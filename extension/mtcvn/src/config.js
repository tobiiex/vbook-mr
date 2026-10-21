var BASE_URL = "https://metruyenchu.com.vn";
var HOST = BASE_URL;
var UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
var FETCH_OPTIONS = { headers: { "User-Agent": UA, "Referer": BASE_URL + "/" } };

var LAST_ERR = "";
var LAST_STATUS = 0;
function errInfo() { return LAST_ERR ? " (" + LAST_ERR + ")" : ""; }

function readResp(r, url) {
    LAST_STATUS = 0;
    if (!r) { LAST_ERR = "không có phản hồi"; return null; }
    var st, okFlag;
    try { st = (typeof r.status === "function") ? r.status() : r.status; } catch (e) {}
    try { okFlag = (typeof r.ok === "function") ? r.ok() : r.ok; } catch (e) {}
    if (st) LAST_STATUS = st;
    if (okFlag === undefined || okFlag === null) {
        okFlag = (st === undefined || st === null) ? true : (st >= 200 && st < 400);
    }
    if (!okFlag) { LAST_ERR = "HTTP " + (st || "?") + " tại " + url; return null; }
    try {
        var d = r.html();
        if (d) return d;
        LAST_ERR = "trang trả về rỗng tại " + url;
    } catch (e2) { LAST_ERR = "lỗi đọc HTML: " + String(e2); }
    return null;
}

// Tối đa 2 lần thử; lỗi 4xx (client) thì không thử lại. Không đổi domain, không dùng API cũ.
function fetchHtml(url, once) {
    url = (url || "").replace(/[.\u2026\s]+$/, "");
    for (var i = 0; i < (once ? 1 : 2); i++) {
        try {
            var doc = readResp(fetch(url, FETCH_OPTIONS), url);
            if (doc) return doc;
        } catch (e) { LAST_ERR = "lỗi fetch: " + String(e); LAST_STATUS = 0; }
        if (LAST_STATUS >= 400 && LAST_STATUS < 500) break;
    }
    return null;
}

