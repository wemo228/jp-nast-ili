'use strict';
/* Япония · PWA. Vanilla JS, no build. Data: data.enc (AES-GCM, PBKDF2). State: localStorage + IndexedDB. */

// ---------- utils ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clone = o => JSON.parse(JSON.stringify(o));
const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const fJPY = n => '¥' + nf.format(Math.round(n || 0));
const fKZT = n => nf.format(Math.round(n || 0)) + ' ₸';
const fRate = n => (Math.round(n * 1000) / 1000).toString().replace('.', ',');
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const RU_DOW = { 'пн': 'mon', 'вт': 'tue', 'ср': 'wed', 'чт': 'thu', 'пт': 'fri', 'сб': 'sat', 'вс': 'sun' };
const dObj = d => new Date(d + 'T12:00:00Z');
const fDay = d => { const x = dObj(d); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}, ${WD[x.getUTCDay()]}`; };
const fDayShort = d => { const x = dObj(d); return `${x.getUTCDate()}.${String(x.getUTCMonth() + 1).padStart(2, '0')}`; };
const SRC = { instagram: 'Instagram', reddit: 'Reddit', tiktok: 'TikTok', forum: 'Форум', youtube: 'YouTube', friend: 'Знакомые', me: 'Сам нашёл', booking: 'Бронь', site: 'Сайт' };

function jpNow() {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute, dow: p.weekday.toLowerCase().slice(0, 3) };
}
function dist(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fDist = m => m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} м` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} км`;
const walkMin = m => Math.max(1, Math.round(m * 1.3 / 75));
const fWalk = m => m > 4000 ? fDist(m) : `${fDist(m)} · ${walkMin(m)} мин пешком`;

let toastTimer;
function toast(msg, action) {
  const t = $('#toast');
  t.innerHTML = esc(msg) + (action ? ` <button data-act="${esc(action.act)}" data-id="${esc(action.id || '')}">${esc(action.label)}</button>` : '');
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), action ? 6000 : 2600);
}

const I = {
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
  loc: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/></svg>',
  route: '<svg viewBox="0 0 24 24"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
  nav: '<svg viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v13M7 8l5-5 5 5M5 13v8h14v-8"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  zoom: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8v6M8 11h6"/></svg>',
  pdf: '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>',
  img: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z"/></svg>',
};
const CAT_ICON = {
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 3.5-3 7h3v11"/>',
  shop: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  sight: '<path d="M3 6c5 1.2 13 1.2 18 0M5 10h14M7 7.5V21M17 7.5V21"/>',
  area: '<circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="2"/>',
  stay: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  transport: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 21l1.5-4M15 21l-1.5-4"/>',
  service: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  other: '<circle cx="12" cy="12" r="3"/>',
};
const safeUrl = u => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
const catIcon = id => `<svg viewBox="0 0 24 24">${CAT_ICON[id] || CAT_ICON.other}</svg>`;

// ---------- storage ----------
const DEF_STATE = { tab: 'today', map: null, cats: [], f: { must: false, open: false, hide: false, day: false }, q: '', sel: null, sheet: null, list: false, locate: false, day: null, phr: 'phrases', route: null, doc: null, big: null, pick: null };
const DEF_USER = { places: [], meta: {}, routes: [], expenses: [], exch: [], rate: { manual: null, api: null, apiAt: null, markup: null }, checks: {}, extraChecks: {}, budgets: {} };
function loadLS(k, d) {
  try { const v = localStorage.getItem(k); return v ? Object.assign(clone(d), JSON.parse(v)) : clone(d); } catch (e) { return clone(d); }
}
let S = loadLS('jp.state', DEF_STATE);
let U = loadLS('jp.user', DEF_USER);
S.f = Object.assign(clone(DEF_STATE.f), S.f || {});
U.rate = Object.assign(clone(DEF_USER.rate), U.rate || {});
function saveState() { try { localStorage.setItem('jp.state', JSON.stringify(S)); } catch (e) { } }
function saveUser() { try { localStorage.setItem('jp.user', JSON.stringify(U)); } catch (e) { toast('Не удалось сохранить: память переполнена'); } }
function saveAll() { saveState(); saveUser(); }

const idb = {
  _db: null,
  open() {
    return this._db || (this._db = new Promise((res, rej) => {
      const r = indexedDB.open('jp', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => { const st = db.transaction('kv', mode).objectStore('kv'); const q = fn(st); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  },
  get(k) { return this.tx('readonly', s => s.get(k)); },
  set(k, v) { return this.tx('readwrite', s => s.put(v, k)); },
  del(k) { return this.tx('readwrite', s => s.delete(k)); },
};

// ---------- crypto ----------
function b64d(s) { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
async function deriveRaw(pw, salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, 256));
}
async function decryptEnc(enc, raw) {
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(enc.iv) }, key, b64d(enc.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function fetchEnc() {
  const r = await fetch('data.enc?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// ---------- app data ----------
let T = null, DOCS = [], REV = null;
let ME = null; // {lat,lng,acc}
const catById = id => (T.categories.find(c => c.id === id) || { id: 'other', name: 'Другое', color: '#6B7280', subs: [] });
const meta = id => U.meta[id] || {};
function setMeta(id, patch) { U.meta[id] = Object.assign({}, U.meta[id], patch); for (const k of Object.keys(U.meta[id])) if (U.meta[id][k] === undefined || U.meta[id][k] === '' || U.meta[id][k] === false) delete U.meta[id][k]; saveUser(); }
function getPlaces() {
  const out = [];
  for (const p of T.places) { const m = U.meta[p.id]; if (m && m.hidden) continue; out.push(m && m.edit ? Object.assign({}, p, m.edit, { _base: true }) : Object.assign({}, p, { _base: true })); }
  for (const p of U.places) out.push(p);
  return out;
}
const placeById = id => getPlaces().find(p => p.id === id) || null;
const todayDate = () => jpNow().date;
const tripDays = () => T.days.map(d => d.date);
function curDay() {
  if (S.day && tripDays().includes(S.day)) return S.day;
  const t = todayDate(); return tripDays().includes(t) ? t : tripDays()[0];
}
function dayPlaceIds(d) { const day = T.days.find(x => x.date === d); return new Set((day ? day.items : []).map(i => i.place).filter(Boolean)); }
function stayFor(d) { return getPlaces().find(p => p.cat === 'stay' && p.nights && d >= p.nights[0] && d <= p.nights[1]) || null; }
function nearestCity(lat, lng) {
  let best = null, bd = Infinity;
  for (const c of T.cities) { const dd = dist({ lat, lng }, c); if (dd < bd) { bd = dd; best = c; } }
  return bd < 80000 ? best.id : '';
}
const cityName = id => (T.cities.find(c => c.id === id) || {}).name || '';

// hours
function parseHours(p) {
  if (p.hoursSpec) return p.hoursSpec;
  const t = (p.hours || '').toLowerCase();
  if (!t) return null;
  if (/круглосуточно|24\/7|24 ?ч/.test(t)) return { default: '00:00-24:00' };
  const m = t.match(/(\d{1,2})[:.](\d{2})\s*[-–—~до]+\s*(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const spec = { default: `${m[1].padStart(2, '0')}:${m[2]}-${m[3].padStart(2, '0')}:${m[4]}` };
  const cl = t.match(/(?:вых\S*|закрыт\S*|closed)\s*:?\s*([а-яa-z ,/и-]+)/);
  if (cl) {
    spec.closed = [];
    for (const [ru, en] of Object.entries(RU_DOW)) if (cl[1].includes(ru)) spec.closed.push(en);
    for (const en of DOW) if (cl[1].includes(en)) spec.closed.push(en);
  }
  return spec;
}
const toMin = x => { const [h, m] = x.split(':'); return +h * 60 + +m; };
const fMin = n => `${String(Math.floor((n % 1440) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
function openState(p) {
  const spec = parseHours(p); if (!spec) return null;
  const n = jpNow();
  if (spec.closed && spec.closed.includes(n.dow)) return { open: false, text: 'Сегодня выходной' };
  const r = spec[n.dow] || spec.default; if (!r) return null;
  const [a, b0] = r.split('-').map(toMin); let b = b0; if (b <= a) b += 1440;
  let cur = n.min; if (cur < a && b > 1440 && cur + 1440 < b) cur += 1440;
  if (cur >= a && cur < b) return b >= 1440 && a === 0 ? { open: true, text: 'Круглосуточно' } : { open: true, soon: b - cur <= 60, text: `Открыто до ${fMin(b)}` };
  return { open: false, text: cur < a ? `Откроется в ${fMin(a)}` : 'Закрыто' };
}

// google maps
const llOf = p => (p.approx && (p.ja || p.address)) ? (p.ja || p.address) : `${p.lat},${p.lng}`;
function gmapsPlaceUrl(p) {
  if (safeUrl(p.gmaps)) return safeUrl(p.gmaps);
  if (p.approx || (p.ja && p.cat !== 'area')) return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.ja || p.address || p.name);
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}
function gmapsDirUrl(dest, waypoints = [], mode = 'walking', origin = null) {
  let u = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(llOf(dest)) + '&travelmode=' + mode;
  if (origin) u += '&origin=' + encodeURIComponent(llOf(origin));
  if (waypoints.length) u += '&waypoints=' + encodeURIComponent(waypoints.map(llOf).join('|'));
  return u;
}
function parseGeo(text) {
  const s = (text || '').trim(); if (!s) return null;
  const dec = x => { try { return decodeURIComponent(x.replace(/\+/g, ' ')); } catch (e) { return x; } };
  const out = {}; let m;
  const set = (a, b) => { a = +a; b = +b; if (Math.abs(a) <= 90 && Math.abs(b) <= 180) { out.lat = +a.toFixed(6); out.lng = +b.toFixed(6); } };
  if ((m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/))) set(m[1], m[2]);
  else if ((m = s.match(/[?&](?:q|query|ll|destination|center|daddr)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i))) set(m[1], m[2]);
  else if ((m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/))) set(m[1], m[2]);
  else if ((m = s.match(/(-?\d{1,2}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})/))) set(m[1], m[2]);
  if ((m = s.match(/\/maps\/place\/([^/@?]+)/))) out.name = dec(m[1]);
  else if (out.lat == null && (m = s.match(/[?&](?:q|query)=([^&]+)/))) out.query = dec(m[1]);
  const url = s.match(/https?:\/\/[^\s]+/); if (url) out.url = url[0];
  if (out.url && /goo\.gl|maps\.app/.test(out.url) && out.lat == null) out.short = true;
  const first = s.split('\n').map(x => x.trim()).find(x => x && !/https?:\/\//.test(x));
  if (!out.name && first && !/^-?\d+\.\d+/.test(first) && first.length < 90) out.name = first;
  return out;
}

// ---------- boot / lock ----------
async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  let keyRec = null, bundle = null;
  try { keyRec = await idb.get('key'); bundle = await idb.get('bundle'); } catch (e) { }
  if (keyRec && bundle) { start(bundle); checkUpdate(false); }
  else showLock('');
}
function showLock(msg) {
  $('#app').hidden = true; $('#lock').hidden = false; $('#lock-msg').textContent = msg || '';
  setTimeout(() => $('#pw').focus(), 50);
}
$('#lock-form').addEventListener('submit', async e => {
  e.preventDefault();
  const pw = $('#pw').value.trim(); const btn = $('#lock-btn'), msg = $('#lock-msg');
  btn.disabled = true; msg.textContent = 'Проверяю…';
  try {
    const enc = await fetchEnc().catch(() => { throw new Error('net'); });
    const raw = await deriveRaw(pw, b64d(enc.salt), enc.iter);
    let data;
    try { data = await decryptEnc(enc, raw); } catch (err) { throw new Error('pw'); }
    const bundle = { rev: enc.rev, trip: data.trip, docs: data.docs };
    await idb.set('key', { raw, salt: enc.salt });
    await idb.set('bundle', bundle);
    $('#pw').value = ''; msg.textContent = '';
    start(bundle);
  } catch (err) {
    msg.textContent = err.message === 'pw' ? 'Неверный пароль' : err.message === 'net' ? 'Нет интернета — первый вход нужен онлайн' : 'Ошибка: ' + err.message;
  } finally { btn.disabled = false; }
});
async function checkUpdate(manual) {
  try {
    const vr = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
    if (vr.rev === REV) { if (manual) toast('Данные актуальны'); return; }
    const enc = await fetchEnc();
    if (enc.rev === REV) { if (manual) toast('Данные актуальны'); return; }
    const keyRec = await idb.get('key');
    if (!keyRec || keyRec.salt !== enc.salt) { showLock('Данные обновлены — введи пароль ещё раз'); return; }
    const data = await decryptEnc(enc, keyRec.raw);
    const bundle = { rev: enc.rev, trip: data.trip, docs: data.docs };
    await idb.set('bundle', bundle);
    applyBundle(bundle); renderAll(); toast('Данные обновлены');
  } catch (e) { if (manual) toast('Не получилось: нет связи или файл недоступен'); }
}
function applyBundle(b) { T = b.trip; DOCS = b.docs || []; REV = b.rev; }

let started = false;
function start(bundle) {
  applyBundle(bundle);
  $('#lock').hidden = true; $('#app').hidden = false;
  if (!started) {
    started = true;
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { renderTabContent(); if (S.tab === 'map') refreshMarkers(); } });
    setInterval(() => { if (document.visibilityState === 'visible' && S.tab === 'today') renderToday(); }, 60000);
  }
  renderAll();
  if (S.locate) startLocate(false);
  if (S.doc) openDoc(S.doc); else if (S.big) showBig(S.big);
}
function renderAll() {
  showTab(S.tab, true);
}

// ---------- tabs ----------
function showTab(tab, initial) {
  if (!initial && S.sheet && S.sheet.type !== 'place') S.sheet = null;
  S.tab = tab; saveState();
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.dataset.tab === tab));
  document.querySelectorAll('.tabbar button').forEach(b => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  renderTabContent();
  if (tab === 'map') {
    initMap();
    if (map) setTimeout(() => map.invalidateSize(), 30);
    if (S.sel && !S.sheet) S.sheet = { type: 'place', id: S.sel };
  } else if (S.sheet && S.sheet.type === 'place') S.sheet = null;
  renderSheet();
}
function renderTabContent() {
  if (!T) return;
  ({ today: renderToday, map: renderMapUI, docs: renderDocs, money: renderMoney, phrases: renderPhrases })[S.tab]();
}

