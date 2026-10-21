load("config.js");

function execute(url) {
    var doc = fetchHtml(absUrl(url));
    if (!doc) return Response.error("Không thể tải trang đọc truyện!" + errInfo());

    var contentEl = doc.select("#vungdoc, .vung-doc, #chapter-c, .chapter-c, #chapter-content, .chapter-content, .content-chapter, .reading-detail, .chapter_wrap").first();
    if (!contentEl) return Response.error("Không tìm thấy vùng nội dung chương!");

    try { contentEl.select("script, style, iframe, ins, noscript, button, .ads, .ad, .advertisement, [class^=ads-], [id^=ads], a").remove(); } catch (e) {}

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
        if (/^[\u300a\u3008]?\s*Chương trước\s*$/i.test(line)) continue;
        if (/^Chương tiếp\s*[\u300b\u3009]?$/i.test(line)) continue;
        if (/^Tải Ebook$/i.test(line)) continue;
        out.push(line);
    }

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
