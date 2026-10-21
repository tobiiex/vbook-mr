load("config.js");

var HOME_PAGE_SIZE = 6;       // số truyện mỗi trang ở tab Trang Chủ

// Tab Trang Chủ: lấy toàn bộ danh sách ở trang chủ rồi chia trang (1, 2, 3...), mỗi trang HOME_PAGE_SIZE truyện,
// chỉ tra bìa cho đúng các truyện của trang đó.
// Các tab /danh-sach/...: phân trang bằng ?page=N của site, cũng tra bìa cho truyện còn thiếu.
function execute(url, page) {
    if (!page) page = "1";
    var p = parseInt(page, 10);
    url = (url || BASE_URL).replace(/\/+$/, "");

    if (url === BASE_URL) {
        var home = fetchHtml(BASE_URL);
        if (!home) return Response.error("Không thể tải trang chủ" + errInfo());
        var all = parseList(home);
        var from = (p - 1) * HOME_PAGE_SIZE;
        var chunk = all.slice(from, from + HOME_PAGE_SIZE);
        if (chunk.length === 0) return Response.success([], null);
        fillCovers(chunk, home);
        var nextHome = (from + HOME_PAGE_SIZE < all.length) ? String(p + 1) : null;
        return Response.success(chunk, nextHome);
    }

    var doc = fetchHtml(withPage(url, page));
    if (!doc) return Response.error("Không thể tải trang: " + url + errInfo());
    var data = parseList(doc);
    fillCovers(data, doc);
    var next = (data.length > 0 && hasNextPage(doc, page)) ? String(p + 1) : null;
    return Response.success(data, next);
}