// ---------- events ----------
const A = {}; // actions
function onClick(e) {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = A[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A' && !el.dataset.keep) e.preventDefault();
  fn(el, e);
}
let geoTimer;
function onInput(e) {
  const el = e.target;
  if (el.id === 'q') { S.q = el.value; saveState(); refreshMarkers(); const cb = $('[data-act=clearQ]'); if (cb) cb.hidden = !S.q; if (S.list) renderMapList(); return; }
  if (el.dataset.f && S.sheet && S.sheet.draft) {
    const d = S.sheet.draft; d[el.dataset.f] = el.value;
    if (el.dataset.f === 'geo') { d.lat = ''; d.lng = ''; d.resolvedName = ''; clearTimeout(geoTimer); geoTimer = setTimeout(() => tryResolveDraft(d), 700); }
    saveState(); if (el.dataset.f === 'geo') geoHint(); return;
  }
  if (el.dataset.note) { setMeta(el.dataset.note, { note: el.value }); return; }
  if (el.dataset.routeName) { const r = activeRoute(); if (r) { r.name = el.value; saveUser(); } return; }
}
function onChange(e) {
  const el = e.target;
  if (el.dataset.chg && A[el.dataset.chg]) A[el.dataset.chg](el, e);
}
A.tab = el => showTab(el.dataset.tab);

// ---------- sheet ----------
function openSheet(spec) { S.sheet = spec; saveState(); renderSheet(); }
function closeSheet() {
  const wasPlace = S.sheet && S.sheet.type === 'place';
  S.sheet = null; if (wasPlace) { S.sel = null; refreshMarkers(); }
  saveState(); renderSheet();
}
A.closeSheet = closeSheet;
function renderSheet() {
  const wrap = $('#sheet-wrap'), sh = $('#sheet');
  if (!S.sheet || !T) { wrap.hidden = true; sh.innerHTML = ''; updateRouteBar(); return; }
  const b = SHEETS[S.sheet.type];
  const out = b ? b(S.sheet) : null;
  if (!out) { S.sheet = null; saveState(); wrap.hidden = true; return; }
  wrap.hidden = false; wrap.classList.toggle('peek', !!out.peek);
  sh.innerHTML = `<div class="sheet-grip"></div><div class="sheet-head"><div class="grow">${out.head}</div><button class="close" data-act="closeSheet" aria-label="Закрыть">${I.x}</button></div><div class="sheet-body">${out.body}</div>`;
  if (S.sheet.type === 'form' || S.sheet.type === 'ev') geoHint();
  updateRouteBar();
}
const SHEETS = {};
function rerenderSheetKeepScroll() { const b = $('#sheet .sheet-body'); const st = b ? b.scrollTop : 0; renderSheet(); const nb = $('#sheet .sheet-body'); if (nb) nb.scrollTop = st; }

// ---------- overlay ----------
function closeOverlay() { const o = $('#overlay'); o.hidden = true; o.innerHTML = ''; S.doc = null; S.big = null; saveState(); if (curBlobUrl) { URL.revokeObjectURL(curBlobUrl); curBlobUrl = null; } }
A.closeOverlay = closeOverlay;
function showBig(spec) {
  S.big = spec; saveState();
  const o = $('#overlay'); o.hidden = false;
  o.innerHTML = `<div class="ov-head"><button class="close" data-act="closeOverlay" aria-label="Закрыть">${I.x}</button><h2>${esc(spec.title || '')}</h2></div>
  <div class="big"><div class="ja" lang="ja">${esc(spec.ja)}</div>${spec.sub ? `<div class="ja sub" lang="ja">${esc(spec.sub)}</div>` : ''}${spec.ru ? `<div class="ru">${esc(spec.ru)}</div>` : ''}</div>`;
}

// ============================================================
// MAP
// ============================================================
let map = null, mkLayer = null, routeLayer = null, meLayer = null, meMarker = null, meCircle = null, watchId = null, firstFix = false;
function initMap() {
  if (map) return;
  if (!window.L) { $('#map').innerHTML = '<div class="nomap">Карта не загрузилась — нужен интернет при первом открытии. Список мест работает: кнопка «Список» сверху.</div>'; return; }
  const v = S.map || (() => { const c = T.cities.find(x => x.id === 'osaka'); return { lat: c.lat, lng: c.lng, z: c.z }; })();
  map = L.map('map', { zoomControl: false, tapHold: true, attributionControl: true }).setView([v.lat, v.lng], v.z);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, crossOrigin: 'anonymous', attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  routeLayer = L.layerGroup().addTo(map); mkLayer = L.layerGroup().addTo(map); meLayer = L.layerGroup().addTo(map);
  map.on('moveend', () => { const c = map.getCenter(); S.map = { lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), z: map.getZoom() }; saveState(); });
  map.on('zoomend', refreshMarkers);
  map.on('contextmenu', e => { if (!S.pick) openForm({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6), geo: `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}` }); });
  map.on('click', () => { if (S.sheet && S.sheet.type === 'place') closeSheet(); });
  refreshMarkers(); drawRoute(); drawMe();
}
function filtered() {
  const q = S.q.trim().toLowerCase(); const d = curDay(); const dayIds = S.f.day ? dayPlaceIds(d) : null;
  return getPlaces().filter(p => {
    const m = meta(p.id);
    if (S.cats.length && !S.cats.includes(p.cat)) return false;
    if (S.f.hide && (m.status === 'been' || m.status === 'skip')) return false;
    if (S.f.must && !m.must) return false;
    if (S.f.open) { const o = openState(p); if (o && !o.open) return false; }
    if (dayIds && m.day !== d && !dayIds.has(p.id) && !(p.cat === 'stay' && stayFor(d) && stayFor(d).id === p.id)) return false;
    if (q) {
      const hay = [p.name, p.ja, p.notes, p.try, p.sub, p.address, m.note, p.source && p.source.text, catById(p.cat).name, cityName(p.city), (p.tags || []).join(' ')].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
function routeIndex() { const r = activeRoute(); const ix = {}; if (r) r.stops.forEach((s, i) => { ix[s.id] = i + 1; }); return ix; }
function markerHtml(p, sel, num) {
  const c = catById(p.cat), m = meta(p.id);
  const z = map ? map.getZoom() : 13;
  const label = sel || z >= 16 || (z >= 15 && (m.must || num)) ? `<div class="mk-label">${esc(p.name)}</div>` : '';
  return `<div class="mk-wrap"><div class="mk${sel ? ' sel' : ''}${m.status === 'been' || m.status === 'skip' ? ' done' : ''}" style="background:${c.color}">${catIcon(p.cat)}</div>${m.must ? '<div class="mk-star">★</div>' : ''}${num ? `<div class="mk-num">${num}</div>` : ''}${label}</div>`;
}
function refreshMarkers() {
  if (!map) return;
  mkLayer.clearLayers();
  const ix = routeIndex();
  for (const p of filtered()) {
    if (p.lat == null || p.lng == null) continue;
    const sel = S.sel === p.id, c = catById(p.cat);
    if (p.cat === 'area' && p.radius) L.circle([p.lat, p.lng], { radius: p.radius, color: c.color, weight: 1.5, opacity: .7, fillOpacity: .07, dashArray: '5 5', interactive: false }).addTo(mkLayer);
    const s = sel ? 38 : 30, tip = s / 2 + s / 2 * Math.SQRT2;
    const mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: markerHtml(p, sel, ix[p.id]), iconSize: [s, s], iconAnchor: [s / 2, tip] }), zIndexOffset: sel ? 1000 : (meta(p.id).must ? 200 : 0), keyboard: false });
    mk.on('click', ev => { L.DomEvent.stopPropagation(ev); selectPlace(p.id, false); });
    mk.addTo(mkLayer);
  }
}
function selectPlace(id, fly) {
  S.sel = id; S.pick = null; saveState();
  if (S.tab !== 'map') showTab('map');
  const p = placeById(id);
  if (map && p && fly) { map.setView([p.lat, p.lng], Math.max(map.getZoom(), 15), { animate: false }); map.panBy([0, Math.round(window.innerHeight * 0.2)], { animate: false }); }
  if (S.list) { S.list = false; renderMapUI(); }
  refreshMarkers();
  openSheet({ type: 'place', id });
}
A.place = el => selectPlace(el.dataset.id, true);

// location
function startLocate(center) {
  if (!navigator.geolocation) { toast('Геолокация недоступна'); return; }
  S.locate = true; saveState(); firstFix = !!center;
  if (watchId != null) { if (center && ME && map) map.setView([ME.lat, ME.lng], Math.max(map.getZoom(), 15)); return; }
  watchId = navigator.geolocation.watchPosition(pos => {
    ME = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, t: Date.now() };
    drawMe();
    if (firstFix && map) { firstFix = false; map.setView([ME.lat, ME.lng], Math.max(map.getZoom(), 15)); }
    checkNear();
    if (S.tab === 'map') { if (S.list) renderMapList(); updateRouteBar(); }
  }, err => { if (err.code === 1) { toast('Разреши геолокацию в настройках'); stopLocate(); } }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
  renderMapUI();
}
function stopLocate() { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; S.locate = false; saveState(); if (meLayer) meLayer.clearLayers(); meMarker = meCircle = null; renderMapUI(); }
function drawMe() {
  if (!map || !ME) return;
  if (!meMarker) {
    meCircle = L.circle([ME.lat, ME.lng], { radius: ME.acc, color: '#2F6FE4', weight: 1, fillOpacity: .1, interactive: false }).addTo(meLayer);
    meMarker = L.marker([ME.lat, ME.lng], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, zIndexOffset: 2000 }).addTo(meLayer);
  } else { meMarker.setLatLng([ME.lat, ME.lng]); meCircle.setLatLng([ME.lat, ME.lng]).setRadius(ME.acc); }
}
A.locate = () => {
  if (!S.locate) return startLocate(true);
  if (ME && map) {
    const c = map.getCenter();
    if (dist({ lat: c.lat, lng: c.lng }, ME) < 30) return stopLocate();
    map.setView([ME.lat, ME.lng], Math.max(map.getZoom(), 15));
  } else toast('Ищу тебя…');
};
const nearDone = new Set();
function checkNear() {
  const r = activeRoute(); if (!r || !ME) return;
  const next = r.stops.find(s => !s.done); if (!next || nearDone.has(next.id)) return;
  const p = placeById(next.id); if (!p) return;
  const d = dist(ME, p);
  if (d < (p.cat === 'area' ? (p.radius || 300) : 70)) { nearDone.add(next.id); toast(`Ты у точки «${p.name}»`, { act: 'stopDone', id: next.id, label: 'Отметить' }); }
}

