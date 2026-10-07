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

function execute(url, page) {
    if (!page) page = '1';

    let pageUrl = (url.indexOf('/danh-sach') !== -1 && page !== '1') ? url + (url.indexOf('?') === -1 ? '?' : '&') + 'page=' + page : url;
    let doc = fetchHtml(pageUrl);
    if (!doc) return null;

    let data = [];
    let items = doc.select("#slide .item, .list-truyen .row, .book-item");

    items.forEach(item => {
        let aTag = item.select("a").first();
        let imgTag = item.select("img").first();

        if (aTag) {
            let name = item.select(".caption h3, h3 a, .title").text().trim() || aTag.attr("title");

            let link = aTag.attr("href");
            if (link && link.startsWith("/")) {
                link = BASE_URL + link;
            }

            let cover = "";
            if (imgTag) {
                cover = imgTag.attr("data-src") || imgTag.attr("data-original") || imgTag.attr("src") || "";
                if (cover && cover.startsWith("/")) {
                    cover = BASE_URL + cover;
                }
            }

            data.push({
                name: name,
                link: link,
                cover: cover,
                description: item.select(".caption, .author, .text-muted").text().trim(),
                host: BASE_URL
            });
        }
    });

    let next = (url.indexOf('/danh-sach') !== -1 && data.length > 0) ? String(parseInt(page, 10) + 1) : null;
    return Response.success(data, next);
}