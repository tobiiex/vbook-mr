load("config.js");

var MAX_TOC_PAGES = 200;

// Chuyển href (kể cả dạng tương đối như "?page=2", "chuong-5") thành URL đầy đủ theo trang truyện.
function resolveUrl(href, storyUrl) {
    href = (href || "").trim();
    if (!href) return "";
    if (href.indexOf("?") === 0) return ck(storyUrl) + href;
    if (/^(https?:)?\/\//i.test(href) || href.charAt(0) === "/") return absUrl(href);
    return ck(storyUrl) + "/" + href.replace(/^\.?\//, "");
}

function chapNo(u) {
    var m = /\/chuong-(\d+)/.exec(u);
    return m ? parseInt(m[1], 10) : -1;
}

function collect(elements, list, seen, storyUrl) {
    var added = 0;
    elements.forEach(function (e) {
        var href = (e.attr("href") || "").trim();
        var name = (e.text() || "").trim();
        if (!href || !name || href.indexOf("javascript") !== -1 || href.indexOf("#") === 0) return;
        var u = resolveUrl(href, storyUrl);
        if (seen[u]) return;
        seen[u] = true;
        list.push({ name: name, url: u, host: BASE_URL });
        added++;
    });
    return added;
}

// Trả về số chương mới thêm được từ trang này
function collectDoc(doc, list, seen, storyUrl) {
    // Chỉ nhận chương thuộc đúng truyện; trang có thể chứa chương mới/sidebar của truyện khác.
    var base = ck(storyUrl || "");
    var slug = base.split("/").pop();
    var candidates = doc.select("a[href*='/chuong-']");
    var filtered = [];
    candidates.forEach(function (a) {
        var u = ck(resolveUrl(a.attr("href") || "", storyUrl));
        if (!u || !/\/chuong-\d+(?:-|$)/i.test(u)) return;
        // URL chương phải gắn với slug truyện hiện tại; tránh nhặt link từ truyện đề xuất.
        if (slug && u.indexOf(slug + "/chuong-") === -1 && u.indexOf("/" + slug + "-chuong-") === -1) return;
        filtered.push(a);
    });
    return collect(filtered, list, seen, storyUrl);
}

// Các kiểu phân trang thường gặp trên website.
var PAGER_RES = [
    /([?&]page=)(\d+)/i,
    /([?&]paged=)(\d+)/i,
    /([?&]trang=)(\d+)/i,
    /([?&]p=)(\d+)/i,
    /(\/page\/)(\d+)/i,
    /(\/trang-)(\d+)/i,
    /(\/trang\/)(\d+)/i
];

function pageNumber(url) {
    for (var i = 0; i < PAGER_RES.length; i++) {
        var m = PAGER_RES[i].exec(url);
        if (m) return parseInt(m[2], 10);
    }
    return -1;
}

function detectPager(doc, storyUrl) {
    var slug = ck(storyUrl).split("/").pop();
    var max = 1, templates = [];
    doc.select("a[href]").forEach(function (a) {
        var raw = (a.attr("href") || "").trim();
        if (!raw) return;
        var u = resolveUrl(raw, storyUrl);
        if (u.indexOf(slug) === -1 || u.indexOf("/chuong-") !== -1) return;
        for (var i = 0; i < PAGER_RES.length; i++) {
            var re = PAGER_RES[i], m = re.exec(u);
            if (!m) continue;
            var n = parseInt(m[2], 10);
            if (n > max) max = n;
            var exists = false;
            for (var j = 0; j < templates.length; j++) if (templates[j].re.source === re.source) exists = true;
            if (!exists) templates.push({ re: re, url: u });
            break;
        }
    });
    if (!templates.length) return null;
    var t = templates[0];
    return { maxPage: max, build: function (num) { return t.url.replace(t.re, function (all, prefix) { return prefix + num; }); } };
}

// Lấy liên kết trang kế tiếp trực tiếp từ HTML nếu website không dùng mẫu URL phổ biến.
function findNextPage(doc, storyUrl, currentPage) {
    var slug = ck(storyUrl).split("/").pop();
    var candidates = [];
    doc.select("a[href]").forEach(function (a) {
        var raw = (a.attr("href") || "").trim();
        var label = (a.text() || "").trim().toLowerCase();
        if (!raw) return;
        var u = resolveUrl(raw, storyUrl);
        if (u.indexOf(slug) === -1 || u.indexOf("/chuong-") !== -1) return;
        var n = pageNumber(u);
        if (n > currentPage) candidates.push({ url: u, n: n, next: /tiếp|next|›|»/.test(label) });
    });
    candidates.sort(function (a, b) { return a.n - b.n; });
    // Không nhảy thẳng tới trang cuối (ví dụ trang 123), vì sẽ bỏ sót các trang giữa.
    for (var k = 0; k < candidates.length; k++) if (candidates[k].n === currentPage + 1) return candidates[k];
    return null;
}

// Dò các dạng URL phân trang phổ biến khi HTML không cung cấp liên kết phân trang.
function probePager(storyUrl, list, seen) {
    var base = ck(storyUrl);
    var guesses = [
        function (n) { return base + "?page=" + n; },
        function (n) { return base + "?paged=" + n; },
        function (n) { return base + "?trang=" + n; },
        function (n) { return base + "?p=" + n; },
        function (n) { return base + "/trang-" + n; },
        function (n) { return base + "/trang/" + n; },
        function (n) { return base + "/page/" + n; },
        function (n) { return base + "/danh-sach-chuong?page=" + n; },
        function (n) { return base + "/danh-sach-chuong/trang-" + n; },
        function (n) { return base + "/danh-sach-chuong"; }
    ];
    for (var g = 0; g < guesses.length; g++) {
        var d = fetchHtml(guesses[g](2), true);
        if (d && collectDoc(d, list, seen, storyUrl) > 0) return guesses[g];
    }
    return null;
}


// ---------- Phân trang bằng AJAX (website nạp danh sách chương bằng JS, link trang là javascript:void(0)) ----------
function fetchText(url, opts) {
    try {
        var r = fetch(url, opts || FETCH_OPTIONS);
        if (!r) return "";
        var okFlag = (typeof r.ok === "function") ? r.ok() : r.ok;
        if (okFlag === false) return "";
        var t = r.text();
        return t ? String(t) : "";
    } catch (e) { return ""; }
}

function unescapeJson(t) {
    return t.replace(/\\\//g, "/").replace(/\\"/g, '"').replace(/\\n|\\r|\\t/g, " ")
        .replace(/\\u([0-9a-fA-F]{4})/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); });
}

// Lấy chương từ 1 đoạn văn bản bất kỳ (HTML hoặc JSON chứa HTML).
function extractChaps(text, list, seen, storyUrl) {
    if (!text) return 0;
    text = unescapeJson(text);
    var slug = ck(storyUrl).split("/").pop();
    var re = /<a\b[^>]*?href\s*=\s*["']([^"']*\/chuong-[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    var m, added = 0;
    while ((m = re.exec(text)) !== null) {
        var u = ck(resolveUrl(m[1], storyUrl));
        if (!/\/chuong-\d+(?:-|$)/i.test(u)) continue;
        if (u.indexOf(slug + "/chuong-") === -1) continue;
        var name = m[2].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        if (!name || seen[u]) continue;
        seen[u] = true;
        list.push({ name: name, url: u, host: BASE_URL });
        added++;
    }
    return added;
}

// Gọi 1 request {url, opts}
function fetchReq(rq) {
    return fetchText(rq.url, rq.opts);
}

function postOpts(body) {
    return { method: "POST", body: body, headers: { "User-Agent": UA, "Referer": BASE_URL + "/", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" } };
}

function getOpts() {
    return { headers: { "User-Agent": UA, "Referer": BASE_URL + "/", "X-Requested-With": "XMLHttpRequest" } };
}

function strEps(src, onlyHint) {
    var eps = [], m;
    var re = /["'`]((?:https?:)?\/[^"'`\s<>\\]{2,160})["'`]/g;
    while ((m = re.exec(src)) !== null) {
        var e = m[1];
        if (!onlyHint && !/ajax|api|chapter|chuong|list|load|more|page/i.test(e)) continue;
        if (/\.(js|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf)(\?|$)/i.test(e)) continue;
        if (/\/chuong-\d/.test(e)) continue;
        if (/^(https?:)?\/\//i.test(e) && e.indexOf("metruyenchu") === -1) continue;
        e = e.replace(/[?&]$/, "");
        if (eps.indexOf(e) === -1) eps.push(e);
    }
    return eps;
}

// Trang truyện gọi page(<id truyện>, <số trang>) qua onclick; đọc book.js để biết hàm này gọi endpoint nào.
function discoverAjax(doc, storyUrl) {
    var htmlText = "";
    try { htmlText = doc.html() || ""; } catch (e) {}
    var texts = [htmlText];
    var n = 0;
    doc.select("script[src]").forEach(function (sc) {
        if (n >= 8) return;
        var src = resolveUrl(sc.attr("src") || "", storyUrl);
        if (!src || /jquery|bootstrap|google|analytics|gtag|facebook|adsbygoogle|cloudflare|histats|yandex/i.test(src)) return;
        if (src.indexOf("metruyenchu") === -1) return;
        var t = fetchText(src);
        if (t) { texts.push(t); n++; }
    });
    var all = texts.join("\n");
    var m;

    var ids = [];
    var oc = /page\(\s*(\d+)\s*,\s*\d+\s*\)/.exec(htmlText);
    if (oc) ids.push(oc[1]);
    var idRe = /(?:book[_-]?id|bookId|story[_-]?id|storyId|truyen[_-]?id|novel[_-]?id|data-id|data-book(?:-id)?|data-story)["'\s:=]{1,6}["']?(\d{1,12})/gi;
    while ((m = idRe.exec(all)) !== null) if (ids.indexOf(m[1]) === -1) ids.push(m[1]);

    // Đoạn mã định nghĩa hàm page(...)
    var snip = "";
    var idx = all.search(/function\s+page\s*\(|\bpage\s*=\s*function|\bpage\s*:\s*function/);
    if (idx >= 0) snip = all.substr(idx, 1500);
    var keys = [];
    var kr = /["']?([A-Za-z_]\w*)["']?\s*:\s*[A-Za-z_\d"']/g;
    while ((m = kr.exec(snip)) !== null) if (keys.indexOf(m[1]) === -1 && !/^(url|type|method|data|success|error|dataType|function|cache|async|beforeSend|complete)$/i.test(m[1])) keys.push(m[1]);
    var priority = strEps(snip, true);
    var general = strEps(all, false);
    var eps = priority.slice();
    general.forEach(function (e) { if (eps.indexOf(e) === -1) eps.push(e); });
    return { eps: eps.slice(0, 20), ids: ids.slice(0, 4), keys: keys, snipEps: priority };
}

function findAjaxBuilder(doc, storyUrl, list, seen) {
    var info = discoverAjax(doc, storyUrl);
    var slug = ck(storyUrl).split("/").pop();
    var builders = [];
    info.eps.forEach(function (ep) {
        var base = absUrl(ep);
        var sep = base.indexOf("?") === -1 ? "?" : "&";
        info.ids.forEach(function (id) {
            // Dùng tên tham số lấy từ book.js (nếu có)
            var pk = "", ik = "";
            info.keys.forEach(function (k) {
                if (!pk && /^(page|p|trang|pg)$/i.test(k)) pk = k;
                else if (!ik && /id|book|story|truyen/i.test(k)) ik = k;
            });
            if (pk && ik) {
                builders.push(function (pg) { return { url: base + sep + ik + "=" + id + "&" + pk + "=" + pg, opts: getOpts() }; });
                builders.push(function (pg) { return { url: base, opts: postOpts(ik + "=" + id + "&" + pk + "=" + pg) }; });
            }
            ["id", "bookId", "book_id", "story_id", "truyen_id"].forEach(function (name) {
                builders.push(function (pg) { return { url: base + sep + name + "=" + id + "&page=" + pg, opts: getOpts() }; });
                builders.push(function (pg) { return { url: base, opts: postOpts(name + "=" + id + "&page=" + pg) }; });
            });
            builders.push(function (pg) { return { url: base + "/" + id + "/" + pg, opts: getOpts() }; });
            builders.push(function (pg) { return { url: base + "/" + id + sep + "page=" + pg, opts: getOpts() }; });
        });
        builders.push(function (pg) { return { url: base + sep + "page=" + pg, opts: getOpts() }; });
        builders.push(function (pg) { return { url: base + sep + "slug=" + slug + "&page=" + pg, opts: getOpts() }; });
    });
    var tries = 0;
    for (var i = 0; i < builders.length && tries < 90; i++) {
        tries++;
        var t = fetchReq(builders[i](2));
        if (!t) continue;
        var tmpList = [], tmpSeen = {};
        extractChaps(t, tmpList, tmpSeen, storyUrl);
        var fresh = 0;
        for (var k = 0; k < tmpList.length; k++) if (!seen[tmpList[k].url]) fresh++;
        if (fresh >= 10) return builders[i];
    }
    return null;
}

function execute(url) {
    var storyUrl = absUrl(url).replace(/\/+$/, "");
    var doc = fetchHtml(storyUrl);
    if (!doc) return Response.error("Không thể tải danh sách chương" + errInfo());

    var list = [];
    var seen = {};
    collectDoc(doc, list, seen, storyUrl);
    extractChaps(doc.html() || "", list, seen, storyUrl);

    // 1) Phân trang bằng link thật (nếu có)
    var pager = detectPager(doc, storyUrl);
    var cur = 1, tried = {}, d = doc, linkPaged = false;
    while (cur < MAX_TOC_PAGES) {
        var next = findNextPage(d, storyUrl, cur);
        var nextUrl = next ? next.url : (pager && cur < pager.maxPage ? pager.build(cur + 1) : "");
        if (!nextUrl || tried[nextUrl]) break;
        tried[nextUrl] = true;
        var dd = fetchHtml(nextUrl, true);
        if (!dd) break;
        var a = collectDoc(dd, list, seen, storyUrl);
        if (a === 0) break;
        linkPaged = true;
        cur = next ? next.n : cur + 1;
        d = dd;
    }

    // 2) Phân trang AJAX (trường hợp của site này: link trang là javascript:void(0))
    if (!linkPaged) {
        var build = findAjaxBuilder(doc, storyUrl, list, seen);
        if (build) {
            var empty = 0;
            for (var pg = 2; pg < MAX_TOC_PAGES && empty < 2; pg++) {
                var t = fetchReq(build(pg));
                var added = t ? extractChaps(t, list, seen, storyUrl) : 0;
                if (added === 0) empty++; else empty = 0;
            }
        }
    }

    if (list.length === 0) return Response.error("Không tìm thấy danh sách chương!");

    for (var i = 0; i < list.length; i++) {
        list[i]._i = i;
        list[i]._n = chapNo(list[i].url);
        list[i]._t = /[:：]\s*\S/.test(list[i].name) ? 0 : 1;
        list[i]._special = /chương\s*cuối|chuong-cuoi/i.test(list[i].name + " " + list[i].url);
    }
    list.sort(function (a, b) {
        var an = a._n, bn = b._n;
        if (an >= 0 && bn >= 0) return (an - bn) || (a._t - b._t) || (a._i - b._i);
        if (an >= 0) return -1;
        if (bn >= 0) return 1;
        if (a._special !== b._special) return a._special ? 1 : -1;
        return a._i - b._i;
    });
    // Chương bị tách thành nhiều phần (cùng số chương): giữ hết, đánh dấu "phần 2", "phần 3"...
    var part = {};
    for (var j = 0; j < list.length; j++) {
        var no = list[j]._n;
        if (no >= 0) {
            part[no] = (part[no] || 0) + 1;
            if (part[no] > 1) list[j].name = list[j].name + " (phần " + part[no] + ")";
        }
        delete list[j]._i; delete list[j]._n; delete list[j]._t; delete list[j]._special;
    }
    return Response.success(list);
}
