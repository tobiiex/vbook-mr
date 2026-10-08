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

function execute(url) {
    var doc = fetchHtml(url);
    if (!doc) return Response.error("Không thể tải trang đọc truyện!" + errInfo());

    var contentEl = doc.select("#vungdoc, .vung-doc, #chapter-c, .chapter-c, #chapter-content, .chapter-content, .content-chapter, .reading-detail, .chapter_wrap").first();
    if (!contentEl) return Response.error("Không tìm thấy vùng nội dung chương!");

    try { contentEl.select("script, style, iframe, .ads, [class*=ads], a").remove(); } catch (e) {}

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
        if (/^《?\s*Chương trước\s*$/i.test(line)) continue;
        if (/^Chương tiếp\s*》?$/i.test(line)) continue;
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
