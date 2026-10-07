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
    if (!doc) return Response.error("Không thể tải danh sách chương");

    let list = [];
    let seen = {};
    let chapterElements = doc.select(".list-chapter a, #list-chapter a, .chapter-list a, .list-chap a, a[href*='/chuong-'], a[href*='chuong'], #chapter-list a");

    chapterElements.forEach(e => {
        let chapterUrl = (e.attr("href") || '').trim();
        let chapterName = (e.text() || '').trim();

        if (!chapterUrl || !chapterName) return;
        if (chapterUrl.startsWith('#') || chapterUrl.indexOf('javascript') !== -1) return;

        if (chapterUrl.startsWith("/")) {
            chapterUrl = BASE_URL + chapterUrl;
        } else if (!chapterUrl.startsWith('http')) {
            chapterUrl = BASE_URL + '/' + chapterUrl.replace(/^\//, '');
        }

        if (!seen[chapterUrl]) {
            seen[chapterUrl] = true;
            list.push({
                name: chapterName,
                url: chapterUrl,
                host: BASE_URL
            });
        }
    });

    if (list.length === 0) {
        return Response.error("Không tìm thấy danh sách chương!");
    }

    return Response.success(list);
}