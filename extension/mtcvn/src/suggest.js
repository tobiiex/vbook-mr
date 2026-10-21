load("config.js");

// Gợi ý: input là link danh sách (thể loại hoặc tác giả) do detail.js đưa ra
function execute(url, page) {
    if (!url) return Response.success([], null);
    if (!page) page = "1";
    var doc = fetchHtml(withPage(absUrl(url), page));
    if (!doc) return Response.error("Không thể tải danh sách gợi ý" + errInfo());
    var data = parseList(doc);
    fillCovers(data, doc);
    var next = (data.length > 0 && hasNextPage(doc, page)) ? String(parseInt(page, 10) + 1) : null;
    return Response.success(data, next);
}
