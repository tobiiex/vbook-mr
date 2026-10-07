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

function execute(url) {
    let doc = fetchHtml(url);
    if (!doc) return Response.error("Không thể tải trang chi tiết");

    let titleEl = doc.select("h1[itemprop='name'], h1, .book-title, .title").first();
    let authorEl = doc.select(".author, a[href*='/tac-gia/'], .book-author, .author-name").first();
    let coverEl = doc.select(".book-thumb img, .cover img, .thumb img, img[alt*='truyện'], img[alt*='book'], .book-cover img").first();
    let descEl = doc.select(".book-desc, .desc, .summary, #tab-overview, #gioithieu, .content, .book-content, .description").first();
    let statusEl = doc.select(".status, .label-status, .book-status, .truyen-status, .status-book, .book-info li b + span").first();

    let name = titleEl ? titleEl.text().trim() : (doc.select('meta[property="og:title"]').attr('content') || 'Không rõ tên truyện');
    let author = authorEl ? authorEl.text().trim() : (doc.select('meta[name="description"]').attr('content') || 'Đang cập nhật');
    let cover = '';
    if (coverEl) {
        cover = coverEl.attr("src") || coverEl.attr("data-src") || coverEl.attr("data-original") || '';
        if (cover && cover.startsWith("/")) {
            cover = BASE_URL + cover;
        }
    }

    let description = descEl ? descEl.text().trim() : (doc.select('meta[property="og:description"]').attr('content') || '');
    let status = statusEl ? statusEl.text().trim() : 'Đang ra';
    if (!status || !status.trim()) status = 'Đang ra';

    let genres = [];
    doc.select(".genres a, .tags a, a[href*='/the-loai/']").forEach(e => {
        let genreLink = e.attr("href") || '';
        if (genreLink.startsWith("/")) {
            genreLink = BASE_URL + genreLink;
        }

        let title = e.text().trim();
        if (title && genreLink) {
            genres.push({
                title: title,
                input: genreLink,
                script: "genre.js"
            });
        }
    });

    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: description,
        detail: `Tác giả: ${author}<br>Trạng thái: ${status}`,
        ongoing: status.toLowerCase().indexOf("hoàn thành") === -1,
        genres: genres,
        host: BASE_URL
    });
}