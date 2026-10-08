var BASE_URL = "https://metruyenchuvn.org";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function fetchHtml(url) {
    try {
        if (typeof fetch === "function") {
            var r = fetch(url, { headers: { "User-Agent": UA } });
            if (r && r.ok) return r.html();
        }
    } catch (e) {}
    try {
        if (typeof Http !== "undefined") {
            var r2 = Http.get(url);
            if (r2 && r2.ok) return r2.html();
        }
    } catch (e) {}
    return null;
}

function absUrl(u) {
    u = (u || "").trim();
    if (!u) return "";
    if (u.indexOf("//") === 0) return "https:" + u;
    if (u.indexOf("http") === 0) return u;
    return BASE_URL + "/" + u.replace(/^\//, "");
}

function withPage(url, page) {
    if (!page || page === "1") return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "page=" + page;
}

function isNovelLink(href) {
    if (!href || href.charAt(0) === "#" || href.indexOf("javascript") !== -1) return false;
    return !/\/(danh-sach|the-loai|tim-kiem|chuong-|tac-gia)/.test(href);
}

function parseList(doc) {
    var data = [];
    var seen = {};
    var items = doc.select("#slide .item, .list-truyen .row, .book-item, .item-truyen, .story-item, .truyen-item");
    items.forEach(function (item) {
        var aTag = item.select("h3 a, h2 a, .title a, a[href]").first();
        if (!aTag) return;
        var link = absUrl(aTag.attr("href"));
        if (!isNovelLink(link) || seen[link]) return;

        var nameEl = item.select(".caption h3, h3 a, h3, .title").first();
        var name = (nameEl ? nameEl.text().trim() : "") || (aTag.attr("title") || "").trim() || aTag.text().trim();
        if (!name) return;

        var cover = "";
        var imgTag = item.select("img").first();
        if (imgTag) {
            cover = absUrl(imgTag.attr("data-src") || imgTag.attr("data-original") || imgTag.attr("src") || "");
        }

        var descEl = item.select(".author, .text-muted, .caption").first();
        seen[link] = true;
        data.push({
            name: name,
            link: link,
            cover: cover,
            description: descEl ? descEl.text().trim() : "",
            host: BASE_URL
        });
    });
    return data;
}

// Không có url: trả về danh sách thể loại lấy từ trang chủ.
// Có url (vd: /the-loai/tien-hiep): trả về danh sách truyện của thể loại, có phân trang.
function execute(url, page) {
    if (!page) page = "1";

    if (!url) {
        var home = fetchHtml(BASE_URL);
        if (!home) return Response.error("Không thể tải danh sách thể loại");
        var genres = [];
        var seenG = {};
        home.select("a[href*='/the-loai/']").forEach(function (a) {
            var href = absUrl(a.attr("href"));
            var title = a.text().trim();
            if (!title || !href || seenG[href]) return;
            seenG[href] = true;
            genres.push({ title: title, input: href, script: "genre.js" });
        });
        if (genres.length === 0) return Response.error("Không tìm thấy thể loại");
        return Response.success(genres);
    }

    var doc = fetchHtml(withPage(absUrl(url), page));
    if (!doc) return Response.error("Không thể tải thể loại");

    var data = parseList(doc);
    var next = data.length > 0 ? String(parseInt(page, 10) + 1) : null;
    return Response.success(data, next);
}
