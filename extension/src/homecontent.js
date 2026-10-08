var BASE_URL = "https://metruyenchuvn.org";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

var LAST_ERR = "";
function errInfo() { return LAST_ERR ? " (" + LAST_ERR + ")" : ""; }

function tryFetch(url, opts) {
    try {
        var r = opts ? fetch(url, opts) : fetch(url);
        if (!r) { LAST_ERR = "không có phản hồi"; return null; }
        if (r.ok) return r.html();
        LAST_ERR = "HTTP " + (r.status || "?") + " tại " + url;
    } catch (e) { LAST_ERR = String(e); }
    return null;
}

function fetchHtml(url) {
    url = (url || "").replace(/[.\u2026\s]+$/, "");
    var doc = null;
    if (typeof fetch === "function") {
        doc = tryFetch(url, { headers: { "User-Agent": UA, "Referer": BASE_URL + "/" } });
        if (doc) return doc;
        doc = tryFetch(url, null);
        if (doc) return doc;
        if (url.indexOf("metruyenchuvn.org") !== -1) {
            doc = tryFetch(url.replace("metruyenchuvn.org", "metruyenchuvn.com"), null);
            if (doc) return doc;
        }
    }
    try {
        if (typeof Http !== "undefined") {
            var r2 = Http.get(url);
            if (r2 && r2.ok) return r2.html();
            if (r2 && !LAST_ERR) LAST_ERR = "HTTP " + (r2.status || "?");
        }
    } catch (e2) { LAST_ERR = String(e2); }
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

// Tìm khối bao quanh 1 truyện: đi từ thẻ h3 lên cho tới khi khối chứa nhiều hơn 1 truyện
function findBox(h3) {
    var box = h3;
    var best = h3;
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
    var imgs = box.select("img");
    var cover = "";
    imgs.forEach(function (img) {
        var src = absUrl(img.attr("data-src") || img.attr("data-original") || img.attr("src") || "");
        if (!src) return;
        if (src.indexOf("/media/book/") !== -1) { if (cover.indexOf("/media/book/") === -1) cover = src; }
        else if (!cover) cover = src;
    });
    return cover;
}

function parseList(doc) {
    var data = [];
    var seen = {};

    doc.select("h3 a[href]").forEach(function (a) {
        var link = absUrl(a.attr("href"));
        if (!isNovelLink(link) || seen[link]) return;
        var name = (a.text() || "").trim();
        if (!name) return;

        var h3 = null;
        try { h3 = a.parent(); } catch (e) {}
        var box = h3 ? findBox(h3) : a;

        var cover = pickCover(box);

        var author = "";
        var authorA = box.select("a[href*='/tac-gia/']").first();
        if (authorA) author = (authorA.text() || "").trim();

        var genres = [];
        box.select("a[href*='/the-loai/']").forEach(function (g) {
            var t = (g.text() || "").trim();
            if (t && genres.indexOf(t) === -1) genres.push(t);
        });

        var chap = "";
        var m = /Số chương\s*:\s*([\d.,]+)/.exec(box.text() || "");
        if (m) chap = m[1];

        var parts = [];
        if (author) parts.push("Tác giả: " + author);
        if (genres.length) parts.push("Thể loại: " + genres.join(", "));
        if (chap) parts.push(chap + " chương");

        seen[link] = true;
        data.push({
            name: name,
            link: link,
            cover: cover,
            description: parts.join(" · "),
            host: BASE_URL
        });
    });

    // Dự phòng cho trang chủ: link có ảnh bìa + thuộc tính title
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

// Trang chủ: trang 1 lấy từ trang chủ, các trang sau nối tiếp danh sách "Truyện Full" để load thêm.
// Các tab khác (/danh-sach/...): phân trang bằng ?page=N
function execute(url, page) {
    if (!page) page = "1";
    var p = parseInt(page, 10);
    url = (url || BASE_URL).replace(/\/+$/, "");

    var isHome = (url === BASE_URL);
    if (isHome) {
        if (p === 1) {
            var home = fetchHtml(BASE_URL);
            if (!home) return Response.error("Không thể tải trang chủ" + errInfo());
            var first = parseList(home);
            return Response.success(first, "2");
        }
        var more = fetchHtml(withPage(BASE_URL + "/danh-sach/truyen-full", String(p - 1)));
        if (!more) return Response.error("Không thể tải thêm truyện" + errInfo());
        var moreData = parseList(more);
        return Response.success(moreData, (moreData.length > 0 && hasNextPage(more, String(p - 1))) ? String(p + 1) : null);
    }

    var doc = fetchHtml(withPage(url, page));
    if (!doc) return Response.error("Không thể tải trang: " + url + errInfo());
    var data = parseList(doc);
    var next = (data.length > 0 && hasNextPage(doc, page)) ? String(p + 1) : null;
    return Response.success(data, next);
}
