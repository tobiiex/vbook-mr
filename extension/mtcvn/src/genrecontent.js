load("config.js");

// url: link thể loại (vd https://.../the-loai/ngon-tinh), có phân trang ?page=N
function execute(url, page) {
    if (!url) return Response.error("Thiếu đường dẫn thể loại");
    if (!page) page = "1";
    var doc = fetchHtml(withPage(absUrl(url), page));
    if (!doc) return Response.error("Không thể tải thể loại" + errInfo());
    var data = parseList(doc);
    var next = (data.length > 0 && hasNextPage(doc, page)) ? String(parseInt(page, 10) + 1) : null;
    return Response.success(data, next);
}
