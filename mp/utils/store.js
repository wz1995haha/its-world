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
    setting: setting, setSetting: setSetting,
    load: load, save: save, get: get,
    pets: pets, active: active, setActive: setActive, addPet: addPet, updatePet: updatePet,
    removePet: removePet, petById: petById, setPet: setPet,
    day: day, ensureDay: ensureDay,
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
