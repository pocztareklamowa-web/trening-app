'use strict';
/* Trening — panel treningowy. Dane: prywatne repo GitHub (dane/…), klucz tylko na tym urządzeniu. */

const APP_VERSION = '1.0.0';
const DEFAULT_REPO = 'pocztareklamowa-web/trening';
const DEFAULT_BRANCH = 'main';
const K = { token: 'trening:token', repo: 'trening:repo', branch: 'trening:branch', theme: 'trening:theme', snap: 'trening:snapshot:v1' };
const DAY_SHORT = ['Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sb', 'Nd'];
const KIND_LABEL = { key: 'Sesja kluczowa', endurance: 'Wytrzymałość', long: 'Długa jazda', strength: 'Siła', group: 'Jazda w grupie', rest: 'Wolne', other: 'Inny sport', test: 'Test' };
const DOMAINS = [
  { id: 'rec', label: 'Regeneracja', range: '< 56%', max: 0.555, css: '--d-rec' },
  { id: 'mod', label: 'Umiarkowana', range: '56–75%', max: 0.755, css: '--d-mod' },
  { id: 'heavy', label: 'Ciężka', range: '76–105%', max: 1.055, css: '--d-heavy' },
  { id: 'severe', label: 'Bardzo ciężka', range: '> 105%', max: Infinity, css: '--d-severe' },
];

/* ---------------- pamięć urządzenia ---------------- */
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* prywatny tryb */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
  json(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
};

/* ---------------- DOM ---------------- */
const $ = (s, r = document) => r.querySelector(s);
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  append(n, kids);
  return n;
}
function append(n, kids) {
  for (const c of kids.flat()) {
    if (c === null || c === undefined || c === false) continue;
    n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return n;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs = {}, ...kids) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined) continue;
    if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c) n.appendChild(c);
  return n;
}
function icon(name) {
  const paths = {
    check: 'M5 12.5l4.2 4.2L19 7',
    close: 'M6 6l12 12M18 6L6 18',
    down: 'M12 4v11m0 0l-5-5m5 5l5-5M5 20h14',
    cal: 'M3.5 5h17v15.5h-17zM3.5 10h17M8 3v4M16 3v4',
    share: 'M12 4v11M7 9l5-5 5 5M5 14v5h14v-5',
    left: 'M15 5l-7 7 7 7',
    right: 'M9 5l7 7-7 7',
    dot: 'M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
    warn: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  };
  const s = sv('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  const p = sv('path', { d: paths[name] || '', fill: name === 'dot' ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  s.appendChild(p);
  return s;
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2800);
}

/* ---------------- daty ---------------- */
const pad = (n) => String(n).padStart(2, '0');
function parseDate(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); }
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayISO() { return isoDate(new Date()); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function weekKey(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t - y0) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(w)}`;
}
function weekMonday(key) {
  const [y, w] = key.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const dow = jan4.getDay() || 7;
  return addDays(jan4, 1 - dow + (w - 1) * 7);
}
const dowIdx = (d) => (d.getDay() + 6) % 7;
const fmt = {
  dayLong: (d) => cap(d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })),
  dayMonth: (d) => d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }),
  short: (d) => `${d.getDate()}.${pad(d.getMonth() + 1)}`,
  month: (d) => cap(d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })),
  time: (d) => d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
  num: (v, dec = 0) => (v === null || v === undefined || Number.isNaN(v)) ? '–' : Number(v).toLocaleString('pl-PL', { minimumFractionDigits: dec, maximumFractionDigits: dec }),
};
function signed(v, dec = 0) { if (v === null || v === undefined || Number.isNaN(v)) return '–'; const a = fmt.num(Math.abs(v), dec); return v > 0 ? `+${a}` : v < 0 ? `−${a}` : a; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function weekRangeLabel(key) {
  const m = weekMonday(key), e = addDays(m, 6);
  return m.getMonth() === e.getMonth()
    ? `${m.getDate()}–${fmt.dayMonth(e)}`
    : `${fmt.dayMonth(m)} – ${fmt.dayMonth(e)}`;
}
function mmss(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60);
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function durLabel(sec) {
  if (sec < 60) return `${sec} s`;
  if (sec % 60 === 0 && sec < 3600) return `${sec / 60} min`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ${sec % 60} s`;
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

/* ---------------- trening: kroki (ten sam format co build_workout.py) ---------------- */
function parseDuration(v) {
  if (typeof v === 'number') return Math.round(v);
  const s = String(v || '').trim().toLowerCase().replace(/\s+/g, '');
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s));
  let m = s.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  m = s.match(/^(\d+):(\d{2})$/);
  if (m) return +m[1] * 60 + +m[2];
  let tot = 0;
  for (const mm of s.matchAll(/(\d+(?:\.\d+)?)(h|min|m|s|sek|sec)/g)) {
    tot += parseFloat(mm[1]) * ({ h: 3600, min: 60, m: 60, s: 1, sek: 1, sec: 1 }[mm[2]]);
  }
  return Math.round(tot);
}
function frac(v, ftp) {
  if (typeof v === 'string') {
    const s = v.trim().replace(',', '.');
    if (s.endsWith('%')) return parseFloat(s) / 100;
    if (/w$/i.test(s)) return ftp ? parseFloat(s) / ftp : 0.6;
    v = parseFloat(s);
  }
  v = Number(v);
  return v > 3 ? v / 100 : v;
}
const TYPE_ALIASES = { work: 'steady', interval: 'steady', on: 'steady', active: 'steady', rest: 'recovery', off: 'recovery', easy: 'recovery', freeride: 'free', free_ride: 'free', max: 'sprint', 'warm-up': 'warmup', 'cool-down': 'cooldown' };
function parseStep(d, ftp) {
  const t0 = String(d.type || 'steady').toLowerCase();
  const type = TYPE_ALIASES[t0] || t0;
  const st = { type, dur: parseDuration(d.duration), text: d.text || d.cue || '', cadence: d.cadence || null };
  if (['warmup', 'cooldown', 'ramp'].includes(type)) {
    if ('from' in d || 'to' in d) { st.p0 = frac(d.from ?? 0.5, ftp); st.p1 = frac(d.to ?? 0.5, ftp); }
    else if (Array.isArray(d.power)) { st.p0 = frac(d.power[0], ftp); st.p1 = frac(d.power[1], ftp); }
    else if (d.power != null) { st.p0 = st.p1 = frac(d.power, ftp); }
    else { [st.p0, st.p1] = type === 'warmup' ? [0.45, 0.75] : [0.65, 0.4]; }
  } else if (type === 'steady' || type === 'recovery') {
    let p = d.power;
    if (d.watts != null && ftp) p = Array.isArray(d.watts) ? d.watts.map((w) => w / ftp) : d.watts / ftp;
    if (p == null) p = type === 'recovery' ? 0.5 : 0.65;
    if (Array.isArray(p)) { st.lo = frac(p[0], ftp); st.hi = frac(p[1], ftp); } else { st.lo = st.hi = frac(p, ftp); }
    st.p0 = st.p1 = (st.lo + st.hi) / 2;
  } else {
    const est = frac(d.estimate ?? (type === 'sprint' ? 1.6 : 0.6), ftp);
    st.p0 = st.p1 = est; st.free = true;
  }
  return st;
}
function parseTree(list, ftp) {
  return (list || []).map((d) => (d.repeat || d.type === 'repeat')
    ? { repeat: +(d.repeat || d.count || d.times || 1), items: parseTree(d.steps || [], ftp) }
    : parseStep(d, ftp));
}
function flatten(tree) {
  const out = [];
  for (const it of tree) {
    if (it.repeat) for (let i = 0; i < it.repeat; i++) out.push(...flatten(it.items));
    else out.push(it);
  }
  return out;
}
function segments(session, ftp) {
  if (!Array.isArray(session.steps) || !session.steps.length) return [];
  try {
    let t = 0;
    return flatten(parseTree(session.steps, ftp)).filter((s) => s.dur > 0).map((s) => { const seg = { ...s, t0: t, t1: t + s.dur }; t += s.dur; return seg; });
  } catch { return []; }
}
// Szacunkowy wydatek energetyczny sesji. Rower: praca z mocy (kJ ≈ kcal przy ~24% sprawności).
// Siła: ~6 kcal/min. Inne z czasem. Zaokrąglone do 10 kcal.
function sessionEnergy(s) {
  const segs = segments(s, s._ftp);
  if (segs.length && s._ftp) {
    let joule = 0;
    for (const g of segs) joule += ((g.p0 + g.p1) / 2) * s._ftp * g.dur;
    const kj = Math.round(joule / 1000);
    return { kcal: Math.round(kj / 10) * 10, kj };
  }
  if (s.exercises && s.exercises.length) return { kcal: Math.round(((s.duration_min || 40) * 6) / 10) * 10, kj: null };
  if (s.duration_min) return { kcal: Math.round((s.duration_min * 8) / 10) * 10, kj: null };
  return null;
}
function refuel(kcal) {
  if (kcal >= 600) return { carb: '70–90 g', prot: '30–40 g' };
  if (kcal >= 350) return { carb: '50–70 g', prot: '25–35 g' };
  return { carb: '30–50 g', prot: '20–25 g' };
}
function energyBlock(s) {
  const en = sessionEnergy(s);
  if (!en) return document.createDocumentFragment();
  const rf = refuel(en.kcal);
  const meal = el('details', { class: 'meal' },
    el('summary', { text: 'Przykładowy prosty jadłospis (dzień treningowy)' }),
    el('ul', { class: 'meal-list' },
      el('li', {}, el('b', { text: 'Śniadanie: ' }), 'owsianka 80 g płatków + mleko + banan + garść orzechów + miód'),
      el('li', {}, el('b', { text: 'Przed treningiem (1–2 h): ' }), 'ryż lub makaron z czymś lekkostrawnym; krótko przed — banan albo baton'),
      el('li', {}, el('b', { text: 'Po treningu: ' }), 'koktajl (banan + 250 ml mleka + 50 g płatków + 150 g jogurtu / miarka odżywki) albo ryż 100 g + pierś 150 g + warzywa'),
      el('li', {}, el('b', { text: 'Obiad: ' }), 'ziemniaki / ryż / makaron + ryba / mięso / jajka + warzywa + oliwa'),
      el('li', {}, el('b', { text: 'Kolacja: ' }), 'twaróg lub jajka + pieczywo pełnoziarniste + warzywa lub owoc')));
  return el('div', { class: 'energy' },
    el('h2', { style: { marginTop: '18px' }, text: 'Energia i odżywianie' }),
    el('p', { class: 'energy-kcal' }, el('b', { text: `Wydatek sesji: ≈ ${en.kcal} kcal` }), en.kj ? el('span', { class: 'cue', text: ` (${en.kj} kJ pracy)` }) : null),
    el('p', { class: 'cue', text: 'Tyle ten trening dokłada ponad zwykły dzień — zjedz to z powrotem, zwłaszcza po długiej i po sesji jakościowej.' }),
    el('p', {}, `Zaraz po treningu (okno ~30–60 min): ~${rf.carb} węglowodanów + ${rf.prot} białka.`),
    meal,
    el('p', { class: 'cue', text: 'To przykład, nie sztywna dieta — dostosuj do głodu i samopoczucia. Dokładny cel kcal na dzień policzę, jeśli podasz wzrost.' }));
}
function domainOf(p) { return DOMAINS.find((d) => p <= d.max) || DOMAINS[3]; }
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function mainTarget(segs) {
  const work = segs.filter((s) => !['warmup', 'cooldown'].includes(s.type) && !s.free);
  if (!work.length) return null;
  const tally = new Map();
  for (const s of work) {
    const k = `${(s.lo ?? s.p0).toFixed(3)}|${(s.hi ?? s.p1).toFixed(3)}`;
    tally.set(k, (tally.get(k) || 0) + s.dur);
  }
  let best = null;
  for (const [k, dur] of tally) {
    const [lo, hi] = k.split('|').map(Number);
    if (dur < 60) continue;
    if (!best || hi > best.hi) best = { lo, hi, dur };
  }
  return best;
}
const watts = (f, ftp) => Math.round(f * ftp);
function wattsLabel(lo, hi, ftp) {
  if (!ftp) return `${Math.round(lo * 100)}${hi !== lo ? `–${Math.round(hi * 100)}` : ''}% FTP`;
  const a = watts(lo, ftp), b = watts(hi, ftp);
  return a === b ? `${a}` : `${a}–${b}`;
}
function estimateTSS(segs) {
  if (!segs.length) return null;
  let tot = 0, sec = 0;
  for (const s of segs) { const p = (s.p0 + s.p1) / 2; tot += s.dur * p ** 4; sec += s.dur; }
  const np = (tot / sec) ** 0.25;
  return Math.round((sec / 3600) * np * np * 100);
}

