load("config.js");

// Tìm <li> trong khung "THÔNG TIN TRUYỆN" có dạng "Nhãn : giá trị".
// Dùng regex phân biệt hoa/thường để không dính menu "THỂ LOẠI" trên đầu trang.
function findInfoLi(doc, label) {
    var re = new RegExp("^" + label + "\\s*:");
    var found = null;
    doc.select("li").forEach(function (li) {
        if (found) return;
        if (re.test((li.text() || "").trim())) found = li;
    });
    return found;
}

function cleanDesc(text) {
    text = (text || "").replace(/\s+/g, " ");
    var cut = text.search(/(Tìm chương|Danh sách chương|Chương mới nhất)/);
    if (cut !== -1) text = text.substring(0, cut);
    text = text.replace(/^\s*Giới thiệu nội dung\s*:?\s*/i, "")
               .replace(/Xem thêm\s*[»›>]*/gi, "")
               .replace(/Rút gọn\s*[«‹<]*/gi, "");
    return text.trim();
}

function getDescription(doc) {
    var text = "";

    // Cách 1: lấy các khối nằm ngay sau tiêu đề "Giới thiệu nội dung"
    doc.select("h2, h3, h4").forEach(function (h) {
        if (text) return;
        if (!/Giới thiệu/i.test(h.text() || "")) return;
        var el = null;
        try { el = h.nextElementSibling(); } catch (e) {}
        var guard = 0;
        var buf = "";
        while (el && guard < 4) {
            var t = (el.text() || "").trim();
            if (count(el.select("a[href*='/chuong-']")) > 0 || /^(Tìm chương|Danh sách chương|Chương mới nhất)/.test(t)) break;
            buf += " " + t;
            try { el = el.nextElementSibling(); } catch (e2) { el = null; }
            guard++;
        }
        text = cleanDesc(buf);
    });

    // Cách 2: đoạn bắt đầu bằng "Văn án"
    if (text.length < 20) {
        var va = doc.select("*:containsOwn(Văn án)").first();
        if (va) {
            var box = va;
            try { if (va.parent() && count(va.parent().select("a[href*='/chuong-']")) === 0) box = va.parent(); } catch (e3) {}
            text = cleanDesc(box.text());
        }
    }

    // Cách 3: meta
    if (text.length < 20) {
        text = doc.select("meta[property='og:description']").attr("content") || doc.select("meta[name=description]").attr("content") || "";
    }
    return text;
}

function execute(url) {
    var doc = fetchHtml(url);
    if (!doc) return Response.error("Không thể tải trang chi tiết" + errInfo());

    var titleEl = doc.select("h1").first();
    var name = titleEl ? titleEl.text().trim() : "";
    if (!name) {
        name = (doc.select("meta[property='og:title']").attr("content") || "").replace(/\s*-\s*Đọc Truyện.*$/i, "").trim();
    }
    if (!name) name = "Không rõ tên truyện";

    var cover = absUrl(doc.select("meta[property='og:image']").attr("content"));
    if (!cover || cover.indexOf("/media/book/") === -1) {
        var imgEl = doc.select("img[src*='/media/book/'], img[data-src*='/media/book/']").first();
        if (imgEl) cover = absUrl(imgEl.attr("data-src") || imgEl.attr("src"));
    }

    var author = "";
    var authorUrl = "";
    var authorLi = findInfoLi(doc, "Tác giả");
    if (authorLi) {
        var aa = authorLi.select("a").first();
        author = aa ? aa.text().trim() : authorLi.text().replace(/^Tác giả\s*:/, "").trim();
        if (aa) authorUrl = absUrl(aa.attr("href")).replace(/\/+$/, "");
    }
    if (!author) author = "Đang cập nhật";

    var status = "";
    var statusLi = findInfoLi(doc, "Trạng thái");
    if (statusLi) status = statusLi.text().replace(/^Trạng thái\s*:/, "").trim();
    if (!status) status = "Đang cập nhật";

    var chapCount = "";
    var chapLi = findInfoLi(doc, "Số chương");
    if (chapLi) chapCount = chapLi.text().replace(/^Số chương\s*:/, "").trim();

    var genres = [];
    var seen = {};
    var genreLi = findInfoLi(doc, "Thể loại");
    if (genreLi) {
        genreLi.select("a[href*='/the-loai/']").forEach(function (e) {
            var gl = absUrl(e.attr("href")).replace(/\/+$/, "");
            var title = (e.text() || "").trim();
            if (title && gl && !seen[gl]) {
                seen[gl] = true;
                genres.push({ title: title, input: gl, script: "genrecontent.js" });
            }
        });
    }

    var suggests = [];
    if (authorUrl && /\/tac-gia\//.test(authorUrl)) suggests.push({ title: "Truyện cùng tác giả", input: authorUrl, script: "suggest.js" });
    if (genres.length > 0) suggests.push({ title: "Truyện cùng thể loại: " + genres[0].title, input: genres[0].input, script: "suggest.js" });

    var detail = "Tác giả: " + author + "<br>Trạng thái: " + status;
    if (chapCount) detail += "<br>Số chương: " + chapCount;

    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: getDescription(doc),
        detail: detail,
        ongoing: !/(hoàn|full|đã xong)/i.test(status),
        genres: genres,
        suggests: suggests,
        host: BASE_URL
    });
}