// map ui
function renderMapUI() {
  const ui = $('#map-ui'); if (!ui || !T) return;
  if (S.pick) { ui.innerHTML = `<div class="pick"></div><div class="pick-bar"><b>Двигай карту — точка встанет в центр</b><div class="row"><button class="btn grow" data-act="pickCancel">Отмена</button><button class="btn primary grow" data-act="pickDone">Готово</button></div></div>`; return; }
  const r = activeRoute();
  const nAct = (S.cats.length ? 1 : 0) + Object.values(S.f).filter(Boolean).length;
  ui.innerHTML = `
  <div class="map-top">
    <div class="search">
      <label class="search-box">${I.search}<input id="q" type="search" placeholder="Поиск по местам и заметкам" value="${esc(S.q)}" enterkeyhint="search" autocomplete="off"><button data-act="clearQ" aria-label="Очистить" ${S.q ? '' : 'hidden'}>×</button></label>
      <button class="icon-btn" data-act="toggleList" aria-label="${S.list ? 'Карта' : 'Список'}">${S.list ? I.map : I.list}</button>
    </div>
    <div class="chips">${T.categories.map(c => `<button class="chip" data-act="cat" data-id="${c.id}" aria-pressed="${S.cats.includes(c.id)}"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</button>`).join('')}</div>
    <div class="chips">
      <button class="chip" data-act="flt" data-k="day" aria-pressed="${S.f.day}">На ${fDayShort(curDay())}</button>
      <button class="chip" data-act="flt" data-k="must" aria-pressed="${S.f.must}">★ Must</button>
      <button class="chip" data-act="flt" data-k="open" aria-pressed="${S.f.open}">Открыто сейчас</button>
      <button class="chip" data-act="flt" data-k="hide" aria-pressed="${S.f.hide}">Скрыть «были»</button>
      ${nAct ? '<button class="chip" data-act="fltReset">Сбросить</button>' : ''}
      <span style="width:6px;flex:none"></span>
      ${T.cities.map(c => `<button class="chip" data-act="city" data-id="${c.id}">${esc(c.name)}</button>`).join('')}
    </div>
  </div>
  <div id="mu-list"></div>
  <div class="map-fabs">
    <button class="fab${S.locate ? ' on' : ''}" data-act="locate" aria-label="Где я">${I.loc}</button>
    <button class="fab" data-act="openRoute" aria-label="Маршрут">${I.route}${r && r.stops.length ? `<span class="n">${r.stops.filter(s => !s.done).length}</span>` : ''}</button>
    <button class="fab add" data-act="addPlace" aria-label="Добавить место">${I.plus}</button>
  </div>
  <div id="route-bar"></div>`;
  if (S.list) renderMapList();
  updateRouteBar();
}
function updateRouteBar() {
  const el = $('#route-bar'); if (!el) return;
  const r = activeRoute();
  if (!r || !r.stops.length || S.list || (S.sheet && S.tab === 'map')) { el.innerHTML = ''; return; }
  const left = r.stops.filter(s => !s.done); const next = left[0] && placeById(left[0].id);
  const done = r.stops.length - left.length;
  el.innerHTML = `<div class="route-bar"><div class="grow" data-act="openRoute"><small>${esc(r.name)} · ${done}/${r.stops.length}</small><b>${next ? 'Дальше: ' + esc(next.name) : 'Маршрут пройден'}</b>${next && ME ? `<small>${fWalk(dist(ME, next))}</small>` : ''}</div>${next ? `<a class="btn primary sm" href="${esc(gmapsDirUrl(next, [], r.mode || 'walking'))}" target="_blank" rel="noopener" data-keep="1">${I.nav}Идти</a>` : ''}</div>`;
}
function renderMapList() {
  const el = $('#mu-list'); if (!el) return;
  if (!S.list) { el.innerHTML = ''; return; }
  const list = filtered().map(p => ({ p, d: ME && p.lat != null ? dist(ME, p) : null }));
  if (ME) list.sort((a, b) => a.d - b.d);
  else list.sort((a, b) => (a.p.city || '').localeCompare(b.p.city || '') || catById(a.p.cat).name.localeCompare(catById(b.p.cat).name));
  el.innerHTML = `<div class="map-list"><div class="between" style="margin-bottom:8px"><span class="label">${list.length} мест${ME ? ' · ближайшие сверху' : ''}</span>${!ME ? '<button class="btn sm ghost" data-act="locate">Рядом со мной</button>' : ''}</div>
    <div class="card pad0">${list.length ? list.map(({ p, d }) => placeRow(p, d)).join('') : '<div class="empty">Ничего не найдено. Сбрось фильтры или поиск.</div>'}</div></div>`;
}
function placeRow(p, d) {
  const c = catById(p.cat), m = meta(p.id), o = openState(p);
  const sub = [p.sub || c.name, cityName(p.city)].filter(Boolean).join(' · ');
  return `<button class="prow" data-act="place" data-id="${esc(p.id)}"><span class="ic" style="background:${c.color}">${catIcon(p.cat)}</span><span class="grow"><b>${m.must ? '★ ' : ''}${esc(p.name)}${m.status === 'been' ? ' ✓' : ''}</b><small>${esc(sub)}</small></span><span class="r">${d != null ? `<span>${d > 4000 ? fDist(d) : walkMin(d) + ' мин'}</span>` : ''}${o ? `<span class="badge ${o.open ? (o.soon ? 'warn' : 'good') : 'grey'}">${o.open ? 'открыто' : 'закрыто'}</span>` : ''}</span></button>`;
}
A.clearQ = () => { S.q = ''; saveState(); renderMapUI(); refreshMarkers(); };
A.toggleList = () => { S.list = !S.list; saveState(); renderMapUI(); };
A.cat = el => { const id = el.dataset.id; S.cats = S.cats.includes(id) ? S.cats.filter(x => x !== id) : [...S.cats, id]; saveState(); renderMapUI(); refreshMarkers(); };
A.flt = el => { const k = el.dataset.k; S.f[k] = !S.f[k]; saveState(); renderMapUI(); refreshMarkers(); };
A.fltReset = () => { S.cats = []; S.f = clone(DEF_STATE.f); saveState(); renderMapUI(); refreshMarkers(); };
A.city = el => { const c = T.cities.find(x => x.id === el.dataset.id); if (S.list) { S.list = false; renderMapUI(); } if (map) map.setView([c.lat, c.lng], c.z); };