/* ---------------- GitHub ---------------- */
class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
function repoCfg() {
  const [owner, repo] = (store.get(K.repo, DEFAULT_REPO) || DEFAULT_REPO).split('/');
  return { owner, repo, branch: store.get(K.branch, DEFAULT_BRANCH) || DEFAULT_BRANCH };
}
function contentsUrl(path) {
  const { owner, repo } = repoCfg();
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
}
async function gh(path, { accept = 'raw', method = 'GET', body } = {}) {
  const token = store.get(K.token);
  if (!token) throw new ApiError(0, 'Brak klucza');
  const { branch } = repoCfg();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: accept === 'raw' ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
  };
  if (body) headers['Content-Type'] = 'application/json';
  const url = contentsUrl(path) + (method === 'GET' ? `?ref=${encodeURIComponent(branch)}` : '');
  let res;
  try { res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }); }
  catch { throw new ApiError(-1, 'Brak połączenia'); }
  if (!res.ok) throw new ApiError(res.status, `GitHub ${res.status}`);
  return res;
}
async function getJSON(path, { optional = false } = {}) {
  try { return await (await gh(path)).json(); }
  catch (e) { if (optional && e.status === 404) return null; throw e; }
}
function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function utf8b64(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
async function putJSON(path, mutate, message) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let sha, current = null;
    try {
      const meta = await (await gh(path, { accept: 'json' })).json();
      sha = meta.sha; current = JSON.parse(utf8b64(meta.content));
    } catch (e) { if (e.status !== 404) throw e; }
    const next = mutate(current);
    const { branch } = repoCfg();
    try {
      await gh(path, { method: 'PUT', accept: 'json', body: { message, content: b64utf8(JSON.stringify(next, null, 2) + '\n'), sha, branch } });
      return next;
    } catch (e) { if (!(e.status === 409 || e.status === 422) || attempt) throw e; }
  }
  return null;
}
function explain(e) {
  if (!e) return '';
  if (e.status === -1) return 'Brak połączenia z internetem. Pokazuję ostatnio pobrane dane.';
  if (e.status === 401) return 'GitHub odrzucił klucz. Sprawdź, czy nie wygasł, i wpisz go ponownie w ustawieniach.';
  if (e.status === 403) return 'Klucz nie ma uprawnień do tego repo (potrzebne: Contents — odczyt, a do zapisu wykonania także zapis).';
  if (e.status === 404) return 'Nie znaleziono repo albo pliku. Sprawdź nazwę repo w ustawieniach.';
  if (e.status === 0) return '';
  return `GitHub zwrócił błąd ${e.status}. Spróbuj odświeżyć za chwilę.`;
}

/* ---------------- stan ---------------- */
const state = {
  view: 'dzis', index: null, historia: null, profile: null, weeks: {}, feedback: {},
  syncedAt: null, loading: false, error: null, noData: false,
  calMonth: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  calSelected: todayISO(),
};
function saveSnapshot() {
  store.set(K.snap, JSON.stringify({ savedAt: state.syncedAt, index: state.index, historia: state.historia, profile: state.profile, weeks: state.weeks, feedback: state.feedback }));
}
function loadSnapshot() {
  const s = store.json(K.snap);
  if (!s) return false;
  Object.assign(state, { index: s.index, historia: s.historia, profile: s.profile, weeks: s.weeks || {}, feedback: s.feedback || {}, syncedAt: s.savedAt ? new Date(s.savedAt) : null });
  state.noData = !state.index || !(state.index.weeks || []).length;
  return true;
}
function weeksForRange(from, to) {
  const keys = new Set();
  for (let d = new Date(from); d <= to; d = addDays(d, 7)) keys.add(weekKey(d));
  keys.add(weekKey(to));
  return [...keys];
}
async function ensureWeeks(keys) {
  const avail = new Set((state.index && state.index.weeks) || []);
  const need = keys.filter((k) => avail.has(k));
  await Promise.all(need.map(async (k) => {
    const [w, f] = await Promise.all([
      getJSON(`dane/tygodnie/${k}.json`, { optional: true }),
      getJSON(`dane/feedback/${k}.json`, { optional: true }),
    ]);
    if (w) state.weeks[k] = w;
    state.feedback[k] = f || { week: k, entries: {} };
  }));
}
async function loadAll() {
  if (!store.get(K.token)) { render(); return; }
  if (state.loading) return;
  state.loading = true; state.error = null; setSync();
  try {
    const [index, historia, profile] = await Promise.all([
      getJSON('dane/index.json', { optional: true }),
      getJSON('dane/historia.json', { optional: true }),
      getJSON('profil/profil-zawodnika.json', { optional: true }),
    ]);
    state.index = index; state.historia = historia; state.profile = profile;
    state.noData = !index || !(index.weeks || []).length;
    if (!state.noData) {
      const t = new Date();
      const keys = new Set([weekKey(t), weekKey(addDays(t, -7)), weekKey(addDays(t, 7))]);
      if (index.current_week) keys.add(index.current_week);
      const m0 = state.calMonth, m1 = new Date(m0.getFullYear(), m0.getMonth() + 1, 0);
      weeksForRange(addDays(m0, -6), addDays(m1, 6)).forEach((k) => keys.add(k));
      await ensureWeeks([...keys]);
    }
    state.syncedAt = new Date();
    saveSnapshot();
  } catch (e) {
    state.error = e;
  } finally {
    state.loading = false;
    setSync(); render();
  }
}
function setSync() {
  const s = $('#sync'), b = $('#refresh');
  b.hidden = !store.get(K.token);
  b.classList.toggle('spinning', state.loading);
  if (state.loading) { s.textContent = 'Pobieram…'; return; }
  if (state.error && state.error.status === -1) { s.textContent = state.syncedAt ? `Offline, dane z ${fmt.time(state.syncedAt)}` : 'Offline'; return; }
  s.textContent = state.syncedAt ? `Stan z ${fmt.time(state.syncedAt)}` : '';
}

