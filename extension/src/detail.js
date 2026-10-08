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

function execute(url) {
    var doc = fetchHtml(url);
    if (!doc) return Response.error("Không thể tải trang chi tiết");

    var titleEl = doc.select("h1[itemprop='name'], h1, .book-title").first();
    var authorEl = doc.select("a[href*='/tac-gia/'], .book-author, .author-name, .author").first();
    var coverEl = doc.select(".book-thumb img, .cover img, .thumb img, .book-cover img, img[alt*='truyện'], img[alt*='book']").first();
    var descEl = doc.select(".book-desc, .desc, .summary, #tab-overview, #gioithieu, .book-content, .description").first();
    var statusEl = doc.select(".status, .label-status, .book-status, .truyen-status, .status-book, .book-info li b + span").first();

    var name = titleEl ? titleEl.text().trim() : "";
    if (!name) name = doc.select("meta[property='og:title']").attr("content") || "Không rõ tên truyện";

    var author = authorEl ? authorEl.text().trim() : "";
    if (!author) author = "Đang cập nhật";

    var cover = "";
    if (coverEl) {
        cover = absUrl(coverEl.attr("data-src") || coverEl.attr("data-original") || coverEl.attr("src") || "");
    }
    if (!cover) cover = absUrl(doc.select("meta[property='og:image']").attr("content"));

    var description = descEl ? descEl.text().trim() : "";
    if (!description) description = doc.select("meta[property='og:description']").attr("content") || "";

    var status = statusEl ? statusEl.text().trim() : "";
    if (!status) status = "Đang ra";

    var genres = [];
    var seen = {};
    doc.select(".genres a, .tags a, a[href*='/the-loai/']").forEach(function (e) {
        var genreLink = absUrl(e.attr("href"));
        var title = e.text().trim();
        if (title && genreLink && !seen[genreLink]) {
            seen[genreLink] = true;
            genres.push({ title: title, input: genreLink, script: "genre.js" });
        }
    });

    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: description,
        detail: "Tác giả: " + author + "<br>Trạng thái: " + status,
        ongoing: status.toLowerCase().indexOf("hoàn thành") === -1,
        genres: genres,
        host: BASE_URL
    });
}
