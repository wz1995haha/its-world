/* store.js — 数据层：多只宠物、状态、持久化、日记生成、示例数据 */
(function () {
  'use strict';
  var PT = require('./pt-core.js');
  var KEY = 'pawseye.diary.v1';

  var state = null;

  function defaultState() {
    return { v: 2, createdAt: new Date().toISOString(), activeId: null, pets: [], days: {}, settings: {} };
  }

  function uid() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* v1（单只宠物、days 是平铺的）→ v2（pets[] + days[petId]） */
  function migrate(s) {
    if (s && s.v === 2 && Array.isArray(s.pets)) {
      if (!s.days) s.days = {};
      if (!s.settings) s.settings = {};
      if (!s.activeId && s.pets[0]) s.activeId = s.pets[0].id;
      return s;
    }
    var out = defaultState();
    if (!s || typeof s !== 'object') return out;
    out.createdAt = s.createdAt || out.createdAt;
    out.settings = s.settings || {};
    if (s.pet) {
      var id = uid();
      var pet = {};
      Object.keys(s.pet).forEach(function (k) { pet[k] = s.pet[k]; });
      pet.id = id;
      if (pet.bio == null) pet.bio = '';
      out.pets = [pet];
      out.activeId = id;
      out.days[id] = s.days || {};
    }
    return out;
  }

  function load() {
    try {
      var raw = PT.STORAGE.getItem(KEY);
      if (raw) state = migrate(JSON.parse(raw));
    } catch (e) { /* 忽略损坏数据 */ }
    if (!state) state = defaultState();
    return state;
  }

  function save() {
    try { PT.STORAGE.setItem(KEY, JSON.stringify(state)); } catch (e) {
      console.warn('保存失败（可能是本地存储已满）', e);
    }
  }

  function setting(k, def) {
    var st = get();
    if (!st.settings) st.settings = {};
    return st.settings[k] === undefined ? def : st.settings[k];
  }

  function setSetting(k, v) {
    var st = get();
    if (!st.settings) st.settings = {};
    st.settings[k] = v;
    save();
  }

  function get() {
    if (!state) load();
    if (PT.setExtraBreeds) PT.setExtraBreeds(state.customBreeds || []);
    return state;
  }

  /* ---------------- 宠物 ---------------- */

  function pets() { return get().pets || []; }

  function petById(id) {
    return pets().filter(function (p) { return p.id === id; })[0] || null;
  }

  function active() {
    var s = get();
    return petById(s.activeId) || pets()[0] || null;
  }

  function activeId() {
    var p = active();
    return p ? p.id : null;
  }

  function setActive(id) {
    if (!petById(id)) return;
    get().activeId = id;
    save();
  }

  function addPet(pet) {
    var s = get();
    var p = { bio: '' };
    Object.keys(pet || {}).forEach(function (k) { if (k !== 'id') p[k] = pet[k]; });
    p.id = uid();
    p.createdAt = p.createdAt || new Date().toISOString();
    s.pets.push(p);
    if (!s.days[p.id]) s.days[p.id] = {};
    s.activeId = p.id;
    save();
    return p;
  }

  function updatePet(id, patch) {
    var p = petById(id);
    if (!p) return null;
    Object.keys(patch || {}).forEach(function (k) { if (k !== 'id') p[k] = patch[k]; });
    save();
    return p;
  }

  function removePet(id) {
    var s = get();
    if (s.pets.length <= 1) return false;
    s.pets = s.pets.filter(function (p) { return p.id !== id; });
    delete s.days[id];
    if (s.activeId === id) s.activeId = s.pets[0].id;
    save();
    return true;
  }

  function setPet(pet) {
    var a = active();
    if (a) return updatePet(a.id, pet);
    return addPet(pet);
  }

  /* ---------------- 重要节点（档案用） ---------------- */

  function milestones(petId) {
    var p = petById(petId || activeId());
    if (!p) return [];
    if (!p.milestones) p.milestones = [];
    return p.milestones.slice().sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
  }

  function addMilestone(date, label, icon) {
    var p = active();
    if (!p) return null;
    if (!p.milestones) p.milestones = [];
    var m = { id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: date, label: String(label || '').slice(0, 14), icon: icon || '⭐️' };
    p.milestones.push(m);
    save();
    return m;
  }

  function removeMilestone(id) {
    var p = active();
    if (!p || !p.milestones) return false;
    var n = p.milestones.length;
    p.milestones = p.milestones.filter(function (m) { return m.id !== id; });
    if (p.milestones.length === n) return false;
    save();
    return true;
  }

  /* ---------------- 自己加的品种 ---------------- */

  function customBreeds(species) {
    var list = (get().customBreeds || []).slice();
    if (!species) return list;
    var sp = species === 'dog' ? 'dog' : 'cat';
    return list.filter(function (b) { return b.species === sp; });
  }

  function addBreed(patch) {
    var p = patch || {};
    var sp = p.species === 'dog' ? 'dog' : 'cat';
    var label = String(p.label || '').trim().slice(0, 8);
    if (!label) return null;
    var s = get();
    if (!s.customBreeds) s.customBreeds = [];
    if (s.customBreeds.some(function (x) { return x.species === sp && x.label === label; })) return null;
    var b = {
      id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      species: sp,
      label: label,
      fur: p.fur || '#E9D2B0',
      furD: p.furD || '#B2936A',
      eye: p.eye || '',
      pattern: p.pattern || '',
      ears: sp === 'dog' ? (p.ears || 'flop') : ''
    };
    s.customBreeds.push(b);
    save();
    syncExtras();
    return b;
  }

  function removeBreed(id) {
    var s = get();
    if (!s.customBreeds) return false;
    var n = s.customBreeds.length;
    s.customBreeds = s.customBreeds.filter(function (b) { return b.id !== id; });
    if (s.customBreeds.length === n) return false;
    save();
    syncExtras();
    return true;
  }

  function syncExtras() {
    if (PT.setExtraBreeds) PT.setExtraBreeds(get().customBreeds || []);
  }

  /* ---------------- 档案里的自定义字段（芯片号、血型…） ---------------- */

  function fields(petId) {
    var p = petById(petId || activeId());
    return p && p.fields ? p.fields.slice() : [];
  }

  function addField(petId, label, value) {
    var p = petById(petId || activeId());
    if (!p) return null;
    if (!p.fields) p.fields = [];
    var f = {
      id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: String(label || '').trim().slice(0, 12),
      value: String(value == null ? '' : value).trim().slice(0, 60)
    };
    if (!f.label) return null;
    p.fields.push(f);
    save();
    return f;
  }

  function updateField(petId, id, patch) {
    var p = petById(petId || activeId());
    if (!p || !p.fields) return null;
    var f = p.fields.filter(function (x) { return x.id === id; })[0];
    if (!f) return null;
    if (patch.label != null) f.label = String(patch.label).trim().slice(0, 12);
    if (patch.value != null) f.value = String(patch.value).trim().slice(0, 60);
    save();
    return f;
  }

  function removeField(petId, id) {
    var p = petById(petId || activeId());
    if (!p || !p.fields) return false;
    var n = p.fields.length;
    p.fields = p.fields.filter(function (x) { return x.id !== id; });
    if (p.fields.length === n) return false;
    save();
    return true;
  }

  /* ---------------- 每天 ---------------- */

  function bucket(petId) {
    var s = get();
    if (!s.days) s.days = {};
    if (!s.days[petId]) s.days[petId] = {};
    return s.days[petId];
  }

  function day(key, petId) {
    var s = get();
    var b = s.days[petId || activeId()];
    return (b && b[key]) || null;
  }

  /* 整本日记（云端推送用） */
  function daysOf(petId) {
    var s = get();
    return s.days[petId || activeId()] || {};
  }

  /* 云端下来的单条记录 upsert */
  function importRecord(petId, rec) {
    if (!rec || !rec.id) return null;
    var list = recBucket(petId);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === rec.id) {
        if ((rec.updatedAt || 0) <= (list[i].updatedAt || 0)) return list[i];
        Object.keys(rec).forEach(function (k) { list[i][k] = rec[k]; });
        save();
        return list[i];
      }
    }
    var copy = {};
    Object.keys(rec).forEach(function (k) { copy[k] = rec[k]; });
    list.push(copy);
    save();
    return copy;
  }

  function ensureDay(key, petId) {
    var b = bucket(petId || activeId());
    if (!b[key]) b[key] = { date: key, events: [], note: '', diary: null };
    var d = b[key];
    if (!d.events) d.events = [];
    if (d.note == null) d.note = '';
    return d;
  }

  function addEvent(key, type, opts) {
    opts = opts || {};
    var d = ensureDay(key);
    var t = PT.TYPE[type];
    var custom = !t ? customType(type) : null;
    if (!t && !custom) return null;
    var ev = { id: uid(), type: type, at: Date.now() };
    if (t && t.num) ev.num = opts.num != null ? opts.num : t.num.def;
    if (t && t.opt) ev.opt = opts.opt || t.opt[0];
    if (custom) ev.label = custom.label;
    d.events.push(ev);
    if (d.diary) d.diary.stale = true;
    save();
    return ev;
  }

  /* ---------------- 自定义事件类型 ---------------- */

  function customTypes() {
    return get().customTypes || [];
  }

  function customType(id) {
    var list = customTypes();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function addCustomType(label, icon) {
    label = String(label || '').trim().slice(0, 8);
    if (!label) return null;
    var s = get();
    if (!s.customTypes) s.customTypes = [];
    var dup = s.customTypes.filter(function (t) { return t.label === label; })[0];
    if (dup) return dup;
    var t = { id: 'x' + uid(), label: label, icon: String(icon || '⭐️') };
    s.customTypes.push(t);
    save();
    return t;
  }

  function removeCustomType(id) {
    var s = get();
    if (!s.customTypes) return;
    s.customTypes = s.customTypes.filter(function (t) { return t.id !== id; });
    save();
  }

  function updateEvent(key, id, patch) {
    var d = day(key);
    if (!d) return;
    var ev = d.events.filter(function (e) { return e.id === id; })[0];
    if (!ev) return;
    Object.keys(patch).forEach(function (k) { ev[k] = patch[k]; });
    if (d.diary) d.diary.stale = true;
    save();
  }

  function removeEvent(key, id) {
    var d = day(key);
    if (!d) return;
    d.events = d.events.filter(function (e) { return e.id !== id; });
    if (d.diary) d.diary.stale = true;
    save();
  }

  /* 把一整天（云上下来的）整段写回本地，用于多设备同步 */
  /* ---------------- 它的空间：成长记录（文字 + 照片 + 视频） ---------------- */

function storyBucket(petId) {
  var s = get();
  if (!s.stories) s.stories = {};
  var pid = petId || activeId();
  if (!s.stories[pid]) s.stories[pid] = [];
  return s.stories[pid];
}

function stories(petId) {
  return storyBucket(petId).slice().sort(function (a, b) {
    if (a.date === b.date) return (b.createdAt || '') < (a.createdAt || '') ? -1 : 1;
    return a.date < b.date ? 1 : -1;
  });
}

function storyById(id, petId) {
  var hit = null;
  storyBucket(petId).forEach(function (x) { if (x.id === id) hit = x; });
  return hit;
}

function addStory(petId, story) {
  var pid = petId || activeId();
  var list = storyBucket(pid);
  var now = new Date().toISOString();
  var item = {
    id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: story.date || todayKey(),
    tag: story.tag || '日常',
    title: String(story.title || '').slice(0, 24),
    text: String(story.text || '').slice(0, 1200),
    files: (story.files || []).slice(),
    createdAt: now,
    updatedAt: now
  };
  list.push(item);
  save();
  return item;
}

function updateStory(petId, id, patch) {
  var item = storyById(id, petId);
  if (!item) return null;
  Object.keys(patch || {}).forEach(function (k) { if (k !== 'id') item[k] = patch[k]; });
  item.updatedAt = new Date().toISOString();
  save();
  return item;
}

function removeStory(petId, id) {
  var list = storyBucket(petId);
  for (var i = list.length - 1; i >= 0; i--) if (list[i].id === id) list.splice(i, 1);
  save();
}

function importStory(petId, item) {
  if (!item || !item.id) return;
  var list = storyBucket(petId);
  var hit = null;
  list.forEach(function (x) { if (x.id === item.id) hit = x; });
  if (!hit) { list.push(item); save(); return; }
  if ((item.updatedAt || '') >= (hit.updatedAt || '')) {
    Object.keys(item).forEach(function (k) { hit[k] = item[k]; });
    save();
  }
}

function storyYearCount(petId) {
  var n = {};
  stories(petId).forEach(function (x) {
    var y = String(x.date || '').slice(0, 4);
    if (!y) return;
    n[y] = (n[y] || 0) + 1;
  });
  return n;
}

function fileCount(storyList) {
  var n = 0;
  (storyList || []).forEach(function (x) { n += (x.files || []).length; });
  return n;
}

function importDay(petId, key, box) {
    if (!petId || !key || !box) return null;
    var b = bucket(petId);
    var d = box;
    d.date = key;
    if (!d.events) d.events = [];
    if (d.note == null) d.note = '';
    b[key] = d;
    save();
    return d;
  }

  function setNote(key, note) {
    var d = ensureDay(key);
    d.note = note || '';
    if (d.diary) d.diary.stale = true;
    save();
  }

  function addMedia(key, meta) {
    var d = ensureDay(key);
    d.media = d.media || [];
    d.media.push(meta);
    save();
    return d.media;
  }

  function removeMedia(key, id) {
    var d = day(key);
    if (!d || !d.media) return;
    d.media = d.media.filter(function (m) { return m.id !== id; });
    save();
  }

  function mediaOf(key) {
    var d = day(key);
    return (d && d.media) || [];
  }

  function historyHashes(petId, limit) {
    var s = get();
    var b = s.days[petId || activeId()] || {};
    var out = [];
    var keys = Object.keys(b).sort().reverse();
    for (var i = 0; i < keys.length && out.length < (limit || 160); i++) {
      var d = b[keys[i]];
      if (d.diary && d.diary.used) out = out.concat(d.diary.used);
    }
    return out.slice(0, limit || 160);
  }

  /* ---------------- 健康档案（记录 / 到期 / 花费） ---------------- */

  function recBucket(petId) {
    var s = get();
    if (!s.records) s.records = {};
    var id = petId || activeId();
    if (!s.records[id]) s.records[id] = [];
    return s.records[id];
  }

  /* 按日期倒序；同一天按创建时间倒序 */
  function records(petId) {
    return recBucket(petId).slice().sort(function (a, b) {
      if (a.date === b.date) return (b.createdAt || 0) - (a.createdAt || 0);
      return a.date < b.date ? 1 : -1;
    });
  }

  function recById(id, petId) {
    var list = recBucket(petId);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* 记一次就自动算下次；rec.next 手动传了就以手动为准 */
  function nextOf(rec, pet) {
    if (!rec) return '';
    if (rec.next) return rec.next;
    var months = PT.cycleOf(pet && pet.species, rec);
    if (!months) return '';
    return PT.addMonths(rec.date, months);
  }

  function addRecord(rec, petId) {
    var pet = petById(petId || activeId());
    var list = recBucket(petId);
    var r = {};
    Object.keys(rec || {}).forEach(function (k) { r[k] = rec[k]; });
    r.id = r.id || ('r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
    r.date = r.date || PT.todayKey();
    r.createdAt = Date.now();
    if (!r.next && !r.noCycle) r.next = nextOf(r, pet);
    list.push(r);
    save();
    return r;
  }

  function updateRecord(id, patch, petId) {
    var list = recBucket(petId);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        Object.keys(patch || {}).forEach(function (k) { list[i][k] = patch[k]; });
        list[i].editedAt = Date.now();
        save();
        return list[i];
      }
    }
    return null;
  }

  function removeRecord(id, petId) {
    var s = get();
    var pid = petId || activeId();
    var list = recBucket(pid);
    var before = list.length;
    s.records[pid] = list.filter(function (x) { return x.id !== id; });
    save();
    return s.records[pid].length !== before;
  }

  /* 「该做什么」：按 疫苗名 / 体内外 / 体检 分组，每组取最近一次 */
  var TRACKABLE = { vaccine: 1, deworm: 1, exam: 1, bath: 1, groom: 1 };

  function trackKey(rec) {
    if (rec.kind === 'vaccine') return 'vaccine:' + (rec.name || '疫苗');
    if (rec.kind === 'deworm') return 'deworm:' + (rec.route || '体内');
    if (rec.kind === 'exam') return 'exam';
    if (rec.kind === 'bath') return 'bath';
    if (rec.kind === 'groom') return 'groom';
    return '';
  }

  function dueList(petId) {
    var pet = petById(petId || activeId());
    var list = records(petId);
    var latest = {};
    list.forEach(function (r) {
      if (!TRACKABLE[r.kind]) return;
      var k = trackKey(r);
      if (!k) return;
      if (!latest[k] || latest[k].date < r.date) latest[k] = r;
    });

    var out = [];
    Object.keys(latest).forEach(function (k) {
      var r = latest[k];
      var next = r.next || nextOf(r, pet);
      if (!next) return;
      var days = PT.daysUntil(next);
      out.push({
        key: k,
        kind: r.kind,
        name: PT.recTitle(r),
        icon: PT.recIcon(r),
        last: r.date,
        next: next,
        days: days,
        status: PT.dueStatus(days),
        months: PT.cycleOf(pet && pet.species, r),
        recId: r.id
      });
    });

    out.sort(function (a, b) { return a.days - b.days; });
    return out;
  }

  function costSum(petId, fromKey) {
    return records(petId).reduce(function (sum, r) {
      if (fromKey && r.date < fromKey) return sum;
      var c = Number(r.cost || 0);
      return sum + (isFinite(c) ? c : 0);
    }, 0);
  }

  function reminders(petId) {
    var s = get();
    if (!s.reminders) s.reminders = {};
    var id = petId || activeId();
    return (s.reminders[id] || []).slice();
  }

  function toggleReminder(key, petId) {
    var s = get();
    if (!s.reminders) s.reminders = {};
    var id = petId || activeId();
    var list = s.reminders[id] || [];
    var i = list.indexOf(key);
    if (i >= 0) list.splice(i, 1); else list.push(key);
    s.reminders[id] = list;
    save();
    return i < 0;
  }

  /* 生病事件：同一种病的看诊/用药串成一段 */
  function episodes(petId) {
    var list = records(petId).filter(function (r) { return r.kind === 'visit' || r.kind === 'med'; });
    var map = {};
    list.forEach(function (r) {
      var name = r.illness || r.diagnosis || '看诊';
      if (!map[name]) map[name] = { name: name, items: [], cost: 0, open: false, start: r.date, end: r.date };
      var e = map[name];
      e.items.push(r);
      e.cost += Number(r.cost || 0) || 0;
      if (r.date < e.start) e.start = r.date;
      if (r.date > e.end) e.end = r.date;
      if (!r.closed) e.open = true;
      e.count = e.items.length;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.end < b.end ? 1 : -1; });
  }

  /* 这次病好了：把同名的那几条 visit/med 标成 closed */
  function closeEpisode(petId, name) {
    var n = 0;
    records(petId).forEach(function (r) {
      if ((r.kind === 'visit' || r.kind === 'med') && (r.illness === name || r.diagnosis === name)) {
        r.closed = true;
        r.updatedAt = new Date().toISOString();
        n++;
      }
    });
    if (n) save();
    return n;
  }

  function reopenEpisode(petId, name) {
    var n = 0;
    records(petId).forEach(function (r) {
      if ((r.kind === 'visit' || r.kind === 'med') && (r.illness === name || r.diagnosis === name)) {
        r.closed = false;
        r.updatedAt = new Date().toISOString();
        n++;
      }
    });
    if (n) save();
    return n;
  }

  function generateFor(petId, key, reroll) {
    var pet = petById(petId);
    if (!pet) return null;
    var d = ensureDay(key, petId);
    var diary = PT.WRITER.generate({
      pet: pet,
      date: key,
      events: d.events,
      note: d.note,
      media: d.media || [],
      reroll: reroll || 0,
      history: historyHashes(petId, 160)
    });
    diary.createdAt = new Date().toISOString();
    diary.stale = false;
    d.diary = diary;
    save();
    return diary;
  }

  function generate(key, reroll) {
    return generateFor(activeId(), key, reroll);
  }

  function clearDiary(key) {
    var d = day(key);
    if (!d) return;
    d.diary = null;
    save();
  }

  function allDays(petId) {
    var s = get();
    var b = s.days[petId || activeId()] || {};
    var out = [];
    Object.keys(b).forEach(function (k) {
      var d = b[k];
      if ((d.events && d.events.length) || d.diary) out.push(d);
    });
    return out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  function stats(petId) {
    var s = get();
    var id = petId || activeId();
    var days = allDays(id);
    var withDiary = days.filter(function (d) { return d.diary; });
    var pet = petById(id) || {};
    var start = pet.homeDate || pet.birthday || (s.createdAt || '').slice(0, 10);
    var together = start ? PT.daysBetween(start, PT.todayKey()) + 1 : 0;
    var first = days.length ? days[days.length - 1].date : null;
    return {
      together: Math.max(1, together),
      recordedDays: days.filter(function (d) { return d.events && d.events.length; }).length,
      diaryCount: withDiary.length,
      firstDate: first,
      lastDate: days.length ? days[0].date : null
    };
  }

  function weights(petId) {
    var out = [];
    allDays(petId).slice().reverse().forEach(function (d) {
      (d.events || []).forEach(function (e) {
        if (e.type === 'weight' && e.num != null) out.push({ date: d.date, kg: Number(e.num) });
      });
    });
    return out;
  }

  function exportJSON() { return JSON.stringify(get(), null, 2); }

  function importJSON(text) {
    var s = migrate(JSON.parse(text));
    /* 备份里没有图片视频的字节，别把空壳位置带进来 */
    Object.keys(s.days).forEach(function (pid) {
      Object.keys(s.days[pid] || {}).forEach(function (k) {
        if (s.days[pid][k]) delete s.days[pid][k].media;
      });
    });
    state = s;
    save();
    return true;
  }

  function reset() {
    state = defaultState();
    save();
  }

  /* ---------------- 示例数据 ---------------- */

  function agoKey(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return PT.keyOf(d);
  }

  function seedDemo() {
    state = defaultState();
    var todayKey = agoKey(0);

    var mao = addPet({
      name: '麻薯',
      species: 'cat',
      breed: '中华田园猫',
      breedId: 'orange',
      personality: 'tsundere',
      bio: '三岁半的橘猫。怕生，只认纸箱和你刚坐热的那把椅子。',
      birthday: agoKey(1280),
      homeDate: agoKey(560)
    });
    var gao = addPet({
      name: '年糕',
      species: 'dog',
      breed: '柴犬',
      breedId: 'shiba',
      personality: 'clingy',
      bio: '两岁的柴犬。谁开门都当是自己的朋友，包括快递员。',
      birthday: agoKey(730),
      homeDate: agoKey(210)
    });

    var maoScript = [
      { d: 1, ev: ['meal', 'poop', 'cuddle'] },
      { d: 2, ev: ['walk', 'play', 'meal'] },
      { d: 3, ev: ['vomit', 'vet', 'med'], note: '吐了两次，明天还是带去看看吧' },
      { d: 5, ev: ['bath', 'weight', 'meal'] },
      { d: 7, ev: ['walk', 'play', 'poop'] },
      { d: 9, ev: ['meal', 'water', 'sleep'] },
      { d: 12, ev: ['naughty', 'meal', 'cuddle'], note: '今天把我杯子推下去了，还看着我' },
      { d: 0, ev: ['meal', 'walk'] }
    ];
    var gaoScript = [
      { d: 1, ev: ['walk', 'poop', 'play'], note: '在小区门口坐着不肯走' },
      { d: 4, ev: ['vaccine', 'weight', 'meal'] },
      { d: 6, ev: ['bath', 'walk'] },
      { d: 10, ev: ['vet', 'med'], note: '打针，全程没叫，回来蔫了一下午' },
      { d: 0, ev: ['walk', 'cuddle'] }
    ];
    var defaults = { meal: 45, walk: 30, weight: 4.3, water: 120 };
    var gaoDefaults = { meal: 110, walk: 40, weight: 9.6, water: 300 };

    function fill(pet, script, defs) {
      script.forEach(function (row) {
        var key = agoKey(row.d);
        var d = ensureDay(key, pet.id);
        row.ev.forEach(function (type) {
          var t = PT.TYPE[type];
          if (!t) return;
          var ev = { id: uid(), type: type, at: Date.now() };
          if (t.num) ev.num = defs[type] != null ? defs[type] : t.num.def;
          if (t.opt) ev.opt = t.opt[0];
          d.events.push(ev);
        });
        if (row.note) d.note = row.note;
      });
      // 按日期顺序生成，模拟真实书写轨迹；今天留白，等你自己点「让它写今天的日记」
      Object.keys(state.days[pet.id]).sort().forEach(function (k) {
        var d = state.days[pet.id][k];
        if (d.events.length && k !== todayKey) generateFor(pet.id, k, 0);
      });
    }

    fill(mao, maoScript, defaults);
    fill(gao, gaoScript, gaoDefaults);

    /* 一条自定义事件：主人自己加的「剪指甲」 */
    var ct = addCustomType('剪指甲', '✂️');
    if (ct) {
      var ck = agoKey(7);
      var cd = ensureDay(ck, mao.id);
      cd.events.push({ id: uid(), type: ct.id, label: ct.label, at: Date.now() });
      generateFor(mao.id, ck, 0);
    }

    state.activeId = mao.id;
    /* 档案里手记的两个重要节点：绝育手术、一次疫苗 */
    mao.milestones = [
      { id: 'm' + uid(), date: agoKey(300), label: '绝育手术', icon: '🏥' },
      { id: 'm' + uid(), date: agoKey(150), label: '搬家到新家', icon: '🏠' }
    ];
    var vk = agoKey(48);
    var vd = ensureDay(vk, mao.id);
    vd.events.push({ id: uid(), type: 'vaccine', at: Date.now() });
    generateFor(mao.id, vk, 0);
    save();
    save();
  }

  PT.STORE = {
    customBreeds: customBreeds, addBreed: addBreed, removeBreed: removeBreed,
    setting: setting, setSetting: setSetting,
    load: load, save: save, get: get,
    pets: pets, active: active, setActive: setActive, addPet: addPet, updatePet: updatePet,
    removePet: removePet, petById: petById, setPet: setPet,
    day: day, ensureDay: ensureDay, importDay: importDay,
    daysOf: daysOf, importRecord: importRecord,
    records: records, recById: recById, addRecord: addRecord, updateRecord: updateRecord, removeRecord: removeRecord,
    dueList: dueList, costSum: costSum, reminders: reminders, toggleReminder: toggleReminder, episodes: episodes,
    closeEpisode: closeEpisode,
  stories: stories,
  storyById: storyById,
  addStory: addStory,
  updateStory: updateStory,
  removeStory: removeStory,
  importStory: importStory,
  storyYearCount: storyYearCount,
    reopenEpisode: reopenEpisode,
    addEvent: addEvent, updateEvent: updateEvent, removeEvent: removeEvent, setNote: setNote,
    customTypes: customTypes, customType: customType, addCustomType: addCustomType, removeCustomType: removeCustomType,
    milestones: milestones, addMilestone: addMilestone, removeMilestone: removeMilestone,
    fields: fields, addField: addField, updateField: updateField, removeField: removeField,
    addMedia: addMedia, removeMedia: removeMedia, mediaOf: mediaOf,
    generate: generate, generateFor: generateFor, clearDiary: clearDiary, historyHashes: historyHashes,
    allDays: allDays, stats: stats, weights: weights,
    exportJSON: exportJSON, importJSON: importJSON, reset: reset, seedDemo: seedDemo,
    uid: uid, KEY: KEY
  };
})();

module.exports = require('./pt-core.js');