/* ---------------- dane pomocnicze ---------------- */
function allSessions() {
  const out = [];
  for (const [k, w] of Object.entries(state.weeks)) {
    (w.sessions || []).forEach((s, i) => out.push({ ...s, _id: s.id || `${s.date}-${i}`, _week: k, _ftp: w.ftp || ftpNow() }));
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
function sessionsOn(date) { return allSessions().filter((s) => s.date === date); }
function feedbackFor(s) { const f = state.feedback[s._week]; return f && f.entries ? f.entries[s._id] : null; }
function ftpNow() {
  const h = state.historia && state.historia.ftp_history;
  if (h && h.length) return h[h.length - 1].ftp;
  const p = state.profile && state.profile.physiology;
  return (p && (p.ftp_w || p.fallback_ftp_w)) || null;
}
function weightNow() {
  const ws = state.historia && state.historia.weeks;
  const last = ws && [...ws].reverse().find((w) => w.weight_kg);
  return (last && last.weight_kg) || (state.profile && state.profile.weight_kg) || null;
}
const KIND_ORDER = { key: 0, test: 1, long: 2, endurance: 3, group: 4, strength: 5, other: 6, rest: 9 };
const byImportance = (a, b) => (KIND_ORDER[a.kind] ?? 7) - (KIND_ORDER[b.kind] ?? 7);
function sessionColor(s) {
  if (s.kind === 'strength' || s.kind === 'other') return cssVar('--d-strength');
  const segs = segments(s, s._ftp);
  if (segs.length) {
    const top = mainTarget(segs);
    return cssVar(domainOf(top ? top.hi : Math.max(...segs.map((x) => x.p1))).css);
  }
  if (s.kind === 'key' || s.kind === 'test') return cssVar('--d-severe');
  if (s.kind === 'group') return cssVar('--d-heavy');
  return cssVar('--d-mod');
}

/* ---------------- wykres profilu treningu ---------------- */
function profileSVG(segs, { ftp, height = 120, interactive = true, mini = false } = {}) {
  const W = 360, H = height, padT = mini ? 1 : 8, padB = mini ? 1 : 18, padR = mini ? 0 : 30;
  const total = segs.length ? segs[segs.length - 1].t1 : 1;
  const yMax = Math.min(1.8, Math.max(1.25, ...segs.map((s) => Math.max(s.p0, s.p1)) ));
  const x = (t) => (t / total) * (W - padR);
  const y = (p) => H - padB - (Math.min(p, yMax) / yMax) * (H - padT - padB);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: mini ? 'mini' : 'profile-svg', role: mini ? 'presentation' : 'img' });
  if (!mini) svg.setAttribute('aria-label', `Profil treningu, ${durLabel(total)}`);
  const g = sv('g');
  for (const s of segs) {
    const x0 = x(s.t0), x1 = x(s.t1), w = x1 - x0;
    const inset = !mini && w > 4 ? 0.75 : 0;
    const pts = [[x0 + inset, H - padB], [x0 + inset, y(s.p0)], [x1 - inset, y(s.p1)], [x1 - inset, H - padB]];
    const dom = domainOf(Math.max(s.p0, s.p1));
    g.appendChild(sv('polygon', { points: pts.map((p) => p.join(',')).join(' '), style: { fill: `var(${dom.css})` } }));
  }
  svg.appendChild(g);
  if (!mini) {
    const yf = y(1);
    svg.appendChild(sv('line', { x1: 0, x2: W - padR + 4, y1: yf, y2: yf, class: 'ftp-line' }));
    svg.appendChild(sv('text', { x: W - padR + 6, y: yf + 4, class: 'ftp-label', text: 'FTP' }));
    const mins = Math.round(total / 60);
    [[0, '0'], [x(total / 2), `${Math.round(mins / 2)}'`], [W - padR, `${mins}'`]].forEach(([xx, t], i) => {
      svg.appendChild(sv('text', { x: xx, y: H - 4, class: 'axis-time', 'text-anchor': i === 0 ? 'start' : i === 2 ? 'end' : 'middle', text: t }));
    });
    if (interactive) {
      const mark = sv('line', { y1: padT, y2: H - padB, class: 'hover-mark', style: { display: 'none' } });
      svg.appendChild(mark);
      const hit = sv('rect', { x: 0, y: 0, width: W - padR, height: H, fill: 'transparent', tabindex: '0' });
      svg.appendChild(hit);
      const show = (clientX) => {
        const r = svg.getBoundingClientRect();
        const vx = ((clientX - r.left) / r.width) * W;
        const t = Math.max(0, Math.min(total - 1, (vx / (W - padR)) * total));
        const s = segs.find((q) => t >= q.t0 && t < q.t1) || segs[segs.length - 1];
        mark.setAttribute('x1', x(t)); mark.setAttribute('x2', x(t)); mark.style.display = '';
        const p = (s.p0 + s.p1) / 2;
        const ramp = s.p0 !== s.p1;
        const wl = ftp ? (ramp ? `${watts(s.p0, ftp)}→${watts(s.p1, ftp)} W` : `${wattsLabel(s.lo ?? s.p0, s.hi ?? s.p1, ftp)} W`) : '';
        const pct = ramp ? `${Math.round(s.p0 * 100)}→${Math.round(s.p1 * 100)}% FTP` : `${Math.round((s.lo ?? p) * 100)}${s.hi && s.hi !== s.lo ? `–${Math.round(s.hi * 100)}` : ''}% FTP`;
        showTip(r.left + (x(t) / W) * r.width, r.top, [
          el('div', {}, el('b', { text: s.free ? (s.type === 'sprint' ? 'Sprint' : 'Swobodnie') : (wl || pct) })),
          el('div', { text: s.free ? 'Bez celu mocy (ERG wyłączony)' : (wl ? pct : '') }),
          el('div', { text: `${mmss(s.t0)}–${mmss(s.t1)}, ${durLabel(s.dur)}` }),
          s.text ? el('div', { text: s.text }) : null,
        ]);
      };
      hit.addEventListener('pointermove', (e) => show(e.clientX));
      hit.addEventListener('pointerdown', (e) => show(e.clientX));
      hit.addEventListener('pointerleave', () => { mark.style.display = 'none'; hideTip(); });
      hit.addEventListener('focus', () => { const r = svg.getBoundingClientRect(); show(r.left + 1); });
      hit.addEventListener('blur', () => { mark.style.display = 'none'; hideTip(); });
    }
  }
  return svg;
}
function domainLegend(segs) {
  const used = new Set(segs.map((s) => domainOf(Math.max(s.p0, s.p1)).id));
  return el('div', { class: 'legend', 'aria-label': 'Legenda: domeny intensywności' },
    DOMAINS.filter((d) => used.has(d.id)).map((d) => el('span', {}, el('i', { style: { background: `var(${d.css})` } }), `${d.label} ${d.range}`)));
}
function showTip(px, py, kids) {
  const t = $('#tooltip');
  t.replaceChildren(...kids.filter(Boolean)); t.hidden = false;
  const r = t.getBoundingClientRect();
  let left = Math.min(window.innerWidth - r.width - 8, Math.max(8, px - r.width / 2));
  let top = py - r.height - 10;
  if (top < 8) top = py + 10;
  t.style.left = `${left}px`; t.style.top = `${top}px`;
}
function hideTip() { $('#tooltip').hidden = true; }