// ============================================================
// PLACE CARD
// ============================================================
SHEETS.place = spec => {
  const p = placeById(spec.id); if (!p) return null;
  const c = catById(p.cat), m = meta(p.id), o = openState(p);
  const inRoute = (activeRoute() || { stops: [] }).stops.some(s => s.id === p.id);
  const d = ME && p.lat != null ? dist(ME, p) : null;
  const src = p.source || {};
  const head = `<div class="cat-line"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}${p.sub ? ' · ' + esc(p.sub) : ''}${p.city ? ' · ' + esc(cityName(p.city)) : ''}</div>
    <h2>${m.must ? '★ ' : ''}${esc(p.name)}</h2>${p.ja && p.ja !== p.address ? `<div class="ja muted" lang="ja" style="font-size:14px;margin-top:2px">${esc(p.ja)}</div>` : ''}`;
  const badges = [
    o ? `<span class="badge ${o.open ? (o.soon ? 'warn' : 'good') : 'grey'}">${esc(o.text)}</span>` : '',
    d != null ? `<span class="badge grey">${esc(fWalk(d))}</span>` : '',
    p.approx ? '<span class="badge warn">точка примерная</span>' : '',
    m.day ? `<span class="badge">в плане на ${fDayShort(m.day)}</span>` : '',
  ].filter(Boolean).join('');
  const info = [
    p.notes ? ['Что это', esc(p.notes)] : null,
    p.try ? ['Брать / пробовать', esc(p.try)] : null,
    p.dates ? ['Даты', esc(p.dates)] : null,
    p.hours ? ['Часы', esc(p.hours)] : null,
    p.price ? ['Цены', esc(p.price)] : null,
    p.address ? ['Адрес', esc(p.address)] : null,
  ].filter(Boolean);
  const body = `
    ${badges ? `<div class="row" style="flex-wrap:wrap;gap:6px">${badges}</div>` : ''}
    <div class="status-seg">${[['', 'Хочу'], ['been', 'Были ✓'], ['skip', 'Пропуск']].map(([v, l]) => `<button data-act="status" data-id="${esc(p.id)}" data-v="${v}" aria-pressed="${(m.status || '') === v}">${l}</button>`).join('')}</div>
    <div class="actions">
      <a class="btn primary" href="${esc(gmapsPlaceUrl(p))}" target="_blank" rel="noopener" data-keep="1">${I.ext}Google Maps</a>
      <a class="btn" href="${esc(gmapsDirUrl(p, [], 'transit'))}" target="_blank" rel="noopener" data-keep="1">${I.nav}Как добраться</a>
      <button class="btn ${inRoute ? 'ghost' : ''}" data-act="toggleRoute" data-id="${esc(p.id)}">${I.route}${inRoute ? 'В маршруте ✓' : 'В маршрут'}</button>
      <button class="btn ${m.must ? 'ghost' : ''}" data-act="must" data-id="${esc(p.id)}">${I.star}${m.must ? 'Must ✓' : 'Must'}</button>
    </div>
    ${p.ja || p.address ? `<div class="actions"><button class="btn sm" data-act="taxi" data-id="${esc(p.id)}">Показать таксисту</button><button class="btn sm" data-act="copy" data-v="${esc(p.ja || p.address)}">Копировать адрес</button></div>` : ''}
    ${info.length ? `<dl class="card pad0" style="margin:0;border:1px solid var(--line2)">${info.map(([k, v]) => `<div class="kv"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
    ${placeExtras(p)}
    ${src.text || src.url ? `<div class="stack" style="gap:6px"><div class="src"><span class="label">Источник</span>${src.type ? `<span class="badge grey">${esc(SRC[src.type] || src.type)}</span>` : ''}${safeUrl(src.url) ? `<a href="${esc(safeUrl(src.url))}" target="_blank" rel="noopener" data-keep="1" style="margin-left:auto;font-weight:600">Открыть ↗</a>` : ''}</div>${src.text ? `<div class="quote">${esc(src.text)}</div>` : ''}</div>` : ''}
    <label class="field"><span>Моя заметка</span><textarea data-note="${esc(p.id)}" placeholder="Что заказать, что купить, с кем идти…">${esc(m.note || '')}</textarea></label>
    <div class="stack" style="gap:6px"><span class="label">В план на день</span><div class="days">${tripDays().map(dd => dayChip(dd, m.day === dd, `data-act="planDay" data-id="${esc(p.id)}" data-d="${dd}"`)).join('')}</div></div>
    <div class="row"><button class="btn sm grow" data-act="editPlace" data-id="${esc(p.id)}">Изменить</button><button class="btn sm warn grow" data-act="delPlace" data-id="${esc(p.id)}">${p._base ? 'Скрыть' : 'Удалить'}</button></div>`;
  return { head, body, peek: true };
};
function dayChip(d, on, attrs) { const x = dObj(d); return `<button class="day-chip${d === todayDate() ? ' today' : ''}" aria-pressed="${on}" ${attrs}><b>${x.getUTCDate()}</b>${WD[x.getUTCDay()]}</button>`; }
A.status = el => { setMeta(el.dataset.id, { status: el.dataset.v || undefined }); if (el.dataset.v === 'been') { const r = activeRoute(); const s = r && r.stops.find(x => x.id === el.dataset.id); if (s) { s.done = true; saveUser(); drawRoute(); } } rerenderSheetKeepScroll(); refreshMarkers(); };
A.must = el => { setMeta(el.dataset.id, { must: !meta(el.dataset.id).must }); rerenderSheetKeepScroll(); refreshMarkers(); };
A.planDay = el => { const m = meta(el.dataset.id); setMeta(el.dataset.id, { day: m.day === el.dataset.d ? undefined : el.dataset.d }); rerenderSheetKeepScroll(); };
A.toggleRoute = el => { const r = activeRoute(); if (r && r.stops.some(s => s.id === el.dataset.id)) { r.stops = r.stops.filter(s => s.id !== el.dataset.id); saveUser(); drawRoute(); toast('Убрано из маршрута'); } else addToRoute(el.dataset.id); rerenderSheetKeepScroll(); refreshMarkers(); renderMapUI(); };
A.taxi = el => { const p = placeById(el.dataset.id); showBig({ title: p.name, ja: p.ja || p.address, sub: p.ja && p.address && p.address !== p.ja ? p.address : '', ru: 'この住所までお願いします。 — Отвезите, пожалуйста, по этому адресу.' }); };
A.copy = async el => { try { await navigator.clipboard.writeText(el.dataset.v); toast('Скопировано'); } catch (e) { toast(el.dataset.v); } };
A.delPlace = el => {
  const p = placeById(el.dataset.id); if (!p) return;
  if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Точно? Нажми ещё раз'; return; }
  if (p._base) setMeta(p.id, { hidden: true }); else { U.places = U.places.filter(x => x.id !== p.id); delete U.meta[p.id]; }
  for (const r of U.routes) r.stops = r.stops.filter(s => s.id !== p.id);
  saveUser(); closeSheet(); drawRoute(); renderMapUI(); toast(p._base ? 'Скрыто. Вернуть — в настройках' : 'Удалено');
};

// ============================================================
// ADD / EDIT PLACE
// ============================================================
function openForm(draft) {
  const d = Object.assign({ id: '', name: '', cat: '', sub: '', city: '', geo: '', lat: '', lng: '', ja: '', address: '', hours: '', price: '', notes: '', try: '', srcType: '', srcUrl: '', srcText: '', gmaps: '' }, draft || {});
  S.pick = null; S.sel = null;
  if (S.tab !== 'map') showTab('map');
  openSheet({ type: 'form', draft: d }); renderMapUI(); refreshMarkers();
}
A.addPlace = () => openForm({});
A.editPlace = el => {
  const p = placeById(el.dataset.id); if (!p) return;
  const s = p.source || {};
  openForm({ id: p.id, name: p.name || '', cat: p.cat || '', sub: p.sub || '', city: p.city || '', geo: p.lat != null ? `${p.lat}, ${p.lng}` : '', lat: p.lat ?? '', lng: p.lng ?? '', ja: p.ja || '', address: p.address || '', hours: p.hours || '', price: p.price || '', notes: p.notes || '', try: p.try || '', srcType: s.type || '', srcUrl: s.url || '', srcText: s.text || '', gmaps: p.gmaps || '' });
};
SHEETS.form = spec => {
  const d = spec.draft; const cat = catById(d.cat);
  const head = `<h2>${d.id ? 'Изменить место' : 'Новое место'}</h2>`;
  const body = `
    <label class="field"><span>Ссылка Google Maps, координаты или текст «Поделиться»</span><textarea data-f="geo" rows="2" style="min-height:60px" placeholder="https://www.google.com/maps/place/… или 35.6595, 139.7005">${esc(d.geo)}</textarea><span id="geo-hint" class="hint"></span></label>
    <div class="row"><button class="btn sm grow" data-act="pasteGeo">Вставить из буфера</button><button class="btn sm grow" data-act="pickStart">Указать на карте</button><button class="btn sm" data-act="geoMe">Я здесь</button></div>
    <label class="field"><span>Название</span><input data-f="name" value="${esc(d.name)}" placeholder="Например: Ichiran Shibuya"></label>
    <div class="stack" style="gap:6px"><span class="label">Категория</span><div class="chips wrap">${T.categories.map(c => `<button class="chip" data-act="fCat" data-id="${c.id}" aria-pressed="${d.cat === c.id}"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</button>`).join('')}</div></div>
    ${d.cat && cat.subs.length ? `<div class="stack" style="gap:6px"><span class="label">Тип</span><div class="chips wrap">${cat.subs.map(s => `<button class="chip" data-act="fSub" data-v="${esc(s)}" aria-pressed="${d.sub === s}">${esc(s)}</button>`).join('')}</div></div>` : ''}
    <label class="field"><span>Что это (коротко)</span><textarea data-f="notes" placeholder="Рамен на свином бульоне, очередь с 11:00">${esc(d.notes)}</textarea></label>
    <label class="field"><span>Что брать / пробовать</span><input data-f="try" value="${esc(d.try || '')}" placeholder="Тонкацу-сет, матча-латте…"></label>
    <label class="field"><span>Часы работы</span><input data-f="hours" value="${esc(d.hours)}" placeholder="11:00–22:00, вых: вт"><span class="hint">Формат «11:00–22:00, вых: вт» — тогда работает фильтр «Открыто сейчас»</span></label>
    <label class="field"><span>Цены / средний чек</span><input data-f="price" value="${esc(d.price)}" placeholder="¥1 200"></label>
    <label class="field"><span>Адрес или название по-японски (для такси и поиска)</span><input data-f="ja" value="${esc(d.ja)}" lang="ja"></label>
    <div class="stack" style="gap:6px"><span class="label">Откуда узнал</span><div class="chips wrap">${['instagram', 'reddit', 'tiktok', 'youtube', 'forum', 'friend', 'me'].map(t => `<button class="chip" data-act="fSrc" data-v="${t}" aria-pressed="${d.srcType === t}">${SRC[t]}</button>`).join('')}</div></div>
    <label class="field"><span>Ссылка на пост</span><input data-f="srcUrl" value="${esc(d.srcUrl)}" inputmode="url" placeholder="https://www.instagram.com/p/…"></label>
    <label class="field"><span>Что говорили в источнике</span><textarea data-f="srcText" placeholder="«Лучший тонкацу в районе, брать сет с рисом», советуют прийти до 18:00">${esc(d.srcText)}</textarea></label>
    <button class="btn primary wide" data-act="saveForm">Сохранить</button>`;
  return { head, body };
};
function geoHint() {
  const el = $('#geo-hint'); if (!el || !S.sheet || !S.sheet.draft) return;
  const d = S.sheet.draft; const g = parseGeo(d.geo || '');
  const hasPt = d.lat !== '' && d.lat != null;
  if (resolving) { el.className = 'hint'; el.textContent = 'Ищу точку по ссылке…'; return; }
  if (!(d.geo || '').trim()) { el.className = 'hint' + (hasPt ? ' ok' : ''); el.textContent = hasPt ? `Точка на карте: ${(+d.lat).toFixed(5)}, ${(+d.lng).toFixed(5)}` : (S.sheet.type === 'ev' ? 'Вставь ссылку из Google Maps — место появится на карте. Или выбери уже сохранённое ниже.' : 'Можно и без ссылки: «Указать на карте» или долгий тап по карте.'); return; }
  if (g && g.lat != null) { el.className = 'hint ok'; el.textContent = `Координаты найдены: ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}${g.name ? ' · ' + g.name : ''}`; return; }
  if (hasPt) { el.className = 'hint ok'; el.textContent = `Точка найдена: ${(+d.lat).toFixed(5)}, ${(+d.lng).toFixed(5)}${d.resolvedName ? ' · ' + d.resolvedName : ''}`; return; }
  if (g && g.short) { el.className = 'hint bad'; el.textContent = 'Короткая ссылка: при сохранении попробую найти точку через интернет. Не выйдет — поставь её «Указать на карте».'; return; }
  el.className = 'hint bad'; el.textContent = 'Координат нет. Поставь точку «Указать на карте».';
}
let resolving = false;
function fetchT(url, ms) { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return fetch(url, { signal: c.signal }).finally(() => clearTimeout(t)); }
function geoFromText(txt) {
  const s = String(txt || '').replace(/%2C/gi, ',').replace(/%21/g, '!').replace(/%40/g, '@').replace(/\\u0026/g, '&');
  let m, out = null;
  const ok = (a, b) => { a = +a; b = +b; return Math.abs(a) <= 90 && Math.abs(b) <= 180 && !(a === 0 && b === 0) ? { lat: +a.toFixed(6), lng: +b.toFixed(6) } : null; };
  if ((m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/))) out = ok(m[1], m[2]);
  if (!out && (m = s.match(/@(-?\d{1,2}\.\d{3,}),(-?\d{1,3}\.\d{3,})/))) out = ok(m[1], m[2]);
  if (!out && (m = s.match(/(?:center|ll|markers|q|query)=(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/))) out = ok(m[1], m[2]);
  if (!out) return null;
  if ((m = s.match(/\/maps\/place\/([^/@?"&]+)/))) { try { out.name = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { } }
  if (!out.name && (m = s.match(/property="og:title"\s+content="([^"]+)"|content="([^"]+)"\s+property="og:title"/))) out.name = (m[1] || m[2]).split(' · ')[0].replace(/&amp;/g, '&').replace(/&#39;/g, "'");
  return out;
}
async function resolveShort(url) {
  const tries = [
    async () => { const j = await (await fetchT('https://api.allorigins.win/get?url=' + encodeURIComponent(url), 9000)).json(); return [j.status && j.status.url, j.contents].filter(Boolean).join('\n'); },
    async () => { const r = await fetchT('https://corsproxy.io/?url=' + encodeURIComponent(url), 9000); return r.url + '\n' + await r.text(); },
  ];
  for (const t of tries) { try { const g = geoFromText(await t()); if (g) return g; } catch (e) { } }
  return null;
}
async function tryResolveDraft(d) {
  const g = parseGeo(d.geo || '');
  if (!g || g.lat != null || !g.short || (d.lat !== '' && d.lat != null)) return;
  resolving = true; geoHint();
  const r = await resolveShort(g.url);
  resolving = false;
  if (r) { d.lat = r.lat; d.lng = r.lng; if (r.name) { d.resolvedName = r.name; if ('name' in d && !d.name) d.name = r.name; } saveState(); }
  if (S.sheet && S.sheet.draft === d) { rerenderSheetKeepScroll(); geoHint(); }
  return r;
}
function readGeoIntoDraft(d) {
  const g = parseGeo(d.geo);
  if (g) {
    if (g.lat != null) { d.lat = g.lat; d.lng = g.lng; }
    if (g.url && /google|goo\.gl/.test(g.url)) d.gmaps = g.url;
    if (!d.name && (g.name || g.query)) d.name = g.name || g.query;
  }
}
A.pasteGeo = async () => {
  try { const t = await navigator.clipboard.readText(); const d = S.sheet.draft; d.geo = t; d.lat = ''; d.lng = ''; readGeoIntoDraft(d); saveState(); rerenderSheetKeepScroll(); geoHint(); tryResolveDraft(d); }
  catch (e) { toast('Нет доступа к буферу — вставь вручную'); }
};
A.geoMe = () => {
  if (!ME) { startLocate(false); toast('Ищу тебя… нажми ещё раз через пару секунд'); return; }
  const d = S.sheet.draft; readGeoIntoDraft(d); d.lat = +ME.lat.toFixed(6); d.lng = +ME.lng.toFixed(6); d.geo = `${d.lat}, ${d.lng}`; saveState(); rerenderSheetKeepScroll(); geoHint();
};
A.fCat = el => { const d = S.sheet.draft; d.cat = d.cat === el.dataset.id ? '' : el.dataset.id; d.sub = ''; saveState(); rerenderSheetKeepScroll(); geoHint(); };
A.fSub = el => { const d = S.sheet.draft; d.sub = d.sub === el.dataset.v ? '' : el.dataset.v; saveState(); rerenderSheetKeepScroll(); geoHint(); };
A.fSrc = el => { const d = S.sheet.draft; d.srcType = d.srcType === el.dataset.v ? '' : el.dataset.v; saveState(); rerenderSheetKeepScroll(); geoHint(); };
A.pickStart = () => {
  const d = S.sheet.draft; readGeoIntoDraft(d);
  S.pick = { draft: d }; S.sheet = null; saveState(); renderSheet();
  if (map && d.lat !== '') map.setView([+d.lat, +d.lng], Math.max(map.getZoom(), 16));
  renderMapUI();
};
A.pickCancel = () => { const { draft: d, ret } = S.pick; S.pick = null; saveState(); if (ret === 'ev') { showTab('today'); openSheet({ type: 'ev', draft: d }); } else openForm(d); };
A.pickDone = () => {
  const d = S.pick.draft;
  const ret = S.pick.ret;
  if (map) { readGeoIntoDraft(d); const c = map.getCenter(); d.lat = +c.lat.toFixed(6); d.lng = +c.lng.toFixed(6); if (ret !== 'ev') d.geo = `${d.lat}, ${d.lng}`; }
  S.pick = null; saveState();
  if (ret === 'ev') { showTab('today'); openSheet({ type: 'ev', draft: d }); } else { openForm(d); setTimeout(geoHint, 0); }
};
A.saveForm = async () => {
  const d = S.sheet.draft; readGeoIntoDraft(d);
  if ((d.lat === '' || d.lat == null) && parseGeo(d.geo || '') && parseGeo(d.geo).short) { toast('Ищу точку по ссылке…'); await tryResolveDraft(d); }
  if (!d.name.trim()) return toast('Нужно название');
  if (!d.cat) return toast('Выбери категорию');
  if (d.lat === '' || d.lat == null) return toast('Нет точки: вставь ссылку с координатами или «Указать на карте»');
  const lat = +d.lat, lng = +d.lng;
  const obj = { name: d.name.trim(), cat: d.cat, sub: d.sub || undefined, city: nearestCity(lat, lng), lat, lng, ja: d.ja.trim() || undefined, hours: d.hours.trim() || undefined, price: d.price.trim() || undefined, notes: d.notes.trim() || undefined, try: (d.try || '').trim() || undefined, gmaps: d.gmaps || undefined, source: (d.srcType || d.srcUrl || d.srcText) ? { type: d.srcType || undefined, url: d.srcUrl.trim() || undefined, text: d.srcText.trim() || undefined } : undefined };
  let id = d.id;
  if (id) {
    const base = T.places.find(p => p.id === id);
    if (base) { const m = meta(id); setMeta(id, { edit: Object.assign({}, m.edit, obj, { approx: false }) }); }
    else { const i = U.places.findIndex(p => p.id === id); if (i >= 0) U.places[i] = JSON.parse(JSON.stringify(Object.assign({}, U.places[i], obj))); }
  } else { id = uid('u-'); U.places.push(JSON.parse(JSON.stringify(Object.assign({ id, created: new Date().toISOString() }, obj)))); }
  saveUser(); toast('Сохранено');
  selectPlace(id, true);
};

// ============================================================
// ROUTES
// ============================================================
function activeRoute() { return U.routes.find(r => r.id === S.route) || null; }
function newRoute(name, day) { const r = { id: uid('r'), name: name || `Маршрут ${fDayShort(curDay())}`, day: day || null, stops: [], mode: 'walking' }; U.routes.push(r); S.route = r.id; saveAll(); return r; }
function addToRoute(pid) {
  const r = activeRoute() || newRoute();
  if (r.stops.some(s => s.id === pid)) return toast('Уже в маршруте');
  r.stops.push({ id: pid, done: false }); saveUser(); drawRoute();
  toast(`Добавлено в «${r.name}» · точек: ${r.stops.length}`);
}
function drawRoute() {
  if (!map) return;
  routeLayer.clearLayers();
  const r = activeRoute(); if (!r || r.stops.length < 1) { refreshMarkers(); return; }
  const pts = r.stops.map(s => ({ s, p: placeById(s.id) })).filter(x => x.p && x.p.lat != null);
  for (let i = 1; i < pts.length; i++) {
    const done = pts[i].s.done;
    L.polyline([[pts[i - 1].p.lat, pts[i - 1].p.lng], [pts[i].p.lat, pts[i].p.lng]], { color: done ? '#8A909C' : '#24457A', weight: 4, opacity: done ? .5 : .85, dashArray: '2 8', lineCap: 'round', interactive: false }).addTo(routeLayer);
  }
  refreshMarkers();
}
function optimize(r) {
  const done = r.stops.filter(s => s.done), left = r.stops.filter(s => !s.done);
  if (left.length < 3 && !ME) return;
  const P = id => placeById(id);
  let cur = ME || (done.length ? P(done[done.length - 1].id) : P(left[0].id));
  const out = [];
  let pool = left.slice();
  if (!ME && !done.length) { out.push(pool.shift()); cur = P(out[0].id); }
  while (pool.length) {
    let bi = 0, bd = Infinity;
    pool.forEach((s, i) => { const p = P(s.id); const dd = p ? dist(cur, p) : Infinity; if (dd < bd) { bd = dd; bi = i; } });
    const [s] = pool.splice(bi, 1); out.push(s); cur = P(s.id) || cur;
  }
  r.stops = done.concat(out);
}
function routeLinks(r) {
  const left = r.stops.filter(s => !s.done).map(s => placeById(s.id)).filter(Boolean);
  if (!left.length) return [];
  const mode = r.mode || 'walking';
  if (mode === 'transit') return [{ label: `До «${left[0].name}» на транспорте`, url: gmapsDirUrl(left[0], [], 'transit') }];
  const links = []; let i = 0, origin = null, part = 1;
  while (i < left.length) {
    const chunk = left.slice(i, i + 4);
    const dest = chunk[chunk.length - 1], wps = chunk.slice(0, -1);
    links.push({ label: left.length > 4 ? `Часть ${part}: ${origin ? origin.name : 'отсюда'} → ${dest.name}` : 'Весь маршрут в Google Maps', url: gmapsDirUrl(dest, wps, mode, origin) });
    origin = dest; i += 4; part++;
  }
  return links;
}
A.openRoute = () => { S.sel = null; openSheet({ type: 'route' }); refreshMarkers(); updateRouteBar(); };
SHEETS.route = () => {
  const r = activeRoute();
  const chips = `<div class="chips">${U.routes.map(x => `<button class="chip" data-act="routePick" data-id="${x.id}" aria-pressed="${x.id === S.route}">${esc(x.name)}</button>`).join('')}<button class="chip" data-act="routeNew">+ Новый</button></div>`;
  if (!r) return { head: '<h2>Маршрут</h2>', body: `${U.routes.length ? chips : ''}<div class="empty">Открой место на карте и нажми «В маршрут». Или создай маршрут дня на вкладке «Сегодня» — из мест, отмеченных на этот день.</div><button class="btn primary wide" data-act="routeNew">Создать маршрут</button>` };
  let prev = null;
  const rows = r.stops.map((s, i) => {
    const p = placeById(s.id); if (!p) return '';
    const leg = prev && p.lat != null ? `<div class="leg">↓ ${fWalk(dist(prev, p))}</div>` : '';
    prev = p;
    return `${leg}<div class="stop${s.done ? ' done' : ''}"><button class="box${s.done ? ' on' : ''}" data-act="stopToggle" data-i="${i}" aria-label="Пройдено" style="background:${s.done ? '' : '#fff'}">${I.check}</button><span class="n">${i + 1}</span><span class="grow" data-act="place" data-id="${esc(p.id)}"><div class="nm">${esc(p.name)}</div><small>${esc(p.sub || catById(p.cat).name)}${openState(p) ? ' · ' + esc(openState(p).text) : ''}</small></span><button class="mini" data-act="stopMove" data-i="${i}" data-d="-1" aria-label="Выше">${I.up}</button><button class="mini" data-act="stopMove" data-i="${i}" data-d="1" aria-label="Ниже">${I.down}</button><button class="mini" data-act="stopDel" data-i="${i}" aria-label="Убрать">${I.x}</button></div>`;
  }).join('');
  const total = r.stops.reduce((acc, s, i) => { if (!i) return acc; const a = placeById(r.stops[i - 1].id), b = placeById(s.id); return a && b ? acc + dist(a, b) : acc; }, 0);
  const links = routeLinks(r);
  const head = `<input data-route-name="1" value="${esc(r.name)}" aria-label="Название маршрута" style="border:none;font-size:19px;font-weight:700;width:100%;padding:0;background:none;outline:none">
    <div class="muted" style="font-size:13px;margin-top:2px">${r.stops.length} точек · ${r.stops.filter(s => s.done).length} пройдено${total ? ' · ~' + fDist(total * 1.3) + ' пешком' : ''}</div>`;
  const body = `${chips}
    <div class="seg">${[['walking', 'Пешком'], ['transit', 'Транспорт'], ['driving', 'Такси']].map(([v, l]) => `<button data-act="routeMode" data-v="${v}" aria-pressed="${(r.mode || 'walking') === v}">${l}</button>`).join('')}</div>
    <div class="card pad0" style="border:1px solid var(--line2)">${rows || '<div class="empty">Пока пусто. Добавляй точки кнопкой «В маршрут» в карточке места.</div>'}</div>
    ${links.map((l, i) => `<a class="btn ${i ? '' : 'primary'} wide" href="${esc(l.url)}" target="_blank" rel="noopener" data-keep="1">${I.ext}${esc(l.label)}</a>`).join('')}
    ${links.length && (r.mode || 'walking') !== 'transit' && r.stops.filter(s => !s.done).length > 4 ? '<div class="hint">Google Maps на телефоне принимает до 3 промежуточных точек, поэтому маршрут разбит на части.</div>' : ''}
    ${(r.mode || 'walking') === 'transit' ? '<div class="hint">В режиме транспорта Google строит путь только до одной точки — веду по одной, следующую отмечай галочкой.</div>' : ''}
    <div class="row"><button class="btn sm grow" data-act="routeOpt">Оптимизировать порядок</button><button class="btn sm grow" data-act="routeShow">Показать на карте</button></div>
    <div class="row"><select data-chg="routeDay" class="btn sm grow" style="font-weight:500"><option value="">Без дня</option>${tripDays().map(d => `<option value="${d}" ${r.day === d ? 'selected' : ''}>${fDay(d)}</option>`).join('')}</select><button class="btn sm" data-act="routeReset">Сбросить ✓</button><button class="btn sm warn" data-act="routeDelete">Удалить</button></div>`;
  return { head, body };
};
function routeChanged() { saveAll(); drawRoute(); rerenderSheetKeepScroll(); renderMapUI(); }
A.routePick = el => { S.route = el.dataset.id; routeChanged(); };
A.routeNew = () => { newRoute(); routeChanged(); };
A.routeMode = el => { activeRoute().mode = el.dataset.v; routeChanged(); };
A.stopToggle = el => { const r = activeRoute(); const s = r.stops[+el.dataset.i]; s.done = !s.done; if (s.done) setMeta(s.id, { status: 'been' }); routeChanged(); };
A.stopDone = el => { const r = activeRoute(); const s = r && r.stops.find(x => x.id === el.dataset.id); if (s) { s.done = true; setMeta(s.id, { status: 'been' }); routeChanged(); toast('Отмечено'); } };
A.stopMove = el => { const r = activeRoute(); const i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= r.stops.length) return; [r.stops[i], r.stops[j]] = [r.stops[j], r.stops[i]]; routeChanged(); };
A.stopDel = el => { const r = activeRoute(); r.stops.splice(+el.dataset.i, 1); routeChanged(); };
A.routeOpt = () => { optimize(activeRoute()); routeChanged(); toast(ME ? 'Порядок от твоего места' : 'Порядок по ближайшим'); };
A.routeReset = () => { activeRoute().stops.forEach(s => s.done = false); nearDone.clear(); routeChanged(); };
A.routeDay = el => { activeRoute().day = el.value || null; saveUser(); };
A.routeDelete = el => { if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Точно?'; return; } U.routes = U.routes.filter(r => r.id !== S.route); S.route = U.routes.length ? U.routes[U.routes.length - 1].id : null; routeChanged(); };
A.routeShow = () => {
  const r = activeRoute(); const pts = r.stops.map(s => placeById(s.id)).filter(p => p && p.lat != null);
  closeSheet(); if (map && pts.length) map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 16 });
  updateRouteBar();
};
function dayRoute(d) {
  const ids = getPlaces().filter(p => meta(p.id).day === d).map(p => p.id);
  if (!ids.length) return toast('Нет мест на этот день — отметь их в карточках');
  let r = U.routes.find(x => x.day === d);
  if (!r) r = newRoute(`День ${fDayShort(d)}`, d);
  for (const id of ids) if (!r.stops.some(s => s.id === id)) r.stops.push({ id, done: false });
  S.route = r.id; optimize(r); saveAll();
  showTab('map'); drawRoute(); openSheet({ type: 'route' }); renderMapUI();
}
A.dayRoute = el => dayRoute(el.dataset.d);

// ============================================================
// TODAY
// ============================================================
function renderToday() {
  const v = $('#v-today'); const d = curDay(); const day = T.days.find(x => x.date === d) || { items: [] };
  const now = jpNow(); const days = tripDays();
  const before = now.date < days[0];
  const left = Math.ceil((dObj(days[0]) - dObj(now.date)) / 864e5);
  const stay = stayFor(d);
  const mine = getPlaces().filter(p => meta(p.id).day === d);
  const route = U.routes.find(r => r.day === d);
  const chk = T.checklists.find(c => c.id === 'before');
  const chkDone = chk ? chk.items.filter((_, i) => (U.checks.before || {})[i]).length : 0;
  v.innerHTML = `
  <div class="head"><h1 class="title">${d === now.date ? 'Сегодня' : 'План'}</h1><button class="icon-btn" data-act="settings" aria-label="Настройки">${I.gear}</button></div>
  <div class="stack">
    <div class="days" id="days-row">${days.map(x => dayChip(x, x === d, `data-act="day" data-d="${x}"`)).join('')}</div>
    <div class="hero">
      <div class="k">${fDay(d)} · ${esc(day.city || '')}${before && d === days[0] ? ` · через ${left} ${plural(left, 'день', 'дня', 'дней')}` : ''}</div>
      <h2>${esc(day.title || '')}</h2>
      ${stay ? `<div class="row" data-act="place" data-id="${stay.id}" style="cursor:pointer">Ночуем: ${esc(stay.name)}${stay.hours ? ' · ' + esc(stay.hours) : ''} ›</div>` : ''}
    </div>
    ${before && chk ? `<button class="card between" data-act="goChecklist" style="border:none;text-align:left"><span><span class="label">Перед выездом</span><div style="font-size:15px;font-weight:600;margin-top:4px">Чек-лист: ${chkDone} из ${chk.items.length}</div></span>${I.chev.replace('<svg', '<svg width="20" height="20" style="fill:none;stroke:#8A909C;stroke-width:2"')}</button>` : ''}
    <div class="card pad0"><div class="between" style="padding:12px 0 4px"><span class="label">План дня</span><span class="row" style="gap:6px"><button class="btn sm ${S.planEdit ? 'ghost' : ''}" data-act="planEdit">${S.planEdit ? 'Готово' : 'Править'}</button><button class="btn sm ghost" data-act="evAdd" data-d="${d}">+ Событие</button></span></div><div class="tl">${timeline(d, day).map(it => {
      const hid = it._key && (U.hiddenItems || {})[it._key];
      if (hid && !S.planEdit) return '';
      const p = it.place ? placeById(it.place) : null;
      const act = it._user ? `data-act="evEdit" data-id="${esc(it.id)}"` : p ? `data-act="place" data-id="${esc(p.id)}"` : it.phrase ? `data-act="phrase" data-id="${esc(it.phrase)}"` : '';
      const tail = S.planEdit && it._key ? `<span class="mini" data-act="itemHide" data-k="${esc(it._key)}" style="flex:none">${hid ? '↺' : I.x}</span>` : act ? `<span class="tl-go">${it._user ? '✎' : I.chev}</span>` : '';
      const tag = act || (S.planEdit && it._key) ? 'button' : 'div';
      return `<${tag} class="tl-item ${esc(it.kind || '')}" ${S.planEdit && it._key ? '' : act} style="${hid ? 'opacity:.4' : ''}"><span class="tl-t">${esc(it.t || '')}</span><span class="tl-b"><b>${it._user ? '• ' : ''}${esc(it.title)}</b>${it.text ? `<span>${esc(it.text)}</span>` : ''}${it._user && p ? `<span>📍 ${esc(p.name)}</span>` : ''}</span>${tail}</${tag}>`;
    }).join('') || '<div class="empty">Свободный день. «+ Событие» — добавить своё, или отмечай места «В план на день».</div>'}</div></div>
    <div class="card pad0">
      <div class="between" style="padding:12px 0 6px"><span class="label">Мои места на ${fDayShort(d)}</span>${mine.length ? `<button class="btn sm ghost" data-act="dayRoute" data-d="${d}">${route ? 'Открыть маршрут' : 'Маршрут дня'}</button>` : ''}</div>
      ${mine.length ? mine.map(p => placeRow(p, ME && p.lat != null ? dist(ME, p) : null)).join('') : '<div class="empty" style="padding:8px 0 16px">Пока нет. В карточке места → «В план на день».</div>'}
    </div>
    ${moneyMini()}
  </div>`;
  const row = $('#days-row'); const on = row && row.querySelector('[aria-pressed="true"]'); if (on) row.scrollLeft = on.offsetLeft - 16;
}
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
A.day = el => { S.day = el.dataset.d; saveState(); renderToday(); };
function timeKey(t) {
  const x = String(t || '').toLowerCase(); const m = x.match(/(\d{1,2})(?:[:.](\d{2}))?/);
  if (m) return +m[1] * 60 + +(m[2] || 0);
  if (/утр|откр/.test(x)) return 540; if (/день|обед/.test(x)) return 780; if (/закат/.test(x)) return 1020; if (/вечер/.test(x)) return 1080; if (/ноч/.test(x)) return 1320;
  return null;
}
function timeline(d, day) {
  let n = 0; const base = day.items.map(it => Object.assign({}, it, { _key: d + '#' + (it.id ? it.id : n++) }));
  const mine = (U.events || []).filter(e => e.date === d).map(e => Object.assign({}, e, { _user: true }));
  const out = base.slice();
  for (const e of mine.sort((a, b) => (timeKey(a.t) ?? 9999) - (timeKey(b.t) ?? 9999))) {
    const k = timeKey(e.t); let at = out.length;
    if (k != null) { const i = out.findIndex(x => (timeKey(x.t) ?? -1) > k); if (i >= 0) at = i; }
    out.splice(at, 0, e);
  }
  return out;
}
A.planEdit = () => { S.planEdit = !S.planEdit; saveState(); renderToday(); };
A.itemHide = el => { U.hiddenItems = U.hiddenItems || {}; const k = el.dataset.k; if (U.hiddenItems[k]) delete U.hiddenItems[k]; else U.hiddenItems[k] = true; saveUser(); renderToday(); };
A.evAdd = el => openSheet({ type: 'ev', draft: { id: '', date: el.dataset.d, t: '', title: '', text: '', place: '', geo: '', lat: '', lng: '', cat: '' } });
A.evEdit = el => { const e = (U.events || []).find(x => x.id === el.dataset.id); if (e) openSheet({ type: 'ev', draft: Object.assign({ place: '', text: '', geo: '', lat: '', lng: '', cat: '' }, e) }); };
A.evCat = el => { const d = S.sheet.draft; d.cat = d.cat === el.dataset.id ? '' : el.dataset.id; saveState(); rerenderSheetKeepScroll(); };
A.evPick = () => {
  const d = S.sheet.draft; readGeoIntoDraft(d);
  S.pick = { draft: d, ret: 'ev' }; S.sheet = null; saveState();
  showTab('map');
  if (map) {
    if (d.lat !== '' && d.lat != null) map.setView([+d.lat, +d.lng], 16);
    else { const day = T.days.find(x => x.date === d.date) || {}; const c = T.cities.find(x => x.name === (day.city || '').split(' ')[0]); if (c) map.setView([c.lat, c.lng], 15); }
  }
  renderMapUI();
};
SHEETS.ev = spec => {
  const d = spec.draft;
  const day = T.days.find(x => x.date === d.date) || {};
  const cityId = (T.cities.find(c => c.name === (day.city || '').split(' ')[0]) || {}).id;
  const pl = getPlaces().slice().sort((a, b) => ((b.city === cityId) - (a.city === cityId)) || a.name.localeCompare(b.name));
  return {
    head: `<h2>${d.id ? 'Событие' : 'Новое событие'}</h2><div class="muted" style="font-size:13px;margin-top:2px">${fDay(d.date)}</div>`,
    body: `<div class="grid2"><label class="field"><span>Время</span><input data-f="t" value="${esc(d.t)}" placeholder="14:30 или вечер"></label><label class="field"><span>День</span><select data-f="date">${tripDays().map(x => `<option value="${x}" ${x === d.date ? 'selected' : ''}>${fDayShort(x)}</option>`).join('')}</select></label></div>
    <label class="field"><span>Что</span><input data-f="title" value="${esc(d.title)}" placeholder="Ужин в идзакае"></label>
    <label class="field"><span>Подробности</span><textarea data-f="text" placeholder="Бронь на 19:00, спросить столик у окна">${esc(d.text)}</textarea></label>
    <label class="field"><span>Ссылка на место из Google Maps</span><textarea data-f="geo" rows="2" style="min-height:56px" placeholder="Вставь ссылку «Поделиться» из Google Maps">${esc(d.geo || '')}</textarea><span id="geo-hint" class="hint"></span></label>
    <div class="row"><button class="btn sm grow" data-act="pasteGeo">Вставить из буфера</button><button class="btn sm grow" data-act="evPick">Указать на карте</button></div>
    ${true ? `<div class="stack" style="gap:6px"><span class="label">Категория точки (если по ссылке)</span><div class="chips wrap">${T.categories.filter(c => c.id !== 'stay').map(c => `<button class="chip" data-act="evCat" data-id="${c.id}" aria-pressed="${d.cat === c.id}"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</button>`).join('')}</div></div>` : ''}
    <label class="field"><span>…или уже сохранённое место</span><select data-f="place"><option value="">— без места —</option>${pl.map(p => `<option value="${esc(p.id)}" ${p.id === d.place ? 'selected' : ''}>${esc(p.name)}${p.city ? ' · ' + esc(cityName(p.city)) : ''}</option>`).join('')}</select></label>
    <button class="btn primary wide" data-act="evSave">Сохранить</button>
    ${d.place ? `<button class="btn wide" data-act="place" data-id="${esc(d.place)}">Показать место на карте</button>` : ''}
    ${d.id ? '<button class="btn warn wide" data-act="evDel">Удалить</button>' : ''}`
  };
};
A.evSave = async () => {
  const d = S.sheet.draft; if (!d.title.trim()) return toast('Напиши, что за событие');
  U.events = U.events || [];
  if ((d.geo || '').trim() || (d.lat !== '' && d.lat != null)) {
    readGeoIntoDraft(d);
    if (d.lat === '' || d.lat == null) {
      const g = parseGeo(d.geo);
      if (g && g.short) { toast('Ищу точку по ссылке…'); await tryResolveDraft(d); }
      if (d.lat === '' || d.lat == null) return toast('Не нашёл координаты по ссылке — нажми «Указать на карте»');
    }
    const g = parseGeo(d.geo || '') || {};
    const pid = uid('u-'); const lat = +d.lat, lng = +d.lng;
    U.places.push(JSON.parse(JSON.stringify({ id: pid, created: new Date().toISOString(), name: d.resolvedName || g.name || g.query || d.title.trim(), cat: d.cat || 'sight', city: nearestCity(lat, lng), lat, lng, gmaps: d.gmaps || (g.url && /google|goo\.gl/.test(g.url) ? g.url : undefined), notes: (d.text || '').trim() || undefined })));
    setMeta(pid, { day: d.date });
    d.place = pid; d.geo = ''; d.lat = ''; d.lng = ''; d.resolvedName = '';
    toast('Место добавлено на карту');
  }
  const rec = { id: d.id || uid('ev'), date: d.date, t: d.t.trim(), title: d.title.trim(), text: (d.text || '').trim(), place: d.place || '' };
  const i = U.events.findIndex(x => x.id === rec.id); if (i >= 0) U.events[i] = rec; else U.events.push(rec);
  saveUser(); S.day = rec.date; closeSheet(); renderToday(); refreshMarkers();
};
A.evDel = el => { if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Точно удалить?'; return; } U.events = (U.events || []).filter(x => x.id !== S.sheet.draft.id); saveUser(); closeSheet(); renderToday(); };
A.goChecklist = () => { S.phr = 'checks'; showTab('phrases'); };

// ============================================================
// DOCS
// ============================================================
function renderDocs() {
  const v = $('#v-docs');
  const groups = []; for (const d of DOCS) { let g = groups.find(x => x.name === d.group); if (!g) groups.push(g = { name: d.group, items: [] }); g.items.push(d); }
  const stays = getPlaces().filter(p => p.cat === 'stay');
  v.innerHTML = `<div class="head"><h1 class="title">Документы</h1></div>
  <div class="stack">
    ${groups.map(g => `<div class="stack" style="gap:6px"><span class="label">${esc(g.name)}</span><div class="card pad0">${g.items.map(d => `<button class="list-row" data-act="doc" data-id="${d.id}"><span class="ic" style="width:36px;height:36px;border-radius:10px;background:${d.mime === 'application/pdf' ? '#FBEDE3;color:#9A4416' : '#E6ECF6;color:#24457A'};display:flex;align-items:center;justify-content:center;flex:none">${(d.mime === 'application/pdf' ? I.pdf : I.img).replace('<svg', '<svg width="20" height="20" style="fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round"')}</span><span class="grow"><b style="display:block;font-size:15px">${esc(d.title)}</b>${d.sub ? `<small class="muted" style="font-size:12px">${esc(d.sub)}</small>` : ''}</span><span class="tl-go">${I.chev}</span></button>`).join('')}</div></div>`).join('')}
    <div class="stack" style="gap:6px"><span class="label">Жильё · коротко</span>
    ${stays.map(p => `<button class="card" data-act="place" data-id="${p.id}" style="border:none;text-align:left;display:flex;flex-direction:column;gap:4px"><span class="between"><b style="font-size:15px">${esc(p.name)}</b><span class="badge">${esc(p.dates || '')}</span></span>${p.hours ? `<span style="font-size:13px">${esc(p.hours)}</span>` : ''}<span class="muted" style="font-size:13px;line-height:1.45">${esc(p.notes || '')}</span></button>`).join('')}</div>
    <p class="hint">Всё хранится на телефоне и открывается без интернета. Паспортов здесь нет.</p>
  </div>`;
}
let curBlobUrl = null, pdfMod = null;
function docBlob(d) { return new Blob([b64d(d.b64)], { type: d.mime }); }
A.doc = el => openDoc(el.dataset.id);
async function openDoc(id) {
  const d = DOCS.find(x => x.id === id); if (!d) { S.doc = null; saveState(); return; }
  S.doc = id; saveState();
  const o = $('#overlay'); o.hidden = false;
  o.innerHTML = `<div class="ov-head"><button class="close" data-act="closeOverlay" aria-label="Закрыть">${I.x}</button><h2>${esc(d.title)}</h2><button class="icon-btn" data-act="docZoom" aria-label="Увеличить">${I.zoom}</button><button class="icon-btn" data-act="docShare" data-id="${d.id}" aria-label="Поделиться">${I.share}</button></div><div class="ov-body" id="doc-body"><div class="empty" style="color:#fff">Открываю…</div></div>`;
  const body = $('#doc-body');
  if (curBlobUrl) URL.revokeObjectURL(curBlobUrl);
  const blob = docBlob(d); curBlobUrl = URL.createObjectURL(blob);
  if (d.mime.startsWith('image/')) { body.innerHTML = `<img src="${curBlobUrl}" alt="${esc(d.title)}">`; return; }
  try {
    if (!pdfMod) { pdfMod = await import('./vendor/pdfjs/pdf.min.mjs'); pdfMod.GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.min.mjs'; }
    const pdf = await pdfMod.getDocument({ data: b64d(d.b64), wasmUrl: './vendor/pdfjs/wasm/', isEvalSupported: false }).promise;
    if (S.doc !== id) return;
    body.innerHTML = '';
    const pxW = Math.min((body.clientWidth - 20) * Math.min(window.devicePixelRatio || 1, 3) * 1.6, 2000);
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const vp1 = page.getViewport({ scale: 1 });
      const scale = pxW / vp1.width;
      const vp = page.getViewport({ scale });
      const cv = document.createElement('canvas'); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
      body.appendChild(cv);
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      if (S.doc !== id) return;
    }
  } catch (e) {
    body.innerHTML = `<iframe src="${curBlobUrl}" style="width:100%;height:100%;border:none;background:#fff"></iframe>`;
  }
}
A.docZoom = () => { const b = $('#doc-body'); if (b) b.classList.toggle('zoom'); };
A.docShare = async el => {
  const d = DOCS.find(x => x.id === el.dataset.id);
  const file = new File([docBlob(d)], d.name, { type: d.mime });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: d.title });
    else { const a = document.createElement('a'); a.href = curBlobUrl; a.download = d.name; a.click(); }
  } catch (e) { }
};

// ============================================================
// MONEY
// ============================================================
const rateBase = () => U.rate.manual || U.rate.api || T.rateDefault;
const markup = () => (U.rate.markup ?? T.cardMarkupPct ?? 0);
const cardRate = () => rateBase() * (1 + markup() / 100);
function cashStats() {
  const exJ = U.exch.reduce((a, x) => a + (+x.jpy || 0), 0), exK = U.exch.reduce((a, x) => a + (+x.kzt || 0), 0);
  const avg = exJ ? exK / exJ : rateBase();
  const spentJ = U.expenses.filter(e => e.wallet === 'cash').reduce((a, e) => a + e.jpy, 0);
  return { exJ, exK, avg, spentJ, left: exJ - spentJ };
}
function expKZT(e, cs) { return e.wallet === 'cash' ? e.jpy * cs.avg : (e.kzt || e.jpy * (e.rate || cardRate())); }
function budgets() { return T.budget.map(b => Object.assign({}, b, { kzt: U.budgets[b.id] ?? b.kzt })); }
function moneyMini() {
  const cs = cashStats(); const tot = U.expenses.reduce((a, e) => a + expKZT(e, cs), 0);
  return `<button class="card between" data-act="tab" data-tab="money" style="border:none;text-align:left"><span><span class="label">Деньги</span><div style="font-size:15px;font-weight:600;margin-top:4px">Потрачено ${fKZT(tot)}${U.exch.length ? ` · наличных ${fJPY(cs.left)}` : ''}</div><small class="muted">1 ¥ = ${fRate(rateBase())} ₸</small></span><span class="tl-go">${I.chev}</span></button>`;
}
function renderMoney() {
  const v = $('#v-money'); const cs = cashStats();
  const card = U.expenses.filter(e => e.wallet !== 'cash');
  const cardJ = card.reduce((a, e) => a + e.jpy, 0), cardK = card.reduce((a, e) => a + expKZT(e, cs), 0);
  const totJ = U.expenses.reduce((a, e) => a + e.jpy, 0), totK = U.expenses.reduce((a, e) => a + expKZT(e, cs), 0);
  const byCat = {}; for (const e of U.expenses) byCat[e.cat] = (byCat[e.cat] || 0) + expKZT(e, cs);
  const bud = budgets();
  const groups = {}; for (const e of U.expenses.slice().sort((a, b) => (b.date + b.ts).localeCompare(a.date + a.ts))) (groups[e.date] = groups[e.date] || []).push(e);
  const exRows = U.exch.slice().sort((a, b) => b.date.localeCompare(a.date));
  v.innerHTML = `<div class="head"><h1 class="title">Деньги</h1><button class="btn sm" data-act="rateSheet">1 ¥ = ${fRate(rateBase())} ₸</button></div>
  <div class="stack">
    <div class="total"><div class="k">Потрачено за поездку</div><div class="v"><b class="num">${fJPY(totJ)}</b><span class="num">≈ ${fKZT(totK)}</span></div></div>
    <div class="grid2">
      <div class="wallet"><span class="k">Карта</span><b class="num">${fJPY(cardJ)}</b><small class="num">${fKZT(cardK)} · курс ${fRate(cardRate())}</small></div>
      <button class="wallet" data-act="exchSheet"><span class="k">Наличные</span><b class="num">${fJPY(cs.left)} <small>осталось</small></b><small class="num">${U.exch.length ? `из ${fJPY(cs.exJ)} · обменяно ${fKZT(cs.exK)}` : 'Нажми, чтобы записать обмен'}</small></button>
    </div>
    <div class="card stack" style="gap:12px"><span class="label">Бюджет по статьям</span>
      ${bud.map(b => { const s = byCat[b.id] || 0; const pct = b.kzt ? Math.min(100, s / b.kzt * 100) : 0; return `<div class="stack" style="gap:5px"><div class="between" style="font-size:14px"><span style="font-weight:600">${esc(b.name)}</span><span class="num muted">${b.kzt ? `${fKZT(s).replace(' ₸', '')} / ${fKZT(b.kzt)}` : `${fKZT(s)} · без лимита`}</span></div>${b.kzt ? `<div class="bar"><i class="${s > b.kzt ? 'over' : ''}" style="width:${pct}%"></i></div>` : ''}</div>`; }).join('')}
      <button class="btn sm" data-act="budgetSheet">Изменить лимиты</button>
    </div>
    ${Object.keys(groups).length ? Object.entries(groups).map(([d, list]) => `<div class="stack" style="gap:6px"><span class="label">${fDay(d)}</span><div class="card pad0">${list.map(e => `<button class="list-row" data-act="editExp" data-id="${e.id}"><span class="grow"><b style="display:block;font-size:14px">${esc(e.note || (bud.find(b => b.id === e.cat) || {}).name || 'Трата')}</b><small class="muted" style="font-size:12px">${esc((bud.find(b => b.id === e.cat) || {}).name || '')} · ${e.wallet === 'cash' ? 'наличные' : 'карта'}</small></span><span class="num" style="text-align:right;display:flex;flex-direction:column"><b style="font-size:14px">${fJPY(e.jpy)}</b><small class="muted" style="font-size:12px">${fKZT(expKZT(e, cs))}</small></span></button>`).join('')}</div></div>`).join('') : '<div class="card empty">Трат пока нет. «+ Трата» внизу — сумма в иенах, тенге посчитаются сами.</div>'}
    ${exRows.length ? `<div class="stack" style="gap:6px"><span class="label">Обмены и снятия</span><div class="card pad0">${exRows.map(x => `<button class="list-row" data-act="editExch" data-id="${x.id}"><span class="grow"><b style="display:block;font-size:14px">${esc(x.note || 'Обмен')}</b><small class="muted" style="font-size:12px">${fDay(x.date)} · курс ${fRate(x.kzt / x.jpy)}</small></span><span class="num" style="text-align:right;display:flex;flex-direction:column"><b style="font-size:14px">+${fJPY(x.jpy)}</b><small class="muted" style="font-size:12px">−${fKZT(x.kzt)}</small></span></button>`).join('')}</div></div>` : ''}
  </div>
  <div class="money-fabs"><button class="btn primary" style="flex:2" data-act="addExp">+ Трата</button><button class="btn" style="flex:1" data-act="exchSheet">Обмен</button></div>`;
}
A.addExp = () => openSheet({ type: 'exp', draft: { id: '', amt: '', wallet: U.expenses.length ? (U.expenses[U.expenses.length - 1].wallet || 'card') : 'card', cat: '', note: '', date: todayDate(), kzt: '' } });
A.editExp = el => { const e = U.expenses.find(x => x.id === el.dataset.id); if (e) openSheet({ type: 'exp', draft: { id: e.id, amt: String(e.jpy), wallet: e.wallet, cat: e.cat, note: e.note || '', date: e.date, kzt: e.kztManual ? String(e.kzt) : '' } }); };
SHEETS.exp = spec => {
  const d = spec.draft; const cs = cashStats(); const amt = +d.amt || 0;
  const kzt = d.wallet === 'cash' ? amt * cs.avg : (+d.kzt || amt * cardRate());
  const head = `<h2>${d.id ? 'Трата' : 'Новая трата'}</h2>`;
  const body = `
    <div class="amount" id="amt"><b class="num">${fJPY(amt)}</b><span class="num">≈ ${fKZT(kzt)} · курс ${fRate(d.wallet === 'cash' ? cs.avg : cardRate())}</span></div>
    <div class="seg"><button data-act="expWallet" data-v="card" aria-pressed="${d.wallet !== 'cash'}">Карта</button><button data-act="expWallet" data-v="cash" aria-pressed="${d.wallet === 'cash'}">Наличные · ${fJPY(cs.left)}</button></div>
    <div class="chips wrap">${budgets().map(b => `<button class="chip" data-act="expCat" data-id="${b.id}" aria-pressed="${d.cat === b.id}">${esc(b.name)}</button>`).join('')}</div>
    <label class="field"><span>Что купили</span><input data-f="note" value="${esc(d.note)}" placeholder="Кроссовки, ABC-Mart"></label>
    <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map(k => `<button data-act="kp" data-k="${k}">${k}</button>`).join('')}</div>
    <div class="grid2"><label class="field"><span>Дата</span><input type="date" data-f="date" value="${esc(d.date)}"></label>${d.wallet !== 'cash' ? `<label class="field"><span>₸ по выписке</span><input data-f="kzt" inputmode="numeric" value="${esc(d.kzt)}" placeholder="авто"></label>` : '<span></span>'}</div>
    <button class="btn primary wide" data-act="saveExp">Сохранить</button>
    ${d.id ? '<button class="btn warn wide" data-act="delExp">Удалить</button>' : ''}`;
  return { head, body };
};
function updAmt() { const el = $('#amt'); if (!el) return; const d = S.sheet.draft; const cs = cashStats(); const amt = +d.amt || 0; const kzt = d.wallet === 'cash' ? amt * cs.avg : (+d.kzt || amt * cardRate()); el.innerHTML = `<b class="num">${fJPY(amt)}</b><span class="num">≈ ${fKZT(kzt)} · курс ${fRate(d.wallet === 'cash' ? cs.avg : cardRate())}</span>`; }
A.kp = el => { const d = S.sheet.draft; const k = el.dataset.k; if (k === '⌫') d.amt = d.amt.slice(0, -1); else if ((d.amt + k).length <= 8) d.amt = (d.amt + k).replace(/^0+/, ''); saveState(); updAmt(); };
A.expWallet = el => { S.sheet.draft.wallet = el.dataset.v; saveState(); rerenderSheetKeepScroll(); };
A.expCat = el => { S.sheet.draft.cat = el.dataset.id; saveState(); rerenderSheetKeepScroll(); };
A.saveExp = () => {
  const d = S.sheet.draft; const jpy = +d.amt || 0;
  if (!jpy) return toast('Введи сумму');
  if (!d.cat) return toast('Выбери статью');
  const rec = { id: d.id || uid('e'), jpy, wallet: d.wallet, cat: d.cat, note: d.note.trim(), date: d.date || todayDate(), ts: new Date().toISOString() };
  if (d.wallet !== 'cash') { rec.rate = cardRate(); rec.kzt = +d.kzt ? +d.kzt : Math.round(jpy * rec.rate); rec.kztManual = !!+d.kzt; }
  if (d.id) { const i = U.expenses.findIndex(x => x.id === d.id); const old = U.expenses[i]; if (old && old.wallet !== 'cash' && rec.wallet !== 'cash' && !rec.kztManual && old.jpy === jpy) { rec.rate = old.rate; rec.kzt = old.kzt; } rec.ts = old ? old.ts : rec.ts; U.expenses[i] = rec; }
  else U.expenses.push(rec);
  if (rec.wallet === 'cash' && cashStats().left < 0) toast('Наличных меньше нуля — запиши обмен'); else toast('Записано');
  saveUser(); closeSheet(); renderMoney();
};
A.delExp = el => { if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Точно удалить?'; return; } U.expenses = U.expenses.filter(x => x.id !== S.sheet.draft.id); saveUser(); closeSheet(); renderMoney(); };

A.exchSheet = () => openSheet({ type: 'exch', draft: { id: '', jpy: '', kzt: '', note: '', date: todayDate() } });
A.editExch = el => { const x = U.exch.find(e => e.id === el.dataset.id); if (x) openSheet({ type: 'exch', draft: { id: x.id, jpy: String(x.jpy), kzt: String(x.kzt), note: x.note || '', date: x.date } }); };
SHEETS.exch = spec => {
  const d = spec.draft;
  return {
    head: `<h2>Обмен или снятие наличных</h2><div class="muted" style="font-size:13px;margin-top:2px">Сколько иен получил и сколько тенге это стоило</div>`,
    body: `<div class="grid2"><label class="field"><span>Получил ¥</span><input data-f="jpy" inputmode="numeric" value="${esc(d.jpy)}" placeholder="30000"></label><label class="field"><span>Списали ₸</span><input data-f="kzt" inputmode="numeric" value="${esc(d.kzt)}" placeholder="87000"></label></div>
    <label class="field"><span>Где</span><input data-f="note" value="${esc(d.note)}" placeholder="Банкомат 7-Eleven / обменник в Алматы"></label>
    <label class="field"><span>Дата</span><input type="date" data-f="date" value="${esc(d.date)}"></label>
    <p class="hint">Траты наличными пересчитываются в тенге по среднему курсу всех обменов. Комиссию банкомата включай в «Списали ₸».</p>
    <button class="btn primary wide" data-act="saveExch">Сохранить</button>${d.id ? '<button class="btn warn wide" data-act="delExch">Удалить</button>' : ''}`
  };
};
A.saveExch = () => {
  const d = S.sheet.draft; const jpy = +String(d.jpy).replace(/\s/g, ''), kzt = +String(d.kzt).replace(/\s/g, '');
  if (!jpy || !kzt) return toast('Нужны обе суммы');
  const rec = { id: d.id || uid('x'), jpy, kzt, note: d.note.trim(), date: d.date || todayDate() };
  if (d.id) U.exch[U.exch.findIndex(x => x.id === d.id)] = rec; else U.exch.push(rec);
  saveUser(); closeSheet(); renderMoney(); toast('Обмен записан');
};
A.delExch = el => { if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Точно удалить?'; return; } U.exch = U.exch.filter(x => x.id !== S.sheet.draft.id); saveUser(); closeSheet(); renderMoney(); };

A.rateSheet = () => openSheet({ type: 'rate', draft: { manual: U.rate.manual ? String(U.rate.manual) : '', markup: String(markup()) } });
SHEETS.rate = spec => {
  const d = spec.draft;
  return {
    head: '<h2>Курс иены</h2>',
    body: `<div class="card" style="border:1px solid var(--line2)"><div class="between"><span>Сейчас</span><b>1 ¥ = ${fRate(rateBase())} ₸</b></div><div class="hint" style="margin-top:6px">${U.rate.manual ? 'Задан вручную' : U.rate.api ? 'Из интернета, ' + new Date(U.rate.apiAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Курс НБ РК на 18.10 — обнови в поездке'}</div></div>
    <button class="btn ghost wide" data-act="rateFetch">Обновить из интернета</button>
    <label class="field"><span>Свой курс (пусто = авто)</span><input data-f="manual" inputmode="decimal" value="${esc(d.manual)}" placeholder="${fRate(U.rate.api || T.rateDefault)}"></label>
    <label class="field"><span>Наценка банка по карте, %</span><input data-f="markup" inputmode="decimal" value="${esc(d.markup)}"></label>
    <p class="hint">Траты по карте сохраняют курс на момент записи. Если в выписке сумма другая — впиши её в трату в поле «₸ по выписке».</p>
    <button class="btn primary wide" data-act="rateSave">Сохранить</button>`
  };
};
A.rateFetch = async () => {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/JPY'); const j = await r.json();
    if (!j.rates || !j.rates.KZT) throw 0;
    U.rate.api = +j.rates.KZT.toFixed(4); U.rate.apiAt = Date.now(); saveUser(); toast('Курс обновлён: ' + fRate(U.rate.api)); rerenderSheetKeepScroll(); renderMoney();
  } catch (e) { toast('Не получилось — нет связи'); }
};
A.rateSave = () => { const d = S.sheet.draft; const m = parseFloat(String(d.manual).replace(',', '.')); U.rate.manual = m > 0 ? m : null; const mk = parseFloat(String(d.markup).replace(',', '.')); U.rate.markup = isNaN(mk) ? null : mk; saveUser(); closeSheet(); renderMoney(); };
A.budgetSheet = () => openSheet({ type: 'budget', draft: Object.fromEntries(budgets().map(b => [b.id, String(b.kzt || '')])) });
SHEETS.budget = spec => ({
  head: '<h2>Лимиты, ₸</h2>',
  body: `${budgets().map(b => `<label class="field"><span>${esc(b.name)}</span><input data-f="${b.id}" inputmode="numeric" value="${esc(spec.draft[b.id])}" placeholder="без лимита"></label>`).join('')}<button class="btn primary wide" data-act="budgetSave">Сохранить</button>`
});
A.budgetSave = () => { for (const [k, v] of Object.entries(S.sheet.draft)) U.budgets[k] = +String(v).replace(/\s/g, '') || 0; saveUser(); closeSheet(); renderMoney(); };

// ============================================================
// PHRASES / CONTACTS / CHECKLISTS
// ============================================================
function renderPhrases() {
  const v = $('#v-phrases'); const seg = S.phr || 'phrases';
  let body = '';
  if (seg === 'phrases') {
    const [feat, ...rest] = T.phrases;
    body = `<div class="card feature stack" style="gap:8px"><div class="between"><span class="label" style="color:var(--indigo)">${esc(feat.title)}</span><span class="muted" style="font-size:12px">18 ноября</span></div><p class="ja" lang="ja" style="margin:0;font-weight:700;font-size:19px;line-height:1.55">${esc(feat.ja)}</p><p class="muted" style="margin:0;font-size:13px;line-height:1.4">${esc(feat.ru)}</p>${feat.extra ? `<p class="ja" lang="ja" style="margin:0;font-size:13px;background:var(--ground);border-radius:8px;padding:8px 10px;white-space:pre-line">${esc(feat.extra)}</p>` : ''}<button class="btn primary" data-act="phrase" data-id="${feat.id}">Показать крупно</button></div>
    <div class="card pad0">${rest.map(p => `<button class="phrase" data-act="phrase" data-id="${p.id}"><span class="ja" lang="ja">${esc(p.ja)}</span><span>${esc(p.ru)}</span></button>`).join('')}</div>`;
  } else if (seg === 'contacts') {
    body = `<div class="sos"><a href="tel:110" data-keep="1"><b>110</b><span>полиция</span></a><a href="tel:119" data-keep="1"><b>119</b><span>скорая и пожарные</span></a></div>
    <div class="card pad0">${T.contacts.filter(c => !['110', '119'].includes(c.phone)).map(c => `<a class="list-row" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}" data-keep="1"><span class="grow"><b style="display:block;font-size:15px">${esc(c.name)}</b><small class="muted" style="font-size:13px">${esc(c.phone)}${c.note ? ' · ' + esc(c.note) : ''}</small></span><span class="tl-go">${I.chev}</span></a>`).join('')}</div>`;
  } else if (seg === 'shop') {
    const sub = S.shopSub || 'places';
    body = `<div class="chips"><button class="chip" data-act="shopSub" data-v="places" aria-pressed="${sub === 'places'}">Магазины</button><button class="chip" data-act="shopSub" data-v="pharm" aria-pressed="${sub === 'pharm'}">Аптека</button><button class="chip" data-act="shopSub" data-v="uniq" aria-pressed="${sub === 'uniq'}">Только в Японии</button></div>` + (sub === 'pharm' ? pharmGuide() : sub === 'uniq' ? uniqGuide() : guideByCity(p => p.cat === 'shop' || (p.cat === 'sight' && p.sub === 'Аттракцион' && !p._base) || (p.cat === 'sight' && p.sub === 'Аттракцион' && String(p.id).startsWith('ig-')), 'Пока пусто — добавляй магазины на карту, они появятся здесь.'));
  } else if (seg === 'food') {
    const kb = (T.guides && T.guides.konbini) || [];
    body = guideByCity(p => p.cat === 'food', 'Пока пусто — добавляй кафе на карту, они появятся здесь.') + (kb.length ? `<div class="stack" style="gap:6px"><span class="label">Попробовать в комбини</span><div class="card pad0">${kb.map(k => `<div class="list-row" style="flex-direction:column;align-items:stretch;gap:2px"><b style="font-size:15px">${esc(k.name)}</b><small class="ja muted" lang="ja">${esc(k.ja)}</small><span style="font-size:13px;line-height:1.45">${esc(k.what)}</span></div>`).join('')}</div></div>` : '');
  } else {
    body = T.checklists.map(cl => {
      const st = U.checks[cl.id] || {}; const extra = U.extraChecks[cl.id] || [];
      const items = cl.items.map((t, i) => ({ t, k: String(i) })).concat(extra.map((t, i) => ({ t, k: 'x' + i })));
      const done = items.filter(it => st[it.k]).length;
      return `<div class="stack" style="gap:6px"><div class="between"><span class="label">${esc(cl.title)}</span><span class="muted" style="font-size:12px">${done} / ${items.length}</span></div><div class="card pad0">${items.map(it => `<button class="check${st[it.k] ? ' on' : ''}" data-act="check" data-l="${cl.id}" data-k="${it.k}"><span class="box">${I.check}</span><span class="t">${esc(it.t)}</span></button>`).join('')}
      <div class="row" style="padding:8px 0 10px"><input id="add-${cl.id}" placeholder="Добавить пункт" style="flex:1;height:40px;border-radius:10px;border:1px solid var(--line);background:var(--field);padding:0 12px;font-size:16px"><button class="btn sm" data-act="checkAdd" data-l="${cl.id}">${I.plus}</button></div></div></div>`;
    }).join('');
  }
  v.innerHTML = `<div class="head" style="flex-direction:column;align-items:stretch;gap:12px"><h1 class="title">Шпаргалки</h1><div class="seg seg5">${[['phrases', 'Фразы'], ['contacts', 'Контакты'], ['checks', 'Списки'], ['shop', 'Шопинг'], ['food', 'Еда']].map(([k, l]) => `<button data-act="phrSeg" data-v="${k}" aria-pressed="${seg === k}">${l}</button>`).join('')}</div></div><div class="stack">${body}</div>`;
}
function placeExtras(p) {
  const tips = Array.isArray(p.tips) ? p.tips : []; const links = (Array.isArray(p.links) ? p.links : []).filter(l => l && safeUrl(l.url));
  return (tips.length ? `<div class="card stack" style="gap:6px;background:var(--indigo-s)"><b>Как купить и советы</b>${tips.map(t => `<div style="font-size:14px;line-height:1.45">• ${esc(t)}</div>`).join('')}</div>` : '')
    + (links.length ? `<div class="stack" style="gap:6px">${links.map((l, i) => `<a class="btn ${i ? '' : 'primary'} wide" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener" data-keep="1">${I.ext}${esc(l.label || 'Сайт')}</a>`).join('')}</div>` : '');
}
function guideCard(p) {
  const c = catById(p.cat), m = meta(p.id), src = p.source || {};
  const facts = [p.hours, p.price].filter(Boolean).map(esc).join(' · ');
  return `<div class="card stack" style="gap:7px">
    <div class="between" style="align-items:flex-start"><b style="font-size:16px;line-height:1.3">${m.must ? '★ ' : ''}${esc(p.name)}${m.status === 'been' ? ' ✓' : ''}</b><span class="badge" style="background:${c.color}22;color:${c.color};flex:none">${esc(p.sub || c.name)}</span></div>
    ${p.notes ? `<div style="font-size:14px;line-height:1.45">${esc(p.notes)}</div>` : ''}
    ${p.try ? `<div class="quote" style="border-left-color:var(--good)"><b>Брать / пробовать:</b> ${esc(p.try)}</div>` : ''}
    ${facts ? `<div class="muted" style="font-size:13px">${facts}</div>` : ''}
    ${placeExtras(p)}
    ${m.note ? `<div style="font-size:13px"><b>Моя заметка:</b> ${esc(m.note)}</div>` : ''}
    ${src.text ? `<div class="quote">${esc(src.text)}${src.type ? ` <span class="badge grey">${esc(SRC[src.type] || src.type)}</span>` : ''}</div>` : ''}
    <div class="row"><button class="btn sm grow" data-act="place" data-id="${esc(p.id)}">На карте</button><a class="btn sm grow" href="${esc(gmapsPlaceUrl(p))}" target="_blank" rel="noopener" data-keep="1">Google Maps</a>${safeUrl(src.url) ? `<a class="btn sm" href="${esc(safeUrl(src.url))}" target="_blank" rel="noopener" data-keep="1">Пост</a>` : ''}</div>
  </div>`;
}
function guideByCity(filter, empty) {
  const list = getPlaces().filter(filter);
  if (!list.length) return `<div class="card empty">${empty}</div>`;
  return T.cities.map(c => { const xs = list.filter(p => p.city === c.id); return xs.length ? `<div class="stack" style="gap:8px"><span class="label">${esc(c.name)} · ${xs.length}</span>${xs.map(guideCard).join('')}</div>` : ''; }).join('')
    + (list.some(p => !T.cities.some(c => c.id === p.city)) ? `<div class="stack" style="gap:8px"><span class="label">Другое</span>${list.filter(p => !T.cities.some(c => c.id === p.city)).map(guideCard).join('')}</div>` : '');
}
function pharmGuide() {
  const g = (T.guides && T.guides.pharmacy) || []; const av = (T.guides && T.guides.avoid) || [];
  const groups = [...new Set(g.map(x => x.g))];
  return `<div class="card stack" style="gap:6px;background:var(--indigo-s)"><b>Как покупать</b><span style="font-size:13px;line-height:1.45">Нажми на товар — покажется крупно по-японски, покажи аптекарю. Tax-free с 1.11: платишь полную цену с паспортом, налог вернут после проверки на таможне в Нарите — покупки держать под рукой до сдачи багажа. Цены примерные.</span></div>`
    + groups.map(gr => `<div class="stack" style="gap:6px"><span class="label">${esc(gr)}</span><div class="card pad0">${g.map((x, i) => x.g !== gr ? '' : `<button class="list-row" data-act="pharm" data-i="${i}" style="flex-direction:column;align-items:stretch;gap:3px"><span class="between"><b style="font-size:15px">${esc(x.name)}</b><span class="muted num" style="font-size:12px;flex:none">${esc(x.price || '')}</span></span><small class="ja muted" lang="ja">${esc(x.ja)}</small><span style="font-size:13px;line-height:1.45">${esc(x.what)}</span>${x.warn ? `<span class="badge warn" style="white-space:normal;height:auto;padding:3px 8px;align-self:flex-start">${esc(x.warn)}</span>` : ''}</button>`).join('')}</div></div>`).join('')
    + (av.length ? `<div class="stack" style="gap:6px"><span class="label" style="color:var(--warn)">Не везти домой</span><div class="card pad0" style="border:1px solid var(--warn-s)">${av.map(x => `<div class="list-row" style="flex-direction:column;align-items:stretch;gap:3px"><b style="font-size:15px;color:var(--warn-d)">${esc(x.name)}</b><small class="ja muted" lang="ja">${esc(x.ja)}</small><span style="font-size:13px;line-height:1.45">${esc(x.why)}</span></div>`).join('')}</div></div>` : '');
}
function uniqGuide() {
  const g = (T.guides && T.guides.unique) || []; const groups = [...new Set(g.map(x => x.g))];
  if (!g.length) return '<div class="card empty">Пока пусто.</div>';
  return `<div class="card stack" style="gap:6px;background:var(--indigo-s)"><b>Чего нет больше нигде</b><span style="font-size:13px;line-height:1.45">Отобрано под маршрут и даты. Нажми на пункт с меткой — откроется на карте.</span></div>`
    + groups.map(gr => `<div class="stack" style="gap:6px"><span class="label">${esc(gr)}</span><div class="card pad0">${g.map(x => x.g !== gr ? '' : `<${x.place ? `button data-act="place" data-id="${esc(x.place)}"` : 'div'} class="list-row" style="flex-direction:column;align-items:stretch;gap:3px;text-align:left"><span class="between"><b style="font-size:15px">${esc(x.name)}</b>${x.place ? `<span class="tl-go" style="flex:none">${I.chev}</span>` : ''}</span><small class="ja muted" lang="ja">${esc(x.ja)}</small><span style="font-size:13px;line-height:1.45">${esc(x.what)}</span>${x.warn ? `<span class="badge warn" style="white-space:normal;height:auto;padding:3px 8px;align-self:flex-start">${esc(x.warn)}</span>` : ''}</${x.place ? 'button' : 'div'}>`).join('')}</div></div>`).join('');
}
A.shopSub = el => { S.shopSub = el.dataset.v; saveState(); renderPhrases(); $('#v-phrases').scrollTop = 0; };
A.pharm = el => { const x = T.guides.pharmacy[+el.dataset.i]; if (x) showBig({ title: x.name, ja: x.ja, sub: 'これを探しています。', ru: 'Ищу вот это — покажите аптекарю. ' + (x.what || '') }); };
A.phrSeg = el => { S.phr = el.dataset.v; saveState(); renderPhrases(); $('#v-phrases').scrollTop = 0; };
A.phrase = el => { const p = T.phrases.find(x => x.id === el.dataset.id); if (p) showBig({ title: p.title, ja: p.ja, sub: p.extra || '', ru: p.ru }); };
A.check = el => { const l = el.dataset.l, k = el.dataset.k; U.checks[l] = U.checks[l] || {}; if (U.checks[l][k]) delete U.checks[l][k]; else U.checks[l][k] = true; saveUser(); const st = $('#v-phrases').scrollTop; renderPhrases(); $('#v-phrases').scrollTop = st; };
A.checkAdd = el => { const l = el.dataset.l; const inp = $('#add-' + l); const t = inp.value.trim(); if (!t) return; (U.extraChecks[l] = U.extraChecks[l] || []).push(t); saveUser(); const st = $('#v-phrases').scrollTop; renderPhrases(); $('#v-phrases').scrollTop = st; };

// ============================================================
// SETTINGS / IMPORT / BACKUP / OFFLINE TILES
// ============================================================
A.settings = () => openSheet({ type: 'settings', draft: { imp: '' } });
SHEETS.settings = spec => {
  const hidden = T.places.filter(p => meta(p.id).hidden);
  return {
    head: '<h2>Настройки</h2>',
    body: `
    <div class="stack" style="gap:6px"><span class="label">Данные поездки</span><div class="row"><span class="grow muted" style="font-size:13px">Версия ${esc(REV)} · ${DOCS.length} документов · ${T.places.length} мест</span><button class="btn sm" data-act="checkUpd">Проверить обновление</button></div></div>
    <div class="stack" style="gap:6px"><span class="label">Импорт мест от Claude</span><textarea data-f="imp" style="min-height:90px;border-radius:12px;border:1px solid var(--line);background:var(--field);padding:10px 12px;font-size:14px;font-family:ui-monospace,monospace" placeholder='Вставь JSON с местами'>${esc(spec.draft.imp)}</textarea><button class="btn ghost" data-act="importPlaces">Импортировать</button><span class="hint">Скидываешь мне ссылки из Instagram/Reddit — я отдаю готовый блок, ты вставляешь сюда. Совпадающие места обновятся, не задвоятся.</span></div>
    <div class="stack" style="gap:6px"><span class="label">Карта без интернета</span><span class="hint">Всё, что ты уже смотрел на карте, хранится на телефоне. Пролистай нужные районы на Wi-Fi с приближением до уровня улиц — потом они откроются без сети.</span></div>
    <div class="stack" style="gap:6px"><span class="label">Резервная копия</span><div class="row"><button class="btn sm grow" data-act="backup">Сохранить копию</button><label class="btn sm grow">Восстановить<input type="file" accept="application/json,.json" data-chg="restore" hidden></label></div><span class="hint">Мои места, заметки, маршруты, траты, чек-листы. Стоит сохранять копию в «Файлы» раз в пару дней.</span></div>
    ${hidden.length ? `<div class="stack" style="gap:6px"><span class="label">Скрытые места</span>${hidden.map(p => `<div class="between"><span>${esc(p.name)}</span><button class="btn sm" data-act="unhide" data-id="${p.id}">Вернуть</button></div>`).join('')}</div>` : ''}
    <button class="btn warn" data-act="lockApp">Заблокировать (нужен будет пароль)</button>`
  };
};
A.checkUpd = () => checkUpdate(true);
A.unhide = el => { setMeta(el.dataset.id, { hidden: undefined }); rerenderSheetKeepScroll(); refreshMarkers(); };
A.lockApp = async el => { if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Точно? Мои данные останутся'; return; } await idb.del('key'); await idb.del('bundle'); closeSheet(); closeOverlay(); location.reload(); };
A.importPlaces = () => {
  let data; try { data = JSON.parse(S.sheet.draft.imp); } catch (e) { return toast('Это не JSON — скопируй блок целиком'); }
  const arr = Array.isArray(data) ? data : (data.places || []);
  let add = 0, upd = 0;
  for (const raw of arr) {
    if (!raw || !raw.name || raw.lat == null || raw.lng == null) continue;
    const p = Object.assign({}, raw); p.lat = +p.lat; p.lng = +p.lng;
    if (!p.cat || !T.categories.some(c => c.id === p.cat)) p.cat = 'sight';
    if (!p.city) p.city = nearestCity(p.lat, p.lng);
    if (typeof p.source === 'string') p.source = { text: p.source };
    p.id = p.id ? (p.id.startsWith('u-') ? p.id : 'u-' + p.id) : uid('u-');
    const i = U.places.findIndex(x => x.id === p.id || (x.name === p.name && Math.abs(x.lat - p.lat) < 1e-4));
    if (i >= 0) { p.id = U.places[i].id; U.places[i] = Object.assign({}, U.places[i], p); upd++; } else { p.created = new Date().toISOString(); U.places.push(p); add++; }
    if (raw.day && tripDays().includes(raw.day)) setMeta(p.id, { day: raw.day });
    if (raw.must) setMeta(p.id, { must: true });
  }
  saveUser(); S.sheet.draft.imp = ''; saveState(); rerenderSheetKeepScroll(); refreshMarkers();
  toast(`Добавлено ${add}, обновлено ${upd}`);
};
A.backup = async () => {
  const blob = new Blob([JSON.stringify({ app: 'japan-trip', at: new Date().toISOString(), user: U }, null, 1)], { type: 'application/json' });
  const name = `japan-backup-${todayDate()}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; } } catch (e) { return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
};
A.restore = async el => {
  const f = el.files[0]; if (!f) return;
  try { const j = JSON.parse(await f.text()); if (!j.user) throw 0; U = Object.assign(clone(DEF_USER), j.user); saveUser(); toast('Восстановлено'); closeSheet(); renderAll(); refreshMarkers(); drawRoute(); }
  catch (e) { toast('Файл не подходит'); }
};
// ---------- go ----------
boot();
