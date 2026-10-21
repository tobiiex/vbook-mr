#!/usr/bin/env node
// Công cụ chạy thử script VBook ngoài VS Code, có nhận URL và số trang.
//
//   npm install cheerio              (chạy 1 lần trong thư mục plugin)
//   node vbook-run.js src/homecontent.js https://metruyenchuvn.org/danh-sach/truyen-hot 1
//   node vbook-run.js src/detail.js https://metruyenchuvn.org/chang-re-bac-si
//   node vbook-run.js src/toc.js https://metruyenchuvn.org/chang-re-bac-si
//   node vbook-run.js src/search.js "chang re" 1
//   node vbook-run.js src/genre.js            (không url -> danh sách thể loại)
//
// Tuỳ chọn: --limit=N (chỉ in N phần tử đầu, mặc định 3), --fixture=file.html (đọc HTML từ file thay vì tải web)

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
let cheerio;
try { cheerio = require("cheerio"); } catch (e) {
    console.error("Thiếu cheerio. Chạy:  npm install cheerio"); process.exit(1);
}

const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const opts = {};
process.argv.slice(2).filter(a => a.startsWith("--")).forEach(a => {
    const [k, v] = a.slice(2).split("="); opts[k] = v === undefined ? true : v;
});
const limit = parseInt(opts.limit || "3", 10);
const scriptPath = args[0];
if (!scriptPath) { console.error("Cách dùng: node vbook-run.js <file.js> [input] [page]"); process.exit(1); }
const input = args[1];
const page = args[2];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ---- Mô phỏng Jsoup (Elements/Element) bằng cheerio ----
function norm(s) { return (s || "").replace(/\s+/g, " ").trim(); }
function fixSel(sel) { return sel.replace(/:containsOwn\(/g, ":contains("); }

function wrap($, nodes) {
    const els = nodes.toArray ? nodes.toArray() : nodes;
    const o = {
        _els: els,
        get length() { return els.length; },
        size() { return els.length; },
        forEach(cb) { els.forEach((el, i) => cb(wrap($, [el]), i)); },
        first() { return els.length ? wrap($, [els[0]]) : null; },
        text() { return norm(els.map(e => $(e).text()).join(" ")); },
        attr(n) { for (const e of els) { const v = $(e).attr(n); if (v !== undefined) return v; } return ""; },
        html() { return els.map(e => $(e).html() || "").join("\n"); },
        select(sel) {
            const out = [];
            els.forEach(e => { $(e).find(fixSel(sel)).each((i, x) => { if (!out.includes(x)) out.push(x); }); });
            return wrap($, out);
        },
        remove() { els.forEach(e => $(e).remove()); return o; },
        parent() { const p = els.length ? $(els[0]).parent()[0] : null; return p && p.type === "tag" ? wrap($, [p]) : null; },
        nextElementSibling() { const n = els.length ? $(els[0]).next()[0] : null; return n ? wrap($, [n]) : null; },
        previousElementSibling() { const n = els.length ? $(els[0]).prev()[0] : null; return n ? wrap($, [n]) : null; },
        tagName() { return els.length ? (els[0].name || "") : ""; },
    };
    return o;
}
function makeDoc(html) {
    const $ = cheerio.load(html);
    const doc = wrap($, [$.root()[0]]);
    doc.select = function (sel) { return wrap($, $(fixSel(sel)).toArray()); };
    return doc;
}

// ---- fetch đồng bộ (VBook là đồng bộ) ----
function syncGet(url) {
    if (opts.fixture) return { ok: true, status: 200, body: fs.readFileSync(opts.fixture, "utf-8") };
    const code = `fetch(process.argv[1],{headers:{"User-Agent":${JSON.stringify(UA)}},redirect:"follow"})
      .then(async r=>{process.stdout.write(JSON.stringify({ok:r.ok,status:r.status,body:await r.text()}))})
      .catch(e=>{process.stdout.write(JSON.stringify({ok:false,status:0,error:String(e)+(e.cause?" / "+e.cause:"")}))})`;
    const r = spawnSync(process.execPath, ["-e", code, url], { encoding: "utf-8", maxBuffer: 1 << 28 });
    try { return JSON.parse(r.stdout); } catch (e) { return { ok: false, status: 0, error: r.stderr }; }
}
function fetchMock(url /*, options */) {
    console.error("[fetch] " + url);
    const r = syncGet(url);
    if (r.error) console.error("[fetch lỗi] " + r.error);
    else console.error("[fetch] HTTP " + r.status + " (" + (r.body || "").length + " ký tự)");
    return { ok: r.ok, status: r.status, text: () => r.body, html: () => makeDoc(r.body || "") };
}

const Response = {
    success: (data, next) => ({ status: "success", next: next === undefined ? null : next, data }),
    error: (message) => ({ status: "error", message }),
};

const code = fs.readFileSync(scriptPath, "utf-8");
const fn = new Function("fetch", "Response", "load", "console", code + "\nreturn execute;");
const execute = fn(fetchMock, Response, () => {}, console);

let result;
const isSearch = /search\.js$/.test(scriptPath);
if (isSearch) result = execute(input, page || "1");
else result = execute(input, page);

const out = JSON.parse(JSON.stringify(result));
if (Array.isArray(out.data) && out.data.length > limit) {
    out.data_total = out.data.length;
    out.data = out.data.slice(0, limit);
}
console.log(JSON.stringify(out, null, 2));
