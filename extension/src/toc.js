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

function chapNo(u) {
    var m = /\/chuong-(\d+)/.exec(u);
    return m ? parseInt(m[1], 10) : 0;
}

function collect(elements) {
    var list = [];
    var seen = {};
    elements.forEach(function (e) {
        var href = (e.attr("href") || "").trim();
        var name = (e.text() || "").trim();
        if (!href || !name || href.indexOf("javascript") !== -1) return;
        var u = absUrl(href);
        if (seen[u]) return;
        seen[u] = true;
        list.push({ name: name, url: u, host: BASE_URL });
    });
    return list;
}

function execute(url) {
    var doc = fetchHtml(url);
    if (!doc) return Response.error("Không thể tải danh sách chương" + errInfo());

    // Danh sách chính nằm trong <li>; 5 link "Chương mới nhất" thì không nên lẫn vào
    var list = collect(doc.select("li a[href*='/chuong-']"));
    if (list.length === 0) list = collect(doc.select("a[href*='/chuong-']"));
    if (list.length === 0) return Response.error("Không tìm thấy danh sách chương!");

    list.sort(function (a, b) { return chapNo(a.url) - chapNo(b.url); });
    return Response.success(list);
}