/* ---------------- wykresy postępu ---------------- */
function niceTicks(min, max, n = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min, raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}
function lineChart({ labels, series, unit = '', dec = 0, height = 170, zero = false }) {
  const W = 360, H = height, L = 36, R = 52, T = 10, B = 22;
  const vals = series.flatMap((s) => s.values.filter((v) => v != null));
  if (!vals.length) return null;
  const ticks = niceTicks(zero ? 0 : Math.min(...vals), Math.max(...vals));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const n = labels.length;
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R));
  const y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' });
  ticks.forEach((tv) => {
    svg.appendChild(sv('line', { x1: L, x2: W - R, y1: y(tv), y2: y(tv), class: tv === y0 ? 'base' : 'grid' }));
    svg.appendChild(sv('text', { x: L - 6, y: y(tv) + 4, 'text-anchor': 'end', class: 'tick', text: fmt.num(tv, dec) }));
  });
  const step = Math.max(1, Math.ceil(n / 5));
  labels.forEach((lb, i) => { if (i % step === 0 || i === n - 1) svg.appendChild(sv('text', { x: x(i), y: H - 6, 'text-anchor': 'middle', class: 'tick', text: lb })); });
  series.forEach((s) => {
    const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
    if (pts.length > 1) svg.appendChild(sv('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', style: { stroke: s.color }, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    const lastI = s.values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop();
    if (lastI != null && lastI >= 0) {
      svg.appendChild(sv('circle', { cx: x(lastI), cy: y(s.values[lastI]), r: 4, style: { fill: s.color, stroke: 'var(--page)' }, 'stroke-width': 2 }));
      if (series.length <= 2) svg.appendChild(sv('text', { x: x(lastI) + 8, y: y(s.values[lastI]) + 4, class: 'endlabel', text: `${fmt.num(s.values[lastI], dec)}${unit ? ' ' + unit : ''}` }));
    }
  });
  const cross = sv('line', { y1: T, y2: H - B, class: 'crosshair', style: { display: 'none' } });
  svg.appendChild(cross);
  const hit = sv('rect', { x: L, y: 0, width: W - L - R, height: H, fill: 'transparent', tabindex: '0' });
  svg.appendChild(hit);
  const show = (clientX) => {
    const r = svg.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    const i = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(((vx - L) / (W - L - R)) * (n - 1))));
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.style.display = '';
    showTip(r.left + (x(i) / W) * r.width, r.top, [
      el('div', { text: labels[i] }),
      ...series.map((s) => el('div', { class: 'row' }, el('i', { class: 'key', style: { background: s.color } }), el('b', { text: s.values[i] == null ? '–' : `${fmt.num(s.values[i], dec)}${unit ? ' ' + unit : ''}` }), ` ${s.name}`)),
    ]);
  };
  hit.addEventListener('pointermove', (e) => show(e.clientX));
  hit.addEventListener('pointerdown', (e) => show(e.clientX));
  hit.addEventListener('pointerleave', () => { cross.style.display = 'none'; hideTip(); });
  hit.addEventListener('blur', () => { cross.style.display = 'none'; hideTip(); });
  hit.addEventListener('focus', () => { const r = svg.getBoundingClientRect(); show(r.right - 60); });
  return svg;
}
function barChart({ labels, values, targets, unit = 'h', dec = 1, color, height = 170 }) {
  const W = 360, H = height, L = 36, R = 12, T = 10, B = 22;
  const all = [...values, ...(targets || [])].filter((v) => v != null);
  if (!all.length) return null;
  const ticks = niceTicks(0, Math.max(...all));
  const y1 = ticks[ticks.length - 1];
  const n = labels.length, band = (W - L - R) / n, bw = Math.min(24, band * 0.6);
  const y = (v) => T + (1 - v / y1) * (H - T - B);
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' });
  ticks.forEach((tv) => {
    svg.appendChild(sv('line', { x1: L, x2: W - R, y1: y(tv), y2: y(tv), class: tv === 0 ? 'base' : 'grid' }));
    svg.appendChild(sv('text', { x: L - 6, y: y(tv) + 4, 'text-anchor': 'end', class: 'tick', text: fmt.num(tv, 0) }));
  });
  const step = Math.max(1, Math.ceil(n / 6));
  labels.forEach((lb, i) => {
    const cx = L + band * (i + 0.5);
    if (i % step === 0 || i === n - 1) svg.appendChild(sv('text', { x: cx, y: H - 6, 'text-anchor': 'middle', class: 'tick', text: lb }));
    const v = values[i];
    const g = sv('g', { tabindex: '0' });
    if (v != null && v > 0) {
      const top = y(v), base = y(0), r = Math.min(4, (base - top) / 2);
      const x0 = cx - bw / 2, x1 = cx + bw / 2;
      g.appendChild(sv('path', { d: `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x1 - r} Q${x1},${top} ${x1},${top + r} V${base} Z`, style: { fill: color } }));
    }
    if (targets && targets[i] != null) {
      g.appendChild(sv('line', { x1: cx - bw / 2 - 4, x2: cx + bw / 2 + 4, y1: y(targets[i]), y2: y(targets[i]), style: { stroke: 'var(--ink)' }, 'stroke-width': 2, 'stroke-linecap': 'round' }));
    }
    g.appendChild(sv('rect', { x: cx - band / 2, y: 0, width: band, height: H - B, fill: 'transparent' }));
    const tip = () => {
      const r = svg.getBoundingClientRect();
      showTip(r.left + (cx / W) * r.width, r.top + (y(Math.max(v || 0, targets ? targets[i] || 0 : 0)) / H) * r.height, [
        el('div', { text: labels[i] }),
        el('div', { class: 'row' }, el('i', { class: 'key', style: { background: color, height: '8px', width: '8px' } }), el('b', { text: v == null ? '–' : `${fmt.num(v, dec)} ${unit}` }), ' wykonane'),
        targets ? el('div', { class: 'row' }, el('i', { class: 'key', style: { background: 'currentColor' } }), el('b', { text: targets[i] == null ? '–' : `${fmt.num(targets[i], dec)} ${unit}` }), ' plan') : null,
      ]);
    };
    g.addEventListener('pointerenter', tip); g.addEventListener('pointerdown', tip); g.addEventListener('focus', tip);
    g.addEventListener('pointerleave', hideTip); g.addEventListener('blur', hideTip);
    svg.appendChild(g);
  });
  return svg;
}
function dataTable(headers, rows) {
  return el('table', { class: 'data' },
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { scope: 'col', text: h })))),
    el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', { text: c }))))));
}
function chartBlock(title, chart, legendItems, table) {
  if (!chart) return null;
  const tableWrap = el('div', { hidden: true }, table);
  const btn = el('button', { type: 'button', class: 'table-toggle', 'aria-expanded': 'false', text: 'Pokaż tabelę' });
  btn.addEventListener('click', () => {
    const open = tableWrap.hidden;
    tableWrap.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Ukryj tabelę' : 'Pokaż tabelę';
  });
  return el('div', { class: 'section' },
    el('h2', { text: title }),
    legendItems && legendItems.length > 1 ? el('div', { class: 'legend' }, legendItems.map((li) => el('span', {}, el('i', { class: li.line ? 'line' : '', style: { background: li.color } }), li.label))) : null,
    el('div', { class: 'chart' }, chart),
    btn, tableWrap);
}

