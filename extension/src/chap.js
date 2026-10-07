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
    if (!doc) return Response.error("Không thể tải trang đọc truyện!");

    let contentEl = doc.select("#vungdoc, .vung-doc, .chapter_wrap, .chapter-content, .content-chapter, .reading-detail").first();
    if (!contentEl) {
        return Response.error("Không tìm thấy vùng nội dung chương!");
    }

    let content = contentEl.text();
    if (!content || !content.trim()) {
        return Response.error("Không tìm thấy nội dung chương!");
    }

    content = content
        .replace(/《\s*Chương trước/gi, "")
        .replace(/Chương tiếp\s*》/gi, "")
        .replace(/Tải Ebook/gi, "")
        .replace(/Mau Xuyên/gi, "")
        .replace(/\bTác giả\b[\s\S]*?/gi, "")
        .replace(/\bThể loại\b[\s\S]*?/gi, "")
        .replace(/^\s*Chương\s+\d+[:\-].*$/gim, "")
        .replace(/^\s*\d+\s*$/gm, "")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    if (!content) {
        return Response.error("Không tìm thấy nội dung chương!");
    }

    content = content
        .replace(/\n\s*\n+/g, "<br><br>")
        .replace(/\n/g, "<br>")
        .trim();

    return Response.success(content);
}