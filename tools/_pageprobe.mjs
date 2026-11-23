/* 在 node 里跑 mp 的档案页，抓 refresh() 的真实报错 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);

const mem = new Map();
global.wx = {
  getStorageSync: (k) => (mem.has(k) ? mem.get(k) : ""),
  setStorageSync: (k, v) => mem.set(k, v),
  removeStorageSync: (k) => mem.delete(k),
  getSystemInfoSync: () => ({ windowWidth: 375, statusBarHeight: 20 }),
  getWindowInfo: () => ({ windowWidth: 375, statusBarHeight: 20, safeArea: { top: 20 } }),
  getMenuButtonBoundingClientRect: () => ({ top: 24, height: 32, bottom: 56 }),
  showToast: () => {},
  navigateTo: () => {},
  switchTab: () => {},
  cloud: null,
};
global.getApp = () => ({ globalData: { envId: "", wantNewPet: false } });
global.getCurrentPages = () => [];

const PT = require("../mp/utils/all.js");

const a = PT.STORE.addPet({ name: "虎妞", species: "dog", breed: "bichon", personality: "tsundere" });
const b = PT.STORE.addPet({ name: "喜宝", species: "dog", personality: "tsundere" });
PT.STORE.setActive(a.id);
PT.STORE.addRecord({ kind: "vaccine", name: "狂犬疫苗", date: "2026-03-01", place: "宠物医院" }, a.id);
PT.STORE.addRecord({ kind: "deworm", route: "out", drug: "福来恩", date: "2026-09-01" }, a.id);
PT.STORE.addStory(a.id, { date: "2026-05-01", title: "第一次回家", text: "在车里睡着了。" });
PT.STORE.addStory(b.id, { date: "2026-06-01", title: "喜宝的事", text: "只有喜宝有。" });
PT.STORE.setActive(a.id);

console.log("pets=" + PT.STORE.pets().length, "active=" + (PT.STORE.active() || {}).name);

const pageDir = resolve("mp/pages/history");
const code = readFileSync(resolve(pageDir, "history.js"), "utf8");

let page = null;
const localRequire = (spec) => require(resolve(pageDir, spec));
const fn = new Function("require", "Page", "Component", "wx", "getApp", "getCurrentPages", "console", code);
fn(localRequire, (o) => { page = o; }, () => {}, global.wx, global.getApp, global.getCurrentPages, console);

if (!page) { console.log("page 未注册"); process.exit(1); }

const ctx = Object.assign({}, page, {
  data: JSON.parse(JSON.stringify(page.data || {})),
  setData(d) { Object.assign(this.data, d); },
});

try {
  if (ctx.onLoad) ctx.onLoad({});
  ctx.refresh();
  console.log("hasPet=" + ctx.data.hasPet,
    "vaccines=" + (ctx.data.vaccines || []).length,
    "deworms=" + (ctx.data.deworms || []).length,
    "episodes=" + (ctx.data.episodes || []).length,
    "pets=" + (ctx.data.pets || []).length);
} catch (e) {
  console.log("ERR: " + e.message);
  console.log(e.stack.split("\n").slice(0, 5).join("\n"));
}
