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
    var doc = fetchHtml(url);
    if (!doc) return Response.error("Không thể tải trang đọc truyện!");

    var contentEl = doc.select("#vungdoc, .vung-doc, .chapter_wrap, .chapter-content, .content-chapter, .reading-detail").first();
    if (!contentEl) return Response.error("Không tìm thấy vùng nội dung chương!");

    // Bỏ script/style/quảng cáo/link điều hướng nằm trong vùng đọc
    try { contentEl.select("script, style, iframe, .ads, [class*=ads], a").remove(); } catch (e) {}

    // Lấy HTML để giữ ngắt đoạn (text() sẽ gộp hết xuống dòng)
    var html = contentEl.html() || "";
    var content = html
        .replace(/\r\n/g, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");

    var lines = content.split("\n");
    var out = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].replace(/[ \t\u00a0]+/g, " ").trim();
        if (line === "") { out.push(""); continue; }
        // dòng rác điều hướng / quảng cáo
        if (/^《?\s*Chương trước\s*$/i.test(line)) continue;
        if (/^Chương tiếp\s*》?$/i.test(line)) continue;
        if (/^Tải Ebook$/i.test(line)) continue;
        out.push(line);
    }

    // Bỏ dòng tiêu đề chương nếu nó là dòng đầu tiên và ngắn
    var first = 0;
    while (first < out.length && out[first] === "") first++;
    if (first < out.length && out[first].length < 150 && /^Chương\s+\d+/i.test(out[first])) {
        out.splice(first, 1);
    }

    content = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!content) return Response.error("Không tìm thấy nội dung chương!");

    content = content.replace(/\n\s*\n/g, "<br><br>").replace(/\n/g, "<br>");
    return Response.success(content);
}
