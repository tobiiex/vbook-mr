load("config.js");

var SEARCH_PAGE_FULL = 10;

function tokensOf(keyword) {
    return normalize(keyword).split(" ").filter(function (t) { return t; });
}

// Truyện khớp khi tên (hoặc slug) chứa TẤT CẢ các từ trong từ khoá
function matchesAll(item, tokens) {
    var hay = normalize(item.name) + " " + normalize(item.link.replace(BASE_URL, ""));
    for (var i = 0; i < tokens.length; i++) {
        if (hay.indexOf(tokens[i]) === -1) return false;
    }
    return tokens.length > 0;
}

// Đọc ô tìm kiếm thật trên trang chủ để biết địa chỉ và tên tham số.
// Trả về { url, homeLinks } — homeLinks là các truyện có sẵn ở trang chủ (sidebar/hot) để loại khỏi kết quả rác.
function detectSearch(q) {
    var home = fetchHtml(BASE_URL);
    if (!home) return null;
    var found = null;
    home.select("form").forEach(function (f) {
        if (found) return;
        var method = (f.attr("method") || "get").toLowerCase();
        if (method !== "get") return;
        var inputName = "";
        f.select("input[name]").forEach(function (inp) {
            if (inputName) return;
            var type = (inp.attr("type") || "text").toLowerCase();
            var nm = inp.attr("name") || "";
            if ((type === "search" || type === "text") && nm) inputName = nm;
        });
        if (!inputName) return;
        var action = (f.attr("action") || "").trim();
        var base = action ? absUrl(action) : BASE_URL + "/tim-kiem";
        found = base + (base.indexOf("?") === -1 ? "?" : "&") + encodeURIComponent(inputName) + "=" + q;
    });
    if (!found) return null;
    var homeLinks = {};
    parseList(home).forEach(function (it) { homeLinks[ck(it.link)] = true; });
    return { url: found, homeLinks: homeLinks };
}

function execute(key, page) {
    if (!page) page = "1";
    var keyword = (typeof key === "string") ? key.trim() : "";
    if (!keyword) return Response.success([], null);

    var tokens = tokensOf(keyword);
    var q = encodeURIComponent(keyword);
    var pg = (String(page) === "1") ? "" : "&page=" + page;

    // 1) Địa chỉ lấy từ chính ô tìm kiếm của web: tin kết quả, KHÔNG thử thêm địa chỉ khác
    var det = detectSearch(q);
    if (det) {
        var doc = fetchHtml(det.url + pg);
        if (!doc) return Response.error("Không thể tải kết quả tìm kiếm" + errInfo());
        var all = parseList(doc);
        // Giữ truyện khớp từ khoá (hoặc truyện lạ, không nằm ở trang chủ — vd tìm theo tác giả).
        // Loại truyện sidebar/hot trùng trang chủ mà không khớp từ khoá.
        var result = all.filter(function (it) {
            return matchesAll(it, tokens) || !det.homeLinks[ck(it.link)];
        });
        fillCovers(result, doc);
        // Trang đầy (>= SEARCH_PAGE_FULL kết quả) thì coi như còn trang sau, kể cả khi site không có link ?page=N
        var more = hasNextPage(doc, page) || all.length >= SEARCH_PAGE_FULL;
        var next = (result.length > 0 && more) ? String(parseInt(page, 10) + 1) : null;
        return Response.success(result, next);
    }

    // 2) Dự phòng khi không đọc được form: thử vài địa chỉ phổ biến, mỗi địa chỉ 1 request
    var guesses = ["/tim-kiem?keyword=", "/tim-kiem?q=", "/search?q="];
    for (var i = 0; i < guesses.length; i++) {
        var d = fetchHtml(BASE_URL + guesses[i] + q + pg, true);
        if (!d) continue;
        var matched = parseList(d).filter(function (it) { return matchesAll(it, tokens); });
        if (matched.length === 0) continue;
        fillCovers(matched, d);
        return Response.success(matched, hasNextPage(d, page) ? String(parseInt(page, 10) + 1) : null);
    }
    return Response.success([], null);
}