/* ---------------- kalendarz (.ics, Google) ---------------- */
function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
function icsFold(line) {
  const out = []; let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 73) { out.push(cur); cur = ' ' + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
}
function sessionText(s) {
  return [s.target, s.why && `Po co: ${s.why}`, s.fueling && `Jedzenie: ${s.fueling}`, s.bailout && `Odpuść, gdy: ${s.bailout}`].filter(Boolean).join('\n');
}
function sessionName(s) { return [s.code, s.title].filter(Boolean).join(' ') + (s.duration_min ? ` (${s.duration_min} min)` : ''); }
function weekICS(key) {
  const w = state.weeks[key];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Trening//PL', 'CALSCALE:GREGORIAN'];
  (w.sessions || []).filter((s) => s.kind !== 'rest').forEach((s, i) => {
    const d = parseDate(s.date), n = addDays(d, 1);
    lines.push('BEGIN:VEVENT', `UID:${s.id || `${s.date}-${i}`}@trening`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${isoDate(d).replace(/-/g, '')}`, `DTEND;VALUE=DATE:${isoDate(n).replace(/-/g, '')}`,
      icsFold(`SUMMARY:${icsEscape(sessionName(s))}`), icsFold(`DESCRIPTION:${icsEscape(sessionText(s))}`), 'TRANSP:TRANSPARENT', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
function googleCalUrl(s) {
  const d = parseDate(s.date), n = addDays(d, 1);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: sessionName(s), dates: `${isoDate(d).replace(/-/g, '')}/${isoDate(n).replace(/-/g, '')}`, details: sessionText(s) });
  return `https://calendar.google.com/calendar/render?${q}`;
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function fetchFile(path) {
  const res = await gh(path);
  return res.blob();
}
// Grafika ćwiczenia z prywatnego repo (SVG) — pobierz przez API i pokaż jako obraz.
async function loadExerciseImg(imgEl, path) {
  try {
    const res = await gh(path);
    const txt = await res.text();
    imgEl.src = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' }));
  } catch (e) {
    const fig = imgEl.closest('.ex-fig');
    if (fig) fig.remove();
  }
}

/* ---------------- widoki ---------------- */
function render() {
  setSync();
  const main = $('#main');
  document.querySelectorAll('#tabbar button').forEach((b) => b.toggleAttribute('aria-current', b.dataset.view === state.view));
  document.querySelectorAll('#tabbar button[aria-current]').forEach((b) => b.setAttribute('aria-current', 'page'));
  let view;
  if (!store.get(K.token)) view = viewSetup();
  else if (state.view === 'kalendarz') view = viewCalendar();
  else if (state.view === 'postep') view = viewProgress();
  else view = viewToday();
  main.replaceChildren(...[].concat(view).filter(Boolean));
}
function errorBanner() {
  const e = state.error;
  const msg = explain(e);
  if (!msg) return null;
  if (e.status === -1 && state.index) return null; // offline z kopią: wystarczy status w nagłówku
  const fixable = [401, 403, 404].includes(e.status);
  return el('div', { class: 'section' },
    el('p', { class: e.status === -1 ? 'notice' : 'error', role: 'alert' }, msg),
    fixable ? el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn ghost', onclick: openSettings, text: 'Otwórz ustawienia' })) : null);
}
/* bez danych i z błędem: pokaż tylko komunikat, nie udawaj pustego planu */
const blocked = () => state.error && !state.index;
function viewSetup() {
  return el('div', { class: 'empty' },
    el('h2', { text: 'Połącz aplikację z repo trening' }),
    el('p', { class: 'lead', text: 'Aplikacja pokazuje plan, kalendarz i postęp, które trener zapisuje w Twoim prywatnym repo na GitHubie. Potrzebny jest klucz dostępu — wpisujesz go tylko tutaj i zostaje na tym telefonie.' }),
    tokenHowTo(),
    el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn', onclick: openSettings, text: 'Wpisz klucz' })));
}
function tokenHowTo() {
  return el('ol', { class: 'howto' },
    el('li', {}, 'Na GitHubie: Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.'),
    el('li', {}, 'Repository access: Only select repositories → trening.'),
    el('li', {}, 'Permissions → Contents: Read and write (zapis służy tylko do notowania wykonania i RPE).'),
    el('li', {}, 'Ustaw ważność (np. rok), wygeneruj i skopiuj klucz.'));
}
function emptyPlan() {
  const ask = 'Ułóż mi plan na przyszły tydzień i zapisz go w repo trening.';
  return el('div', { class: 'empty' },
    el('h2', { text: 'Pierwszy plan jeszcze nie powstał' }),
    el('p', { class: 'lead', text: 'Napisz do trenera w aplikacji Claude i dołącz dzisiejszy eksport z Garmina albo opisz sen, HRV i samopoczucie.' }),
    el('div', { class: 'quote', text: ask }),
    el('div', { class: 'actions' }, el('button', {
      type: 'button', class: 'btn ghost', text: 'Kopiuj prośbę',
      onclick: async () => { try { await navigator.clipboard.writeText(ask); toast('Skopiowano'); } catch { toast('Nie udało się skopiować'); } },
    })));
}
function heroFor(s, { label }) {
  const segs = segments(s, s._ftp);
  const top = mainTarget(segs);
  const totalMin = s.duration_min || (segs.length ? Math.round(segs[segs.length - 1].t1 / 60) : null);
  const tss = s.tss ?? estimateTSS(segs);
  const fb = feedbackFor(s);
  const wrap = el('div', { class: 'section' },
    el('p', { class: 'today-date', text: label }),
    el('h1', { class: 'today-title' }, s.code ? el('span', { class: 'today-code', text: `${s.code} ` }) : null, s.title || KIND_LABEL[s.kind] || 'Trening'));
  if (segs.length) {
    wrap.appendChild(el('div', { class: 'profile-wrap' }, profileSVG(segs, { ftp: s._ftp, height: 120 })));
  }
  const figs = el('div', { class: 'hero-figs' });
  if (top && s._ftp) figs.appendChild(el('div', { class: 'hero-watts', 'aria-label': `Cel ${wattsLabel(top.lo, top.hi, s._ftp)} watów` }, wattsLabel(top.lo, top.hi, s._ftp), el('small', { text: 'W' })));
  const facts = el('div', { class: 'facts' },
    totalMin ? el('span', {}, el('b', { text: String(totalMin) }), 'min') : null,
    tss ? el('span', {}, el('b', { text: String(tss) }), 'TSS') : null,
    top ? el('span', {}, el('b', { text: `${Math.round(top.lo * 100)}${top.hi !== top.lo ? `–${Math.round(top.hi * 100)}` : ''}` }), '% FTP') : null);
  figs.appendChild(facts);
  wrap.appendChild(figs);
  if (s.target) wrap.appendChild(el('p', { class: 'hero-sub', text: s.target }));
  if (s.why) wrap.appendChild(el('p', { class: 'small', text: s.why }));
  if (segs.length) wrap.appendChild(domainLegend(segs));
  const actions = el('div', { class: 'actions' });
  if (s.file) actions.appendChild(el('button', { type: 'button', class: 'btn', onclick: () => downloadSession(s) }, icon('down'), 'Pobierz .zwo'));
  actions.appendChild(el('button', { type: 'button', class: s.file ? 'btn ghost' : 'btn', onclick: () => openSession(s) }, fb ? 'Szczegóły i wykonanie' : 'Szczegóły i zapis wykonania'));
  wrap.appendChild(actions);
  if (fb) wrap.appendChild(el('p', { class: 'done-pill ok' }, icon('check'), doneLabel(fb)));
  return wrap;
}
function doneLabel(fb) {
  const st = { tak: 'Zrobione', czesciowo: 'Częściowo', nie: 'Nie zrobione' }[fb.done] || 'Zapisano';
  return fb.rpe ? `${st}, RPE ${fb.rpe}` : st;
}
function viewToday() {
  const out = [errorBanner()];
  if (blocked()) return out;
  if (state.noData) { out.push(emptyPlan()); return out; }
  const today = todayISO();
  const todays = sessionsOn(today).filter((s) => s.kind !== 'rest').sort(byImportance);
  const label = `Dziś, ${fmt.dayLong(new Date()).toLowerCase()}`;
  if (todays.length) {
    out.push(heroFor(todays[0], { label }));
    if (todays.length > 1) out.push(el('div', { class: 'section' }, el('h2', { text: 'Też dziś' }), el('ul', { class: 'days' }, todays.slice(1).map((s) => el('li', { class: 'day solo' }, sessionButton(s), statusCell(s))))));
  } else {
    const next = allSessions().find((s) => s.date > today && s.kind !== 'rest');
    const sec = el('div', { class: 'section' }, el('p', { class: 'today-date', text: label }), el('h1', { class: 'today-title', text: 'Dziś wolne' }));
    if (next) {
      sec.appendChild(el('p', { class: 'lead' }, `Następna sesja: ${fmt.dayLong(parseDate(next.date)).toLowerCase()}, ${sessionName(next)}.`));
      sec.appendChild(el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn ghost', text: 'Pokaż sesję', onclick: () => openSession(next) })));
    } else {
      sec.appendChild(el('p', { class: 'lead', text: 'Na kolejne dni nie ma jeszcze planu. Poproś trenera o plan na nowy tydzień.' }));
    }
    out.push(sec);
  }
  const wk = state.weeks[weekKey(new Date())] || (state.index && state.weeks[state.index.current_week]);
  if (wk) out.push(weekSection(wk));
  const nextKey = weekKey(addDays(new Date(), 7));
  if (state.weeks[nextKey] && (!wk || wk.week !== nextKey)) out.push(weekSection(state.weeks[nextKey], 'Przyszły tydzień'));
  return out;
}
function lightBadge(r) {
  if (!r || !r.light) return null;
  const key = { zielone: 'zielone', 'żółte': 'zolte', zolte: 'zolte', czerwone: 'czerwone' }[r.light] || 'zielone';
  const txt = { zielone: 'Zielone światło', zolte: 'Żółte światło', czerwone: 'Czerwone światło' }[key];
  return el('p', { class: `light ${key}` }, key === 'zielone' ? icon('dot') : icon('warn'), r.note ? `${txt}: ${r.note}` : txt);
}
function weekSection(w, title) {
  const key = w.week;
  const mon = weekMonday(key);
  const sess = (w.sessions || []).map((s, i) => ({ ...s, _id: s.id || `${s.date}-${i}`, _week: key, _ftp: w.ftp || ftpNow() }));
  const done = sess.filter((s) => s.kind !== 'rest' && feedbackFor(s) && feedbackFor(s).done === 'tak').length;
  const planned = sess.filter((s) => s.kind !== 'rest').length;
  const list = el('ul', { class: 'days' });
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i), iso = isoDate(d);
    const daySess = sess.filter((s) => s.date === iso).sort(byImportance);
    const isToday = iso === todayISO();
    const cell = el('div', { class: 'day-sessions' });
    if (!daySess.length || daySess.every((s) => s.kind === 'rest')) cell.appendChild(el('span', { class: 'rest', text: (daySess[0] && daySess[0].title) || 'Wolne' }));
    daySess.filter((s) => s.kind !== 'rest').forEach((s) => cell.appendChild(sessionButton(s)));
    const status = el('div', { class: 'day-status' }, ...daySess.filter((s) => s.kind !== 'rest').map(statusCell));
    list.appendChild(el('li', { class: `day${isToday ? ' is-today' : ''}`, 'aria-current': isToday ? 'date' : null },
      el('span', { class: 'dname' }, DAY_SHORT[i], el('b', { text: String(d.getDate()) })), cell, status));
  }
  const hours = w.planned && w.planned.hours, tss = w.planned && w.planned.tss;
  const rules = (w.rules || []).length ? el('details', { class: 'note-block' }, el('summary', { text: 'Zasady na ten tydzień' }), el('ul', {}, w.rules.map((r) => el('li', { text: r })))) : null;
  return el('div', { class: 'section' },
    el('div', { class: 'week-head' }, el('h2', { text: title || `Tydzień ${Number(key.split('-W')[1])}` }), el('span', { class: 'week-meta', text: weekRangeLabel(key) })),
    w.focus ? el('p', { class: 'lead', text: w.focus }) : null,
    lightBadge(w.readiness),
    el('p', { class: 'small' }, [hours ? `Plan: ${fmt.num(hours, 1)} h` : null, tss ? `${tss} TSS` : null, planned ? `wykonane ${done} z ${planned}` : null].filter(Boolean).join(', ')),
    list, rules,
    w.plan_file ? el('p', { class: 'small muted', text: `Pełny plan: ${w.plan_file} w repo trening.` }) : null);
}
function sessionButton(s) {
  const segs = segments(s, s._ftp);
  const btn = el('button', { type: 'button', class: 'sess-btn', onclick: () => openSession(s) },
    el('span', { class: 'sess-title', text: [s.code, s.title].filter(Boolean).join(' ') || KIND_LABEL[s.kind] }),
    el('span', { class: 'sess-min', text: s.duration_min ? `${s.duration_min}'` : '' }));
  if (segs.length) btn.appendChild(profileSVG(segs, { ftp: s._ftp, height: 18, mini: true, interactive: false }));
  else if (s.kind === 'strength' && s.exercises) btn.appendChild(el('span', { class: 'sess-sub', text: `${s.exercises.length} ćwiczeń` }));
  else if (s.target) btn.appendChild(el('span', { class: 'sess-sub', text: s.target }));
  return btn;
}
function statusCell(s) {
  const fb = feedbackFor(s);
  if (!fb) return null;
  return el('span', { class: `done-pill${fb.done === 'tak' ? ' ok' : ''}`, title: doneLabel(fb) }, fb.done === 'tak' ? icon('check') : null, fb.rpe ? `RPE ${fb.rpe}` : (fb.done === 'tak' ? '' : doneLabel(fb)));
}

/* kalendarz */
function viewCalendar() {
  const out = [errorBanner()];
  if (blocked()) return out;
  if (state.noData) { out.push(emptyPlan()); return out; }
  const m0 = state.calMonth;
  const first = addDays(m0, -dowIdx(m0));
  const sessions = allSessions();
  const byDate = new Map();
  sessions.forEach((s) => { if (!byDate.has(s.date)) byDate.set(s.date, []); byDate.get(s.date).push(s); });
  const grid = el('div', { class: 'cal-grid', role: 'grid', 'aria-label': fmt.month(m0) });
  DAY_SHORT.forEach((d) => grid.appendChild(el('div', { class: 'cal-dow', role: 'columnheader', text: d })));
  for (let i = 0; i < 42; i++) {
    const d = addDays(first, i), iso = isoDate(d);
    if (i >= 35 && d.getMonth() !== m0.getMonth()) break;
    const ss = (byDate.get(iso) || []).filter((s) => s.kind !== 'rest').sort(byImportance);
    const anyDone = ss.some((s) => feedbackFor(s) && feedbackFor(s).done === 'tak');
    const cls = ['cal-cell', d.getMonth() !== m0.getMonth() ? 'out' : '', iso === todayISO() ? 'today' : '', iso === state.calSelected ? 'selected' : ''].filter(Boolean).join(' ');
    const label = `${fmt.dayLong(d)}${ss.length ? `: ${ss.map((s) => s.title || KIND_LABEL[s.kind]).join(', ')}` : ''}`;
    const cell = el('button', { type: 'button', class: cls, 'aria-label': label, 'aria-pressed': iso === state.calSelected ? 'true' : 'false', onclick: () => { state.calSelected = iso; render(); } },
      el('span', { class: 'num', text: String(d.getDate()) }),
      el('span', { class: 'cal-bars' }, ss.slice(0, 3).map((s) => el('i', { style: { background: sessionColor(s) } }))));
    if (anyDone) { const c = icon('check'); c.setAttribute('class', 'cal-check'); cell.appendChild(c); }
    grid.appendChild(cell);
  }
  const prev = () => { state.calMonth = new Date(m0.getFullYear(), m0.getMonth() - 1, 1); afterMonthChange(); };
  const next = () => { state.calMonth = new Date(m0.getFullYear(), m0.getMonth() + 1, 1); afterMonthChange(); };
  const sel = (byDate.get(state.calSelected) || []).sort(byImportance);
  const selKey = weekKey(parseDate(state.calSelected));
  out.push(el('div', { class: 'section' },
    el('div', { class: 'cal-head' },
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Poprzedni miesiąc', onclick: prev }, icon('left')),
      el('h2', { text: fmt.month(m0) }),
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Następny miesiąc', onclick: next }, icon('right'))),
    grid,
    el('div', { class: 'legend' }, DOMAINS.slice(1).map((d) => el('span', {}, el('i', { style: { background: `var(${d.css})` } }), `${d.label}`)), el('span', {}, el('i', { style: { background: 'var(--d-strength)' } }), 'Siła, inne'))));
  out.push(el('div', { class: 'section cal-day-list' },
    el('h2', { text: fmt.dayLong(parseDate(state.calSelected)) }),
    sel.length ? el('ul', { class: 'days' }, sel.map((s) => el('li', { class: 'day solo' }, s.kind === 'rest' ? el('span', { class: 'rest', text: s.title || 'Wolne' }) : sessionButton(s), statusCell(s))))
      : el('p', { class: 'muted', text: 'Brak zaplanowanych sesji.' }),
    state.weeks[selKey] ? el('div', { class: 'actions' }, el('button', {
      type: 'button', class: 'btn ghost', onclick: () => downloadBlob(new Blob([weekICS(selKey)], { type: 'text/calendar' }), `trening-${selKey}.ics`),
    }, icon('cal'), `Tydzień ${Number(selKey.split('-W')[1])} do kalendarza (.ics)`)) : null));
  return out;
}
async function afterMonthChange() {
  render();
  const m0 = state.calMonth, m1 = new Date(m0.getFullYear(), m0.getMonth() + 1, 0);
  const keys = weeksForRange(addDays(m0, -6), addDays(m1, 6)).filter((k) => !state.weeks[k]);
  if (!keys.length) return;
  try { await ensureWeeks(keys); saveSnapshot(); render(); } catch (e) { state.error = e; render(); }
}

/* postęp */
function viewProgress() {
  const out = [errorBanner()];
  if (blocked()) return out;
  const H = state.historia || { weeks: [], ftp_history: [] };
  const weeks = (H.weeks || []).slice().sort((a, b) => a.week.localeCompare(b.week)).slice(-16);
  const ftpH = (H.ftp_history || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const ftp = ftpNow(), kg = weightNow();
  const last = weeks[weeks.length - 1];
  const firstFtp = ftpH.length > 1 ? ftpH[0] : null;
  out.push(el('div', { class: 'stats' },
    stat('FTP', ftp ? fmt.num(ftp) : '–', 'W', firstFtp && ftp ? `${ftp - firstFtp.ftp >= 0 ? '+' : '−'}${Math.abs(ftp - firstFtp.ftp)} W od ${fmt.short(parseDate(firstFtp.date))}` : null),
    stat('Moc względna', ftp && kg ? fmt.num(ftp / kg, 2) : '–', 'W/kg', kg ? `przy ${fmt.num(kg, 1)} kg` : null),
    stat('Forma (CTL)', last && last.ctl != null ? fmt.num(last.ctl) : '–', '', last && last.tsb != null ? `świeżość (TSB) ${signed(last.tsb)}` : null),
    stat('Ostatni tydzień', last && last.done_hours != null ? fmt.num(last.done_hours, 1) : '–', 'h', last && last.planned_hours != null ? `plan ${fmt.num(last.planned_hours, 1)} h` : null)));
  if (!weeks.length && ftpH.length < 2) {
    out.push(el('div', { class: 'empty' }, el('h2', { text: 'Postęp pojawi się po pierwszych tygodniach' }),
      el('p', { class: 'lead', text: 'Trener dopisuje podsumowanie każdego tygodnia: godziny, TSS, formę i FTP. Wykresy wypełnią się same.' })));
    return out;
  }
  if (ftpH.length >= 2) {
    const labels = ftpH.map((p) => fmt.short(parseDate(p.date)));
    out.push(chartBlock('FTP', lineChart({ labels, series: [{ name: 'FTP', color: 'var(--s1)', values: ftpH.map((p) => p.ftp) }], unit: 'W' }), null,
      dataTable(['Data', 'FTP', 'Źródło'], ftpH.map((p) => [fmt.short(parseDate(p.date)), `${p.ftp} W`, p.source || '']))));
  }
  const wl = weeks.map((w) => `T${Number(w.week.split('-W')[1])}`);
  if (weeks.some((w) => w.ctl != null)) {
    out.push(chartBlock('Forma i zmęczenie',
      lineChart({ labels: wl, series: [{ name: 'forma (CTL)', color: 'var(--s1)', values: weeks.map((w) => w.ctl ?? null) }, { name: 'zmęczenie (ATL)', color: 'var(--s2)', values: weeks.map((w) => w.atl ?? null) }] }),
      [{ label: 'Forma (CTL)', color: 'var(--s1)', line: true }, { label: 'Zmęczenie (ATL)', color: 'var(--s2)', line: true }],
      dataTable(['Tydzień', 'CTL', 'ATL', 'TSB'], weeks.map((w) => [w.week, fmt.num(w.ctl), fmt.num(w.atl), signed(w.tsb)]))));
  }
  if (weeks.some((w) => w.done_hours != null || w.planned_hours != null)) {
    out.push(chartBlock('Godziny w tygodniu',
      barChart({ labels: wl, values: weeks.map((w) => w.done_hours ?? null), targets: weeks.map((w) => w.planned_hours ?? null), color: 'var(--s1)' }),
      [{ label: 'Wykonane', color: 'var(--s1)' }, { label: 'Plan', color: 'var(--ink)', line: true }],
      dataTable(['Tydzień', 'Plan h', 'Wykonane h', 'Plan TSS', 'Wykonane TSS'], weeks.map((w) => [w.week, fmt.num(w.planned_hours, 1), fmt.num(w.done_hours, 1), fmt.num(w.planned_tss), fmt.num(w.done_tss)]))));
  }
  const journal = weeks.slice().reverse().filter((w) => w.note || (w.key_rpe && w.key_rpe.length));
  if (journal.length) {
    out.push(el('div', { class: 'section' }, el('h2', { text: 'Dziennik' }),
      el('ul', { class: 'journal' }, journal.map((w) => el('li', {},
        el('h3', { text: `Tydzień ${Number(w.week.split('-W')[1])}, ${weekRangeLabel(w.week)}` }),
        w.key_rpe && w.key_rpe.length ? el('p', { class: 'small', text: `RPE kluczowych sesji: ${w.key_rpe.join(', ')}` }) : null,
        w.note ? el('p', { text: w.note }) : null)))));
  }
  return out;
}
function stat(label, value, unit, delta) {
  return el('div', {}, el('div', { class: 'stat-label', text: label }), el('div', { class: 'stat-value' }, value, unit ? el('small', { text: unit }) : null), delta ? el('div', { class: 'stat-delta', text: delta }) : null);
}

/* arkusz: szczegóły sesji */
function openSheet(content, titleText) {
  const sheet = $('#sheet'), inner = $('#sheet-inner');
  const close = () => closeSheet();
  inner.replaceChildren(
    el('div', { class: 'sheet-top' }, el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Zamknij', onclick: close }, icon('close')), el('h2', { id: 'sheet-title', text: titleText })),
    ...[].concat(content).filter(Boolean));
  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  history.pushState({ sheet: true }, '');
  setTimeout(() => { const b = $('.sheet-top .icon-btn'); if (b) b.focus(); }, 30);
}
function closeSheet(fromPop) {
  const sheet = $('#sheet');
  if (sheet.hidden) return;
  sheet.hidden = true; document.body.style.overflow = ''; hideTip();
  if (!fromPop && history.state && history.state.sheet) history.back();
}
window.addEventListener('popstate', () => closeSheet(true));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

function stepRows(tree, ftp, depth = 0) {
  const rows = [];
  for (const it of tree) {
    if (it.repeat) {
      rows.push(el('li', { class: 'rep', text: `${it.repeat} ×` }));
      rows.push(...stepRows(it.items, ftp, depth + 1));
      continue;
    }
    const ramp = it.p0 !== it.p1;
    const dom = domainOf(Math.max(it.p0, it.p1));
    const what = it.free ? (it.type === 'sprint' ? 'Sprint, ERG wyłączony' : 'Swobodnie')
      : ramp ? `${it.type === 'warmup' ? 'Rozgrzewka' : it.type === 'cooldown' ? 'Schłodzenie' : 'Rampa'} ${Math.round(it.p0 * 100)}→${Math.round(it.p1 * 100)}%`
        : `${Math.round((it.lo ?? it.p0) * 100)}${it.hi && it.hi !== it.lo ? `–${Math.round(it.hi * 100)}` : ''}% FTP`;
    const extra = [it.text, it.cadence ? `${Array.isArray(it.cadence) ? it.cadence.join('–') : it.cadence} rpm` : null].filter(Boolean).join(', ');
    const w = it.free ? '' : ftp ? (ramp ? `${watts(it.p0, ftp)}→${watts(it.p1, ftp)} W` : `${wattsLabel(it.lo ?? it.p0, it.hi ?? it.p1, ftp)} W`) : '';
    rows.push(el('li', { style: depth ? { paddingLeft: `${depth * 14}px` } : null },
      el('span', { class: 'sw', style: { background: `var(${dom.css})` } }),
      el('span', { class: 't', text: durLabel(it.dur) }),
      el('span', {}, what, extra ? el('span', { class: 'small', text: ` ${extra}` }) : null),
      el('span', { class: 'w', text: w })));
  }
  return rows;
}
function openSession(s) {
  const segs = segments(s, s._ftp);
  const d = parseDate(s.date);
  const fb = feedbackFor(s) || {};
  const totalMin = s.duration_min || (segs.length ? Math.round(segs[segs.length - 1].t1 / 60) : null);
  const tss = s.tss ?? estimateTSS(segs);
  const parts = [
    el('h1', { class: 'today-title', style: { marginTop: '10px' } }, s.code ? el('span', { class: 'today-code', text: `${s.code} ` }) : null, s.title || KIND_LABEL[s.kind]),
    el('div', { class: 'facts', style: { marginTop: '6px' } },
      el('span', { text: KIND_LABEL[s.kind] || '' }),
      totalMin ? el('span', {}, el('b', { text: String(totalMin) }), 'min') : null,
      tss ? el('span', {}, el('b', { text: String(tss) }), 'TSS') : null,
      s._ftp ? el('span', {}, 'FTP ', el('b', { text: String(s._ftp) }), 'W') : null),
  ];
  if (segs.length) {
    parts.push(el('div', { class: 'profile-wrap' }, profileSVG(segs, { ftp: s._ftp, height: 150 })), domainLegend(segs));
    parts.push(el('h2', { style: { marginTop: '18px' }, text: 'Przebieg' }), el('ul', { class: 'steps' }, stepRows(parseTree(s.steps, s._ftp), s._ftp)));
  }
  if (s.target && !segs.length) parts.push(el('p', { class: 'hero-sub', style: { marginTop: '10px' }, text: s.target }));
  if (s.exercises && s.exercises.length) {
    parts.push(el('h2', { style: { marginTop: '18px' }, text: 'Ćwiczenia' }),
      el('table', { class: 'ex-table' }, el('tbody', {}, s.exercises.map((x) => el('tr', {},
        el('td', {}, x.name, x.cue ? el('div', { class: 'cue', text: x.cue }) : null),
        el('td', { text: x.sets || '' }),
        el('td', { class: 'cue', text: x.rest || '' }))))));
    const withImg = s.exercises.filter((x) => x.img);
    if (withImg.length) {
      parts.push(el('div', { class: 'ex-gallery' }, withImg.map((x) => {
        const img = el('img', { class: 'ex-img', alt: x.name, loading: 'lazy' });
        loadExerciseImg(img, x.img);
        return el('figure', { class: 'ex-fig' }, img, el('figcaption', { class: 'cue', text: x.name }));
      })));
    }
  }
  const notes = [['Po co', s.why], ['Jak jechać', [s.hr_rpe, s.cadence && `kadencja ${s.cadence}`].filter(Boolean).join(', ')], ['Jedzenie', s.fueling], ['Odpuść, gdy', s.bailout], ['Na zewnątrz', s.outdoor]].filter(([, v]) => v);
  if (notes.length) parts.push(el('dl', { class: 'note-block' }, notes.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })])));
  if (s.kind !== 'rest') parts.push(energyBlock(s));
  const actions = el('div', { class: 'actions' });
  if (s.file) {
    actions.appendChild(el('button', { type: 'button', class: 'btn', onclick: () => downloadSession(s) }, icon('down'), 'Pobierz .zwo'));
    if (navigator.canShare) actions.appendChild(el('button', { type: 'button', class: 'btn ghost', onclick: () => shareSession(s) }, icon('share'), 'Udostępnij plik'));
  }
  if (s.kind !== 'rest') actions.appendChild(el('a', { class: 'btn ghost', href: googleCalUrl(s), target: '_blank', rel: 'noopener' }, icon('cal'), 'Do Kalendarza Google'));
  parts.push(actions);
  if (s.kind !== 'rest') parts.push(feedbackForm(s, fb));
  openSheet(parts, fmt.dayLong(d));
}
function feedbackForm(s, fb) {
  const st = { done: fb.done || null, rpe: fb.rpe || null };
  const chipGroup = (name, opts, key, cls = '') => el('div', { class: `chips ${cls}`.trim(), role: 'group', 'aria-label': name }, opts.map(([v, lab]) => {
    const c = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(st[key] === v), text: lab });
    c.addEventListener('click', () => { st[key] = st[key] === v ? null : v; c.parentElement.querySelectorAll('.chip').forEach((b, i) => b.setAttribute('aria-pressed', String(st[key] === opts[i][0]))); });
    return c;
  }));
  const note = el('textarea', { id: 'fb-note', placeholder: 'Np. nogi ciężkie w 3. serii, HR nie dochodziło do 165' });
  note.value = fb.note || '';
  const saveBtn = el('button', { type: 'button', class: 'btn', text: 'Zapisz wykonanie' });
  const msg = el('p', { class: 'hint', role: 'status' });
  saveBtn.addEventListener('click', async () => {
    if (!st.done && !st.rpe && !note.value.trim()) { msg.textContent = 'Zaznacz wykonanie, RPE albo dopisz notatkę.'; return; }
    saveBtn.disabled = true; msg.textContent = 'Zapisuję w repo…';
    // Jeśli nie wybrano statusu wykonania, a jest RPE lub notatka — traktuj sesję jako zrobioną.
    // (Oceniasz trening = go zrobiłeś.) Jawny wybór "czesciowo"/"nie" zostaje nietknięty.
    const done = st.done || ((st.rpe || note.value.trim()) ? 'tak' : null);
    const entry = { date: s.date, title: [s.code, s.title].filter(Boolean).join(' '), done, rpe: st.rpe, note: note.value.trim() || null, saved: new Date().toISOString() };
    try {
      const next = await putJSON(`dane/feedback/${s._week}.json`, (cur) => {
        const f = cur && typeof cur === 'object' ? cur : { version: 1, week: s._week, entries: {} };
        f.entries = f.entries || {}; f.entries[s._id] = entry; return f;
      }, `Wykonanie z aplikacji: ${s.date} ${entry.title}`.slice(0, 120));
      state.feedback[s._week] = next || state.feedback[s._week];
      saveSnapshot();
      msg.textContent = ''; toast('Zapisano wykonanie'); closeSheet(); render();
    } catch (e) {
      msg.textContent = e.status === 403 || e.status === 404 ? 'Klucz nie pozwala na zapis. Nadaj mu uprawnienie Contents: Read and write.' : (explain(e) || 'Nie udało się zapisać.');
      msg.className = 'hint error';
    } finally { saveBtn.disabled = false; }
  });
  return el('fieldset', {},
    el('legend', { text: 'Jak poszło?' }),
    chipGroup('Wykonanie', [['tak', 'Zrobione'], ['czesciowo', 'Częściowo'], ['nie', 'Nie zrobione']], 'done'),
    el('p', { class: 'hint', text: 'RPE: 1 bardzo łatwo, 7 ciężko, 10 maksymalnie' }),
    chipGroup('RPE', Array.from({ length: 10 }, (_, i) => [i + 1, String(i + 1)]), 'rpe', 'rpe'),
    el('label', { class: 'field', for: 'fb-note' }, el('span', { text: 'Notatka dla trenera' }), note),
    el('div', { class: 'actions' }, saveBtn), msg);
}
async function downloadSession(s) {
  try { const blob = await fetchFile(s.file); downloadBlob(new Blob([blob], { type: 'application/xml' }), s.file.split('/').pop()); toast('Pobrano plik'); }
  catch (e) { toast(explain(e) || 'Nie udało się pobrać pliku'); }
}
async function shareSession(s) {
  try {
    const blob = await fetchFile(s.file);
    const file = new File([blob], s.file.split('/').pop(), { type: 'application/xml' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: sessionName(s) });
    else downloadBlob(blob, file.name);
  } catch (e) { if (e && e.name !== 'AbortError') toast(explain(e) || 'Nie udało się udostępnić'); }
}

/* ustawienia */
function openSettings() {
  const tok = el('input', { type: 'password', id: 'set-token', autocomplete: 'off', spellcheck: 'false', placeholder: 'github_pat_…' });
  tok.value = store.get(K.token, '') || '';
  const repo = el('input', { type: 'text', id: 'set-repo', autocomplete: 'off', spellcheck: 'false' });
  repo.value = store.get(K.repo, DEFAULT_REPO);
  const show = el('button', { type: 'button', class: 'btn ghost', text: 'Pokaż klucz', onclick: () => { tok.type = tok.type === 'password' ? 'text' : 'password'; show.textContent = tok.type === 'password' ? 'Pokaż klucz' : 'Ukryj klucz'; } });
  const msg = el('p', { class: 'hint', role: 'status' });
  const theme = store.get(K.theme, 'auto');
  const themeChips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Motyw' }, [['auto', 'Jak w telefonie'], ['light', 'Jasny'], ['dark', 'Ciemny']].map(([v, lab]) => el('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(theme === v), text: lab,
    onclick: (e) => { store.set(K.theme, v); applyTheme(); e.currentTarget.parentElement.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); render(); },
  })));
  const save = el('button', { type: 'button', class: 'btn', text: 'Zapisz i połącz' });
  save.addEventListener('click', async () => {
    const t = tok.value.trim(), r = repo.value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(r)) { msg.textContent = 'Nazwa repo powinna mieć postać właściciel/nazwa.'; msg.className = 'hint error'; return; }
    if (!t) { msg.textContent = 'Wklej klucz z GitHuba.'; msg.className = 'hint error'; return; }
    store.set(K.token, t); store.set(K.repo, r);
    msg.className = 'hint'; msg.textContent = 'Sprawdzam połączenie…';
    try {
      await gh('README.md', { accept: 'json' });
      msg.textContent = 'Połączono.'; toast('Połączono z repo'); closeSheet(); state.weeks = {}; state.feedback = {}; await loadAll();
    } catch (e) { msg.className = 'hint error'; msg.textContent = explain(e) || 'Nie udało się połączyć.'; }
  });
  const forget = el('button', {
    type: 'button', class: 'btn ghost', text: 'Usuń klucz z tego telefonu',
    onclick: () => { store.del(K.token); store.del(K.snap); Object.assign(state, { index: null, historia: null, profile: null, weeks: {}, feedback: {}, syncedAt: null }); toast('Klucz usunięty'); closeSheet(); render(); },
  });
  openSheet([
    el('p', { class: 'lead', style: { marginTop: '8px' }, text: 'Klucz zostaje tylko w pamięci tej przeglądarki. Aplikacja łączy się wyłącznie z GitHubem.' }),
    el('label', { class: 'field', for: 'set-token' }, el('span', { text: 'Klucz dostępu GitHub' }), tok),
    el('div', { class: 'actions' }, show),
    el('label', { class: 'field', for: 'set-repo' }, el('span', { text: 'Repo z danymi' }), repo),
    el('div', { class: 'actions' }, save), msg,
    el('h2', { style: { marginTop: '24px' }, text: 'Jak zdobyć klucz' }), tokenHowTo(),
    el('h2', { style: { marginTop: '24px' }, text: 'Motyw' }), themeChips,
    el('div', { class: 'actions', style: { marginTop: '24px' } }, forget),
    el('p', { class: 'small muted', style: { marginTop: '16px' }, text: `Wersja ${APP_VERSION}` }),
  ], 'Ustawienia');
}
function applyTheme() {
  const t = store.get(K.theme, 'auto');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}

/* ---------------- start ---------------- */
function init() {
  applyTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => render());
  document.querySelectorAll('#tabbar button').forEach((b) => b.addEventListener('click', () => { state.view = b.dataset.view; hideTip(); render(); window.scrollTo(0, 0); }));
  $('#brand').addEventListener('click', () => { state.view = 'dzis'; render(); });
  $('#refresh').addEventListener('click', () => loadAll());
  $('#settings').addEventListener('click', openSettings);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.syncedAt && Date.now() - state.syncedAt > 10 * 60 * 1000) loadAll(); });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('svg')) hideTip(); });
  loadSnapshot();
  render();
  loadAll();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
