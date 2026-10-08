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

function isNovelLink(href) {
    if (!href || href.charAt(0) === "#" || href.indexOf("javascript") !== -1) return false;
    return !/\/(danh-sach|the-loai|tim-kiem|chuong-|tac-gia)/.test(href);
}

function execute(key, page) {
    if (!page) page = "1";
    var keyword = (typeof key === "string") ? key.trim() : "";
    if (!keyword) return Response.success([], null);

    var url = BASE_URL + "/tim-kiem?keyword=" + encodeURIComponent(keyword) + "&page=" + encodeURIComponent(String(page));
    var doc = fetchHtml(url);
    if (!doc) return Response.error("Không thể tìm kiếm, thử lại sau");

    var data = [];
    var seen = {};
    var items = doc.select(".list-truyen .row, .list-novel .row, .list-novel .item, .book-item, .item-truyen, .story-item, .truyen-item");
    items.forEach(function (item) {
        var aTag = item.select("h3 a, h2 a, .title a, .book-title a, a[title], a[href]").first();
        if (!aTag) return;
        var link = absUrl(aTag.attr("href"));
        if (!isNovelLink(link) || seen[link]) return;

        var name = aTag.text().trim() || (aTag.attr("title") || "").trim();
        if (!name) return;

        var cover = "";
        var imgEl = item.select("img").first();
        if (imgEl) cover = absUrl(imgEl.attr("data-src") || imgEl.attr("data-original") || imgEl.attr("src") || "");

        var descEl = item.select(".author, .text-muted, .meta").first();
        seen[link] = true;
        data.push({
            name: name,
            link: link,
            cover: cover,
            description: descEl ? descEl.text().trim() : "",
            host: BASE_URL
        });
    });

    var hasNext = false;
    doc.select(".pagination a").forEach(function (a) {
        var t = (a.text() || "").trim().toLowerCase();
        if (a.attr("href") && (t.indexOf("next") !== -1 || t.indexOf("tiếp") !== -1 || t.indexOf("›") !== -1 || t.indexOf("»") !== -1 || t.indexOf("sau") !== -1)) {
            hasNext = true;
        }
    });

    var next = (hasNext && data.length > 0) ? String(parseInt(page, 10) + 1) : null;
    return Response.success(data, next);
}
