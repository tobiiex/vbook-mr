// Kiểm tra nếu chưa có BASE_URL thì mới tạo, tránh lỗi lặp biến
if (typeof BASE_URL === 'undefined') {
    var BASE_URL = "https://metruyenchuvn.org";
}

function fetchHtml(url) {
    try {
        if (typeof Http !== "undefined") {
            let response = Http.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            if (response && response.ok) {
                return typeof response.html === "function" ? response.html() : null;
            }
            return null;
        }

        if (typeof fetch === "function") {
            let response = fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            if (response && response.ok) {
                return typeof response.html === "function" ? response.html() : null;
            }
        }
    } catch (error) {
        return null;
    }

    return null;
}