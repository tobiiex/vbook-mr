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

function execute(key, page) {
    if (!page) page = '1';

    let keyword = (typeof key === 'string' && key.trim() && !key.startsWith('http')) ? key.trim() : 'kiem';
    let keywordLower = keyword.toLowerCase();
    let url = 'https://metruyenchuvn.org/tim-kiem?keyword=' + encodeURIComponent(keyword) + '&page=' + encodeURIComponent(String(page));

    let doc = null;
    if (typeof fetchHtml === 'function') {
        doc = fetchHtml(url) || fetchHtml('https://metruyenchuvn.org/');
    } else if (typeof Http !== 'undefined') {
        try {
            doc = Http.get(url).html();
        } catch (e) {
            doc = Http.get('https://metruyenchuvn.org/').html();
        }
    } else if (typeof fetch === 'function') {
        let res = fetch(url);
        if (res && res.ok) {
            doc = typeof res.html === 'function' ? res.html() : null;
        }
        if (!doc) {
            let homeRes = fetch('https://metruyenchuvn.org/');
            if (homeRes && homeRes.ok && typeof homeRes.html === 'function') {
                doc = homeRes.html();
            }
        }
    }

    if (!doc) {
        return null;
    }

    let novelList = [];
    let addNovel = (name, href, cover, description) => {
        if (!name || !href) return;
        if (href.includes('javascript') || href.includes('/danh-sach') || href.includes('/the-loai') || href.includes('/tim-kiem') || href.includes('/chuong-') || href.startsWith('#')) return;

        let normalizedHref = href;
        if (!normalizedHref.startsWith('http')) {
            normalizedHref = 'https://metruyenchuvn.org/' + normalizedHref.replace(/^\//, '');
        }

        if (!novelList.some(n => n.link === normalizedHref)) {
            novelList.push({
                name: name.trim(),
                link: normalizedHref,
                cover: cover || '',
                description: description || '',
                host: 'https://metruyenchuvn.org'
            });
        }
    };

    let items = doc.select('.list-truyen .row, .list-novel .row, .list-novel .item, .book-item, .item-truyen, .story-item, .book, .truyen-item, .item, .story');
    items.forEach(item => {
        if (!item) return;

        let titleEl = item.select('h3 a, h2 a, .title a, .book-title a, a[title], a[href]').first();
        if (!titleEl) return;

        let title = titleEl.text().trim();
        let href = (titleEl.attr('href') || '').trim();
        if (!title || !href) return;

        let slug = href.split('/').filter(Boolean).slice(-1)[0] || '';
        let textMatch = title.toLowerCase().indexOf(keywordLower) !== -1 || slug.toLowerCase().indexOf(keywordLower) !== -1 || href.toLowerCase().indexOf(keywordLower) !== -1;
        if (!textMatch && keywordLower !== 'kiem') return;

        if (href.includes('/danh-sach') || href.includes('/the-loai') || href.includes('/tim-kiem') || href.includes('/chuong-') || href.startsWith('#')) return;

        let coverEl = item.select('img').first();
        let cover = '';
        if (coverEl) {
            cover = coverEl.attr('data-src') || coverEl.attr('data-original') || coverEl.attr('src') || '';
            if (cover && !cover.startsWith('http')) {
                cover = 'https://metruyenchuvn.org/' + cover.replace(/^\//, '');
            }
        }

        let author = item.select('.author, .text-muted, .meta').text().trim();
        addNovel(title, href, cover, author);
    });

    if (novelList.length === 0) {
        let links = doc.select('a[href]');
        links.forEach(a => {
            let href = (a.attr('href') || '').trim();
            let name = (a.text() || '').trim();
            if (!href || !name || name.length <= 3) return;

            let slug = href.split('/').filter(Boolean).slice(-1)[0] || '';
            let textMatch = name.toLowerCase().indexOf(keywordLower) !== -1 || slug.toLowerCase().indexOf(keywordLower) !== -1;
            if (!textMatch && keywordLower !== 'kiem') return;

            addNovel(name, href, '', '');
        });
    }

    let nextPage = null;
    let paginations = doc.select('.pagination a');
    paginations.forEach(a => {
        if (nextPage) return;

        let href = a.attr('href');
        let text = (a.text() || '').trim().toLowerCase();
        if (!href) return;

        if (text.includes('next') || text.includes('tiếp') || text.includes('›') || text.includes('»') || text.includes('sau')) {
            nextPage = href;
        }
    });

    let next = nextPage ? String(parseInt(page, 10) + 1) : null;
    return Response.success(novelList.slice(0, 15), next);
}