function absUrl(u) {
    u = (u || "").trim();
    if (!u) return "";
    if (u.indexOf("//") === 0) return "https:" + u;
    if (u.indexOf("http") === 0) return u;
    return BASE_URL + "/" + u.replace(/^\//, "");
}

function count(els) {
    if (!els) return 0;
    try { return els.size(); } catch (e) {}
    return els.length || 0;
}

function withPage(url, page) {
    url = url.replace(/\/+$/, "");
    if (!page || String(page) === "1") return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "page=" + page;
}

function hasNextPage(doc, page) {
    var n = parseInt(page, 10) + 1;
    return count(doc.select("a[href*='page=" + n + "']")) > 0;
}

function isNovelLink(href) {
    if (!href || href.indexOf("javascript") !== -1 || href.indexOf("#") !== -1) return false;
    return !/\/(danh-sach|the-loai|tim-kiem|tac-gia|contact|tos)(\/|\?|$)/.test(href) && href.indexOf("/chuong-") === -1;
}

function tagOf(el) {
    try { return (el.tagName() || "").toLowerCase(); } catch (e) { return ""; }
}

function sib(el, dir) {
    try { return dir < 0 ? el.previousElementSibling() : el.nextElementSibling(); } catch (e) { return null; }
}

// Tìm khối bao quanh 1 truyện: đi từ thẻ h3 lên cho tới khi khối chứa nhiều hơn 1 truyện
function findBox(h3) {
    var box = h3;
    var best = null;
    for (var i = 0; i < 6; i++) {
        var p = null;
        try { p = box.parent(); } catch (e) {}
        if (!p) break;
        if (count(p.select("h3 a[href]")) > 1) break;
        box = p;
        if (count(box.select("img")) > 0) best = box;
    }
    return best;
}

function pickCover(box) {
    var cover = "";
    box.select("img").forEach(function (img) {
        var src = absUrl(img.attr("data-src") || img.attr("data-original") || img.attr("data-lazy-src") || img.attr("src") || "");
        if (!src || src.indexOf("data:") !== -1) return;
        if (src.indexOf("/media/book/") !== -1) { if (cover.indexOf("/media/book/") === -1) cover = src; }
        else if (!cover) cover = src;
    });
    return cover;
}

// Trường hợp các phần tử của 1 truyện nằm "phẳng" cạnh nhau (không có khối bao): quét anh em quanh thẻ h3
function siblingScopes(h3) {
    var before = [];
    var after = [];
    var el = sib(h3, -1);
    var n = 0;
    while (el && n < 3 && tagOf(el) !== "h3") {
        before.push(el);
        if (count(el.select("img")) > 0 || tagOf(el) === "img") break;
        el = sib(el, -1);
        n++;
    }
    el = sib(h3, 1);
    n = 0;
    while (el && n < 10 && tagOf(el) !== "h3") {
        if (count(el.select("img")) > 0 || tagOf(el) === "img") break;
        after.push(el);
        el = sib(el, 1);
        n++;
    }
    return { before: before, after: after };
}

function ck(u) { return (u || "").replace(/[?#].*$/, "").replace(/\/+$/, ""); }

// Ghép ảnh bìa theo link: ảnh nằm trong thẻ <a href=link> thì là bìa của truyện có link đó,
// không phụ thuộc ảnh và tiêu đề nằm ở đâu trong cấu trúc HTML.
function buildCoverMap(doc) {
    var map = {};
    doc.select("img").forEach(function (img) {
        var src = absUrl(img.attr("data-src") || img.attr("data-original") || img.attr("data-lazy-src") || img.attr("src") || "");
        if (!src || src.indexOf("data:") !== -1) return;
        var el = img;
        for (var i = 0; i < 4; i++) {
            try { el = el.parent(); } catch (e) { el = null; }
            if (!el) break;
            if (tagOf(el) === "a") {
                var key = ck(absUrl(el.attr("href")));
                if (key && (!map[key] || (src.indexOf("/media/book/") !== -1 && map[key].indexOf("/media/book/") === -1))) map[key] = src;
                break;
            }
        }
    });
    return map;
}

function parseList(doc) {
    var data = [];
    var seen = {};
    var covers = buildCoverMap(doc);

    // Trang chủ: mục slide có cấu trúc  #slide .item > a[href][title] > img + .caption
    doc.select("#slide .item a[href], .slide .item a[href]").forEach(function (a) {
        if (count(a.select("img")) === 0) return;
        var link = absUrl(a.attr("href"));
        if (!isNovelLink(link) || seen[link]) return;
        var capEl = a.select(".caption h3, .caption h2, .caption .title, h3").first();
        var name = capEl ? (capEl.text() || "").trim() : "";
        if (!name) name = (a.attr("title") || "").replace(/\s*đọc online\s*$/i, "").trim();
        if (!name) return;
        seen[link] = true;
        data.push({ name: name, link: link, cover: pickCover(a) || covers[ck(link)] || "", description: "", host: BASE_URL });
    });

    doc.select("h3 a[href]").forEach(function (a) {
        var link = absUrl(a.attr("href"));
        if (!isNovelLink(link) || seen[link]) return;
        var name = (a.text() || "").trim();
        if (!name) return;

        var h3 = null;
        try { h3 = a.parent(); } catch (e) {}

        var cover = "";
        var scopes = [];
        var box = h3 ? findBox(h3) : null;
        if (box) {
            cover = pickCover(box);
            scopes.push(box);
        } else if (h3) {
            var ss = siblingScopes(h3);
            ss.before.forEach(function (e) { if (!cover) cover = pickCover(e); });
            scopes = ss.after;
        }

        var author = "";
        var genres = [];
        var chap = "";
        scopes.forEach(function (sc) {
            if (!author) {
                var authorA = sc.select("a[href*='/tac-gia/']").first();
                if (authorA) author = (authorA.text() || "").trim();
            }
            sc.select("a[href*='/the-loai/']").forEach(function (g) {
                var t = (g.text() || "").trim();
                if (t && genres.indexOf(t) === -1) genres.push(t);
            });
            if (!chap) {
                var m = /Số chương\s*:\s*([\d.,]+)/.exec(sc.text() || "");
                if (m) chap = m[1];
            }
        });

        var parts = [];
        if (author) parts.push("Tác giả: " + author);
        if (genres.length) parts.push("Thể loại: " + genres.join(", "));
        if (chap) parts.push(chap + " chương");

        if (!cover) cover = covers[ck(link)] || "";
        seen[link] = true;
        data.push({
            name: name,
            link: link,
            cover: cover,
            description: parts.join(" · "),
            host: BASE_URL
        });
    });

    // Dự phòng: link có ảnh bìa + thuộc tính title
    if (data.length === 0) {
        doc.select("a[href][title]").forEach(function (a) {
            if (count(a.select("img")) === 0) return;
            var link = absUrl(a.attr("href"));
            if (!isNovelLink(link) || seen[link]) return;
            var name = (a.attr("title") || "").replace(/\s*đọc online\s*$/i, "").trim();
            if (!name) return;
            seen[link] = true;
            data.push({ name: name, link: link, cover: pickCover(a), description: "", host: BASE_URL });
        });
    }
    return data;
}


// ---- Bỏ dấu tiếng Việt (an toàn cả khi engine không có String.prototype.normalize) ----
var VN_FROM = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
var VN_TO   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
function normalize(s) {
    s = (s || "").toLowerCase();
    var out = "";
    for (var i = 0; i < s.length; i++) {
        var idx = VN_FROM.indexOf(s.charAt(i));
        out += idx === -1 ? s.charAt(i) : VN_TO.charAt(idx);
    }
    return out.replace(/[^a-z0-9]+/g, " ").trim();
}

// Lấy slug tác giả / đường dẫn truyện
function pathOf(u) { return ck(absUrl(u)).replace(BASE_URL, ""); }

// ---- Lấy bìa cho truyện thiếu ảnh (dùng chung: trang chủ, danh sách, tìm kiếm) ----
// Trang chủ có mục chỉ liệt kê tên (không kèm ảnh). Lấy bìa theo 2 bước:
//  1) Rẻ: đọc vài trang danh sách (hot/full) vốn có ảnh, ghép theo link (vài request cho cả trang).
//  2) Còn thiếu: mở trang chi tiết lấy og:image, tối đa MAX_COVER_LOOKUPS truyện, mỗi truyện 1 request.
// Trang chủ được chia thành nhiều trang nhỏ (HOME_PAGE_SIZE truyện/trang) nên mỗi trang chỉ cần tra ít bìa -> trang nào cũng đủ ảnh.
var MAX_COVER_LOOKUPS = 12;   // tối đa mỗi trang
var COVER_SOURCES = ["/danh-sach/truyen-hot", "/danh-sach/truyen-full"];

function missing(items) {
    for (var i = 0; i < items.length; i++) if (!items[i].cover) return true;
    return false;
}

function fillCovers(items, homeDoc) {
    // Bước 1: bản đồ bìa từ chính trang chủ + các trang danh sách
    var map = buildCoverMap(homeDoc);
    for (var s = 0; s < COVER_SOURCES.length && missing(items); s++) {
        var d = fetchHtml(BASE_URL + COVER_SOURCES[s], true);
        if (!d) continue;
        var m = buildCoverMap(d);
        for (var k in m) if (!map[k]) map[k] = m[k];
        parseList(d).forEach(function (it) { if (it.cover && !map[ck(it.link)]) map[ck(it.link)] = it.cover; });
    }
    for (var i = 0; i < items.length; i++) {
        if (!items[i].cover) items[i].cover = map[ck(items[i].link)] || "";
    }

    // Bước 2: mở trang chi tiết cho phần còn thiếu. Lượt 1: 1 request/truyện.
    // Lượt 2: truyện nào lượt 1 trượt (site chặn/chậm khi gọi dồn dập) thì nghỉ chút rồi thử lại.
    var n = 0;
    var failed = [];
    for (var j = 0; j < items.length && n < MAX_COVER_LOOKUPS; j++) {
        if (items[j].cover) continue;
        n++;
        var c = coverFromDetail(fetchHtml(items[j].link, true));
        if (c) items[j].cover = c; else failed.push(items[j]);
    }
    if (failed.length > 0) {
        try { if (typeof sleep === "function") sleep(600); } catch (e) {}
        for (var f = 0; f < failed.length; f++) {
            var c2 = coverFromDetail(fetchHtml(failed[f].link));
            if (c2) failed[f].cover = c2;
        }
    }
}

// Bìa từ trang chi tiết: ưu tiên og:image thuộc /media/book/, không có thì tìm ảnh /media/book/ trong trang, cuối cùng mới dùng og:image bất kỳ
function coverFromDetail(d) {
    if (!d) return "";
    var og = absUrl(d.select("meta[property='og:image']").attr("content"));
    if (og && og.indexOf("/media/book/") !== -1) return og;
    var img = d.select("img[src*='/media/book/'], img[data-src*='/media/book/']").first();
    if (img) return absUrl(img.attr("data-src") || img.attr("src"));
    return og;
}
