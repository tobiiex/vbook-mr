load("config.js");

// Trả về danh sách thể loại; mỗi mục mở bằng genrecontent.js
function execute() {
    var home = fetchHtml(BASE_URL);
    if (!home) return Response.error("Không thể tải danh sách thể loại" + errInfo());
    var genres = [];
    var seen = {};
    home.select("a[href*='/the-loai/']").forEach(function (a) {
        var href = absUrl(a.attr("href")).replace(/\/+$/, "");
        var title = (a.text() || "").trim();
        if (!title || seen[href] || /\/the-loai\/?$/.test(href)) return;
        seen[href] = true;
        genres.push({ title: title, input: href, script: "genrecontent.js" });
    });
    if (genres.length === 0) return Response.error("Không tìm thấy thể loại");
    return Response.success(genres);
}
