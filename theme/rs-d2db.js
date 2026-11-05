/* RankSurge Destiny 2 database: weapons, armor, build planner, compare, best gear.
   Data: daily build of Bungie's manifest (github.com/machperformance-prog/ranksurge-d2-data via jsDelivr), cached in IndexedDB.
   Loadout push: the vault manager's Bungie session (same browser) + RankSurge Worker /v2/vault/*. */
(function () {
  'use strict';
  const R = document.getElementById('rsd2');
  if (!R) return;
  const MODE = R.dataset.mode || 'weapons';
  const CDN = (R.dataset.cdn || '').replace(/\/?$/, '/');
  const API = (R.dataset.api || '').replace(/\/$/, '');
  const BN = 'https://www.bungie.net';
  const APP = R.querySelector('[data-d2-app]');
  const CLS = ['hunter', 'titan', 'warlock'];
  const CLSN = { hunter: 'Hunter', titan: 'Titan', warlock: 'Warlock', any: 'Any class' };
  const CLS_TYPE = { titan: 0, hunter: 1, warlock: 2 };
  const SLOTW = ['kinetic', 'energy', 'power'];
  const SLOTA = ['helmet', 'arms', 'chest', 'legs', 'class'];
  const SLOTN = { kinetic: 'Kinetic', energy: 'Energy', power: 'Power', helmet: 'Helmet', arms: 'Arms', chest: 'Chest', legs: 'Legs', class: 'Class item' };
  const BUCKET = { kinetic: 1498876634, energy: 2465295065, power: 953998645, helmet: 3448274439, arms: 3551918588, chest: 14239492, legs: 20886954, class: 1585787867 };
  const AST = ['Weapons', 'Health', 'Class', 'Grenade', 'Super', 'Melee'];
  const AST_ID = { Weapons: '2996146975', Health: '392767087', Class: '1943323491', Grenade: '1735777505', Super: '144602215', Melee: '4244567218' };
  const ELEM = ['Kinetic', 'Arc', 'Solar', 'Void', 'Stasis', 'Strand'];
  const SUBS = ['Arc', 'Solar', 'Void', 'Stasis', 'Strand', 'Prismatic'];
  const KEY_STATS = ['Impact', 'Range', 'Stability', 'Handling', 'Reload Speed', 'Aim Assistance', 'Airborne Effectiveness', 'Blast Radius', 'Velocity', 'Accuracy', 'Swing Speed', 'Charge Rate', 'Guard Efficiency', 'Guard Resistance', 'Ammo Capacity', 'Shield Duration', 'Zoom', 'Recoil Direction', 'Ammo Generation', 'Heat Generated', 'Cooling Efficiency', 'Vent Speed', 'Persistence'];
  const NUM_STATS = ['Rounds Per Minute', 'Charge Time', 'Draw Time', 'Magazine', 'Inventory Size'];
  const PAGE = { weapons: '/pages/destiny-2-weapons', armor: '/pages/destiny-2-armor', build: '/pages/destiny-2-build-planner', top: '/pages/destiny-2-best-weapons-and-armor' };
  let D = null; // data
  let P = {}; // perks
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const img = (p, w, alt, cls) => (p ? `<img src="${BN}${esc(p)}" width="${w}" height="${w}" style="width:${w}px;height:${w}px;max-width:none" alt="${esc(alt || '')}" loading="lazy" decoding="async"${cls ? ` class="${cls}"` : ''}>` : '');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const perk = (h) => P[h] || null;
  const pn = (h) => (P[h] ? P[h].n : '');
  const rel = (r) => { const m = /^v(\d)(\d\d)/.exec(r || ''); return m ? +m[1] * 100 + +m[2] : 0; };
  function live(t) { const l = $('[data-d2-live]', R); if (l) l.textContent = t; }
  function toast(msg, bad) { const t = document.createElement('div'); t.className = 'd2-toast' + (bad ? ' is-bad' : ''); t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), matchMedia('(max-width: 760px)').matches ? 2600 : 4200); }
  function debounce(f, ms) { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => f.apply(null, a), ms); }; }
  function ico(name) {
    const P2 = {
      kinetic: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/>',
      energy: '<path d="M13 3 6 13h5l-1 8 7-10h-5z"/>',
      power: '<path d="M12 3 4 8v8l8 5 8-5V8z"/><path d="M12 8v8"/>',
      helmet: '<path d="M5 14a7 7 0 0 1 14 0v3H5z"/><path d="M9 17v3M15 17v3M8 12h8"/>',
      arms: '<path d="M7 20v-7l-2-3 3-6 3 3v4h6l2 3-3 6z"/>',
      chest: '<path d="M8 4h8l4 4-2 3v9H6v-9L4 8z"/><path d="M12 8v12"/>',
      legs: '<path d="M7 3h10l-1 18h-3l-1-9-1 9H8z"/>',
      class: '<path d="M6 3h12v9l-6 9-6-9z"/><path d="M9 8h6"/>',
      compare: '<path d="M8 4v16M16 4v16"/><path d="M4 8h8M12 16h8"/>',
      build: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M17 14v6M14 17h6"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>',
      share: '<path d="M4 12v7h16v-7M12 3v13M7 8l5-5 5 5"/>',
      push: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
      star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
      filter: '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
      shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/>',
      flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>',
      trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
      clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
      vault: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5V7M12 17v-1.5M15.5 12H17M7 12h1.5"/>',
      chart: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V6M17 16v-8"/>',
      users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
      link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
      trash: '<path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
      swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
    };
    return `<svg class="d2-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P2[name] || ''}</svg>`;
  }

  /* ---------- data ---------- */
  function idb() { return new Promise((res) => { try { const r = indexedDB.open('rsd2db', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); }
  function iget(db, k) { return new Promise((res) => { if (!db) return res(null); try { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }); }
  function iput(db, k, v) { return new Promise((res) => { if (!db) return res(); try { const tx = db.transaction('kv', 'readwrite'); const s = tx.objectStore('kv'); s.clear(); s.put(v, k); s.put(k.slice(2), 'last'); tx.oncomplete = res; tx.onerror = res; } catch (e) { res(); } }); }
  async function curated() { try { const c = await fetch(CDN + 'curated.json', { cache: 'no-cache' }); if (c.ok) return await c.json(); } catch (e) { /* optional */ } return null; }
  async function load() {
    const db = await idb();
    let meta = null;
    try { const r = await fetch(CDN + 'meta.json', { cache: 'no-cache' }); if (r.ok) meta = await r.json(); } catch (e) { meta = null; }
    if (meta && meta.v) {
      const hit = await iget(db, 'v:' + meta.v);
      if (hit) { hit.meta = meta; hit.curated = await curated(); return hit; }
      APP.innerHTML = '<p class="d2-load">Downloading the Destiny 2 item database&hellip;</p>';
      const parts = await Promise.all(['weapons', 'armor', 'perks', 'sets', 'groups'].map((k) => fetch(CDN + k + '.json').then((r) => { if (!r.ok) throw new Error(k); return r.json(); })));
      const data = { meta, weapons: parts[0], armor: parts[1], perks: parts[2], sets: parts[3], groups: parts[4] };
      await iput(db, 'v:' + meta.v, data);
      data.curated = await curated();
      return data;
    }
    const last = await iget(db, 'last');
    const old = last ? await iget(db, 'v:' + last) : null;
    if (old) return old;
    throw new Error('The item database is not available right now. Please try again in a few minutes.');
  }
  function index() {
    P = D.perks;
    D.W = D.weapons.filter((w) => w.n && w.pk);
    D.A = D.armor;
    D.WH = {}; D.W.forEach((w) => { D.WH[w.h] = w; });
    D.AH = {}; D.A.forEach((a) => { D.AH[a.h] = a; });
    D.types = Array.from(new Set(D.W.map((w) => w.ty))).sort();
    D.newest = Math.max.apply(null, D.W.map((w) => rel(w.rel)).concat(D.A.map((a) => rel(a.rel))));
    D.W.forEach((w) => { w.frn = pn(w.fr); w.peerKey = w.r === 'exotic' ? w.ty + '|' + w.rpm : w.ty + '|' + w.frn; w.txt = (w.n + ' ' + w.ty + ' ' + w.frn + ' ' + w.el + ' ' + w.src + ' ' + w.pk.map((c) => c.map(pn).join(' ')).join(' ')).toLowerCase(); });
    D.peers = {}; D.W.forEach((w) => { if (w.ad) return; (D.peers[w.peerKey] = D.peers[w.peerKey] || []).push(w); });
    D.ALT = {}; D.W.concat(D.A).forEach((it) => { D.ALT[it.h] = it; (it.alt || []).forEach((h) => { if (!D.ALT[h]) D.ALT[h] = it; }); });
    D.A.forEach((a) => { const ex = perk(a.ex); const st = a.set && D.sets[a.set]; a.a3 = !!(a.at || a.set); a.txt = (a.n + ' ' + a.ty + ' ' + (ex ? ex.n + ' ' + ex.d : '') + ' ' + (st ? st.n : '') + ' ' + a.src).toLowerCase(); });
  }

  /* ---------- weapon stats ---------- */
  function interp(v, g) {
    if (!g || !g.p || !g.p.length) return v;
    const p = g.p; v = Math.max(0, Math.min(v, g.m || v));
    if (v <= p[0][0]) return p[0][1];
    for (let i = 1; i < p.length; i++) if (v <= p[i][0]) { const a = p[i - 1], b = p[i]; return Math.round(a[1] + ((v - a[0]) * (b[1] - a[1])) / (b[0] - a[0] || 1)); }
    return p[p.length - 1][1];
  }
  function wStats(w, sel) {
    const out = Object.assign({}, w.s);
    if (!sel || !sel.length) return out;
    const g = D.groups[w.sg] || {};
    const add = {};
    sel.forEach((h) => { const p = perk(h); if (p && p.s) for (const k in p.s) add[k] = (add[k] || 0) + p.s[k]; });
    for (const k in add) {
      const base = w.inv[k] || 0;
      if (g[k]) out[k] = (w.s[k] || 0) + interp(base + add[k], g[k]) - interp(base, g[k]);
      else out[k] = (w.s[k] || 0) + add[k];
      if (k !== 'Rounds Per Minute') out[k] = Math.max(0, Math.min(100, out[k]));
    }
    return out;
  }
  function statRows(stats, base, peerMax) {
    const rows = [];
    const order = D.meta.statOrder || KEY_STATS;
    order.forEach((k) => {
      if (stats[k] == null) return;
      const v = stats[k], b = base ? base[k] : v, diff = v - (b == null ? v : b);
      const numeric = NUM_STATS.indexOf(k) > -1 || (D.meta.stats[k] && D.meta.stats[k].bar === 0);
      const tip = D.meta.stats[k] ? D.meta.stats[k].d : '';
      if (numeric) { rows.push(`<div class="d2-st d2-st--n"><dt title="${esc(tip)}">${esc(k)}</dt><dd><b>${v}</b>${diff ? `<em class="${diff > 0 ? 'up' : 'dn'}">${diff > 0 ? '+' : ''}${diff}</em>` : ''}</dd></div>`); return; }
      const pm = peerMax && peerMax[k];
      rows.push(`<div class="d2-st"><dt title="${esc(tip)}">${esc(k)}</dt><dd><span class="d2-bar" role="img" aria-label="${esc(k)} ${v} out of 100"><i style="width:${Math.min(100, b == null ? v : Math.min(v, b))}%"></i>${diff > 0 ? `<i class="up" style="left:${Math.min(100, b)}%;width:${Math.min(100 - b, diff)}%"></i>` : ''}${diff < 0 ? `<i class="dn" style="left:${Math.max(0, v)}%;width:${-diff}%"></i>` : ''}${pm ? `<s style="left:${Math.min(100, pm)}%" title="Best in class: ${pm}"></s>` : ''}</span><b>${v}</b>${diff ? `<em class="${diff > 0 ? 'up' : 'dn'}">${diff > 0 ? '+' : ''}${diff}</em>` : ''}</dd></div>`);
    });
    return `<dl class="d2-stats">${rows.join('')}</dl>`;
  }

  /* ---------- shared UI ---------- */
  const TOOLS = [
    ['weapons', 'Weapons database', PAGE.weapons, 'kinetic'],
    ['armor', 'Armor database', PAGE.armor, 'helmet'],
    ['build', 'Build planner', PAGE.build, 'build'],
    ['top', 'Best weapons & armor', PAGE.top, 'trophy'],
    ['vault', 'Vault manager', '/pages/destiny-2-vault-manager', 'vault'],
    ['stats', 'Stats tracker', '/pages/destiny-2-stats', 'chart'],
    ['hub', 'Player hub', '/pages/player-hub', 'users'],
  ];
  function hubNav() {
    return `<nav class="d2-hub" aria-label="Destiny 2 tools">${TOOLS.map((t) => `<a class="d2-hub__a${t[0] === MODE ? ' is-on' : ''}" href="${t[2]}"${t[0] === MODE ? ' aria-current="page"' : ''}>${ico(t[3])}<span>${esc(t[1])}</span></a>`).join('')}</nav>`;
  }
  function chips(name, opts, val, label) {
    return `<fieldset class="d2-chips"><legend>${esc(label)}</legend>${opts.map((o) => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return `<label class="d2-chip"><input type="radio" name="${name}" value="${esc(v)}"${String(val) === String(v) ? ' checked' : ''}><span>${esc(t)}</span></label>`; }).join('')}</fieldset>`;
  }
  function sel(name, opts, val, label) {
    return `<label class="d2-sel"><span>${esc(label)}</span><select name="${name}">${opts.map((o) => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return `<option value="${esc(v)}"${String(val) === String(v) ? ' selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;
  }
  function elemBadge(e) { const m = D.meta.elements && D.meta.elements[e]; return `<span class="d2-el d2-el--${esc((e || '').toLowerCase())}">${m && m.ic ? img(m.ic, 16, '') : ''}${esc(e)}</span>`; }
  function tile(it, kind) {
    const ex = it.r === 'exotic';
    const sub = kind === 'w' ? `${esc(it.ty)} · ${elemBadge(it.el)}` : `${esc(CLSN[it.cl] || '')} · ${esc(SLOTN[it.sl] || it.ty)}`;
    const extra = kind === 'w' ? `<span class="d2-card__k">${esc(it.frn || '')}${rpmTxt(it)}</span>` : `<span class="d2-card__k">${it.ex ? esc(pn(it.ex)) : it.set && D.sets[it.set] ? esc(D.sets[it.set].n) + ' set' : esc(it.ty)}</span>`;
    const isNew = false;
    return `<button type="button" class="d2-card${ex ? ' is-exotic' : ''}" data-open="${kind}${it.h}"><span class="d2-card__img">${img(it.ic, 72, '')}${it.wm ? img(it.wm, 72, '', 'd2-wm') : ''}</span><span class="d2-card__t"><b>${esc(it.n)}${it.ad ? ' <small>(Adept)</small>' : ''}</b><span class="d2-card__s">${sub}</span>${extra}</span>${isNew ? '<span class="d2-new">New</span>' : ''}</button>`;
  }

  /* ---------- compare tray ---------- */
  const CMP_KEY = 'rs_d2_cmp';
  function cmpGet() { try { return JSON.parse(sessionStorage.getItem(CMP_KEY) || '[]'); } catch (e) { return []; } }
  function cmpSet(a) { try { sessionStorage.setItem(CMP_KEY, JSON.stringify(a)); } catch (e) { /* ignore */ } tray(); }
  function cmpToggle(key) {
    let a = cmpGet();
    if (a.indexOf(key) > -1) a = a.filter((x) => x !== key);
    else { if (a.length && a[0][0] !== key[0]) { a = []; toast('Compare holds one kind at a time. Started a new comparison.'); } if (a.length >= 4) a.shift(); a.push(key); }
    cmpSet(a);
  }
  function tray() {
    let t = $('#d2-tray');
    const a = cmpGet().filter((k) => (k[0] === 'w' ? D.WH[k.slice(1)] : D.AH[k.slice(1)]));
    if (!a.length) { if (t) t.remove(); return; }
    if (!t) { t = document.createElement('div'); t.id = 'd2-tray'; t.className = 'd2-tray'; t.setAttribute('role', 'region'); t.setAttribute('aria-label', 'Compare tray'); document.body.appendChild(t); }
    t.innerHTML = `<div class="d2-tray__in"><span class="d2-tray__k">${ico('compare')}Compare</span><div class="d2-tray__its">${a.map((k) => { const it = k[0] === 'w' ? D.WH[k.slice(1)] : D.AH[k.slice(1)]; return `<span class="d2-tray__it">${img(it.ic, 36, '')}<span>${esc(it.n)}</span><button type="button" data-cmp-x="${k}" aria-label="Remove ${esc(it.n)}">${ico('close')}</button></span>`; }).join('')}</div><button type="button" class="rs-btn" data-cmp-go${a.length < 2 ? ' disabled' : ''}>Compare ${a.length}</button><button type="button" class="d2-link" data-cmp-clear>Clear</button></div>`;
    t.onclick = (e) => {
      const x = e.target.closest('[data-cmp-x]'); if (x) return cmpToggle(x.dataset.cmpX);
      if (e.target.closest('[data-cmp-clear]')) return cmpSet([]);
      if (e.target.closest('[data-cmp-go]')) compareView(a);
    };
  }
  function compareView(keys) {
    const items = keys.map((k) => (k[0] === 'w' ? { k: 'w', it: D.WH[k.slice(1)] } : { k: 'a', it: D.AH[k.slice(1)] }));
    let body;
    if (items[0].k === 'w') {
      const stats = (D.meta.statOrder || KEY_STATS).filter((s) => items.some((x) => x.it.s[s] != null));
      const best = {}; stats.forEach((s) => { best[s] = Math.max.apply(null, items.map((x) => x.it.s[s] || 0)); });
      body = `<div class="d2-cmp" style="--n:${items.length}"><div class="d2-cmp__row d2-cmp__hd"><span></span>${items.map((x) => `<span>${img(x.it.ic, 56, '')}<b>${esc(x.it.n)}</b><small>${esc(x.it.ty)} · ${esc(x.it.frn)}</small><small>${elemBadge(x.it.el)} · ${esc(x.it.am)}</small></span>`).join('')}</div>` +
        stats.map((s) => `<div class="d2-cmp__row"><span class="d2-cmp__k">${esc(s)}</span>${items.map((x) => { const v = x.it.s[s]; const bar = NUM_STATS.indexOf(s) < 0 && !(D.meta.stats[s] && D.meta.stats[s].bar === 0); return `<span class="${v === best[s] && items.length > 1 && v != null ? 'is-best' : ''}">${v == null ? '—' : bar ? `<span class="d2-bar"><i style="width:${Math.min(100, v)}%"></i></span><b>${v}</b>` : `<b>${v}</b>`}</span>`; }).join('')}</div>`).join('') +
        `<div class="d2-cmp__row"><span class="d2-cmp__k">Frame</span>${items.map((x) => `<span>${esc(x.it.frn)}</span>`).join('')}</div><div class="d2-cmp__row"><span class="d2-cmp__k">Source</span>${items.map((x) => `<span><small>${esc(x.it.src || '—')}</small></span>`).join('')}</div></div>`;
    } else {
      body = `<div class="d2-cmp" style="--n:${items.length}"><div class="d2-cmp__row d2-cmp__hd"><span></span>${items.map((x) => `<span>${img(x.it.ic, 56, '')}<b>${esc(x.it.n)}</b><small>${esc(CLSN[x.it.cl])} · ${esc(SLOTN[x.it.sl])}</small></span>`).join('')}</div>` +
        `<div class="d2-cmp__row"><span class="d2-cmp__k">Exotic perk</span>${items.map((x) => `<span>${x.it.ex ? `<b>${esc(pn(x.it.ex))}</b><small>${esc(perk(x.it.ex).d)}</small>` : '—'}</span>`).join('')}</div>` +
        `<div class="d2-cmp__row"><span class="d2-cmp__k">Set bonus</span>${items.map((x) => { const st = x.it.set && D.sets[x.it.set]; return `<span>${st ? `<b>${esc(st.n)}</b>${st.p.map((p) => `<small>${p[0]} pieces: ${esc(p[1])}</small>`).join('')}` : '—'}</span>`; }).join('')}</div>` +
        `<div class="d2-cmp__row"><span class="d2-cmp__k">Archetypes</span>${items.map((x) => `<span><small>${(x.it.at || []).map((h) => esc(pn(h))).join(', ') || '—'}</small></span>`).join('')}</div>` +
        `<div class="d2-cmp__row"><span class="d2-cmp__k">Stat rolls</span>${items.map((x) => `<span><small>${(x.it.ro || []).map((r, i) => ['Primary', 'Secondary', 'Tertiary'][i] + ' ' + r[0] + '–' + r[1]).join('<br>') || '—'}</small></span>`).join('')}</div>` +
        `<div class="d2-cmp__row"><span class="d2-cmp__k">Source</span>${items.map((x) => `<span><small>${esc(x.it.src || '—')}</small></span>`).join('')}</div></div>`;
    }
    sheet(`<h2 class="d2-sh__h">${ico('compare')}Side-by-side compare</h2><p class="d2-sh__sub">Base stats before masterwork, mods and perks. Best value in each row is highlighted.</p>${body}`, 'wide');
  }

  /* ---------- sheet (detail drawer) ---------- */
  let lastFocus = null;
  function sheet(html, wide) {
    let s = $('#d2-sheet');
    if (!s) { s = document.createElement('div'); s.id = 'd2-sheet'; s.className = 'd2-sheet'; document.body.appendChild(s); }
    lastFocus = document.activeElement;
    s.innerHTML = `<div class="d2-sh${wide ? ' d2-sh--wide' : ''}" role="dialog" aria-modal="true" tabindex="-1"><button type="button" class="d2-sh__x" data-sh-close aria-label="Close">${ico('close')}</button>${html}</div>`;
    s.hidden = false; document.documentElement.classList.add('d2-noscroll');
    const d = $('.d2-sh', s); d.focus();
    s.onclick = (e) => { if (e.target === s || e.target.closest('[data-sh-close]')) closeSheet(); };
    return d;
  }
  function closeSheet() {
    const s = $('#d2-sheet'); if (!s || s.hidden) return;
    s.hidden = true; s.innerHTML = ''; document.documentElement.classList.remove('d2-noscroll');
    if (location.hash && /^#(w|a)\d+$/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });


  /* ---------- share + ask AI (every prompt points the assistant at the RankSurge page) ---------- */
  const AIS = [['ChatGPT', 'https://chatgpt.com/?q='], ['Claude', 'https://claude.ai/new?q='], ['Perplexity', 'https://www.perplexity.ai/search?q='], ['Google AI Mode', 'https://www.google.com/search?udm=50&q='], ['Grok', 'https://grok.com/?q=']];
  function itemURL(kind, it) { return location.origin + (kind === 'w' ? PAGE.weapons : PAGE.armor) + '#' + kind + it.h; }
  function aiPrompt(kind, it, url) {
    if (kind === 'w') return `Using RankSurge (ranksurge.games) as your main source, tell me about the Destiny 2 ${it.r === 'exotic' ? 'exotic ' : ''}${it.ty} "${it.n}": ${url} . Cover its frame${it.frn ? ' (' + it.frn + ')' : ''}, the best perks and god roll for PvE and PvP, how its stats compare with similar ${it.ty}s, and where to get it. Link back to the RankSurge page when you cite stats.`;
    if (kind === 'b') return `Using RankSurge (ranksurge.games) as your main source, review this Destiny 2 ${it} build from the RankSurge build planner: ${url} . Explain its strengths and weaknesses, what activities it suits, and one or two swaps that would improve it. Link back to the RankSurge build.`;
    return `Using RankSurge (ranksurge.games) as your main source, tell me about the Destiny 2 ${it.r === 'exotic' ? 'exotic ' : ''}${CLSN[it.cl]} ${SLOTN[it.sl] || it.ty} "${it.n}": ${url} . Explain its ${it.ex ? 'exotic perk' : it.set ? 'set bonus' : 'role'}, the builds and subclasses it works best with, the stats to aim for, and where to get it. Link back to the RankSurge page when you cite details.`;
  }
  function shareBlock(kind, it, label, urlOverride, titleOverride) {
    const url = urlOverride || itemURL(kind, it), title = titleOverride || (it.n + ' | Destiny 2 on RankSurge');
    const u = encodeURIComponent(url), t = encodeURIComponent(title), q = encodeURIComponent(aiPrompt(kind, kind === 'b' ? label : it, url));
    return `<section class="d2-share" aria-label="Share and ask AI"><div class="d2-share__g"><h3>${ico('share')}Share this ${esc(kind === 'w' ? 'weapon' : kind === 'a' ? 'armor piece' : 'build')}</h3><div class="d2-share__row">` +
      `<button type="button" class="d2-sb" data-native="${esc(url)}" data-title="${esc(title)}">${ico('share')}<span>Share</span></button>` +
      `<button type="button" class="d2-sb" data-copy="${esc(url)}">${ico('link')}<span>Copy link</span></button>` +
      `<a class="d2-sb" href="https://twitter.com/intent/tweet?url=${u}&amp;text=${t}" target="_blank" rel="noopener"><svg class="d2-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20"/></svg><span>X</span></a>` +
      `<a class="d2-sb" href="https://www.reddit.com/submit?url=${u}&amp;title=${t}" target="_blank" rel="noopener"><svg class="d2-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="14" r="6"/><circle cx="18" cy="5" r="1.6"/><path d="M12 8l1.5-5 4.5 1.6M9.5 16.5c1.4 1 3.6 1 5 0"/></svg><span>Reddit</span></a>` +
      `<a class="d2-sb" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener"><svg class="d2-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/></svg><span>Facebook</span></a>` +
      `<a class="d2-sb" href="https://bsky.app/intent/compose?text=${t}%20${u}" target="_blank" rel="noopener"><svg class="d2-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11c-1.5-3-5-6.5-7.5-6.5-1.5 0-1.5 2-1 4.5.6 2.6 2.5 3.5 5 3.3-3 .6-4 2.3-2 4.4 3 3 4.6-.5 5.5-2.7.9 2.2 2.5 5.7 5.5 2.7 2-2.1 1-3.8-2-4.4 2.5.2 4.4-.7 5-3.3.5-2.5.5-4.5-1-4.5C17 4.5 13.5 8 12 11z"/></svg><span>Bluesky</span></a>` +
      `<a class="d2-sb" href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener"><svg class="d2-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1-1.2 2 1-.5 1.7c-3.5.5-8-4-7.5-7.5L10.2 7l1 2z"/></svg><span>WhatsApp</span></a>` +
      `</div></div><div class="d2-share__g"><h3>${ico('bolt')}Ask AI about this ${esc(kind === 'w' ? 'weapon' : kind === 'a' ? 'armor' : 'build')}</h3><div class="d2-share__row">` +
      AIS.map((a) => `<a class="d2-sb d2-sb--ai" href="${a[1]}${q}" target="_blank" rel="noopener nofollow" data-ai="${esc(a[0])}">${esc(a[0])}</a>`).join('') +
      `</div><p class="d2-fine">Opens the assistant in a new tab with a prompt that points it to this RankSurge page. These are independent services; some may ask you to sign in.</p></div></section>`;
  }
  document.addEventListener('click', (e) => {
    const qa = e.target.closest('.d2-quick__a');
    if (qa) { e.preventDefault(); history.replaceState(null, '', location.pathname + qa.getAttribute('href')); if (MODE === 'armor') armorView(); else weaponsView(); return; }
    const n = e.target.closest('.d2-sb[data-native]');
    if (n) { if (navigator.share) navigator.share({ title: n.dataset.title, url: n.dataset.native }).catch(() => {}); else (navigator.clipboard ? navigator.clipboard.writeText(n.dataset.native) : Promise.reject()).then(() => toast('Link copied'), () => toast(n.dataset.native)); return; }
    const c = e.target.closest('.d2-sb[data-copy]');
    if (c) { (navigator.clipboard ? navigator.clipboard.writeText(c.dataset.copy) : Promise.reject()).then(() => toast('Link copied'), () => toast(c.dataset.copy)); return; }
    const a = e.target.closest('.d2-sb[data-ai]');
    if (a) { try { (window.dataLayer = window.dataLayer || []).push({ event: 'rs_d2_ask_ai', rs_ai_target: a.dataset.ai }); } catch (x) { /* ignore */ } }
  });

  /* ---------- weapon detail ---------- */
  function rankIn(peers, w, stat) {
    const vals = peers.filter((p) => p.s[stat] != null).map((p) => p.s[stat]).sort((a, b) => b - a);
    if (!vals.length || w.s[stat] == null) return null;
    const r = vals.indexOf(w.s[stat]) + 1;
    return { r, n: vals.length, max: vals[0], avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
  }
  function openWeapon(w) {
    const peers = (D.peers[w.peerKey] || []).filter((p) => p.h !== w.h);
    const all = peers.concat([w]);
    const pmax = {}; (D.meta.statOrder || KEY_STATS).forEach((k) => { const v = all.map((p) => p.s[k]).filter((x) => x != null); if (v.length > 1) pmax[k] = Math.max.apply(null, v); });
    const selected = w.pk.map(() => null);
    const frame = perk(w.fr);
    const cols = w.pk.map((c, i) => `<div class="d2-col"><p class="d2-col__k">${esc(colName(c, i, w.pk))}</p>${c.map((h) => { const p = perk(h); return `<button type="button" class="d2-perk${p.e ? ' is-enh' : ''}" data-col="${i}" data-perk="${h}" aria-pressed="false" title="${esc(p.n)}">${img(p.i, 36, '')}<span>${esc(p.n)}</span></button>`; }).join('')}</div>`).join('');
    const keyStats = (D.meta.statOrder || KEY_STATS).filter((k) => w.s[k] != null && NUM_STATS.indexOf(k) < 0 && !(D.meta.stats[k] && D.meta.stats[k].bar === 0));
    const ranks = keyStats.map((k) => { const r = rankIn(all, w, k); return r && r.n > 1 ? `<li><b>${esc(k)}</b> <span>#${r.r} of ${r.n}</span> <small>${w.s[k]} vs avg ${r.avg}, best ${r.max}</small></li>` : ''; }).join('');
    const best = keyStats.map((k) => ({ k, r: rankIn(all, w, k) })).filter((x) => x.r && x.r.n > 2);
    const uniq = (k, hi) => { const v = all.map((p) => p.s[k]).filter((x) => x != null); const t = hi ? Math.max.apply(null, v) : Math.min.apply(null, v); return v.filter((x) => x === t).length === 1; };
    const strong = best.filter((x) => x.r.r === 1 && w.s[x.k] === x.r.max && uniq(x.k, 1)).map((x) => x.k), weak = best.filter((x) => uniq(x.k, 0) && w.s[x.k] === Math.min.apply(null, all.map((p) => p.s[x.k]).filter((v) => v != null))).map((x) => x.k);
    const verdict = peers.length ? `<p class="d2-verdict">${strong.length ? `Best ${esc(w.frn || w.ty)} ${esc(w.ty)} for <b>${esc(strong.slice(0, 3).join(', '))}</b>. ` : ''}${weak.length ? `Lowest for <b>${esc(weak.slice(0, 3).join(', '))}</b>. ` : ''}Compared with ${peers.length} other ${esc(w.r === 'exotic' ? w.ty + 's at ' + w.rpm + ' RPM' : (w.frn || '') + ' ' + w.ty + 's')} in the database.</p>` : '<p class="d2-verdict">No other weapon shares this frame, so it has no direct rivals in the database.</p>';
    const sortStat = keyStats.indexOf('Range') > -1 ? 'Range' : keyStats[0];
    const peerTable = peers.length ? `<div class="d2-peers"><div class="d2-peers__hd"><h3>Similar weapons</h3>${sel('pst', keyStats.map((k) => [k, 'Sort by ' + k]), sortStat, 'Sort similar weapons')}</div><div class="d2-peers__t" data-peers></div></div>` : '';
    const d = sheet(`<div class="d2-det${w.r === 'exotic' ? ' is-exotic' : ''}"><header class="d2-det__hd">${img(w.ic, 96, w.n)}${w.wm ? img(w.wm, 96, '', 'd2-wm') : ''}<div><p class="d2-det__k">${w.r === 'exotic' ? 'Exotic' : 'Legendary'} ${esc(w.ty)}${w.ad ? ' · Adept' : ''}${w.cr ? ' · Craftable' : ''}</p><h2 class="d2-det__h">${esc(w.n)}</h2><p class="d2-det__m">${elemBadge(w.el)}<span>${ico(w.sl)}${esc(SLOTN[w.sl])}</span><span class="d2-ammo d2-ammo--${esc(w.am)}">${esc(cap(w.am))} ammo</span>${w.br ? `<span>${esc(w.br)}</span>` : ''}</p>${w.fl ? `<p class="d2-det__fl">${esc(w.fl)}</p>` : ''}</div></header>
      <div class="d2-det__grid"><section><h3>Stats</h3><div data-wstats>${statRows(w.s, null, pmax)}</div><p class="d2-fine">Select perks below to see how they change the stats. The tick on each bar is the best value among similar weapons. Stats are before masterwork and mods.</p></section>
      <section><h3>Frame</h3>${frame ? `<div class="d2-frame">${img(frame.i, 40, '')}<div><b>${esc(frame.n)}</b><p>${esc(frame.d)}</p></div></div>` : ''}<h3>How it compares</h3>${verdict}${ranks ? `<ul class="d2-ranks">${ranks}</ul>` : ''}<h3>Where to get it</h3><p>${esc(w.src || 'Source not listed by Bungie.')}</p></section></div>
      <section class="d2-perks"><h3>Perks <small>${w.r === 'exotic' ? 'Exotic weapons have a fixed roll' : 'Tap one perk per column to build your god roll'}</small></h3><div class="d2-cols">${cols}</div><div class="d2-perkinfo" data-perkinfo aria-live="polite"><p>Tap a perk to read what it does.</p></div></section>
      ${peerTable}
      <div class="d2-det__act"><button type="button" class="rs-btn" data-add-build="w${w.h}">${ico('build')}Add to build</button><button type="button" class="rs-btn rs-btn--ghost" data-cmp="w${w.h}">${ico('compare')}${cmpGet().indexOf('w' + w.h) > -1 ? 'In compare' : 'Compare'}</button></div>${shareBlock('w', w)}</div>`);
    history.replaceState(null, '', '#w' + w.h); recentAdd('w' + w.h);
    function drawPeers() {
      const box = $('[data-peers]', d); if (!box) return;
      const st = ($('select[name=pst]', d) || {}).value || sortStat;
      const list = all.slice().sort((a, b) => (b.s[st] || 0) - (a.s[st] || 0)).slice(0, 14);
      const cols2 = ['Impact', 'Range', 'Stability', 'Handling', 'Reload Speed'].filter((k) => keyStats.indexOf(k) > -1);
      box.innerHTML = `<table class="d2-tbl"><thead><tr><th scope="col">Weapon</th>${cols2.map((k) => `<th scope="col"${k === st ? ' class="is-sort"' : ''}>${esc(k.replace(' Speed', ''))}</th>`).join('')}${keyStats.indexOf(st) > -1 && cols2.indexOf(st) < 0 ? `<th scope="col" class="is-sort">${esc(st)}</th>` : ''}</tr></thead><tbody>${list.map((p) => `<tr${p.h === w.h ? ' class="is-me"' : ''}><th scope="row"><button type="button" class="d2-link" data-open="w${p.h}">${img(p.ic, 28, '')}${esc(p.n)}</button></th>${cols2.map((k) => `<td${k === st ? ' class="is-sort"' : ''}>${p.s[k] == null ? '—' : p.s[k]}</td>`).join('')}${keyStats.indexOf(st) > -1 && cols2.indexOf(st) < 0 ? `<td class="is-sort">${p.s[st] == null ? '—' : p.s[st]}</td>` : ''}</tr>`).join('')}</tbody></table>`;
    }
    drawPeers();
    d.addEventListener('change', (e) => { if (e.target.name === 'pst') drawPeers(); });
    d.addEventListener('click', (e) => {
      const b = e.target.closest('[data-perk]');
      if (b) {
        const i = +b.dataset.col, h = +b.dataset.perk;
        selected[i] = selected[i] === h ? null : h;
        $$('[data-col="' + i + '"]', d).forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.perk === selected[i])));
        const p = perk(h);
        $('[data-perkinfo]', d).innerHTML = `<div class="d2-frame">${img(p.i, 40, '')}<div><b>${esc(p.n)}</b>${p.e ? ' <small class="d2-enh">Enhanced</small>' : ''}<p>${esc(p.d || 'Bungie has no description for this perk.')}</p>${p.s ? `<p class="d2-fine">${Object.keys(p.s).map((k) => `${esc(k)} ${p.s[k] > 0 ? '+' : ''}${p.s[k]}`).join(' · ')}</p>` : ''}${p.cs ? `<p class="d2-fine">When active: ${Object.keys(p.cs).map((k) => `${esc(k)} ${p.cs[k] > 0 ? '+' : ''}${p.cs[k]}`).join(' · ')}</p>` : ''}</div></div>`;
        $('[data-wstats]', d).innerHTML = statRows(wStats(w, selected.filter(Boolean)), w.s, pmax);
        return;
      }
      const o = e.target.closest('[data-open]'); if (o) return openKey(o.dataset.open);
      actions(e);
    });
  }
  function colName(c, i, pk) {
    const cat = perk(c[0]) ? perk(c[0]).c : '';
    if (/frames/i.test(cat) && pk) { const n = pk.slice(0, i + 1).filter((x) => perk(x[0]) && /frames/i.test(perk(x[0]).c)).length; return 'Trait ' + n; }
    if (/barrel|tubes|bowstring|blades|haft|scope/i.test(cat)) return 'Barrel / sight';
    if (/magazine|arrows|batter|guards/i.test(cat)) return 'Magazine';
    if (/frames/i.test(cat)) return i < 3 ? 'Trait ' + (i - 1) : 'Trait';
    if (/origins/i.test(cat)) return 'Origin trait';
    if (/stocks|grips/i.test(cat)) return 'Grip / stock';
    return 'Column ' + (i + 1);
  }
  function rpmTxt(w) { const s = w.s; if (s['Rounds Per Minute']) return ` · ${s['Rounds Per Minute']} RPM`; if (s['Draw Time'] && /bow/i.test(w.ty)) return ` · ${s['Draw Time']} ms draw`; if (s['Charge Time'] && /fusion/i.test(w.ty)) return ` · ${s['Charge Time']} ms charge`; return ''; }
  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

  /* ---------- armor detail ---------- */
  function openArmor(a) {
    const ex = perk(a.ex), st = a.set && D.sets[a.set];
    const arch = (a.at || []).map((h) => { const p = perk(h); return `<li>${img(p.i, 28, '')}<b>${esc(p.n)}</b><small>${p.pr ? esc(p.pr) + ' primary' : ''}${p.se ? ' · ' + esc(p.se) + ' secondary' : ''}</small></li>`; }).join('');
    const ro = (a.ro || []).map((r, i) => `<li><b>${['Primary stat', 'Secondary stat', 'Tertiary stat'][i] || 'Stat'}</b> <span>${r[0]}–${r[1]}</span></li>`).join('');
    const total = (a.ro || []).reduce((t, r) => [t[0] + r[0], t[1] + r[1]], [0, 0]);
    const d = sheet(`<div class="d2-det${a.r === 'exotic' ? ' is-exotic' : ''}"><header class="d2-det__hd">${img(a.ic, 96, a.n)}${a.wm ? img(a.wm, 96, '', 'd2-wm') : ''}<div><p class="d2-det__k">${a.r === 'exotic' ? 'Exotic' : 'Legendary'} ${esc(SLOTN[a.sl] || a.ty)} · ${esc(CLSN[a.cl])}</p><h2 class="d2-det__h">${esc(a.n)}</h2>${a.fl ? `<p class="d2-det__fl">${esc(a.fl)}</p>` : ''}</div></header>
      <div class="d2-det__grid"><section>${ex ? `<h3>Exotic perk</h3><div class="d2-frame">${img(ex.i, 40, '')}<div><b>${esc(ex.n)}</b><p>${esc(ex.d)}</p></div></div>` : ''}${st ? `<h3>Set bonus: ${esc(st.n)}</h3><ul class="d2-setp">${st.p.map((p) => `<li><b>${p[0]} pieces · ${esc(p[1])}</b><p>${esc(p[2])}</p></li>`).join('')}</ul>` : ''}${!ex && !st ? '<h3>Perks</h3><p>No exotic perk or set bonus on this piece.</p>' : ''}<h3>Where to get it</h3><p>${esc(a.src || 'Source not listed by Bungie.')}</p></section>
      <section>${ro ? `<h3>Stat rolls</h3><ul class="d2-ranks">${ro}</ul><p class="d2-fine">Armor 3.0 pieces roll a primary and secondary stat from their archetype, plus one random tertiary stat. This piece totals ${total[0]}–${total[1]} before tuning and mods. Higher gear tiers roll closer to the top of each range.</p>` : '<h3>Stats</h3><p>This is older armor; its stats are set per drop, so they are not in Bungie\'s item data.</p>'}${arch ? `<h3>Possible archetypes</h3><ul class="d2-arch">${arch}</ul>` : ''}</section></div>
      <div class="d2-det__act"><button type="button" class="rs-btn" data-add-build="a${a.h}">${ico('build')}Add to build</button><button type="button" class="rs-btn rs-btn--ghost" data-cmp="a${a.h}">${ico('compare')}${cmpGet().indexOf('a' + a.h) > -1 ? 'In compare' : 'Compare'}</button></div>${shareBlock('a', a)}</div>`);
    history.replaceState(null, '', '#a' + a.h); recentAdd('a' + a.h);
    d.addEventListener('click', actions);
  }
  function openKey(k) { if (k[0] === 'w' && D.WH[k.slice(1)]) openWeapon(D.WH[k.slice(1)]); else if (k[0] === 'a' && D.AH[k.slice(1)]) openArmor(D.AH[k.slice(1)]); }
  function actions(e) {
    const c = e.target.closest('[data-cmp]');
    if (c) { cmpToggle(c.dataset.cmp); c.lastChild.textContent = cmpGet().indexOf(c.dataset.cmp) > -1 ? 'In compare' : 'Compare'; return; }
    const ab = e.target.closest('[data-add-build]');
    if (ab) { addToBuild(ab.dataset.addBuild); return; }
    const cl = e.target.closest('[data-copy-link]');
    if (cl) { const u = location.origin + location.pathname + cl.dataset.copyLink; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Link copied'), () => toast(u)); }
  }


  /* ---------- recently viewed + quick picks ---------- */
  const RK = 'rs_d2_recent';
  function recentGet() { try { return JSON.parse(localStorage.getItem(RK) || '[]'); } catch (e) { return []; } }
  function recentAdd(k) { try { const a = recentGet().filter((x) => x !== k); a.unshift(k); localStorage.setItem(RK, JSON.stringify(a.slice(0, 8))); } catch (e) { /* ignore */ } }
  function recentRow() {
    const a = recentGet().map((k) => (k[0] === 'w' ? D.WH[k.slice(1)] && ['w', D.WH[k.slice(1)]] : D.AH[k.slice(1)] && ['a', D.AH[k.slice(1)]])).filter(Boolean);
    if (!a.length) return '';
    return `<div class="d2-recent" aria-label="Recently viewed"><span class="d2-recent__k">${ico('clock')}Recently viewed</span>${a.map((x) => `<button type="button" class="d2-recent__b" data-open="${x[0]}${x[1].h}">${img(x[1].ic, 28, '')}<span>${esc(x[1].n)}</span></button>`).join('')}</div>`;
  }
  function quick(list) { return `<nav class="d2-quick" aria-label="Quick filters"><span class="d2-recent__k">${ico('bolt')}Quick picks</span>${list.map((q) => `<a class="d2-quick__a" href="${q[1]}">${esc(q[0])}</a>`).join('')}</nav>`; }
  const QW = [['Exotic weapons', '?rarity=exotic'], ['Heavy weapons', '?ammo=heavy'], ['Craftable', '?craft=1'], ['Hand cannons', '?type=Hand+Cannon'], ['Pulse rifles', '?type=Pulse+Rifle'], ['Shotguns', '?type=Shotgun'], ['Sniper rifles', '?type=Sniper+Rifle'], ['Rocket launchers', '?type=Rocket+Launcher'], ['Highest Range', '?sort=Range'], ['Best Handling', '?sort=Handling']];
  const QA = [['Hunter exotics', '?class=hunter&rarity=exotic'], ['Titan exotics', '?class=titan&rarity=exotic'], ['Warlock exotics', '?class=warlock&rarity=exotic'], ['Exotic class items', '?slot=class&rarity=exotic'], ['Gunner armor', '?arch=Gunner'], ['Grenadier armor', '?arch=Grenadier'], ['Paragon armor', '?arch=Paragon']];

  /* ---------- browse views ---------- */
  const PER = 60;
  function weaponsView() {
    const q = new URLSearchParams(location.search);
    const st = { q: q.get('q') || '', slot: q.get('slot') || 'all', ty: q.get('type') || 'all', el: q.get('el') || 'all', am: q.get('ammo') || 'all', r: q.get('rarity') || 'all', fr: q.get('frame') || 'all', sort: q.get('sort') || 'newest', min: +(q.get('min') || 0), craft: q.get('craft') === '1', adept: q.get('adept') === '1', n: PER };
    APP.innerHTML = `${hubNav()}${quick(QW)}${recentRow()}<form class="d2-f" data-f role="search" aria-label="Filter weapons" onsubmit="return false">
      <label class="d2-q"><span class="rs-sr">Search weapons, perks or frames</span>${ico('filter')}<input type="search" name="q" value="${esc(st.q)}" placeholder="Search a weapon, perk, frame or source" autocomplete="off"></label>
      ${chips('slot', [['all', 'All slots'], ['kinetic', 'Kinetic'], ['energy', 'Energy'], ['power', 'Power']], st.slot, 'Slot')}
      ${chips('el', [['all', 'All elements']].concat(ELEM.map((e) => [e, e])), st.el, 'Element')}
      <div class="d2-f__row">${sel('type', [['all', 'All weapon types']].concat(D.types.map((t) => [t, t])), st.ty, 'Type')}${sel('frame', [['all', 'All frames']], st.fr, 'Frame')}${sel('ammo', [['all', 'All ammo'], ['primary', 'Primary'], ['special', 'Special'], ['heavy', 'Heavy']], st.am, 'Ammo')}${sel('rarity', [['all', 'Legendary + Exotic'], ['legendary', 'Legendary'], ['exotic', 'Exotic']], st.r, 'Rarity')}
      ${sel('sort', [['newest', 'Newest first'], ['name', 'Name A–Z']].concat(KEY_STATS.slice(0, 10).map((k) => [k, 'Highest ' + k])).concat([['Rounds Per Minute', 'Highest RPM']]), st.sort, 'Sort')}
      <label class="d2-sel d2-sel--rng"><span>Minimum <b data-minlbl>${esc(statOf(st.sort))}</b>: <output data-minv>${st.min}</output></span><input type="range" name="min" min="0" max="100" step="5" value="${st.min}"${KEY_STATS.indexOf(st.sort) < 0 ? ' disabled' : ''}></label>
      <label class="d2-tog"><input type="checkbox" name="craft"${st.craft ? ' checked' : ''}><span>Craftable only</span></label><label class="d2-tog"><input type="checkbox" name="adept"${st.adept ? ' checked' : ''}><span>Include Adept</span></label><button type="button" class="d2-link" data-reset>Reset filters</button></div></form>
      <p class="d2-count" data-count aria-live="polite"></p><div class="d2-grid" data-grid></div><p class="d2-more"><button type="button" class="rs-btn rs-btn--ghost" data-more hidden>Show more</button></p>`;
    const f = $('[data-f]', APP);
    function frames() {
      const fs = Array.from(new Set(D.W.filter((w) => (st.ty === 'all' || w.ty === st.ty) && w.r === 'legendary' && w.frn).map((w) => w.frn))).sort();
      const s = $('select[name=frame]', f);
      s.innerHTML = [['all', 'All frames']].concat(fs.map((x) => [x, x])).map((o) => `<option value="${esc(o[0])}"${o[0] === st.fr ? ' selected' : ''}>${esc(o[1])}</option>`).join('');
      if (fs.indexOf(st.fr) < 0) st.fr = 'all';
    }
    function list() {
      const qq = st.q.trim().toLowerCase();
      let L = D.W.filter((w) => (st.adept || !w.ad) && (st.slot === 'all' || w.sl === st.slot) && (st.el === 'all' || w.el === st.el) && (st.ty === 'all' || w.ty === st.ty) && (st.am === 'all' || w.am === st.am) && (st.r === 'all' || w.r === st.r) && (st.fr === 'all' || w.frn === st.fr) && (!st.craft || w.cr) && (!qq || qq.split(/\s+/).every((t) => w.txt.indexOf(t) > -1)) && (!st.min || KEY_STATS.indexOf(st.sort) < 0 || (w.s[st.sort] || 0) >= st.min));
      if (st.sort === 'name') L.sort((a, b) => a.n.localeCompare(b.n));
      else if (st.sort === 'newest') L.sort((a, b) => rel(b.rel) - rel(a.rel) || a.n.localeCompare(b.n));
      else L.sort((a, b) => (b.s[st.sort] || b.rpm * (st.sort === 'Rounds Per Minute') || 0) - (a.s[st.sort] || a.rpm * (st.sort === 'Rounds Per Minute') || 0) || a.n.localeCompare(b.n));
      $('[data-count]', APP).textContent = `${L.length} weapon${L.length === 1 ? '' : 's'}${qq ? ` matching "${st.q.trim()}"` : ''}`;
      $('[data-grid]', APP).innerHTML = L.slice(0, st.n).map((w) => tile(w, 'w')).join('') || '<p class="d2-empty">No weapons match. Try fewer filters.</p>';
      const m = $('[data-more]', APP); m.hidden = L.length <= st.n; m.textContent = `Show more (${L.length - st.n} left)`;
      syncURL({ q: st.q, slot: st.slot, type: st.ty, el: st.el, ammo: st.am, rarity: st.r, frame: st.fr, sort: st.sort, min: st.min || '', craft: st.craft ? 1 : '', adept: st.adept ? 1 : '' }, { slot: 'all', type: 'all', el: 'all', ammo: 'all', rarity: 'all', frame: 'all', sort: 'newest' });
    }
    frames(); list();
    const upd = () => { const fd = new FormData(f); st.q = fd.get('q') || ''; st.slot = fd.get('slot'); st.el = fd.get('el'); const nt = fd.get('type'); if (nt !== st.ty) { st.ty = nt; frames(); } st.fr = $('select[name=frame]', f).value; st.am = fd.get('ammo'); st.r = fd.get('rarity'); st.sort = fd.get('sort'); st.craft = !!fd.get('craft'); st.adept = !!fd.get('adept'); const rg = $('input[name=min]', f); rg.disabled = KEY_STATS.indexOf(st.sort) < 0; st.min = rg.disabled ? 0 : +rg.value; $('[data-minv]', f).textContent = st.min; $('[data-minlbl]', f).textContent = statOf(st.sort); st.n = PER; list(); };
    f.addEventListener('input', debounce(upd, 120)); f.addEventListener('change', upd);
    $('[data-reset]', f).onclick = () => { history.replaceState(null, '', location.pathname); weaponsView(); };
    $('[data-more]', APP).onclick = () => { st.n += PER; list(); };
    APP.onclick = (e) => { const o = e.target.closest('[data-open]'); if (o) openKey(o.dataset.open); };
  }
  function statOf(s) { return KEY_STATS.indexOf(s) > -1 ? s : 'stat'; }
  function syncURL(o, defs) { const p = new URLSearchParams(); Object.keys(o).forEach((k) => { const v = o[k]; if (v !== '' && v != null && v !== defs[k] && v !== 0) p.set(k, v); }); const s = p.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); }

  function armorView() {
    const q = new URLSearchParams(location.search);
    const st = { q: q.get('q') || '', cl: q.get('class') || 'all', sl: q.get('slot') || 'all', r: q.get('rarity') || 'all', set: q.get('set') || 'all', at: q.get('arch') || 'all', a3: q.get('all') !== '1', sort: q.get('sort') || 'newest', n: PER };
    const sets = Object.keys(D.sets).map((k) => [k, D.sets[k].n]).sort((a, b) => a[1].localeCompare(b[1]));
    const archs = Array.from(new Set(D.A.reduce((t, a) => t.concat(a.at || []), []))).map((h) => [String(h), pn(h)]).filter((x) => x[1]).sort((a, b) => a[1].localeCompare(b[1]));
    const archByName = {}; archs.forEach((a) => { (archByName[a[1]] = archByName[a[1]] || []).push(+a[0]); });
    const archOpts = Object.keys(archByName).sort().map((n) => { const p = perk(archByName[n][0]); return [n, n + (p && p.pr ? ` (${p.pr} / ${p.se})` : '')]; });
    APP.innerHTML = `${hubNav()}${quick(QA)}${recentRow()}<form class="d2-f" data-f role="search" aria-label="Filter armor" onsubmit="return false">
      <label class="d2-q"><span class="rs-sr">Search armor, exotic perks or sets</span>${ico('filter')}<input type="search" name="q" value="${esc(st.q)}" placeholder="Search armor, an exotic perk, a set or a source" autocomplete="off"></label>
      ${chips('class', [['all', 'All classes'], ['hunter', 'Hunter'], ['titan', 'Titan'], ['warlock', 'Warlock']], st.cl, 'Class')}
      ${chips('slot', [['all', 'All slots']].concat(SLOTA.map((s) => [s, SLOTN[s]])), st.sl, 'Slot')}
      <div class="d2-f__row">${sel('rarity', [['all', 'Legendary + Exotic'], ['legendary', 'Legendary'], ['exotic', 'Exotic']], st.r, 'Rarity')}${sel('set', [['all', 'Any set bonus'], ['none', 'No set']].concat(sets), st.set, 'Armor set')}${sel('arch', [['all', 'Any archetype']].concat(archOpts), st.at, 'Archetype')}${sel('sort', [['newest', 'Newest first'], ['name', 'Name A–Z']], st.sort, 'Sort')}
      <label class="d2-tog"><input type="checkbox" name="all"${!st.a3 ? ' checked' : ''}><span>Include older armor</span></label><button type="button" class="d2-link" data-reset>Reset filters</button></div></form>
      <p class="d2-count" data-count aria-live="polite"></p><div class="d2-grid" data-grid></div><p class="d2-more"><button type="button" class="rs-btn rs-btn--ghost" data-more hidden>Show more</button></p>`;
    const f = $('[data-f]', APP);
    function list() {
      const qq = st.q.trim().toLowerCase();
      const ah = st.at === 'all' ? null : archByName[st.at] || [];
      let L = D.A.filter((a) => (!st.a3 || a.a3 || a.r === 'exotic') && (st.cl === 'all' || a.cl === st.cl) && (st.sl === 'all' || a.sl === st.sl) && (st.r === 'all' || a.r === st.r) && (st.set === 'all' || (st.set === 'none' ? !a.set : String(a.set) === st.set)) && (!ah || (a.at || []).some((h) => ah.indexOf(h) > -1)) && (!qq || qq.split(/\s+/).every((t) => a.txt.indexOf(t) > -1)));
      if (st.sort === 'name') L.sort((a, b) => a.n.localeCompare(b.n)); else L.sort((a, b) => rel(b.rel) - rel(a.rel) || (b.r === 'exotic') - (a.r === 'exotic') || a.n.localeCompare(b.n));
      $('[data-count]', APP).textContent = `${L.length} armor piece${L.length === 1 ? '' : 's'}${qq ? ` matching "${st.q.trim()}"` : ''}`;
      $('[data-grid]', APP).innerHTML = L.slice(0, st.n).map((a) => tile(a, 'a')).join('') || '<p class="d2-empty">No armor matches. Try fewer filters.</p>';
      const m = $('[data-more]', APP); m.hidden = L.length <= st.n; m.textContent = `Show more (${L.length - st.n} left)`;
      syncURL({ q: st.q, class: st.cl, slot: st.sl, rarity: st.r, set: st.set, arch: st.at, sort: st.sort, all: st.a3 ? '' : 1 }, { class: 'all', slot: 'all', rarity: 'all', set: 'all', arch: 'all', sort: 'newest' });
    }
    list();
    const upd = () => { const fd = new FormData(f); st.q = fd.get('q') || ''; st.cl = fd.get('class'); st.sl = fd.get('slot'); st.r = fd.get('rarity'); st.set = fd.get('set'); st.at = fd.get('arch'); st.sort = fd.get('sort'); st.a3 = !fd.get('all'); st.n = PER; list(); };
    f.addEventListener('input', debounce(upd, 120)); f.addEventListener('change', upd);
    $('[data-reset]', f).onclick = () => { history.replaceState(null, '', location.pathname); armorView(); };
    $('[data-more]', APP).onclick = () => { st.n += PER; list(); };
    APP.onclick = (e) => { const o = e.target.closest('[data-open]'); if (o) openKey(o.dataset.open); };
  }

  /* ---------- best gear (data-driven + curated) ---------- */
  function topView() {
    const leg = D.W.filter((w) => w.r === 'legendary' && !w.ad);
    const newestW = D.W.filter((w) => !w.ad && rel(w.rel) >= D.newest).sort((a, b) => (b.r === 'exotic') - (a.r === 'exotic') || a.n.localeCompare(b.n));
    const newestA = D.A.filter((a) => a.r === 'exotic' && rel(a.rel) >= D.newest - 2);
    const CAT = [['Hand Cannon', 'Range'], ['Auto Rifle', 'Stability'], ['Pulse Rifle', 'Range'], ['Scout Rifle', 'Range'], ['Submachine Gun', 'Handling'], ['Sidearm', 'Range'], ['Shotgun', 'Range'], ['Sniper Rifle', 'Aim Assistance'], ['Fusion Rifle', 'Range'], ['Grenade Launcher', 'Blast Radius'], ['Rocket Launcher', 'Blast Radius'], ['Linear Fusion Rifle', 'Range'], ['Machine Gun', 'Range'], ['Sword', 'Impact'], ['Bow', 'Accuracy'], ['Glaive', 'Range'], ['Trace Rifle', 'Range']];
    const leaders = CAT.map((c) => { const L = leg.filter((w) => w.ty === c[0] && w.s[c[1]] != null).sort((a, b) => b.s[c[1]] - a.s[c[1]]).slice(0, 3); return L.length ? `<div class="d2-lead"><h3>${esc(c[0])}s <small>highest base ${esc(c[1])}</small></h3><ol>${L.map((w) => `<li><button type="button" class="d2-link" data-open="w${w.h}">${img(w.ic, 32, '')}<span>${esc(w.n)}</span></button><b>${w.s[c[1]]}</b><small>${esc(w.frn)}</small></li>`).join('')}</ol></div>` : ''; }).join('');
    const cur = D.curated || null;
    const curHtml = cur && cur.picks && cur.picks.length ? `<section class="d2-sec"><h2>${ico('star')}Community meta picks <small>Updated ${esc(cur.updated || '')}</small></h2><p class="d2-fine">${esc(cur.note || 'Picks reviewed by the RankSurge team from current community tier lists and patch notes.')}</p><div class="d2-grid">${cur.picks.map((p) => { const it = p.k === 'a' ? D.A.find((a) => a.n === p.n) : D.W.find((w) => w.n === p.n && !w.ad); return it ? `<div class="d2-pick">${tile(it, p.k === 'a' ? 'a' : 'w')}<p><b>${esc(p.tag || '')}</b> ${esc(p.why || '')}</p></div>` : ''; }).join('')}</div></section>` : '';
    const exoBy = CLS.map((c) => { const L = newestA.filter((a) => a.cl === c); return L.length ? `<div><h3>${esc(CLSN[c])}</h3><div class="d2-grid d2-grid--s">${L.map((a) => tile(a, 'a')).join('')}</div></div>` : ''; }).join('');
    APP.innerHTML = `${hubNav()}${curHtml}
      <section class="d2-sec"><h2>${ico('clock')}Latest update</h2><p class="d2-fine">Weapons Bungie added or refreshed in the most recent Destiny 2 update, straight from Bungie's item data.</p><div class="d2-grid">${newestW.slice(0, 24).map((w) => tile(w, 'w')).join('')}</div><p class="d2-more"><a class="rs-btn rs-btn--ghost" href="${PAGE.weapons}?sort=newest">See every weapon</a></p></section>
      ${exoBy ? `<section class="d2-sec"><h2>${ico('shield')}Newest exotic armor by class</h2>${exoBy}</section>` : ''}
      <section class="d2-sec"><h2>${ico('chart')}Stat leaders by weapon type</h2><p class="d2-fine">The three legendary weapons with the highest base value in the stat that matters most for each type. Base stats only: perks, masterwork and mods change the final numbers.</p><div class="d2-leads">${leaders}</div></section>`;
    APP.onclick = (e) => { const o = e.target.closest('[data-open]'); if (o) openKey(o.dataset.open); };
  }

  /* ---------- build planner ---------- */
  const BKEY = 'rs_d2_builds';
  function blank(c) { return { c: c || 'hunter', sub: 'Void', name: '', w: { kinetic: null, energy: null, power: null }, wp: {}, a: { helmet: null, arms: null, chest: null, legs: null, class: null }, ap: {} }; }
  function bLoad() { try { const o = JSON.parse(localStorage.getItem(BKEY) || 'null'); if (o && o.A) return o; } catch (e) { /* ignore */ } return { A: blank('hunter'), B: blank('hunter'), cur: 'A' }; }
  function bSave(S) { try { localStorage.setItem(BKEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function enc(b) { return btoa(unescape(encodeURIComponent(JSON.stringify(b)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dec(s) { try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; } }
  function addToBuild(key) {
    const S = bLoad(), b = S[S.cur];
    if (key[0] === 'w') { const w = D.WH[key.slice(1)]; if (!w) return; b.w[w.sl] = w.h; b.wp[w.sl] = []; }
    else { const a = D.AH[key.slice(1)]; if (!a) return; if (a.cl !== 'any' && a.cl !== b.c) { b.c = a.cl; Object.keys(b.a).forEach((s) => { const x = D.AH[b.a[s]]; if (x && x.cl !== 'any' && x.cl !== a.cl) b.a[s] = null; }); } b.a[a.sl] = a.h; b.ap[a.sl] = apDefault(a); if (b.real) delete b.real[a.sl]; if (b.inst) delete b.inst[a.sl]; if (b.fill) delete b.fill[a.sl]; }
    bSave(S);
    if (MODE === 'build') { closeSheet(); buildView(); toast('Added to Build ' + S.cur); }
    else toast('Added to Build ' + S.cur + '. Open the build planner to see the totals.');
  }
  function pieceStats(a, ap) {
    const out = {}; AST.forEach((s) => { out[s] = 0; });
    if (!a || !a.ro || !ap) return { s: out, est: false };
    const arch = perk(ap.at), g = Math.max(1, Math.min(5, ap.g || 5));
    const pick = (r) => Math.round(r[0] + ((r[1] - r[0]) * (g - 1)) / 4);
    if (arch && arch.pr && a.ro[0]) out[arch.pr] += pick(a.ro[0]);
    if (arch && arch.se && a.ro[1]) out[arch.se] += pick(a.ro[1]);
    if (ap.t && a.ro[2] && (!arch || (ap.t !== arch.pr && ap.t !== arch.se))) out[ap.t] += pick(a.ro[2]);
    return { s: out, est: true };
  }
  function buildTotals(b) {
    const t = {}; AST.forEach((s) => { t[s] = 0; });
    const sets = {}; let exA = 0, exW = 0, missing = 0;
    SLOTA.forEach((sl) => {
      const a = D.AH[b.a[sl]]; if (!a) { missing++; return; }
      if (a.r === 'exotic') exA++;
      const real = b.real && b.real[sl];
      const ps = real ? { s: real } : pieceStats(a, b.ap[sl]);
      AST.forEach((s) => { t[s] += ps.s[s] || 0; });
      if (a.set) sets[a.set] = (sets[a.set] || 0) + 1;
    });
    SLOTW.forEach((sl) => { const w = D.WH[b.w[sl]]; if (w && w.r === 'exotic') exW++; });
    const bonuses = []; Object.keys(sets).forEach((k) => { const st = D.sets[k]; if (!st) return; st.p.forEach((p) => { bonuses.push({ set: st.n, n: p[0], name: p[1], d: p[2], on: sets[k] >= p[0], have: sets[k] }); }); });
    const warn = [];
    if (exA > 1) warn.push('Only one exotic armor piece can be equipped. Swap one for a legendary.');
    if (exW > 1) warn.push('Only one exotic weapon can be equipped. Swap one for a legendary.');
    const wrong = SLOTA.filter((sl) => { const a = D.AH[b.a[sl]]; return a && a.cl !== 'any' && a.cl !== b.c; });
    if (wrong.length) warn.push(`${wrong.map((s) => SLOTN[s]).join(', ')} ${wrong.length > 1 ? 'are' : 'is'} for another class.`);
    const sub = b.sub, elemW = SLOTW.map((sl) => D.WH[b.w[sl]]).filter(Boolean).filter((w) => w.el === sub).length;
    return { t, bonuses, warn, missing, elemW };
  }

  /* ---------- easy-build helpers ---------- */
  function apDefault(a, want) {
    const at = (a.at || []).slice();
    let pickAt = at[0] || null;
    if (want && at.length) { const m = at.find((h) => perk(h) && perk(h).pr === want); if (m) pickAt = m; }
    const p = perk(pickAt), t = AST.find((x) => !p || (x !== p.pr && x !== p.se)) || null;
    return { at: pickAt, t, g: 5 };
  }
  const isTouch = () => matchMedia('(hover: none), (max-width: 760px)').matches;
  function curatedFor(kind, sl, cls) {
    const c = D.curated && D.curated.picks ? D.curated.picks : [];
    return c.filter((p) => p.k === kind).map((p) => (kind === 'a' ? D.A.find((a) => a.n === p.n && a.sl === sl && (a.cl === cls || a.cl === 'any')) : D.W.find((w) => w.n === p.n && !w.ad && w.sl === sl))).filter(Boolean);
  }
  function bestSet(cls) {
    // The newest armor set that has a piece for every non-class slot for this class.
    const by = {};
    D.A.forEach((a) => { if (!a.set || a.r === 'exotic' || (a.cl !== cls && a.cl !== 'any')) return; (by[a.set] = by[a.set] || {})[a.sl] = by[a.set][a.sl] && rel(by[a.set][a.sl].rel) > rel(a.rel) ? by[a.set][a.sl] : a; });
    return Object.keys(by).filter((k) => ['helmet', 'arms', 'chest', 'legs'].every((sl) => by[k][sl])).sort((x, y) => rel(by[y].helmet.rel) - rel(by[x].helmet.rel)).map((k) => ({ k, n: D.sets[k] ? D.sets[k].n : 'Set', pieces: by[k] }));
  }
  function fillSet(b, set, keepExotic) {
    const exSlot = SLOTA.find((sl) => { const a = D.AH[b.a[sl]]; return a && a.r === 'exotic'; });
    Object.keys(set.pieces).forEach((sl) => { if (keepExotic && sl === exSlot) return; const a = set.pieces[sl]; b.a[sl] = a.h; b.ap[sl] = apDefault(a, b.focus); });
    b.real = null;
  }
  function starter(b) {
    const w = {}; SLOTW.forEach((sl) => { const c = curatedFor('w', sl, b.c); const nonEx = c.filter((x) => x.r !== 'exotic'); w[sl] = (sl === 'power' ? c[0] : nonEx[0] || c[0]) || null; });
    // only one exotic weapon
    let ex = 0; SLOTW.forEach((sl) => { if (w[sl] && w[sl].r === 'exotic') { ex++; if (ex > 1) { const alt = curatedFor('w', sl, b.c).find((x) => x.r !== 'exotic'); w[sl] = alt || null; } } });
    SLOTW.forEach((sl) => { b.w[sl] = w[sl] ? w[sl].h : null; b.wp[sl] = []; });
    const sets = bestSet(b.c); if (sets[0]) fillSet(b, sets[0]);
    const exA = D.A.filter((a) => a.r === 'exotic' && a.cl === b.c && (D.curated && D.curated.picks || []).some((p) => p.k === 'a' && p.n === a.n))[0];
    if (exA) { b.a[exA.sl] = exA.h; b.ap[exA.sl] = apDefault(exA, b.focus); }
    SLOTA.forEach((sl) => { if (!b.a[sl]) { const c = D.A.filter((a) => a.sl === sl && a.cl === b.c && a.r !== 'exotic' && a.at).sort((x, y) => rel(y.rel) - rel(x.rel))[0]; if (c) { b.a[sl] = c.h; b.ap[sl] = apDefault(c, b.focus); } } });
    b.real = null;
  }
  function focusStat(b, stat) { b.focus = stat; SLOTA.forEach((sl) => { const a = D.AH[b.a[sl]]; if (a && a.at) b.ap[sl] = apDefault(a, stat); }); b.real = null; }
  function buildView() {
    const S = bLoad();
    const h = location.hash.match(/^#b=([A-Za-z0-9_-]+)/);
    if (h) { const b = dec(h[1]); if (b && b.w && b.a) { S[S.cur] = Object.assign(blank(b.c), b); bSave(S); toast('Build loaded from link'); } history.replaceState(null, '', location.pathname); }
    if (S.cur === 'CMP') return buildCompare(S);
    const b = S[S.cur];
    const T = buildTotals(b);
    const slotW = SLOTW.map((sl) => slotCard(b, sl, 'w')).join('');
    const slotA = SLOTA.map((sl) => slotCard(b, sl, 'a')).join('');
    const stats = AST.map((s) => { const v = T.t[s]; return `<div class="d2-ast"><span>${esc(s)}</span><span class="d2-bar d2-bar--200" role="img" aria-label="${esc(s)} ${v} out of 200"><i style="width:${Math.min(100, v / 2)}%"></i><s style="left:50%" title="100"></s></span><b>${v}</b></div>`; }).join('');
    const total = AST.reduce((t, s) => t + T.t[s], 0);
    APP.innerHTML = `${hubNav()}<div class="d2-bld">
      <div class="d2-bld__tabs" role="tablist" aria-label="Builds">${['A', 'B'].map((k) => `<button type="button" role="tab" aria-selected="${S.cur === k}" data-btab="${k}">Build ${k}<small>${esc(S[k].name || CLSN[S[k].c])}</small></button>`).join('')}<button type="button" role="tab" aria-selected="false" data-btab="CMP">${ico('compare')}Compare A vs B</button></div>
      <div class="d2-bld__top"><label class="d2-sel"><span>Build name</span><input type="text" name="bname" maxlength="40" value="${esc(b.name)}" placeholder="Like: Void Hunter for raids"></label>${chips('bcls', CLS.map((c) => [c, CLSN[c]]), b.c, 'Class')}${chips('bsub', SUBS.map((s) => [s, s]), b.sub, 'Subclass')}</div>
      <div class="d2-easy" role="group" aria-label="Quick start"><div class="d2-easy__row"><button type="button" class="rs-btn" data-agent>${ico('bolt')}AI loadouts for an activity</button><button type="button" class="rs-btn rs-btn--ghost" data-optim>${ico('user')}Best build from my gear</button><button type="button" class="rs-btn" data-starter>${ico('bolt')}Fill a starter ${esc(CLSN[b.c])} build</button><label class="d2-sel d2-sel--s"><span>Armor set</span><select name="eset"><option value="">Pick a set to fill all armor</option>${bestSet(b.c).slice(0, 12).map((x) => `<option value="${x.k}">${esc(x.n)}</option>`).join('')}</select></label><label class="d2-sel d2-sel--s"><span>Focus stat</span><select name="efocus"><option value="">Choose the stat to max</option>${AST.map((x) => `<option${b.focus === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label></div><p class="d2-fine">New here? Tap <b>Fill a starter build</b> for meta picks, then swap anything you like. Picking a focus stat sets every armor piece's archetype to boost it.</p></div>
      <div class="d2-bld__grid"><section><h2>Weapons</h2><div class="d2-slots">${slotW}</div><h2>Armor</h2><div class="d2-slots">${slotA}</div></section>
      <aside class="d2-bld__sum" aria-label="Build totals"><h2>Build stats</h2><div class="d2-asts">${stats}</div><p class="d2-fine">Total ${total} from armor${b.real ? ' (your real rolls)' : ' (estimated from each piece\'s archetype, tertiary stat and gear tier)'}. Each stat goes to 200: 100 gives the full base effect, and points past 100 add an extra bonus. Mods, tuning and your subclass fragments add more in game.</p>
      ${T.warn.length ? `<div class="d2-warn" role="alert">${T.warn.map((w) => `<p>${esc(w)}</p>`).join('')}</div>` : ''}
      ${T.bonuses.length ? `<h3>Set bonuses</h3><ul class="d2-setp">${T.bonuses.map((x) => `<li class="${x.on ? 'is-on' : ''}"><b>${esc(x.set)} · ${x.n} pieces${x.on ? ' · Active' : ` · ${x.have}/${x.n}`}</b><p><i>${esc(x.name)}:</i> ${esc(x.d)}</p></li>`).join('')}</ul>` : ''}
      <h3>Synergy</h3><p class="d2-fine">${T.elemW ? `${T.elemW} of your weapons match your ${esc(b.sub)} subclass, which helps with element-based perks, fragments and set bonuses.` : `None of your weapons match your ${esc(b.sub)} subclass element yet.`}</p>
      <div class="d2-bld__act"><button type="button" class="rs-btn" data-push>${ico('push')}Save to in-game loadout</button><button type="button" class="rs-btn rs-btn--ghost" data-share>${ico('share')}Share build</button><button type="button" class="rs-btn rs-btn--ghost" data-mine>${ico('user')}${b.real ? 'Refresh my rolls' : 'Use my real gear stats'}</button><button type="button" class="d2-link" data-copyab>Copy to Build ${S.cur === 'A' ? 'B' : 'A'}</button><button type="button" class="d2-link" data-clear>${ico('trash')}Clear build</button></div>${buildShare(b)}</aside></div></div>
      <div class="d2-mbar" aria-hidden="true"><div class="d2-mbar__st">${AST.map((x) => `<span><small>${esc(x.slice(0, 3))}</small><b>${T.t[x]}</b></span>`).join('')}</div><button type="button" class="rs-btn" data-push tabindex="-1">${ico('push')}Save</button><button type="button" class="d2-iconbtn" data-jump tabindex="-1" aria-label="Show build stats">${ico('chart')}</button></div>`;
    const ui = APP;
    ui.onchange = (e) => {
      const n = e.target.name;
      if (n === 'bcls') { b.c = e.target.value; Object.keys(b.a).forEach((s) => { const x = D.AH[b.a[s]]; if (x && x.cl !== 'any' && x.cl !== b.c) b.a[s] = null; }); b.real = null; }
      else if (n === 'bsub') b.sub = e.target.value;
      else if (n === 'bname') b.name = e.target.value.slice(0, 40);
      else if (n === 'eset') { const set = bestSet(b.c).find((x) => x.k === e.target.value); if (!set) return; fillSet(b, set, true); toast('Filled your armor with the ' + set.n + ' set'); }
      else if (n === 'efocus') { if (!e.target.value) return; focusStat(b, e.target.value); toast('Armor archetypes set to boost ' + e.target.value); }
      else if (n && n.indexOf('ap-') === 0) { const p = n.split('-'); b.ap[p[2]] = b.ap[p[2]] || {}; b.ap[p[2]][p[1]] = p[1] === 'g' ? +e.target.value : (p[1] === 'at' ? +e.target.value || null : e.target.value || null); b.real = null; }
      else if (n && n.indexOf('wp-') === 0) { const p = n.split('-'); b.wp[p[1]] = b.wp[p[1]] || []; b.wp[p[1]][+p[2]] = +e.target.value || null; }
      else return;
      bSave(S); buildView();
    };
    ui.onclick = (e) => {
      const t = e.target.closest('[data-btab]'); if (t) { S.cur = t.dataset.btab; bSave(S); return buildView(); }
      const pk = e.target.closest('[data-pick]'); if (pk) return picker(pk.dataset.pick, b, S);
      const rm = e.target.closest('[data-rm]'); if (rm) { const sl = rm.dataset.rm; if (b.w[sl] !== undefined) { b.w[sl] = null; b.wp[sl] = []; } else { b.a[sl] = null; b.ap[sl] = null; if (b.real) delete b.real[sl]; if (b.inst) delete b.inst[sl]; if (b.fill) delete b.fill[sl]; } bSave(S); return buildView(); }
      const o = e.target.closest('[data-open]'); if (o) return openKey(o.dataset.open);
      if (e.target.closest('[data-share]')) { const u = location.origin + location.pathname + '#b=' + enc({ c: b.c, sub: b.sub, name: b.name, w: b.w, wp: b.wp, a: b.a, ap: b.ap }); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Build link copied. Anyone with it sees this build.'), () => prompt('Copy this build link', u)); return; }
      if (e.target.closest('[data-copyab]')) { const o2 = S.cur === 'A' ? 'B' : 'A'; S[o2] = JSON.parse(JSON.stringify(b)); bSave(S); toast('Copied to Build ' + o2); return buildView(); }
      if (e.target.closest('[data-clear]')) { if (confirm('Clear Build ' + S.cur + '?')) { S[S.cur] = blank(b.c); bSave(S); buildView(); } return; }
      if (e.target.closest('[data-starter]')) { starter(b); bSave(S); buildView(); toast('Starter ' + CLSN[b.c] + ' build filled. Tap any slot to change it.'); return; }
      if (e.target.closest('[data-jump]')) { const sm = $('.d2-bld__sum', APP); if (sm) sm.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
      if (e.target.closest('[data-agent]')) return agent(S);
      if (e.target.closest('[data-optim]')) return optimizer(b, S);
      if (e.target.closest('[data-mine]')) return useMine(b, S);
      if (e.target.closest('[data-push]')) return pushLoadout(b);
    };
  }
  function buildURL(b) { return location.origin + location.pathname + '#b=' + enc({ c: b.c, sub: b.sub, name: b.name, w: b.w, wp: b.wp, a: b.a, ap: b.ap }); }
  function buildShare(b) { const any = SLOTW.some((s) => b.w[s]) || SLOTA.some((s) => b.a[s]); if (!any) return ''; const lbl = `${b.sub} ${CLSN[b.c]}`; return shareBlock('b', null, lbl, buildURL(b), (b.name || lbl + ' build') + ' | Destiny 2 build on RankSurge'); }
  function slotCard(b, sl, kind) {
    const it = kind === 'w' ? D.WH[b.w[sl]] : D.AH[b.a[sl]];
    if (!it) return `<button type="button" class="d2-slot is-empty" data-pick="${kind}-${sl}"><span class="d2-slot__k">${ico(sl)}${esc(SLOTN[sl])}</span><span class="d2-slot__add">+ Choose ${esc(SLOTN[sl].toLowerCase())}</span></button>`;
    let extra = '';
    if (kind === 'w' && it.r !== 'exotic') {
      const wp = b.wp[sl] || [];
      extra = `<div class="d2-slot__opts">${it.pk.map((c, i) => c.length > 1 ? `<label class="d2-sel d2-sel--s"><span>${esc(colName(c, i, it.pk))}</span><select name="wp-${sl}-${i}"><option value="">Any</option>${c.map((h) => `<option value="${h}"${wp[i] === h ? ' selected' : ''}>${esc(pn(h))}</option>`).join('')}</select></label>` : '').join('')}</div>`;
    }
    if (kind === 'w') { const ws = wStats(it, (b.wp[sl] || []).filter(Boolean)); extra += `<p class="d2-slot__st">${['Impact', 'Range', 'Stability', 'Handling', 'Reload Speed'].filter((k) => ws[k] != null).map((k) => `<span>${esc(k.replace(' Speed', ''))} <b>${ws[k]}</b></span>`).join('')}</p>`; }
    if (kind === 'a') {
      const ap = b.ap[sl] || {};
      const real = b.real && b.real[sl];
      if (real) extra = `<p class="d2-slot__st">${AST.filter((s) => real[s]).map((s) => `<span>${esc(s)} <b>${real[s]}</b></span>`).join('')} <small>${b.fill && b.fill[sl] ? 'Estimate, not owned' : 'Your roll'}</small></p>`;
      else if (it.ro) {
        const arch = perk(ap.at);
        extra = `<div class="d2-slot__opts"><label class="d2-sel d2-sel--s"><span>Archetype</span><select name="ap-at-${sl}">${(it.at || []).map((h) => `<option value="${h}"${ap.at === h ? ' selected' : ''}>${esc(pn(h))}${perk(h).pr ? ` (${esc(perk(h).pr)}/${esc(perk(h).se)})` : ''}</option>`).join('')}</select></label><label class="d2-sel d2-sel--s"><span>Tertiary</span><select name="ap-t-${sl}"><option value="">Pick</option>${AST.filter((s) => !arch || (s !== arch.pr && s !== arch.se)).map((s) => `<option${ap.t === s ? ' selected' : ''}>${s}</option>`).join('')}</select></label><label class="d2-sel d2-sel--s"><span>Gear tier</span><select name="ap-g-${sl}">${[5, 4, 3, 2, 1].map((g) => `<option value="${g}"${(ap.g || 5) === g ? ' selected' : ''}>Tier ${g}</option>`).join('')}</select></label></div>`;
        const ps = pieceStats(it, ap).s; extra += `<p class="d2-slot__st">${AST.filter((s) => ps[s]).map((s) => `<span>${esc(s)} <b>${ps[s]}</b></span>`).join('')}</p>`;
      } else extra = '<p class="d2-fine">Older armor: stats are set per drop. Use "Use my real gear stats" to load yours.</p>';
      if (b.fill && b.fill[sl]) extra += '<p class="d2-fine d2-fine--fill">Not in your inventory yet. Stats are a Tier 5 best-roll estimate.</p>';
    }
    return `<div class="d2-slot${it.r === 'exotic' ? ' is-exotic' : ''}"><span class="d2-slot__k">${ico(sl)}${esc(SLOTN[sl])}</span><div class="d2-slot__it"><button type="button" class="d2-slot__img" data-open="${kind}${it.h}" aria-label="Details for ${esc(it.n)}">${img(it.ic, 56, '')}</button><div><b>${esc(it.n)}</b><small>${kind === 'w' ? `${esc(it.ty)} · ${esc(it.el)} · ${esc(it.frn)}` : (it.ex ? esc(pn(it.ex)) : it.set && D.sets[it.set] ? esc(D.sets[it.set].n) + ' set' : esc(it.ty))}</small></div><button type="button" class="d2-link" data-pick="${kind}-${sl}">Change</button><button type="button" class="d2-iconbtn" data-rm="${sl}" aria-label="Remove ${esc(it.n)}">${ico('close')}</button></div>${extra}</div>`;
  }
  function picker(key, b, S) {
    const kind = key[0], sl = key.slice(2);
    const pool = kind === 'w' ? D.W.filter((w) => w.sl === sl && !w.ad) : D.A.filter((a) => a.sl === sl && (a.cl === b.c || a.cl === 'any') && (a.a3 || a.r === 'exotic'));
    const d = sheet(`<h2 class="d2-sh__h">${ico(sl)}Choose ${esc(SLOTN[sl].toLowerCase())}${kind === 'a' ? ' for ' + esc(CLSN[b.c]) : ''}</h2><div class="d2-f d2-f--pick"><label class="d2-q"><span class="rs-sr">Search</span>${ico('filter')}<input type="search" data-pq placeholder="Search name, ${kind === 'w' ? 'type, frame or perk' : 'exotic perk or set'}" autocomplete="off"></label>${chips('pr', [['all', 'All'], ['legendary', 'Legendary'], ['exotic', 'Exotic']], 'all', 'Rarity')}${PROF ? '<label class="d2-tog"><input type="checkbox" data-mine-only checked><span>Only gear I own</span></label>' : ''}</div><div class="d2-grid d2-grid--s" data-pl></div>`, 'wide');
    let r = 'all';
    const tops = curatedFor(kind, sl, b.c);
    let mine = !!PROF;
    const ownedSet = () => { const o = {}; (PROF ? PROF.items : []).forEach((i) => { const it = D.ALT[i.h]; if (it) o[it.h] = 1; }); return o; };
    const OW = ownedSet();
    const draw = () => { const qq = ($('[data-pq]', d).value || '').trim().toLowerCase(); const topHtml = !qq && r === 'all' && !mine && tops.length ? `<p class="d2-pick__k">${ico('star')}Top picks for this slot</p>${tops.map((x) => tile(x, kind).replace('data-open=', 'data-choose=')).join('')}<p class="d2-pick__k">Everything else</p>` : ''; const L = pool.filter((x) => (!mine || OW[x.h]) && (r === 'all' || x.r === r) && (!qq || qq.split(/\s+/).every((t) => x.txt.indexOf(t) > -1))).sort((x, y) => rel(y.rel) - rel(x.rel) || x.n.localeCompare(y.n)).slice(0, 90); $('[data-pl]', d).innerHTML = topHtml + (L.map((x) => tile(x, kind).replace('data-open=', 'data-choose=')).join('') || '<p class="d2-empty">Nothing matches.</p>'); };
    draw();
    $('[data-pq]', d).addEventListener('input', debounce(draw, 100));
    d.addEventListener('change', (e) => { if (e.target.name === 'pr') { r = e.target.value; draw(); } if (e.target.hasAttribute('data-mine-only')) { mine = e.target.checked; draw(); } });
    d.addEventListener('click', (e) => { const c = e.target.closest('[data-choose]'); if (!c) return; addToBuild(c.dataset.choose); });
    if (!isTouch()) setTimeout(() => $('[data-pq]', d).focus(), 30);
  }
  function buildCompare(S) {
    const cols = ['A', 'B'].map((k) => ({ k, b: S[k], T: buildTotals(S[k]) }));
    const row = (label, f) => `<div class="d2-cmp__row"><span class="d2-cmp__k">${label}</span>${cols.map((c) => `<span>${f(c)}</span>`).join('')}</div>`;
    const statRow = (s) => { const a = cols[0].T.t[s], bb = cols[1].T.t[s]; return `<div class="d2-cmp__row"><span class="d2-cmp__k">${esc(s)}</span>${cols.map((c, i) => { const v = c.T.t[s], o = i ? a : bb; return `<span class="${v > o ? 'is-best' : ''}"><span class="d2-bar d2-bar--200"><i style="width:${Math.min(100, v / 2)}%"></i></span><b>${v}</b>${v !== o ? `<em class="${v > o ? 'up' : 'dn'}">${v > o ? '+' : ''}${v - o}</em>` : ''}</span>`; }).join('')}</div>`; };
    APP.innerHTML = `${hubNav()}<div class="d2-bld"><div class="d2-bld__tabs" role="tablist" aria-label="Builds">${['A', 'B'].map((k) => `<button type="button" role="tab" aria-selected="false" data-btab="${k}">Build ${k}<small>${esc(S[k].name || CLSN[S[k].c])}</small></button>`).join('')}<button type="button" role="tab" aria-selected="true" data-btab="CMP">${ico('compare')}Compare A vs B</button></div>
      <div class="d2-cmp" style="--n:2"><div class="d2-cmp__row d2-cmp__hd"><span></span>${cols.map((c) => `<span><b>Build ${c.k}</b><small>${esc(c.b.name || '')} ${esc(CLSN[c.b.c])} · ${esc(c.b.sub)}</small></span>`).join('')}</div>
      ${AST.map(statRow).join('')}
      ${row('Total', (c) => `<b>${AST.reduce((t, s) => t + c.T.t[s], 0)}</b>`)}
      ${SLOTW.concat(SLOTA).map((sl) => row(esc(SLOTN[sl]), (c) => { const it = SLOTW.indexOf(sl) > -1 ? D.WH[c.b.w[sl]] : D.AH[c.b.a[sl]]; return it ? `<button type="button" class="d2-link" data-open="${SLOTW.indexOf(sl) > -1 ? 'w' : 'a'}${it.h}">${img(it.ic, 28, '')}${esc(it.n)}</button>` : '—'; })).join('')}
      ${row('Set bonuses', (c) => c.T.bonuses.filter((x) => x.on).map((x) => `<small>${esc(x.set)} ${x.n}pc: ${esc(x.name)}</small>`).join('<br>') || '—')}
      ${row('Warnings', (c) => c.T.warn.map((w) => `<small>${esc(w)}</small>`).join('<br>') || '—')}</div></div>`;
    APP.onclick = (e) => { const t = e.target.closest('[data-btab]'); if (t) { S.cur = t.dataset.btab; bSave(S); return buildView(); } const o = e.target.closest('[data-open]'); if (o) openKey(o.dataset.open); };
    APP.onchange = null;
  }

  /* ---------- Bungie session (shared with the vault manager) ---------- */
  const SK = 'rs_vault_s', REM = 'rs_vault_remember';
  function vstore() { try { return localStorage.getItem(REM) === '1' ? localStorage : sessionStorage; } catch (e) { return null; } }
  function vget() { const s = vstore(); try { const o = JSON.parse((s && s.getItem(SK)) || 'null'); if (!o) return null; if (Date.now() - o.t > 3600000 && localStorage.getItem(REM) !== '1') return null; return o.s; } catch (e) { return null; } }
  function vset(v) { const s = vstore(); try { if (s) s.setItem(SK, JSON.stringify({ s: v, t: Date.now() })); } catch (e) { /* ignore */ } }
  function vcall(path, opt) {
    const s = vget();
    if (!s) return Promise.reject({ signin: 1 });
    opt = opt || {}; opt.headers = Object.assign({}, opt.headers || {}, { authorization: 'RS ' + s });
    return fetch(API + path, opt).then((r) => {
      const ns = r.headers.get('x-rs-session'); vset(ns || s);
      if (r.status === 401) { try { sessionStorage.removeItem(SK); localStorage.removeItem(SK); } catch (e) { /* ignore */ } throw { signin: 1 }; }
      return r.json().then((b) => { if (!r.ok) throw b; return b; });
    });
  }
  function signIn(why) {
    sheet(`<h2 class="d2-sh__h">${ico('user')}Sign in with Bungie</h2><p>${esc(why)}</p><ul class="d2-safe"><li>You sign in on Bungie.net. RankSurge never sees your password.</li><li>Your session stays in this browser only.</li><li>RankSurge can only move, equip and save loadouts. It cannot delete or dismantle anything.</li></ul><p><a class="rs-btn" href="${esc(API)}/auth/login?next=vault" data-signin rel="nofollow">Sign in with Bungie</a></p><p class="d2-fine">After signing in you come back to this build automatically.</p>`);
    const a = $('[data-signin]'); if (a) a.addEventListener('click', () => { try { sessionStorage.setItem('rs_d2_back', location.pathname + location.search); } catch (e) { /* ignore */ } });
  }
  let PROF = null;
  function profile() {
    return vcall('/v2/vault/profile').then((p) => {
      if (!p || p.ErrorCode !== 1) throw { message: (p && p.Message) || 'Bungie could not load your Guardians.' };
      const R2 = p.Response;
      const chars = Object.entries((R2.characters && R2.characters.data) || {}).map((e) => ({ id: e[0], ct: e[1].classType, cls: ['titan', 'hunter', 'warlock'][e[1].classType], light: e[1].light, last: e[1].dateLastPlayed })).sort((a, b) => String(b.last).localeCompare(String(a.last)));
      const stats = (R2.itemComponents && R2.itemComponents.stats && R2.itemComponents.stats.data) || {};
      const items = [];
      const add = (it, loc, eq) => { if (!it.itemInstanceId) return; items.push({ id: it.itemInstanceId, h: it.itemHash, loc, eq: !!eq, st: stats[it.itemInstanceId] ? stats[it.itemInstanceId].stats : null }); };
      ((R2.profileInventory && R2.profileInventory.data && R2.profileInventory.data.items) || []).forEach((it) => { if (it.bucketHash === 138197802) add(it, 'vault'); });
      const ci = (R2.characterInventories && R2.characterInventories.data) || {}, ce = (R2.characterEquipment && R2.characterEquipment.data) || {};
      Object.keys(ci).forEach((c) => (ci[c].items || []).forEach((it) => add(it, c, false)));
      Object.keys(ce).forEach((c) => (ce[c].items || []).forEach((it) => add(it, c, true)));
      const los = {}; const cl = (R2.characterLoadouts && R2.characterLoadouts.data) || {}; Object.keys(cl).forEach((c) => { los[c] = (cl[c].loadouts || []).map((l, i) => ({ i, empty: !(l.items || []).some((x) => x.itemInstanceId && x.itemInstanceId !== '0'), color: l.colorHash, icon: l.iconHash, name: l.nameHash })); });
      PROF = { chars, items, los, hasStats: Object.keys(stats).length > 0 };
      return PROF;
    });
  }
  function owned(hash, ch) { const it = D.WH[hash] || D.AH[hash], hs = [hash].concat((it && it.alt) || []); const L = PROF.items.filter((i) => hs.indexOf(i.h) > -1); return L.find((i) => i.loc === ch && i.eq) || L.find((i) => i.loc === ch) || L.find((i) => i.loc === 'vault') || L[0] || null; }
  function useMine(b, S) {
    if (!vget()) return signIn('Sign in to load the real stat rolls of the armor you own for this build.');
    toast('Loading your gear from Bungie…');
    profile().then((p) => {
      const ch = p.chars.find((c) => c.cls === b.c);
      if (!p.hasStats) { toast('Real armor stats need the latest RankSurge server update. Using estimates for now.', 1); return; }
      const real = {}; let n = 0;
      SLOTA.forEach((sl) => { const a = D.AH[b.a[sl]]; if (!a) return; const it = owned(a.h, ch && ch.id); if (!it || !it.st) return; const s = {}; AST.forEach((k) => { const x = it.st[AST_ID[k]]; s[k] = x ? x.value : 0; }); real[sl] = s; n++; });
      if (!n) { toast('You do not own any of these armor pieces yet, so the build keeps its estimates.', 1); return; }
      b.real = real; bSave(S); buildView(); toast(`Loaded your real rolls for ${n} armor piece${n > 1 ? 's' : ''}.`);
    }).catch((e) => { if (e && e.signin) return signIn('Your Bungie session ended. Sign in again to load your gear.'); toast((e && e.message) || 'Could not load your gear.', 1); });
  }
  function act(body) { return vcall('/v2/vault/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => { if (!r.ok) throw { message: r.message || 'Bungie could not do that.' }; return r; }); }

  /* ---------- best build from my gear (armor optimizer over the player's own inventory) ---------- */
  function myArmor(cls) {
    const out = {}; SLOTA.forEach((sl) => { out[sl] = []; });
    PROF.items.forEach((i) => {
      const it = D.ALT[i.h]; if (!it || it.ty === undefined || !BUCKET[it.sl] || SLOTA.indexOf(it.sl) < 0) return;
      if (it.cl !== cls && it.cl !== 'any') return;
      if (!i.st) return;
      const st = {}; AST.forEach((k) => { const x = i.st[AST_ID[k]]; st[k] = x ? x.value : 0; });
      out[it.sl].push({ it, i, st });
    });
    return out;
  }
  /* pieces the player does not own, estimated at their best roll for the chosen stats (Tier 5) */
  function fillCands(sl, cls, o, ownedH) {
    const pri = o.pri.filter(Boolean), W = [5, 3, 2], out = [];
    const est = (a) => {
      let best = null;
      const ats = (a.at && a.at.length) ? a.at : [null];
      ats.forEach((h) => {
        const ar = h ? perk(h) : { pr: pri[0] || 'Weapons', se: pri[1] || AST.find((x) => x !== (pri[0] || 'Weapons')) };
        if (!ar || !ar.pr) return;
        const t = pri.find((x) => x !== ar.pr && x !== ar.se) || AST.find((x) => x !== ar.pr && x !== ar.se);
        const ps = h ? pieceStats(a, { at: h, t, g: 5 }).s : (() => { const o2 = {}; AST.forEach((k) => { o2[k] = 0; }); o2[ar.pr] = 30; o2[ar.se] = 25; o2[t] = 20; return o2; })();
        const sc = pri.reduce((z, k, i) => z + W[i] * (ps[k] || 0), 0);
        if (!best || sc > best.sc) best = { sc, st: ps, ap: h ? { at: h, t, g: 5 } : null };
      });
      return best;
    };
    D.A.forEach((a) => {
      if (a.sl !== sl || (a.cl !== cls && a.cl !== 'any') || ownedH[a.h]) return;
      if (a.r === 'exotic') { if (o.ex !== String(a.h)) return; }
      else if (!a.at || !a.ro) return;
      if (o.ex === 'none' && a.r === 'exotic') return;
      const e = est(a); if (e) out.push({ it: a, st: e.st, ap: e.ap, fill: 1, i: null, sc: e.sc + (o.set && String(a.set) === o.set ? 50 : 0) + rel(a.rel) / 1e4 });
    });
    out.sort((x, y) => y.sc - x.sc);
    const keep = out.filter((c) => c.it.r === 'exotic').slice(0, 1).concat(out.filter((c) => c.it.r !== 'exotic').slice(0, 3));
    if (o.set) out.filter((c) => String(c.it.set) === o.set).slice(0, 2).forEach((c) => { if (keep.indexOf(c) < 0) keep.push(c); });
    return keep;
  }
  function optimize(pool, o) {
    const W = [5, 3, 2], pri = o.pri.filter(Boolean);
    const pieceScore = (c) => pri.reduce((t, k, n) => t + W[n] * (c.st[k] || 0), 0) + AST.reduce((t, k) => t + (c.st[k] || 0), 0) * 0.15 + ((o.bonus && o.bonus[c.it.h]) || 0);
    const cand = {};
    SLOTA.forEach((sl) => {
      let L = pool[sl].slice();
      if (o.excl) L = L.filter((c) => !(c.it.r === 'exotic' && o.excl[c.it.h]));
      if (o.ex === 'none') L = L.filter((c) => c.it.r !== 'exotic');
      else if (o.ex && o.ex !== 'any') L = L.filter((c) => c.it.r !== 'exotic' || String(c.it.h) === o.ex);
      L.sort((a, b) => pieceScore(b) - pieceScore(a));
      const keep = L.filter((c) => c.it.r !== 'exotic').slice(0, 9).concat(L.filter((c) => c.it.r === 'exotic').slice(0, 4));
      if (o.set) L.filter((c) => String(c.it.set) === o.set).slice(0, 4).forEach((c) => { if (keep.indexOf(c) < 0) keep.push(c); });
      const ownedH = {}; pool[sl].forEach((c) => { ownedH[c.it.h] = 1; });
      const needEx = o.ex && o.ex !== 'any' && o.ex !== 'none' && D.AH[o.ex] && D.AH[o.ex].sl === sl && !ownedH[o.ex];
      const needSet = o.set && keep.filter((c) => String(c.it.set) === o.set).length === 0;
      if (o.fill === 'all' || (o.fill === 'gaps' && (!keep.length || needEx || needSet))) fillCands(sl, o.cls, o, ownedH).forEach((c) => keep.push(c));
      cand[sl] = keep;
    });
    if (SLOTA.some((sl) => !cand[sl].length)) return { res: [], missing: SLOTA.filter((sl) => !cand[sl].length) };
    const res = []; const tot = {}; let n = 0;
    const need = o.ex && o.ex !== 'any' && o.ex !== 'none';
    (function rec(idx, pick, ex) {
      if (idx === SLOTA.length) {
        if (need && !pick.some((c) => String(c.it.h) === o.ex)) return;
        const t = {}; AST.forEach((k) => { t[k] = 0; }); pick.forEach((c) => AST.forEach((k) => { t[k] += c.st[k] || 0; }));
        if (o.min && pri[0] && t[pri[0]] < o.min) return;
        if (o.set) { const cnt = pick.filter((c) => String(c.it.set) === o.set).length; if (cnt < o.setN) return; }
        const sc = pri.reduce((s, k, i) => s + W[i] * Math.min(200, t[k]), 0) + AST.reduce((s, k) => s + Math.min(200, t[k]), 0) * 0.15 + pick.reduce((s, c) => s + ((o.bonus && o.bonus[c.it.h]) || 0), 0);
        const nf = pick.filter((c) => c.fill).length;
        n++; res.push({ sc: sc - nf * (o.fill === 'all' ? 12 : 0.5), t, pick: pick.slice(), nf });
        if (res.length > 60) { res.sort((a, b) => b.sc - a.sc); res.length = 20; }
        return;
      }
      for (const c of cand[SLOTA[idx]]) { const e2 = ex + (c.it.r === 'exotic' ? 1 : 0); if (e2 > 1) continue; pick.push(c); rec(idx + 1, pick, e2); pick.pop(); }
    })(0, [], 0);
    res.sort((a, b) => b.sc - a.sc);
    return { res: res.slice(0, 8), n };
  }
  function optimizer(b, S) {
    if (!vget()) return signIn('Sign in with Bungie so RankSurge can read the armor you own and find your best combination. Nothing is moved until you choose to save a loadout.');
    const d = sheet(`<h2 class="d2-sh__h">${ico('user')}Best build from my gear</h2><p class="d2-load">Loading your Guardians and armor from Bungie&hellip;</p>`, 'wide');
    profile().then((p) => {
      if (!p.hasStats) { d.innerHTML = `<button type="button" class="d2-sh__x" data-sh-close aria-label="Close">${ico('close')}</button><h2 class="d2-sh__h">Almost there</h2><p class="d2-warn">Bungie did not send armor stats yet. Try again in a minute.</p>`; return; }
      const pool = myArmor(b.c);
      const exo = []; SLOTA.forEach((sl) => pool[sl].forEach((c) => { if (c.it.r === 'exotic' && !exo.some((x) => x.h === c.it.h)) exo.push(c.it); }));
      const setCount = {}; SLOTA.forEach((sl) => { const seen = {}; pool[sl].forEach((c) => { if (c.it.set && !seen[c.it.set]) { seen[c.it.set] = 1; setCount[c.it.set] = (setCount[c.it.set] || 0) + 1; } }); });
      const sets = Object.keys(setCount).filter((k) => setCount[k] >= 2 && D.sets[k]).map((k) => [k, D.sets[k].n + ` (you own ${setCount[k]} slots)`]);
      const owned = SLOTA.reduce((t, sl) => t + pool[sl].length, 0);
      const o = { pri: [b.focus || 'Weapons', '', ''], ex: 'any', set: '', setN: 2, min: 0, fill: 'gaps', cls: b.c };
      const exAll = D.A.filter((a) => a.r === 'exotic' && a.cl === b.c && SLOTA.indexOf(a.sl) > -1 && !exo.some((x) => x.h === a.h)).sort((x, y) => x.n.localeCompare(y.n));
      const setAll = Object.keys(D.sets).filter((k) => !sets.some((x) => x[0] === k) && D.A.some((a) => String(a.set) === k && a.cl === b.c)).map((k) => [k, D.sets[k].n]).sort((x, y) => x[1].localeCompare(y[1]));
      const form = () => `<button type="button" class="d2-sh__x" data-sh-close aria-label="Close">${ico('close')}</button><h2 class="d2-sh__h">${ico('user')}Best ${esc(CLSN[b.c])} build from my gear</h2>
        <p class="d2-sh__sub">Searching ${owned} ${esc(CLSN[b.c])} armor pieces you own for the combination with the highest stats you care about. One exotic at most.</p>
        <div class="d2-opt"><label class="d2-sel"><span>Most important stat</span><select data-o="p0">${AST.map((x) => `<option${o.pri[0] === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="d2-sel"><span>Second</span><select data-o="p1"><option value="">None</option>${AST.map((x) => `<option${o.pri[1] === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="d2-sel"><span>Third</span><select data-o="p2"><option value="">None</option>${AST.map((x) => `<option${o.pri[2] === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="d2-sel"><span>Exotic</span><select data-o="ex"><option value="any">Best exotic I own</option><option value="none"${o.ex === 'none' ? ' selected' : ''}>No exotic</option><optgroup label="Exotics I own">${exo.map((x) => `<option value="${x.h}"${o.ex === String(x.h) ? ' selected' : ''}>${esc(x.n)}</option>`).join('')}</optgroup><optgroup label="Not owned yet (fill in)">${exAll.map((x) => `<option value="${x.h}"${o.ex === String(x.h) ? ' selected' : ''}>${esc(x.n)}</option>`).join('')}</optgroup></select></label>
        <label class="d2-sel"><span>Set bonus</span><select data-o="set"><option value="">Any</option><optgroup label="Sets I own">${sets.map((x) => `<option value="${x[0]}"${o.set === x[0] ? ' selected' : ''}>${esc(x[1])}</option>`).join('')}</optgroup><optgroup label="Other sets (fill in)">${setAll.map((x) => `<option value="${x[0]}"${o.set === x[0] ? ' selected' : ''}>${esc(x[1])}</option>`).join('')}</optgroup></select></label>
        <label class="d2-sel"><span>Pieces of that set</span><select data-o="setN"><option value="2"${o.setN === 2 ? ' selected' : ''}>2 (first bonus)</option><option value="4"${o.setN === 4 ? ' selected' : ''}>4 (both bonuses)</option></select></label>
        <label class="d2-sel d2-sel--rng"><span>Gear I don't own</span><select data-o="fill"><option value="gaps"${o.fill === 'gaps' ? ' selected' : ''}>Fill in only where I have nothing that fits</option><option value="all"${o.fill === 'all' ? ' selected' : ''}>Also show better pieces I could farm</option><option value="off"${o.fill === 'off' ? ' selected' : ''}>Only use gear I own</option></select></label>
        <label class="d2-sel"><span>Minimum for the top stat</span><select data-o="min">${[0, 50, 100, 150, 200].map((v) => `<option value="${v}"${o.min === v ? ' selected' : ''}>${v ? v + '+' : 'No minimum'}</option>`).join('')}</select></label></div>
        <p><button type="button" class="rs-btn" data-run>${ico('bolt')}Find my best builds</button></p><div data-out aria-live="polite"></div>`;
      const run = () => {
        const out = $('[data-out]', d); out.innerHTML = '<p class="d2-load">Checking every combination&hellip;</p>';
        setTimeout(() => {
          const r = optimize(pool, o);
          if (r.missing) { out.innerHTML = `<p class="d2-warn">You don't own a ${esc(CLSN[b.c])} ${r.missing.map((s) => SLOTN[s].toLowerCase()).join(', ')} with stats that fits these choices.</p>`; return; }
          if (!r.res.length) { out.innerHTML = '<p class="d2-warn">No combination meets these choices. Try a lower minimum, another set or any exotic.</p>'; return; }
          out.innerHTML = `<p class="d2-fine">Checked ${r.n.toLocaleString()} combinations. Best ${r.res.length}:</p><ol class="d2-res">${r.res.map((x, i) => {
            const sb = {}; x.pick.forEach((c) => { if (c.it.set) sb[c.it.set] = (sb[c.it.set] || 0) + 1; });
            const bon = Object.keys(sb).filter((k) => D.sets[k] && sb[k] >= 2).map((k) => `${esc(D.sets[k].n)} ${sb[k] >= 4 ? '4' : '2'}pc`).join(', ');
            return `<li class="d2-res__i"><div class="d2-res__st">${AST.map((k) => `<span class="${o.pri.indexOf(k) > -1 ? 'is-pri' : ''}"><small>${esc(k)}</small><b>${x.t[k]}</b></span>`).join('')}</div><div class="d2-res__pc">${x.pick.map((c) => `<span class="${c.fill ? 'is-fill' : ''}" title="${esc(c.it.n)}${c.fill ? ' (not owned, best-roll estimate)' : ''}">${img(c.it.ic, 40, '')}<em>${esc(c.it.n)}</em>${c.fill ? '<i>Not owned</i>' : ''}</span>`).join('')}</div>${x.nf ? `<p class="d2-fine d2-fine--fill">${x.nf === 1 ? '1 piece is' : x.nf + ' pieces are'} not in your inventory. Stats for ${x.nf === 1 ? 'it are' : 'them are'} a Tier 5 best-roll estimate, so farm ${x.nf === 1 ? 'it' : 'them'} to make this build real.</p>` : '<p class="d2-fine">All 5 pieces are in your inventory with their exact rolls.</p>'}${bon ? `<p class="d2-fine">Set bonus: ${bon}</p>` : ''}<button type="button" class="rs-btn" data-use="${i}">Use this armor</button></li>`; }).join('')}</ol>`;
          out.onclick = (e) => { const u = e.target.closest('[data-use]'); if (!u) return; const x = r.res[+u.dataset.use]; b.real = {}; b.inst = b.inst || {}; b.fill = {}; x.pick.forEach((c) => { const sl = c.it.sl; b.a[sl] = c.it.h; if (c.fill) { delete b.inst[sl]; if (c.ap) { b.ap[sl] = c.ap; delete b.real[sl]; } else { b.real[sl] = c.st; } b.fill[sl] = 1; } else { b.real[sl] = c.st; b.inst[sl] = c.i.id; } }); bSave(S); closeSheet(); buildView(); toast(x.nf ? 'Build filled in. Pieces you don\'t own are marked so you know what to farm.' : 'Your armor is in the build. Tap Save to put it in a loadout.'); };
        }, 20);
      };
      d.innerHTML = form();
      d.addEventListener('change', (e) => { const k = e.target.dataset.o; if (!k) return; const v = e.target.value; if (k[0] === 'p') o.pri[+k[1]] = v; else if (k === 'setN' || k === 'min') o[k] = +v; else o[k] = v; });
      d.addEventListener('click', (e) => { if (e.target.closest('[data-run]')) run(); });
      run();
    }).catch((e) => { if (e && e.signin) return signIn('Your Bungie session ended. Sign in again to read your gear.'); d.innerHTML = `<button type="button" class="d2-sh__x" data-sh-close aria-label="Close">${ico('close')}</button><p class="d2-warn">${esc((e && e.message) || 'Could not reach Bungie. Try again.')}</p>`; });
  }

  /* ---------- AI loadout agent: reads the player's inventory, builds 3 loadouts for an activity, AI picks one, one tap equips ---------- */
  const ACTS = {
    raid: { n: 'Raid or dungeon', m: 'pve', why: 'boss damage and steady add clear',
      w: { 'Rocket Launcher': 10, 'Linear Fusion Rifle': 9, 'Machine Gun': 7, 'Sword': 7, 'Grenade Launcher': 9, 'Sniper Rifle': 8, 'Fusion Rifle': 7, 'Trace Rifle': 7, 'Shotgun': 6, 'Glaive': 6, 'Auto Rifle': 7, 'Pulse Rifle': 7, 'Submachine Gun': 7, 'Hand Cannon': 6, 'Scout Rifle': 6, 'Combat Bow': 6, 'Sidearm': 6 },
      styles: [['Boss damage', ['Weapons', 'Super', 'Class'], 'Big heavy and special damage for damage phases.'], ['Survive and support', ['Health', 'Class', 'Weapons'], 'Tankier, with fast class ability for revives and safety.'], ['Ability spam', ['Grenade', 'Melee', 'Super'], 'Grenades and melees on short cooldowns to clear adds.']] },
    gm: { n: 'Grandmaster or Master content', m: 'pve', why: 'range, safety and champion control',
      w: { 'Scout Rifle': 9, 'Pulse Rifle': 8, 'Combat Bow': 8, 'Auto Rifle': 7, 'Hand Cannon': 6, 'Submachine Gun': 5, 'Sidearm': 4, 'Sniper Rifle': 9, 'Grenade Launcher': 8, 'Trace Rifle': 7, 'Fusion Rifle': 6, 'Glaive': 6, 'Shotgun': 3, 'Linear Fusion Rifle': 9, 'Machine Gun': 8, 'Rocket Launcher': 7, 'Sword': 3 },
      styles: [['Safe and steady', ['Health', 'Class', 'Weapons'], 'Fights from range and survives long encounters.'], ['Damage from range', ['Weapons', 'Health', 'Super'], 'Long-range weapons with as much damage as you can get.'], ['Ability control', ['Grenade', 'Class', 'Health'], 'Grenades and class ability to lock down champions and rooms.']] },
    adclear: { n: 'Strikes, Onslaught and patrol', m: 'pve', why: 'fast add clear',
      w: { 'Submachine Gun': 8, 'Auto Rifle': 8, 'Pulse Rifle': 7, 'Hand Cannon': 6, 'Sidearm': 6, 'Scout Rifle': 5, 'Combat Bow': 5, 'Grenade Launcher': 9, 'Trace Rifle': 8, 'Shotgun': 7, 'Fusion Rifle': 7, 'Glaive': 7, 'Sniper Rifle': 4, 'Machine Gun': 10, 'Sword': 8, 'Rocket Launcher': 7, 'Linear Fusion Rifle': 5 },
      styles: [['Grenade spam', ['Grenade', 'Weapons', 'Melee'], 'Grenades every few seconds plus strong add-clear weapons.'], ['Melee brawler', ['Melee', 'Health', 'Class'], 'Up close and tanky with a fast melee.'], ['Run and gun', ['Weapons', 'Super', 'Grenade'], 'Weapon damage first, with an add-clearing Super.']] },
    crucible: { n: 'Crucible (PvP)', m: 'pvp', why: 'winning gunfights',
      w: { 'Hand Cannon': 10, 'Pulse Rifle': 9, 'Scout Rifle': 7, 'Submachine Gun': 7, 'Sidearm': 7, 'Combat Bow': 6, 'Auto Rifle': 6, 'Shotgun': 10, 'Sniper Rifle': 9, 'Fusion Rifle': 8, 'Glaive': 6, 'Grenade Launcher': 5, 'Trace Rifle': 3, 'Rocket Launcher': 9, 'Machine Gun': 7, 'Sword': 6, 'Linear Fusion Rifle': 6 },
      styles: [['Gunfighter', ['Weapons', 'Health', 'Class'], 'Primary and special weapons first.'], ['Hard to kill', ['Health', 'Class', 'Weapons'], 'Extra health and fast dodge, rift or barricade.'], ['Abilities', ['Grenade', 'Melee', 'Health'], 'Ability kills between gunfights.']] },
    trials: { n: 'Trials of Osiris', m: 'pvp', why: 'team shots and staying alive',
      w: { 'Hand Cannon': 10, 'Pulse Rifle': 10, 'Scout Rifle': 8, 'Sidearm': 6, 'Submachine Gun': 6, 'Combat Bow': 6, 'Auto Rifle': 5, 'Shotgun': 9, 'Sniper Rifle': 10, 'Fusion Rifle': 8, 'Glaive': 5, 'Grenade Launcher': 5, 'Trace Rifle': 3, 'Rocket Launcher': 9, 'Machine Gun': 6, 'Sword': 5, 'Linear Fusion Rifle': 7 },
      styles: [['Anchor', ['Health', 'Weapons', 'Class'], 'Holds lanes with team-shot weapons and extra health.'], ['Aggressive', ['Weapons', 'Class', 'Health'], 'Push with a shotgun or fusion and a fast class ability.'], ['Utility', ['Class', 'Grenade', 'Health'], 'Class ability and grenades to control the round.']] },
    gambit: { n: 'Gambit', m: 'pve', why: 'invading and burning the Primeval',
      w: { 'Pulse Rifle': 8, 'Scout Rifle': 8, 'Hand Cannon': 7, 'Auto Rifle': 7, 'Submachine Gun': 6, 'Combat Bow': 6, 'Sidearm': 5, 'Sniper Rifle': 9, 'Grenade Launcher': 7, 'Fusion Rifle': 7, 'Shotgun': 5, 'Trace Rifle': 6, 'Glaive': 5, 'Rocket Launcher': 9, 'Linear Fusion Rifle': 9, 'Machine Gun': 7, 'Sword': 6 },
      styles: [['Primeval burner', ['Weapons', 'Super', 'Class'], 'Heavy damage to finish the Primeval fast.'], ['Invader', ['Health', 'Weapons', 'Class'], 'Long-range weapons and health for invasions.'], ['Mote collector', ['Grenade', 'Melee', 'Super'], 'Ability add clear to bank motes quickly.']] },
  };
  function wScore(w, A) {
    const t = (A.w[w.ty] || 4) * 10;
    const cp = (D.curated && D.curated.picks || []).find((p) => p.k === 'w' && p.n === w.n);
    const meta = cp && new RegExp(A.m === 'pvp' ? 'pvp' : 'pve', 'i').test(cp.tag) ? 30 : 0;
    const s = w.s || {}, st = A.m === 'pvp' ? (s.Range || 0) * 0.08 + (s.Handling || 0) * 0.06 + (s.Stability || 0) * 0.05 : (s.Impact || 0) * 0.05 + (s.Magazine || 0) * 0.04 + (s['Reload Speed'] || 0) * 0.04;
    return t + meta + (w.r === 'exotic' ? 8 : 0) + st + rel(w.rel) / 200;
  }
  function myWeapons(chId) {
    const by = {};
    const rank = (i) => (i.loc === chId ? (i.eq ? 4 : 3) : i.loc === 'vault' ? 2 : i.eq ? 0 : 1);
    PROF.items.forEach((i) => { const w = D.ALT[i.h]; if (!w || !w.am || SLOTW.indexOf(w.sl) < 0) return; const c = by[w.h]; if (!c || rank(i) > rank(c.i)) by[w.h] = { it: w, i }; });
    return Object.values(by).filter((c) => !(c.i.eq && c.i.loc !== chId));
  }
  function pickWeapons(L, A, excl, used) {
    used = used || {};
    const top = {}; SLOTW.forEach((sl) => { const all = L.filter((c) => c.it.sl === sl && !(c.it.r === 'exotic' && excl[c.it.h])).map((c) => ({ c, sc: wScore(c.it, A) - (used[c.it.h] || 0) * 14 })).sort((a, b) => b.sc - a.sc); top[sl] = all.filter((x) => x.c.it.r !== 'exotic').slice(0, 5).concat(all.filter((x) => x.c.it.r === 'exotic').slice(0, 3)); });
    let best = null;
    const K = top.kinetic.length ? top.kinetic : [null], E = top.energy.length ? top.energy : [null], P = top.power.length ? top.power : [null];
    K.forEach((k) => E.forEach((e) => P.forEach((pw) => {
      const pk = [k, e, pw].filter(Boolean); if (pk.filter((x) => x.c.it.r === 'exotic').length > 1) return;
      let sc = pk.reduce((t, x) => t + x.sc, 0);
      const am = [k, e].filter(Boolean).map((x) => x.c.it.am);
      if (am.length === 2) { if (am.indexOf('primary') < 0) sc -= 25; else if (am.indexOf('special') < 0) sc -= 8; if (k.c.it.ty === e.c.it.ty) sc -= 12; if (k.c.it.el === e.c.it.el && k.c.it.el !== 'Kinetic') sc -= 3; }
      if (!best || sc > best.sc) best = { sc, k, e, pw };
    })));
    if (!best) return null;
    return { kinetic: best.k && best.k.c, energy: best.e && best.e.c, power: best.pw && best.pw.c };
  }
  function agentBuild(ch, A) {
    const pool = myArmor(ch.cls), wL = myWeapons(ch.id);
    const bonus = {}; (D.curated && D.curated.picks || []).forEach((p) => { if (p.k !== 'a') return; D.A.forEach((a) => { if (a.n === p.n) bonus[a.h] = 18; }); });
    const exW = {}, exA = {}, usedW = {}, out = [];
    A.styles.forEach((st) => {
      let w = pickWeapons(wL, A, exW, usedW); if (!w || !SLOTW.some((sl) => w[sl])) w = pickWeapons(wL, A, {}, usedW);
      let r = optimize(pool, { pri: st[1], ex: 'any', set: '', setN: 2, min: 0, fill: 'gaps', cls: ch.cls, excl: exA, bonus });
      if (!r.res || !r.res.length) r = optimize(pool, { pri: st[1], ex: 'any', set: '', setN: 2, min: 0, fill: 'gaps', cls: ch.cls, bonus });
      const a = r.res && r.res[0]; if (!a && !w) return;
      SLOTW.forEach((sl) => { const c = w && w[sl]; if (c) { usedW[c.it.h] = (usedW[c.it.h] || 0) + 1; if (c.it.r === 'exotic') exW[c.it.h] = 1; } });
      if (a) a.pick.forEach((c) => { if (c.it.r === 'exotic') exA[c.it.h] = 1; });
      out.push({ st, w: w || {}, a });
    });
    return out;
  }
  const aiTxt = (v) => String(v || '').replace(/[^A-Za-z0-9 .%\/+-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 32) || '-';
  function agentAI(opts, A, ch) {
    const host = document.querySelector('[data-ts]'), pass = (document.querySelector('[data-pass]') || {}).dataset;
    const stats = { activity: aiTxt(A.n), class: aiTxt(CLSN[ch.cls]) };
    opts.forEach((o, i) => {
      const L = 'abc'[i];
      stats['opt_' + L + '_style'] = aiTxt(o.st[0]);
      SLOTW.forEach((sl) => { const c = o.w[sl]; stats['opt_' + L + '_' + sl] = c ? aiTxt(c.it.n + ' ' + c.it.ty) : '-'; });
      const ex = o.a && o.a.pick.find((c) => c.it.r === 'exotic'); stats['opt_' + L + '_exotic_armor'] = ex ? aiTxt(ex.it.n) : 'none';
      stats['opt_' + L + '_stats'] = o.a ? aiTxt(AST.map((k) => k[0] + k[1] + ' ' + o.a.t[k]).join(' ')) : '-';
    });
    const q = `Which loadout, A, B or C, is best for ${A.n} on my ${CLSN[ch.cls]}? Start your answer with only the letter, then explain why in 2 or 3 short sentences using the weapons, exotic armor and stats given.`.slice(0, 300);
    const body = { game: 'destiny-2', stats, question: q }; if (pass && pass.pass) body.pass = pass.pass;
    return fetch(API + '/v1/ask', { method: 'POST', credentials: 'omit', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json().then((j) => ({ ok: r.ok, j, s: r.status }))).catch(() => ({ ok: false, j: {} }));
  }
  function agent(S) {
    if (!vget()) return signIn('Sign in with Bungie so the RankSurge AI agent can look through your vault and characters and build loadouts from the gear you own. Nothing moves until you tap Equip.');
    const d = sheet(`<h2 class="d2-sh__h">${ico('bolt')}AI loadouts for an activity</h2><p class="d2-load">Reading your Guardians, weapons and armor from Bungie&hellip;</p>`, 'wide');
    profile().then((p) => {
      if (!p.chars.length) { d.innerHTML = `<button type="button" class="d2-sh__x" data-sh-close aria-label="Close">${ico('close')}</button><p class="d2-warn">Bungie did not return any characters on this account.</p>`; return; }
      let ch = p.chars[0], act = 'raid', opts = [], aiPick = -1;
      const head = () => `<button type="button" class="d2-sh__x" data-sh-close aria-label="Close">${ico('close')}</button><h2 class="d2-sh__h">${ico('bolt')}AI loadouts for an activity</h2>
        <p class="d2-sh__sub">Pick a character and an activity. RankSurge searches every weapon and armor piece you own, builds three loadouts, and the AI coach picks the best one. Tap Equip and it goes straight onto your Guardian.</p>
        <div class="d2-ag__pick"><div class="d2-chips" role="radiogroup" aria-label="Character">${p.chars.map((c) => `<button type="button" class="d2-chip${c.id === ch.id ? ' is-on' : ''}" role="radio" aria-checked="${c.id === ch.id}" data-ch="${c.id}">${esc(CLSN[c.cls])} <small>${c.light || ''}</small></button>`).join('')}</div>
        <div class="d2-chips d2-chips--act" role="radiogroup" aria-label="Activity">${Object.keys(ACTS).map((k) => `<button type="button" class="d2-chip${k === act ? ' is-on' : ''}" role="radio" aria-checked="${k === act}" data-act="${k}">${esc(ACTS[k].n)}</button>`).join('')}</div></div>
        <div data-ag-out aria-live="polite"></div>`;
      const card = (o, i) => {
        const ws = SLOTW.map((sl) => o.w[sl]).filter(Boolean), as = o.a ? o.a.pick : [];
        const it = (c) => `<span class="${c.fill ? 'is-fill' : ''}">${img(c.it.ic, 40, '')}<em>${esc(c.it.n)}</em>${c.fill ? '<i>Not owned</i>' : ''}</span>`;
        return `<li class="d2-ag__o${i === aiPick ? ' is-ai' : ''}"><div class="d2-ag__h"><b>${'ABC'[i]}. ${esc(o.st[0])}</b>${i === aiPick ? '<span class="d2-ag__badge">AI pick</span>' : ''}</div><p class="d2-fine">${esc(o.st[2])}</p>
          <p class="d2-ag__k">Weapons</p><div class="d2-res__pc">${ws.map(it).join('') || '<small>No weapons found</small>'}</div>
          <p class="d2-ag__k">Armor</p><div class="d2-res__pc">${as.map(it).join('') || '<small>No armor found</small>'}</div>
          ${o.a ? `<div class="d2-res__st">${AST.map((k) => `<span class="${o.st[1].indexOf(k) > -1 ? 'is-pri' : ''}"><small>${esc(k)}</small><b>${o.a.t[k]}</b></span>`).join('')}</div>` : ''}
          ${o.a && o.a.nf ? `<p class="d2-fine d2-fine--fill">${o.a.nf === 1 ? '1 armor piece is' : o.a.nf + ' armor pieces are'} not in your inventory (best-roll estimate). Equip skips ${o.a.nf === 1 ? 'it' : 'them'}.</p>` : ''}
          <div class="d2-ag__btns"><button type="button" class="rs-btn" data-eq="${i}">${ico('push')}Equip on my ${esc(CLSN[ch.cls])}</button><button type="button" class="rs-btn rs-btn--ghost" data-plan="${i}">Open in planner</button></div></li>`;
      };
      const draw = () => {
        const out = $('[data-ag-out]', d), A = ACTS[act];
        opts = agentBuild(ch, A); aiPick = -1;
        if (!opts.length) { out.innerHTML = `<p class="d2-warn">RankSurge could not find gear for your ${esc(CLSN[ch.cls])}. Make sure Bungie shows it in your vault or on the character.</p>`; return; }
        out.innerHTML = `<div class="d2-ag__ai" data-ai><p class="d2-load">The AI coach is comparing the three loadouts for ${esc(A.n)}&hellip;</p></div><ol class="d2-ag__list">${opts.map(card).join('')}</ol>`;
        const seq = (draw.n = (draw.n || 0) + 1);
        agentAI(opts, A, ch).then((r) => {
          if (seq !== draw.n) return;
          const box = $('[data-ai]', d); if (!box) return;
          if (r.ok && r.j.answer) {
            const m = /^\W*(?:option\s+|loadout\s+)?([ABC])\b/i.exec(r.j.answer); aiPick = m ? 'ABC'.indexOf(m[1].toUpperCase()) : -1;
            if (aiPick >= opts.length) aiPick = -1;
            box.innerHTML = `<p class="d2-ag__aih">${ico('bolt')}AI coach${aiPick > -1 ? `: Loadout ${'ABC'[aiPick]}` : ''}</p><p>${esc(r.j.answer.replace(/^\W*(?:option\s+|loadout\s+)?[ABC]\b[\s.:,-]*/i, ''))}</p>`;
            $('.d2-ag__list', d).innerHTML = opts.map(card).join('');
          } else {
            box.innerHTML = `<p class="d2-fine">${esc((r.j && r.j.message) || 'The AI coach is busy right now.')} Loadout A is RankSurge's top pick for ${esc(A.n)}.</p>`;
          }
        });
      };
      const load = (o, equip) => {
        const b = S[S.cur]; b.c = ch.cls; b.inst = b.inst || {}; b.real = {}; b.fill = {};
        SLOTW.forEach((sl) => { const c = o.w[sl]; b.w[sl] = c ? c.it.h : null; b.wp[sl] = []; if (c) b.inst[sl] = c.i.id; else delete b.inst[sl]; });
        if (o.a) o.a.pick.forEach((c) => { const sl = c.it.sl; b.a[sl] = c.it.h; if (c.fill) { delete b.inst[sl]; if (c.ap) { b.ap[sl] = c.ap; delete b.real[sl]; } else b.real[sl] = c.st; b.fill[sl] = 1; } else { b.real[sl] = c.st; b.inst[sl] = c.i.id; } });
        b.name = `${ACTS[act].n}: ${o.st[0]}`.slice(0, 60);
        bSave(S); closeSheet(); buildView();
        if (equip) setTimeout(() => pushLoadout(b, { equip: true, auto: true }), 60); else toast('Loadout opened in the planner. Tap Save to keep it in a loadout slot.');
      };
      d.innerHTML = head(); draw();
      d.addEventListener('click', (e) => {
        const c = e.target.closest('[data-ch]'), a = e.target.closest('[data-act]'), q = e.target.closest('[data-eq]'), pl = e.target.closest('[data-plan]');
        if (c) { ch = p.chars.find((x) => x.id === c.dataset.ch) || ch; d.innerHTML = head(); draw(); }
        else if (a) { act = a.dataset.act; d.innerHTML = head(); draw(); }
        else if (q) load(opts[+q.dataset.eq], true);
        else if (pl) load(opts[+pl.dataset.plan], false);
      });
    }).catch((e) => { if (e && e.signin) return signIn('Your Bungie session ended. Sign in again so the AI agent can read your gear.'); d.innerHTML = `<button type="button" class="d2-sh__x" data-sh-close aria-label="Close">${ico('close')}</button><p class="d2-warn">${esc((e && e.message) || 'Could not reach Bungie. Try again.')}</p>`; });
  }
  function pushLoadout(b, opt) {
    const eqOnly = !!(opt && opt.equip);
    const T = buildTotals(b);
    if (T.warn.length) { toast(T.warn[0], 1); return; }
    const keys = SLOTW.map((s) => ['w', s, b.w[s]]).concat(SLOTA.map((s) => ['a', s, b.a[s]])).filter((x) => x[2]);
    if (!keys.length) { toast('Add some gear to the build first.', 1); return; }
    if (!vget()) return signIn(eqOnly ? 'Sign in with Bungie so RankSurge can equip this loadout on your Guardian.' : 'Sign in with Bungie to save this build into one of your in-game loadout slots.');
    const d = sheet(`<h2 class="d2-sh__h">${ico('push')}${eqOnly ? 'Equip on my Guardian' : 'Save to in-game loadout'}</h2><p class="d2-load">Checking your Guardians and gear&hellip;</p>`);
    profile().then((p) => {
      const chars = p.chars.filter((c) => c.cls === b.c);
      if (!chars.length) { d.innerHTML = `<button type="button" class="d2-sh__x" data-sh-close aria-label="Close">${ico('close')}</button><h2 class="d2-sh__h">No ${esc(CLSN[b.c])} found</h2><p>This build is for a ${esc(CLSN[b.c])}, but your account has no ${esc(CLSN[b.c])} character.</p>`; return; }
      const ch = chars[0];
      const rows = keys.map((k) => { const it = k[0] === 'w' ? D.WH[k[2]] : D.AH[k[2]]; const pin = b.inst && b.inst[k[1]] ? PROF.items.find((i) => i.id === b.inst[k[1]]) : null; const o = pin || owned(+k[2], ch.id); return { k, it, o }; });
      const miss = rows.filter((r) => !r.o);
      const slots = (p.los[ch.id] || []);
      d.innerHTML = `<button type="button" class="d2-sh__x" data-sh-close aria-label="Close">${ico('close')}</button><h2 class="d2-sh__h">${ico('push')}${eqOnly ? `Equip on your ${esc(CLSN[b.c])}` : `Save to your ${esc(CLSN[b.c])}'s loadout`}</h2>
        <ul class="d2-own">${rows.map((r) => `<li class="${r.o ? 'is-ok' : 'is-miss'}">${img(r.it.ic, 32, '')}<b>${esc(r.it.n)}</b><small>${r.o ? (r.o.loc === ch.id ? (r.o.eq ? 'Equipped' : 'On this character') : r.o.loc === 'vault' ? 'In your vault' : 'On another character') : 'Not owned'}</small></li>`).join('')}</ul>
        ${miss.length ? `<p class="d2-warn">You don't own ${miss.length} of these items, so they are left out. Destiny 2 only saves loadouts from gear you have.</p>` : ''}
        ${eqOnly ? `<p class="d2-fine">RankSurge moves each item to your ${esc(CLSN[b.c])} and equips it. Your Guardian must be in orbit or a social space, and the character needs free inventory space for each item.</p><p><button type="button" class="rs-btn" data-go${rows.length > miss.length ? '' : ' disabled'}>${ico('bolt')}Equip now</button></p><ol class="d2-steps" data-steps aria-live="polite"></ol>` : `${slots.length ? `<label class="d2-sel"><span>Loadout slot</span><select data-slot>${slots.map((s) => `<option value="${s.i}">Slot ${s.i + 1}${s.empty ? ' (empty)' : ' (will be replaced)'}</option>`).join('')}</select></label>` : '<p class="d2-warn">Bungie did not return your loadout slots. Open Destiny 2 once and try again.</p>'}
        <p class="d2-fine">RankSurge moves each item to your ${esc(CLSN[b.c])}, equips it, then saves what is equipped into the slot. Your Guardian must be in orbit or a social space, and the character's inventory needs free space for each item.</p>
        <p><button type="button" class="rs-btn" data-go${slots.length && rows.length > miss.length ? '' : ' disabled'}>Move, equip and save</button></p><ol class="d2-steps" data-steps aria-live="polite"></ol>`}`;
      const go = $('[data-go]', d); if (!go) return;
      go.onclick = async () => {
        const ix = eqOnly ? -1 : +$('[data-slot]', d).value;
        const sl = slots.find((s) => s.i === ix);
        if (sl && !sl.empty && !confirm(`Replace loadout slot ${ix + 1} on your ${CLSN[b.c]}?`)) return;
        go.disabled = true;
        const log = $('[data-steps]', d);
        const step = (t, bad) => { const li = document.createElement('li'); li.textContent = t; if (bad) li.className = 'is-bad'; log.appendChild(li); return li; };
        try {
          for (const r of rows.filter((x) => x.o)) {
            const o = r.o;
            if (o.loc !== ch.id) {
              if (o.eq) throw { message: `${r.it.n} is equipped on another character. Unequip it there first.` };
              if (o.loc !== 'vault') { step(`Moving ${r.it.n} to the vault`); await act({ op: 'transfer', itemId: o.id, itemHash: o.h, characterId: o.loc, toVault: true }); o.loc = 'vault'; }
              step(`Moving ${r.it.n} to your ${CLSN[b.c]}`); await act({ op: 'transfer', itemId: o.id, itemHash: o.h, characterId: ch.id, toVault: false }); o.loc = ch.id;
            }
            if (!o.eq) { step(`Equipping ${r.it.n}`); await act({ op: 'equip', itemId: o.id, characterId: ch.id }); o.eq = true; }
          }
          if (eqOnly) { step('Done. Your Guardian is wearing the new loadout.'); toast('Loadout equipped'); return; }
          step(`Saving to loadout slot ${ix + 1}`);
          const body = { op: 'loadout_save', characterId: ch.id, index: ix };
          if (sl) { if (sl.color) body.colorHash = sl.color; if (sl.icon) body.iconHash = sl.icon; if (sl.name) body.nameHash = sl.name; }
          await act(body);
          step('Done. Open Destiny 2 to see it in your loadouts.');
          toast('Saved to loadout slot ' + (ix + 1));
        } catch (e) {
          if (e && e.signin) { signIn('Your Bungie session ended. Sign in again, then try once more.'); return; }
          step((e && e.message) || 'Bungie stopped the change. Make sure your Guardian is in orbit or a social space.', 1);
          go.disabled = false;
        }
      };
      if (eqOnly && opt.auto && !go.disabled) { const st = $('[data-steps]', d); if (st) st.scrollIntoView({ block: 'nearest' }); go.onclick(); }
    }).catch((e) => { if (e && e.signin) return signIn('Your Bungie session ended. Sign in again to save loadouts.'); d.innerHTML = `<button type="button" class="d2-sh__x" data-sh-close aria-label="Close">${ico('close')}</button><p class="d2-warn">${esc((e && e.message) || 'Could not reach Bungie. Try again.')}</p>`; });
  }

  /* ---------- boot ---------- */
  APP.innerHTML = '<p class="d2-load">Loading the Destiny 2 database&hellip;</p>';
  load().then((data) => {
    D = data; index(); try { if (localStorage.getItem('rs_d2_dbg') === '1') window.__rsd2 = { D, prof: () => PROF, myWeapons, myArmor, agentBuild, ACTS }; } catch (e) { /* debug hook off */ }
    R.classList.add('is-ready');
    const st = $('[data-d2-asof]', R); if (st && D.meta.built) st.textContent = 'Data from Bungie, updated ' + new Date(D.meta.built).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) + '.';
    if (MODE === 'armor') armorView(); else if (MODE === 'build') buildView(); else if (MODE === 'top') topView(); else weaponsView();
    tray();
    const h = location.hash.match(/^#([wa])(\d+)$/); if (h) openKey(h[1] + h[2]);
    live('Database loaded: ' + D.W.length + ' weapons and ' + D.A.length + ' armor pieces.');
  }).catch((e) => { APP.innerHTML = `<p class="d2-warn">${esc(e.message || 'The database could not load.')}</p><p><button type="button" class="rs-btn" onclick="location.reload()">Try again</button></p>`; });
})();
