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

function collect(elements) {
    var list = [];
    var seen = {};
    elements.forEach(function (e) {
        var href = (e.attr("href") || "").trim();
        var name = (e.text() || "").trim();
        if (!href || !name) return;
        if (href.charAt(0) === "#" || href.indexOf("javascript") !== -1) return;
        var chapterUrl = absUrl(href);
        if (seen[chapterUrl]) return;
        seen[chapterUrl] = true;
        list.push({ name: name, url: chapterUrl, host: BASE_URL });
    });
    return list;
}

function execute(url) {
    var doc = fetchHtml(url);
    if (!doc) return Response.error("Không thể tải danh sách chương");

    // Ưu tiên khung danh sách chương; chỉ khi không có mới quét toàn trang
    var list = collect(doc.select(".list-chapter a, #list-chapter a, .chapter-list a, .list-chap a, #chapter-list a"));
    if (list.length === 0) {
        list = collect(doc.select("a[href*='/chuong-']"));
    }

    if (list.length === 0) {
        return Response.error("Không tìm thấy danh sách chương!");
    }
    return Response.success(list);
}
