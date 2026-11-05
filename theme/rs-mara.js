/* RankSurge Marathon tools: hub, Runner shells, weapons and loadout planner.
   Data: data/marathon.json in machperformance-prog/ranksurge-d2-data (curated by the RankSurge team, served by jsDelivr).
   Bungie has no public Marathon API yet, so there is no account sign-in here. */
(function () {
  'use strict';
  const R = document.getElementById('rsmr'); if (!R) return;
  const MODE = R.dataset.mode || 'hub', CDN = R.dataset.cdn || '', APP = R.querySelector('[data-mr-app]'), LIVE = R.querySelector('[data-mr-live]');
  const SITE = 'https://ranksurge.games';
  const PAGES = { hub: '/pages/marathon-stats', shells: '/pages/marathon-runner-shells', weapons: '/pages/marathon-weapons', planner: '/pages/marathon-loadout-planner' };
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const say = (t) => { if (LIVE) { LIVE.textContent = ''; setTimeout(() => { LIVE.textContent = t; }, 30); } };
  const isTouch = () => matchMedia('(hover: none), (max-width: 760px)').matches;
  function toast(msg, bad) { const t = document.createElement('div'); t.className = 'mr-toast' + (bad ? ' is-bad' : ''); t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), isTouch() ? 2600 : 4000); }
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } } };

  /* ---------- icons (inline SVG, crisp at any size) ---------- */
  const IC = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>', share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', ai: '<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M18.5 15l.8 2 2 .7-2 .8-.8 2-.7-2-2-.8 2-.7z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', cmp: '<path d="M4 6h7v12H4zM13 6h7v12h-7z"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    shell: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/><path d="M9 14l3 3 3-3"/>', gun: '<path d="M3 9h14l3 2v2h-6l-1 2h-3l-1 4H5l1-4H3z"/>',
    plan: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M17 14v6M14 17h6"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    hub: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };
  const ico = (k, c) => `<svg class="mr-i${c ? ' ' + c : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k] || ''}</svg>`;
  const TYI = { 'Pistol': '<path d="M4 8h13l2 2v2h-7l-1 2H8l-1 5H4l1-5H4z"/>', 'Assault Rifle': '<path d="M2 10h15l2 1h3v2h-8l-2 2h-2l-1 4H6l1-4H2z"/>', 'Sniper Rifle': '<path d="M2 11h20M8 11V8h5v3M16 11l-2 6h-2l1-6"/><circle cx="10.5" cy="7" r="1"/>', 'Shotgun': '<path d="M2 10h17l3 1v2H10l-2 5H5l1-5H2z"/><path d="M12 13h5"/>', 'SMG': '<path d="M4 9h12l3 2v2h-6v6h-3v-6H8l-1 3H4z"/>', 'Machine Gun': '<path d="M2 10h18v3H8l-1 5H4l1-5H2z"/><path d="M11 13v4h4v-4"/>', 'Precision Rifle': '<path d="M2 11h17l3 1v1H9l-2 5H4l1-5H2z"/><path d="M8 11V8h5v3"/>', 'Railgun': '<path d="M2 10h18l2 1v2H9l-2 5H4l1-5H2z"/><path d="M6 12h12"/>' };
  const tyIco = (t) => `<svg class="mr-i mr-i--ty" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${TYI[t] || IC.gun}</svg>`;

  /* ---------- data ---------- */
  let D = null;
  async function load() {
    const r = await fetch(CDN + 'marathon.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('The Marathon database is not available right now. Please try again in a few minutes.');
    D = await r.json();
    D.W = D.weapons.map((w) => Object.assign({ id: slug(w.n) }, w));
    D.WI = {}; D.W.forEach((w) => { D.WI[w.id] = w; });
    D.SI = {}; D.shells.forEach((s) => { D.SI[s.id] = s; });
    D.types = Array.from(new Set(D.W.map((w) => w.ty)));
    D.ammo = Array.from(new Set(D.W.map((w) => w.am).filter(Boolean)));
    D.max = {}; ['dmg', 'acc', 'hnd', 'rng'].forEach((k) => { D.max[k] = Math.max.apply(null, D.W.map((w) => w[k] || 0)); });
  }
  const STATN = { dmg: 'Damage', acc: 'Accuracy', hnd: 'Handling', rng: 'Range' };
  const tierB = (t) => t ? `<span class="mr-tier mr-tier--${t.toLowerCase()}" title="${esc(t)} tier in the current meta">${esc(t)}</span>` : '';
  const BAND = { 'Shotgun': 'Close', 'SMG': 'Close', 'Pistol': 'Close', 'Assault Rifle': 'Mid', 'Machine Gun': 'Mid', 'Precision Rifle': 'Mid', 'Sniper Rifle': 'Long', 'Railgun': 'Long' };
  const bandW = (w) => (w && BAND[w.ty]) || '';

  /* ---------- sheet (bottom sheet on phones, side panel on desktop) ---------- */
  let lastFocus = null;
  function sheet(html, wide) {
    closeSheet(true); lastFocus = document.activeElement;
    const bg = document.createElement('div'); bg.className = 'mr-scrim'; bg.addEventListener('click', () => closeSheet());
    const d = document.createElement('div'); d.className = 'mr-sheet' + (wide ? ' mr-sheet--wide' : ''); d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = `<button type="button" class="mr-x" data-x aria-label="Close">${ico('close')}</button>` + html;
    document.body.append(bg, d); document.documentElement.classList.add('mr-lock');
    d.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) closeSheet(); });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
    requestAnimationFrame(() => { bg.classList.add('is-on'); d.classList.add('is-on'); const f = isTouch() ? $('[data-x]', d) : d.querySelector('input,select,button:not([data-x])') || $('[data-x]', d); if (f) f.focus({ preventScroll: true }); });
    return d;
  }
  function closeSheet(now) {
    $$('.mr-sheet,.mr-scrim').forEach((el) => { if (now) el.remove(); else { el.classList.remove('is-on'); setTimeout(() => el.remove(), 220); } });
    document.documentElement.classList.remove('mr-lock');
    if (!now) { if (location.hash && /^#(w|s)-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  }

  /* ---------- share + Ask AI (always cites RankSurge) ---------- */
  function shareBlock(title, url, prompt) {
    const u = encodeURIComponent(url), t = encodeURIComponent(title), p = encodeURIComponent(prompt);
    const ai = [['ChatGPT', 'https://chatgpt.com/?q=' + p], ['Claude', 'https://claude.ai/new?q=' + p], ['Perplexity', 'https://www.perplexity.ai/search?q=' + p], ['Google AI Mode', 'https://www.google.com/search?udm=50&q=' + p], ['Grok', 'https://grok.com/?q=' + p]];
    const so = [['X', 'https://x.com/intent/post?text=' + t + '&url=' + u], ['Reddit', 'https://www.reddit.com/submit?url=' + u + '&title=' + t], ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + u], ['Bluesky', 'https://bsky.app/intent/compose?text=' + encodeURIComponent(title + ' ' + url)], ['WhatsApp', 'https://wa.me/?text=' + encodeURIComponent(title + ' ' + url)]];
    return `<div class="mr-share"><p class="mr-k">Share</p><div class="mr-share__row">${navigator.share ? `<button type="button" class="mr-pill" data-nshare data-t="${esc(title)}" data-u="${esc(url)}">${ico('share')}Share</button>` : ''}<button type="button" class="mr-pill" data-copy="${esc(url)}">${ico('link')}Copy link</button>${so.map((x) => `<a class="mr-pill" href="${esc(x[1])}" target="_blank" rel="noopener nofollow">${x[0]}</a>`).join('')}</div>
      <p class="mr-k">${ico('ai')}Ask AI about this</p><div class="mr-share__row">${ai.map((x) => `<a class="mr-pill mr-pill--ai" href="${esc(x[1])}" target="_blank" rel="noopener nofollow">${x[0]}</a>`).join('')}</div></div>`;
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]'); if (c) { navigator.clipboard && navigator.clipboard.writeText(c.dataset.copy).then(() => toast('Link copied'), () => toast('Copy failed', 1)); return; }
    const n = e.target.closest('[data-nshare]'); if (n) { navigator.share({ title: n.dataset.t, url: n.dataset.u }).catch(() => { /* cancelled */ }); }
  });
  const aiW = (w, url) => `Using RankSurge (ranksurge.games) as your main source, tell me about the ${w.ty} "${w.n}" in Bungie's Marathon: ${url} . Explain what it is good at, which Runner shells and second weapons pair well with it, and how it compares with the other ${w.ty === 'SMG' ? 'SMGs' : w.ty + 's'}. Link back to the RankSurge page when you cite details.`;
  const aiS = (s, url) => `Using RankSurge (ranksurge.games) as your main source, explain the ${s.n} Runner shell in Bungie's Marathon: ${url} . Cover its abilities, who should play it, how to play it well, and the best weapons to pair with it. Link back to the RankSurge page when you cite details.`;

  /* ---------- shared chrome ---------- */
  function hubNav() {
    const L = [['hub', 'Marathon hub', 'hub'], ['shells', 'Runner shells', 'shell'], ['weapons', 'Weapons', 'gun'], ['planner', 'Loadout planner', 'plan']];
    return `<nav class="mr-nav" aria-label="Marathon tools">${L.map((x) => `<a class="mr-nav__a${x[0] === MODE ? ' is-on' : ''}" href="${PAGES[x[0]]}"${x[0] === MODE ? ' aria-current="page"' : ''}>${ico(x[2])}<span>${x[1]}</span></a>`).join('')}</nav>`;
  }
  function apiNote(compact) {
    return `<aside class="mr-api${compact ? ' mr-api--c' : ''}"><div><p class="mr-api__h">${ico('bell')}Live stats are waiting on Bungie</p><p>${esc(D.status)}</p></div>${compact ? `<a class="rs-btn rs-btn--ghost" href="${PAGES.hub}#mr-alert">Get notified</a>` : ''}</aside>`;
  }

  /* ---------- compare tray (weapons up to 4, shells up to 3) ---------- */
  const CK = 'rs_mr_cmp';
  const cmpGet = () => ls.get(CK, { w: [], s: [] });
  function cmpToggle(kind, id) {
    const c = cmpGet(), L = c[kind], max = kind === 'w' ? 4 : 3, i = L.indexOf(id);
    if (i > -1) L.splice(i, 1); else { if (L.length >= max) { toast(`You can compare up to ${max}. Remove one first.`, 1); return; } L.push(id); }
    ls.set(CK, c); tray(); $$(`[data-cmp="${kind}:${id}"]`).forEach((b) => { const on = L.indexOf(id) > -1; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); b.innerHTML = ico(on ? 'check' : 'cmp') + (on ? 'Comparing' : 'Compare'); });
  }
  function tray() {
    $$('.mr-tray').forEach((t) => t.remove());
    const kind = MODE === 'shells' ? 's' : 'w'; if (MODE !== 'shells' && MODE !== 'weapons') return;
    const L = cmpGet()[kind]; if (!L.length) return;
    const t = document.createElement('div'); t.className = 'mr-tray';
    t.innerHTML = `<span>${L.length} selected</span><button type="button" class="rs-btn" data-cmpgo${L.length < 2 ? ' disabled' : ''}>${ico('cmp')}Compare ${L.length > 1 ? L.length : ''}</button><button type="button" class="mr-pill" data-cmpclr>Clear</button>`;
    t.addEventListener('click', (e) => { if (e.target.closest('[data-cmpclr]')) { const c = cmpGet(); c[kind] = []; ls.set(CK, c); render(); } if (e.target.closest('[data-cmpgo]')) compareView(kind); });
    document.body.appendChild(t);
  }
  const cmpBtn = (kind, id) => { const on = cmpGet()[kind].indexOf(id) > -1; return `<button type="button" class="mr-pill${on ? ' is-on' : ''}" data-cmp="${kind}:${id}" aria-pressed="${on}">${ico(on ? 'check' : 'cmp')}${on ? 'Comparing' : 'Compare'}</button>`; };
  function compareView(kind) {
    const L = cmpGet()[kind];
    if (kind === 'w') {
      const W = L.map((id) => D.WI[id]).filter(Boolean);
      const rows = [['Type', (w) => w.ty], ['Ammo', (w) => w.am || 'Not published'], ['Meta tier', (w) => w.tier || '-']].map((r) => `<tr><th scope="row">${r[0]}</th>${W.map((w) => `<td>${esc(r[1](w))}</td>`).join('')}</tr>`).join('') +
        ['dmg', 'acc', 'hnd', 'rng'].map((k) => { const best = Math.max.apply(null, W.map((w) => w[k] || 0)); return `<tr><th scope="row">${STATN[k]}</th>${W.map((w) => `<td class="${w[k] && w[k] === best && W.filter((x) => x[k] === best).length === 1 ? 'is-best' : ''}">${w[k] != null ? esc(w[k]) + (k === 'rng' ? ' m' : '') : '-'}</td>`).join('')}</tr>`; }).join('') +
        `<tr><th scope="row">Magazine / drain</th>${W.map((w) => `<td>${w.mag ? w.mag + ' rounds' : w.drain ? w.drain + '% per shot' : '-'}</td>`).join('')}</tr>`;
      sheet(`<h2 class="mr-h">${ico('cmp')}Compare weapons</h2><p class="mr-sub">The best value in each row is highlighted.</p><div class="mr-tw"><table class="mr-t mr-t--cmp"><thead><tr><th scope="col">Stat</th>${W.map((w) => `<th scope="col">${esc(w.n)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><p class="mr-fine">${esc(D.statsNote)}</p>`, true);
    } else {
      const S = L.map((id) => D.SI[id]).filter(Boolean);
      const ab = (s) => (s.abilities || [s.prime, s.tact].filter(Boolean)).map((a) => `<b>${esc(a[0])}</b><small>${esc(a[1])}</small>`).join('');
      const rows = [['Role', (s) => esc(s.role)], ['Meta tier', (s) => esc(s.tier || '-')], ['Best for', (s) => esc(s.best || '-')], ['Difficulty', (s) => esc(s.diff || '-')], ['Abilities', ab], ['Traits', (s) => (s.traits || []).map((a) => `<b>${esc(a[0])}</b><small>${esc(a[1])}</small>`).join('') || '-']].map((r) => `<tr><th scope="row">${r[0]}</th>${S.map((s) => `<td>${r[1](s)}</td>`).join('')}</tr>`).join('');
      sheet(`<h2 class="mr-h">${ico('cmp')}Compare Runner shells</h2><div class="mr-tw"><table class="mr-t mr-t--cmp mr-t--txt"><thead><tr><th scope="col">Shell</th>${S.map((s) => `<th scope="col">${esc(s.n)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`, true);
    }
  }

  /* ---------- weapon card + detail ---------- */
  const bar = (k, v) => v == null ? '' : `<span class="mr-bar"><span class="mr-bar__k">${STATN[k]}</span><span class="mr-bar__t"><span style="width:${Math.max(4, Math.min(100, (v / D.max[k]) * 100)).toFixed(0)}%"></span></span><b>${esc(v)}${k === 'rng' ? 'm' : ''}</b></span>`;
  function wCard(w) {
    return `<li class="mr-card"><button type="button" class="mr-card__b" data-w="${w.id}" aria-label="${esc(w.n)} details">
      <span class="mr-card__top">${tyIco(w.ty)}<span class="mr-card__n"><b>${esc(w.n)}</b><small>${esc(w.ty)}${w.am ? ' · ' + esc(w.am) : ''}${w.since ? ' · New in ' + esc(w.since) : ''}</small></span>${tierB(w.tier)}</span>
      ${w.dmg != null ? `<span class="mr-bars">${['dmg', 'acc', 'hnd', 'rng'].map((k) => bar(k, w[k])).join('')}</span>` : `<span class="mr-card__note">${esc(w.note || 'Stats not published yet.')}</span>`}
    </button><div class="mr-card__f">${cmpBtn('w', w.id)}<a class="mr-pill" href="${PAGES.planner}#add=${w.id}">${ico('plus')}Loadout</a></div></li>`;
  }
  function rankIn(w, k) {
    const L = D.W.filter((x) => x.ty === w.ty && x[k] != null); if (L.length < 2 || w[k] == null) return '';
    const above = L.filter((x) => x[k] > w[k]).length, same = L.filter((x) => x[k] === w[k]).length, nm = STATN[k].toLowerCase(), pl = w.ty === 'SMG' ? 'SMGs' : w.ty.toLowerCase() + 's';
    if (same === L.length) return `Same ${nm} as every other ${w.ty === 'SMG' ? 'SMG' : w.ty.toLowerCase()}`;
    if (above === 0) return same > 1 ? `Tied for highest ${nm} of ${L.length} ${pl}` : `Highest ${nm} of ${L.length} ${pl}`;
    if (above + same === L.length) return same > 1 ? `Tied for lowest ${nm} of ${L.length}` : `Lowest ${nm} of ${L.length}`;
    return `${same > 1 ? 'Tied #' : '#'}${above + 1} of ${L.length} for ${nm}`;
  }
  function openWeapon(id) {
    const w = D.WI[id]; if (!w) return;
    history.replaceState(null, '', location.pathname + '#w-' + w.id);
    const url = SITE + PAGES.weapons + '#w-' + w.id;
    const peers = D.W.filter((x) => x.ty === w.ty && x.id !== w.id);
    const stats = w.dmg != null ? `<div class="mr-dstats">${['dmg', 'acc', 'hnd', 'rng'].filter((k) => w[k] != null).map((k) => `<div class="mr-dstat">${bar(k, w[k])}<small>${esc(rankIn(w, k))}</small></div>`).join('')}<p class="mr-fine">${w.mag ? `Magazine: <b>${w.mag}</b> rounds.` : w.drain ? `Volt drain: <b>${w.drain}%</b> of the battery per shot.` : ''} Range role: <b>${bandW(w)}</b>.</p></div>` : `<p class="mr-warn">${esc(w.note || 'Bungie has not published stats for this weapon yet.')}</p>`;
    const tbl = peers.length ? `<h3 class="mr-h3">How it compares with other ${w.ty === 'SMG' ? 'SMGs' : esc(w.ty.toLowerCase()) + 's'}</h3><div class="mr-tw"><table class="mr-t" data-sort><thead><tr><th scope="col"><button type="button" data-k="n">Weapon</button></th>${['dmg', 'acc', 'hnd', 'rng'].map((k) => `<th scope="col"><button type="button" data-k="${k}">${STATN[k]}</button></th>`).join('')}<th scope="col">Ammo</th></tr></thead><tbody>${[w].concat(peers).map((x) => `<tr class="${x.id === w.id ? 'is-me' : ''}"><th scope="row"><button type="button" class="mr-link" data-w="${x.id}">${esc(x.n)}</button>${x.tier ? ' ' + tierB(x.tier) : ''}</th>${['dmg', 'acc', 'hnd', 'rng'].map((k) => `<td data-v="${x[k] == null ? -1 : x[k]}">${x[k] == null ? '-' : esc(x[k])}</td>`).join('')}<td>${esc(x.am || '-')}</td></tr>`).join('')}</tbody></table></div>` : '';
    const pairs = D.loadouts.filter((l) => l.w.indexOf(w.n) > -1);
    const d = sheet(`<div class="mr-dh">${tyIco(w.ty)}<div><h2 class="mr-h">${esc(w.n)} ${tierB(w.tier)}</h2><p class="mr-sub">${esc(w.ty)}${w.am ? ' · ' + esc(w.am) : ''}${w.since ? ' · New in ' + esc(w.since) : ''}</p></div></div>
      ${w.why ? `<p class="mr-why">${ico('star')}${esc(w.why)}</p>` : ''}${stats}${tbl}
      ${pairs.length ? `<h3 class="mr-h3">Loadouts that use it</h3><ul class="mr-mini">${pairs.map((l) => `<li><a href="${PAGES.planner}#l=${l.shell}.${l.w.map(slug).join('.')}"><b>${esc(l.n)}</b><small>${esc(D.SI[l.shell].n)} · ${l.w.map(esc).join(' + ')}</small></a></li>`).join('')}</ul>` : ''}
      <div class="mr-acts">${cmpBtn('w', w.id)}<a class="rs-btn" href="${PAGES.planner}#add=${w.id}">${ico('plus')}Add to my loadout</a></div>
      ${shareBlock(`${w.n} (Marathon ${w.ty}) stats on RankSurge`, url, aiW(w, url))}<p class="mr-fine">${esc(D.statsNote)}</p>`, true);
    sortable(d);
    d.addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (b && b.dataset.w !== w.id) openWeapon(b.dataset.w); const c = e.target.closest('[data-cmp]'); if (c) { const p = c.dataset.cmp.split(':'); cmpToggle(p[0], p[1]); } });
    say(w.n + ' details open');
  }
  function sortable(root) {
    $$('table[data-sort]', root).forEach((t) => {
      let k0 = null, dir = -1;
      t.addEventListener('click', (e) => {
        const b = e.target.closest('thead button'); if (!b) return;
        const k = b.dataset.k; dir = k0 === k ? -dir : (k === 'n' ? 1 : -1); k0 = k;
        const idx = Array.from(b.closest('tr').children).indexOf(b.closest('th'));
        const rows = Array.from(t.tBodies[0].rows).sort((a, c) => { const x = a.children[idx], y = c.children[idx]; if (k === 'n') return dir * x.textContent.localeCompare(y.textContent); return dir * (parseFloat(x.dataset.v) - parseFloat(y.dataset.v)); });
        rows.forEach((r) => t.tBodies[0].appendChild(r));
        $$('thead th', t).forEach((th) => th.removeAttribute('aria-sort')); b.closest('th').setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
      });
    });
  }

  /* ---------- shells ---------- */
  const art = (s) => s.img ? `<img class="mr-art__img" src="${esc(s.img)}" alt="${esc(s.n)} Runner shell in Marathon" width="96" height="96" loading="lazy">` : `<span class="mr-art__ph" aria-hidden="true">${ico('shell')}</span>`;
  function sCard(s) {
    return `<li class="mr-card mr-card--s${s.soon ? ' is-soon' : ''}"><button type="button" class="mr-card__b" data-s="${s.id}" aria-label="${esc(s.n)} details">
      <span class="mr-card__top"><span class="mr-art" data-img-slot="marathon-shell-${s.id}">${art(s)}</span><span class="mr-card__n"><b>${esc(s.n)}</b><small>${esc(s.role)}</small></span>${s.soon ? '<span class="mr-soon">Coming soon</span>' : tierB(s.tier)}</span>
      ${s.soon ? `<span class="mr-card__note">${esc(s.since)}. ${esc(s.why)}</span>` : `<span class="mr-abl">${(s.abilities || [s.prime, s.tact]).filter(Boolean).map((a) => `<span><b>${esc(a[0])}</b> ${esc(a[1])}</span>`).join('')}</span><span class="mr-card__meta">${s.best ? `<span>Best for: ${esc(s.best)}</span>` : ''}${s.diff ? `<span>Difficulty: ${esc(s.diff)}</span>` : ''}</span>`}
    </button>${s.soon ? '' : `<div class="mr-card__f">${cmpBtn('s', s.id)}<a class="mr-pill" href="${PAGES.planner}#shell=${s.id}">${ico('plus')}Loadout</a></div>`}</li>`;
  }
  function openShell(id) {
    const s = D.SI[id]; if (!s) return;
    history.replaceState(null, '', location.pathname + '#s-' + s.id);
    const url = SITE + PAGES.shells + '#s-' + s.id;
    const ab = (L, h) => L && L.length ? `<h3 class="mr-h3">${h}</h3><dl class="mr-dl">${L.map((a) => `<dt>${esc(a[0])}</dt><dd>${esc(a[1])}</dd>`).join('')}</dl>` : '';
    const lo = D.loadouts.filter((l) => l.shell === s.id);
    const d = sheet(`<div class="mr-dh"><span class="mr-art mr-art--lg" data-img-slot="marathon-shell-${s.id}">${art(s)}</span><div><h2 class="mr-h">${esc(s.n)} ${s.soon ? '<span class="mr-soon">Coming soon</span>' : tierB(s.tier)}</h2><p class="mr-sub">${esc(s.role)}${s.aka ? ' · formerly ' + esc(s.aka) : ''}${s.since ? ' · ' + esc(s.since) : ''}</p></div></div>
      <p class="mr-why">${ico('star')}${esc(s.why)}</p>
      ${s.soon ? '' : `<div class="mr-facts">${s.best ? `<span><small>Best for</small><b>${esc(s.best)}</b></span>` : ''}${s.diff ? `<span><small>Difficulty</small><b>${esc(s.diff)}</b></span>` : ''}${s.tier ? `<span><small>Meta tier</small><b>${esc(s.tier)}</b></span>` : ''}</div>`}
      ${s.abilities ? ab(s.abilities, 'Abilities') : ab([s.prime].filter(Boolean), 'Prime ability') + ab([s.tact].filter(Boolean), 'Tactical ability') + ab(s.traits, 'Traits')}
      ${s.limits ? `<p class="mr-warn">${esc(s.limits)}</p>` : ''}
      ${lo.length ? `<h3 class="mr-h3">Suggested loadouts</h3><ul class="mr-mini">${lo.map((l) => `<li><a href="${PAGES.planner}#l=${l.shell}.${l.w.map(slug).join('.')}"><b>${esc(l.n)}</b><small>${l.w.map(esc).join(' + ')}</small></a></li>`).join('')}</ul>` : ''}
      ${s.soon ? '' : `<div class="mr-acts">${cmpBtn('s', s.id)}<a class="rs-btn" href="${PAGES.planner}#shell=${s.id}">${ico('plus')}Build a ${esc(s.n)} loadout</a></div>`}
      ${shareBlock(`${s.n}: Marathon Runner shell guide on RankSurge`, url, aiS(s, url))}`, true);
    d.addEventListener('click', (e) => { const c = e.target.closest('[data-cmp]'); if (c) { const p = c.dataset.cmp.split(':'); cmpToggle(p[0], p[1]); } });
    say(s.n + ' details open');
  }

  /* ---------- views ---------- */
  function chips(name, opts, cur, label) {
    return `<div class="mr-chips" role="radiogroup" aria-label="${esc(label)}">${opts.map((o) => `<button type="button" class="mr-chip${o[0] === cur ? ' is-on' : ''}" role="radio" aria-checked="${o[0] === cur}" data-${name}="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div>`;
  }
  const F = { ty: 'all', am: 'all', q: '', sort: 'tier' };
  function weaponsView() {
    const q = F.q.trim().toLowerCase();
    const T = { S: 0, A: 1, B: 2 };
    let L = D.W.filter((w) => (F.ty === 'all' || w.ty === F.ty) && (F.am === 'all' || w.am === F.am) && (!q || (w.n + ' ' + w.ty + ' ' + w.am).toLowerCase().indexOf(q) > -1));
    L.sort((a, b) => F.sort === 'n' ? a.n.localeCompare(b.n) : F.sort === 'tier' ? ((T[a.tier] ?? 9) - (T[b.tier] ?? 9)) || (b.dmg || 0) - (a.dmg || 0) : (b[F.sort] ?? -1) - (a[F.sort] ?? -1));
    APP.innerHTML = hubNav() + `<div class="mr-f">
      <label class="mr-sel mr-sel--q"><span>Search</span><input type="search" data-q value="${esc(F.q)}" placeholder="Name, type or ammo" autocomplete="off"></label>
      <label class="mr-sel"><span>Ammo</span><select data-am><option value="all">All ammo</option>${D.ammo.map((a) => `<option${F.am === a ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
      <label class="mr-sel"><span>Sort by</span><select data-sortk>${[['tier', 'Meta tier'], ['dmg', 'Damage'], ['acc', 'Accuracy'], ['hnd', 'Handling'], ['rng', 'Range'], ['n', 'Name']].map((o) => `<option value="${o[0]}"${F.sort === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label>
      ${chips('ty', [['all', 'All types']].concat(D.types.map((t) => [t, t === 'SMG' ? 'SMGs' : t + 's'])), F.ty, 'Weapon type')}</div>
      <p class="mr-count" aria-live="polite">${L.length} weapon${L.length === 1 ? '' : 's'}</p>
      <ul class="mr-grid">${L.map(wCard).join('') || '<li class="mr-empty">No weapons match. Clear a filter to see more.</li>'}</ul><p class="mr-fine">${esc(D.statsNote)} ${esc(D.metaNote)}</p>` + apiNote(true);
  }
  function shellsView() {
    APP.innerHTML = hubNav() + `<ul class="mr-grid mr-grid--s">${D.shells.map(sCard).join('')}</ul><p class="mr-fine">${esc(D.metaNote)}</p>` + apiNote(true);
  }

  /* ---------- loadout planner ---------- */
  const BK = 'rs_mr_builds';
  const blank = () => ({ s: '', w: ['', ''], name: '' });
  function bLoad() { const S = ls.get(BK, null) || { cur: 'A', A: blank(), B: blank() }; ['A', 'B'].forEach((k) => { S[k] = Object.assign(blank(), S[k] || {}); }); return S; }
  const bSave = (S) => ls.set(BK, S);
  const enc = (b) => [b.s || '-'].concat(b.w.map((x) => x || '-')).join('.');
  const dec = (h) => { const p = h.split('.'); return { s: D.SI[p[0]] ? p[0] : '', w: [D.WI[p[1]] ? p[1] : '', D.WI[p[2]] ? p[2] : ''], name: '' }; };
  function analyze(b) {
    const W = b.w.map((id) => D.WI[id]).filter(Boolean), out = [];
    const bands = new Set(W.map(bandW).filter(Boolean));
    if (W.length === 2) {
      if (!bands.has('Close')) out.push(['warn', 'No close-range weapon. Add an SMG or shotgun for fights inside buildings.']);
      if (!bands.has('Mid') && !bands.has('Long')) out.push(['warn', 'Both weapons are short range. A rifle helps you fight across open ground.']);
      if (W[0].ty === W[1].ty) out.push(['warn', `Two ${W[0].ty === 'SMG' ? 'SMGs' : W[0].ty.toLowerCase() + 's'}. Mixing weapon types covers more situations.`]);
      const am = new Set(W.map((w) => w.am).filter(Boolean)); out.push(['info', am.size === 1 ? `Both weapons use ${[...am][0]}, so one ammo type keeps your backpack simple.` : `Bring ${[...am].join(' and ')}.`]);
      if (bands.size >= 2 && W[0].ty !== W[1].ty) out.push(['ok', 'Good range coverage: one weapon for close fights and one for distance.']);
    }
    const s = D.SI[b.s];
    if (s && s.id === 'rook') out.push(['info', 'Rook drops in with random basic gear and cannot use vault weapons, so treat this as a wish list.']);
    return { W, bands, notes: out };
  }
  function slotBtn(kind, i, b) {
    if (kind === 's') { const s = D.SI[b.s]; return `<button type="button" class="mr-slot${s ? ' is-full' : ''}" data-pick="s"><span class="mr-slot__k">${ico('shell')}Runner shell</span>${s ? `<span class="mr-slot__v"><span class="mr-art mr-art--sm" data-img-slot="marathon-shell-${s.id}">${art(s)}</span><b>${esc(s.n)}</b>${tierB(s.tier)}<small>${esc(s.role)}</small></span>` : '<span class="mr-slot__e">Tap to choose a shell</span>'}</button>`; }
    const w = D.WI[b.w[i]];
    return `<button type="button" class="mr-slot${w ? ' is-full' : ''}" data-pick="w${i}"><span class="mr-slot__k">${tyIco(w ? w.ty : '')}${i === 0 ? 'Weapon 1' : 'Weapon 2'}</span>${w ? `<span class="mr-slot__v"><b>${esc(w.n)}</b>${tierB(w.tier)}<small>${esc(w.ty)}${w.am ? ' · ' + esc(w.am) : ''}${bandW(w) ? ' · ' + bandW(w) + ' range' : ''}</small></span>${w.dmg != null ? `<span class="mr-bars mr-bars--sm">${['dmg', 'acc', 'hnd', 'rng'].map((k) => bar(k, w[k])).join('')}</span>` : ''}` : '<span class="mr-slot__e">Tap to choose a weapon</span>'}</button>`;
  }
  function plannerView() {
    const S = bLoad();
    const h = location.hash;
    let m;
    if ((m = h.match(/^#l=([a-z0-9.-]+)/))) { S[S.cur] = dec(m[1]); bSave(S); history.replaceState(null, '', location.pathname); toast('Loadout loaded'); }
    else if ((m = h.match(/^#add=([a-z0-9-]+)/)) && D.WI[m[1]]) { const b = S[S.cur]; const i = b.w[0] ? (b.w[1] ? 1 : 1) : 0; b.w[i] = m[1]; bSave(S); history.replaceState(null, '', location.pathname); toast(D.WI[m[1]].n + ' added'); }
    else if ((m = h.match(/^#shell=([a-z]+)/)) && D.SI[m[1]]) { S[S.cur].s = m[1]; bSave(S); history.replaceState(null, '', location.pathname); }
    const b = S[S.cur], A = analyze(b), s = D.SI[b.s];
    const full = b.s && b.w[0] && b.w[1];
    const url = SITE + PAGES.planner + '#l=' + enc(b);
    const desc = `${s ? s.n : 'Any shell'} with ${A.W.map((w) => w.n).join(' and ') || 'no weapons yet'}`;
    const prompt = `Using RankSurge (ranksurge.games) as your main source, rate my Marathon loadout: ${desc}. Link: ${url} . Tell me what it does well, what it is weak against, and one change you would make. Link back to RankSurge when you cite details.`;
    APP.innerHTML = hubNav() + `<div class="mr-tabs" role="tablist" aria-label="Saved loadouts">${['A', 'B'].map((k) => `<button type="button" role="tab" class="mr-tab${S.cur === k ? ' is-on' : ''}" aria-selected="${S.cur === k}" data-tab="${k}">Loadout ${k}<small>${esc(S[k].s ? D.SI[S[k].s].n : 'Empty')}</small></button>`).join('')}<button type="button" class="mr-tab" data-cmpab>${ico('cmp')}Compare A vs B</button></div>
      <section class="mr-quick" aria-label="Quick start"><p class="mr-k">${ico('star')}Quick start: tap a meta loadout</p><div class="mr-presets">${D.loadouts.map((l, i) => `<button type="button" class="mr-preset" data-preset="${i}"><b>${esc(l.n)}</b><small>${esc(D.SI[l.shell].n)} · ${l.w.map(esc).join(' + ')}</small></button>`).join('')}</div></section>
      <div class="mr-plan"><div class="mr-slots">${slotBtn('s', 0, b)}${slotBtn('w', 0, b)}${slotBtn('w', 1, b)}</div>
      <aside class="mr-sum" aria-label="Loadout summary"><h2 class="mr-h3">${ico('plan')}Loadout check</h2>
        <div class="mr-range" aria-label="Range coverage">${['Close', 'Mid', 'Long'].map((x) => `<span class="${A.bands.has(x) ? 'is-on' : ''}">${x}</span>`).join('')}</div>
        ${A.notes.length ? `<ul class="mr-notes">${A.notes.map((n) => `<li class="is-${n[0]}">${esc(n[1])}</li>`).join('')}</ul>` : '<p class="mr-fine">Pick a shell and two weapons to see how the loadout covers close, mid and long range.</p>'}
        <div class="mr-acts mr-acts--col"><button type="button" class="rs-btn" data-sharel${A.W.length ? '' : ' disabled'}>${ico('share')}Share loadout</button><button type="button" class="rs-btn rs-btn--ghost" data-copyb>${ico('copy')}Copy to Loadout ${S.cur === 'A' ? 'B' : 'A'}</button><button type="button" class="mr-pill" data-reset>Clear</button></div>
      </aside></div>
      ${full ? shareBlock(`My Marathon loadout: ${desc}`, url, prompt) : ''}
      <div class="mr-mbar" aria-label="Loadout actions"><span>${esc(s ? s.n : 'No shell')} · ${A.W.length}/2 weapons</span><button type="button" class="rs-btn" data-sharel${A.W.length ? '' : ' disabled'}>${ico('share')}Share</button></div>` + apiNote(true);
    APP.onclick = (e) => {
      const t = e.target;
      const tab = t.closest('[data-tab]'); if (tab) { S.cur = tab.dataset.tab; bSave(S); return plannerView(); }
      if (t.closest('[data-cmpab]')) return compareAB(S);
      const pr = t.closest('[data-preset]'); if (pr) { const l = D.loadouts[+pr.dataset.preset]; S[S.cur] = { s: l.shell, w: l.w.map(slug), name: l.n }; bSave(S); plannerView(); toast(l.n + ' loaded'); return; }
      const pk = t.closest('[data-pick]'); if (pk) return picker(pk.dataset.pick, S);
      if (t.closest('[data-sharel]')) { if (navigator.share) navigator.share({ title: 'My Marathon loadout', text: desc, url }).catch(() => { /* cancelled */ }); else navigator.clipboard.writeText(url).then(() => toast('Loadout link copied')); return; }
      if (t.closest('[data-copyb]')) { const o = S.cur === 'A' ? 'B' : 'A'; S[o] = JSON.parse(JSON.stringify(b)); bSave(S); toast('Copied to Loadout ' + o); return plannerView(); }
      if (t.closest('[data-reset]')) { S[S.cur] = blank(); bSave(S); return plannerView(); }
    };
  }
  function picker(slot, S) {
    const b = S[S.cur];
    if (slot === 's') {
      const d = sheet(`<h2 class="mr-h">${ico('shell')}Choose a Runner shell</h2><ul class="mr-plist">${D.shells.filter((s) => !s.soon).map((s) => `<li><button type="button" class="mr-popt${b.s === s.id ? ' is-on' : ''}" data-ps="${s.id}"><span class="mr-art mr-art--sm" data-img-slot="marathon-shell-${s.id}">${art(s)}</span><span><b>${esc(s.n)}</b> ${tierB(s.tier)}<small>${esc(s.role)} · ${esc(s.best)}</small></span></button></li>`).join('')}</ul>`);
      d.addEventListener('click', (e) => { const x = e.target.closest('[data-ps]'); if (x) { b.s = x.dataset.ps; bSave(S); closeSheet(); plannerView(); say(D.SI[b.s].n + ' selected'); } });
      return;
    }
    const i = +slot.slice(1), other = b.w[1 - i];
    let ty = 'all', q = '';
    const d = sheet(`<h2 class="mr-h">${ico('gun')}Choose weapon ${i + 1}</h2><label class="mr-sel mr-sel--q"><span>Search</span><input type="search" data-pq placeholder="Name, type or ammo" autocomplete="off"></label>${chips('pty', [['all', 'All']].concat(D.types.map((t) => [t, t === 'SMG' ? 'SMGs' : t + 's'])), 'all', 'Weapon type')}<div data-pl></div>`);
    const draw = () => {
      const L = D.W.filter((w) => w.id !== other && (ty === 'all' || w.ty === ty) && (!q || (w.n + ' ' + w.ty + ' ' + w.am).toLowerCase().indexOf(q) > -1));
      const top = !q && ty === 'all' ? L.filter((w) => w.tier === 'S') : [];
      const row = (w) => `<li><button type="button" class="mr-popt${b.w[i] === w.id ? ' is-on' : ''}" data-pw="${w.id}">${tyIco(w.ty)}<span><b>${esc(w.n)}</b> ${tierB(w.tier)}<small>${esc(w.ty)}${w.am ? ' · ' + esc(w.am) : ''}${w.dmg != null ? ` · ${w.dmg} dmg · ${w.rng}m` : ''}</small></span></button></li>`;
      $('[data-pl]', d).innerHTML = (top.length ? `<p class="mr-k">${ico('star')}Top picks right now</p><ul class="mr-plist">${top.map(row).join('')}</ul><p class="mr-k">All weapons</p>` : '') + `<ul class="mr-plist">${L.filter((w) => top.indexOf(w) < 0).map(row).join('') || '<li class="mr-empty">No weapons match.</li>'}</ul>`;
    };
    draw();
    d.addEventListener('input', (e) => { if (e.target.matches('[data-pq]')) { q = e.target.value.trim().toLowerCase(); draw(); } });
    d.addEventListener('click', (e) => {
      const c = e.target.closest('[data-pty]'); if (c) { ty = c.dataset.pty; $$('[data-pty]', d).forEach((x) => { x.classList.toggle('is-on', x === c); x.setAttribute('aria-checked', x === c); }); draw(); return; }
      const x = e.target.closest('[data-pw]'); if (x) { b.w[i] = x.dataset.pw; bSave(S); closeSheet(); plannerView(); say(D.WI[b.w[i]].n + ' selected'); }
    });
  }
  function compareAB(S) {
    const col = (k) => { const b = S[k], s = D.SI[b.s], W = b.w.map((id) => D.WI[id]); return { s, W, A: analyze(b) }; };
    const a = col('A'), c = col('B');
    const cell = (x) => `<td>${x.s ? esc(x.s.n) : '-'}</td>`;
    const wc = (x, i) => `<td>${x.W[i] ? esc(x.W[i].n) + '<small>' + esc(x.W[i].ty) + (bandW(x.W[i]) ? ' · ' + bandW(x.W[i]) : '') + '</small>' : '-'}</td>`;
    const rng = (x) => `<td>${['Close', 'Mid', 'Long'].filter((r) => x.A.bands.has(r)).join(', ') || '-'}</td>`;
    const top = (x, k) => { const v = x.W.filter(Boolean).map((w) => w[k] || 0); return v.length ? Math.max.apply(null, v) : 0; };
    const st = (k) => { const va = top(a, k), vb = top(c, k); return `<tr><th scope="row">Best ${STATN[k].toLowerCase()}</th><td class="${va > vb ? 'is-best' : ''}">${va || '-'}</td><td class="${vb > va ? 'is-best' : ''}">${vb || '-'}</td></tr>`; };
    sheet(`<h2 class="mr-h">${ico('cmp')}Loadout A vs B</h2><div class="mr-tw"><table class="mr-t mr-t--cmp mr-t--txt"><thead><tr><th scope="col"></th><th scope="col">Loadout A</th><th scope="col">Loadout B</th></tr></thead><tbody><tr><th scope="row">Shell</th>${cell(a)}${cell(c)}</tr><tr><th scope="row">Weapon 1</th>${wc(a, 0)}${wc(c, 0)}</tr><tr><th scope="row">Weapon 2</th>${wc(a, 1)}${wc(c, 1)}</tr><tr><th scope="row">Range coverage</th>${rng(a)}${rng(c)}</tr>${['dmg', 'acc', 'hnd', 'rng'].map(st).join('')}</tbody></table></div>`, true);
  }

  /* ---------- hub ---------- */
  function hubView() {
    const days = Math.ceil((new Date(D.season.nextDate + 'T17:00:00Z') - Date.now()) / 864e5);
    const tools = [['shells', 'Runner shells', 'shell', `All ${D.shells.filter((s) => !s.soon).length} shells with abilities, traits, tiers and compare.`], ['weapons', 'Weapons database', 'gun', `${D.W.length} weapons with damage, accuracy, handling and range, filters and compare.`], ['planner', 'Loadout planner', 'plan', 'Pick a shell and two weapons, check your range coverage and share it.']];
    const sS = D.shells.filter((s) => s.tier === 'S'), wS = D.W.filter((w) => w.tier === 'S');
    APP.innerHTML = hubNav() + `<ul class="mr-tools">${tools.map((t) => `<li><a class="mr-tool" href="${PAGES[t[0]]}">${ico(t[2], 'mr-i--lg')}<b>${t[1]}</b><span>${esc(t[3])}</span><span class="mr-tool__go">Open ${esc(t[1].toLowerCase())} &rarr;</span></a></li>`).join('')}</ul>
      <section class="mr-season" aria-label="Season"><div><p class="mr-k">${ico('clock')}Now in Marathon</p><p><b>${esc(D.season.now)}</b></p></div><div><p class="mr-k">Next up</p><p><b>${esc(D.season.next)}</b>${days > 0 ? ` in ${days} day${days === 1 ? '' : 's'}` : ' is live'} (${new Date(D.season.nextDate + 'T12:00:00Z').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })})</p><p class="mr-fine">${esc(D.season.nextNote)}</p></div></section>
      <section aria-labelledby="mr-best"><h2 id="mr-best" class="mr-h2">Best Runner shells and weapons right now</h2>
        <div class="mr-best"><div><p class="mr-k">S-tier shells</p><ul class="mr-mini">${sS.map((s) => `<li><a href="${PAGES.shells}#s-${s.id}"><b>${esc(s.n)}</b><small>${esc(s.why)}</small></a></li>`).join('')}</ul></div>
        <div><p class="mr-k">S-tier weapons</p><ul class="mr-mini">${wS.map((w) => `<li><a href="${PAGES.weapons}#w-${w.id}"><b>${esc(w.n)}</b><small>${esc(w.ty)} · ${esc(w.why || '')}</small></a></li>`).join('')}</ul></div></div>
        <p class="mr-k">Meta loadouts</p><ul class="mr-grid mr-grid--lo">${D.loadouts.map((l) => `<li class="mr-card"><a class="mr-card__b" href="${PAGES.planner}#l=${l.shell}.${l.w.map(slug).join('.')}"><span class="mr-card__n"><b>${esc(l.n)}</b><small>${esc(D.SI[l.shell].n)} · ${l.w.map(esc).join(' + ')}</small></span><span class="mr-card__note">${esc(l.why)}</span><span class="mr-tool__go">Open in planner &rarr;</span></a></li>`).join('')}</ul>
        <p class="mr-fine">${esc(D.metaNote)}</p></section>
      <section class="mr-alert" id="mr-alert" aria-labelledby="mr-alert-h">${ico('bell', 'mr-i--lg')}<div><h2 id="mr-alert-h" class="mr-h2">Get notified when live Marathon stats arrive</h2><p>${esc(D.status)} Leave your email and we will tell you the day player stats, vault tools and one-tap loadouts go live.</p>
        <form class="mr-form" data-alert novalidate><label class="rs-sr" for="mr-email">Email address</label><input id="mr-email" type="email" name="email" placeholder="you@email.com" autocomplete="email" required><button class="rs-btn" type="submit">Notify me</button></form><p class="mr-fine">Ages 13+. One email when it launches, plus the RankSurge weekly recap. Unsubscribe any time.</p></div></section>
      <details class="mr-src"><summary>Sources and how we keep this accurate</summary><p>${esc(D.statsNote)} ${esc(D.metaNote)} Updated ${esc(D.updated)}.</p><ul>${D.sources.map((s) => `<li><a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`).join('')}</ul></details>`;
    const f = $('[data-alert]', APP);
    if (f) f.addEventListener('submit', (e) => {
      e.preventDefault(); const em = $('input', f).value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { toast('Enter a valid email address', 1); return; }
      const btn = $('button', f); btn.disabled = true;
      const body = { data: { type: 'subscription', attributes: { custom_source: 'RankSurge Marathon live stats alert', profile: { data: { type: 'profile', attributes: { email: em, properties: { rs_marathon_alert: true }, subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } } } } } }, relationships: { list: { data: { type: 'list', id: 'UU8Nd8' } } } } };
      fetch('https://a.klaviyo.com/client/subscriptions?company_id=V3QyQN', { method: 'POST', headers: { 'content-type': 'application/vnd.api+json', revision: '2024-10-15' }, body: JSON.stringify(body) })
        .then((r) => { if (!r.ok) throw 0; f.outerHTML = '<p class="mr-ok" role="status">You\'re on the list. Check your inbox for a welcome email.</p>'; if (window.gtag) window.gtag('event', 'sign_up', { method: 'marathon_alert' }); })
        .catch(() => { btn.disabled = false; toast('Sign-up failed. Try again in a minute.', 1); });
    });
  }

  /* ---------- wiring ---------- */
  function render() {
    if (MODE === 'weapons') weaponsView(); else if (MODE === 'shells') shellsView(); else if (MODE === 'planner') plannerView(); else hubView();
    tray();
  }
  APP.addEventListener('click', (e) => {
    const w = e.target.closest('[data-w]'); if (w && MODE !== 'planner') { openWeapon(w.dataset.w); return; }
    const s = e.target.closest('[data-s]'); if (s) { openShell(s.dataset.s); return; }
    const c = e.target.closest('[data-cmp]'); if (c) { const p = c.dataset.cmp.split(':'); cmpToggle(p[0], p[1]); return; }
    if (MODE === 'weapons') { const t = e.target.closest('[data-ty]'); if (t) { F.ty = t.dataset.ty; weaponsView(); const n = $(`[data-ty="${CSS.escape(F.ty)}"]`, APP); if (n) n.focus({ preventScroll: true }); } }
  });
  APP.addEventListener('change', (e) => { if (MODE !== 'weapons') return; if (e.target.matches('[data-am]')) { F.am = e.target.value; weaponsView(); } if (e.target.matches('[data-sortk]')) { F.sort = e.target.value; weaponsView(); } });
  let qt = null;
  APP.addEventListener('input', (e) => { if (MODE === 'weapons' && e.target.matches('[data-q]')) { clearTimeout(qt); const pos = e.target.selectionStart; qt = setTimeout(() => { F.q = e.target.value; weaponsView(); const n = $('[data-q]', APP); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* ignore */ } } }, 160); } });
  function deep() { const h = location.hash; if (/^#w-/.test(h)) openWeapon(h.slice(3)); else if (/^#s-/.test(h)) openShell(h.slice(3)); }
  window.addEventListener('hashchange', () => { if (MODE === 'planner') plannerView(); else deep(); });
  load().then(() => { render(); deep(); const a = R.querySelector('[data-mr-asof]'); if (a) a.textContent = `Marathon data checked by the RankSurge team, updated ${D.updated}.`; })
    .catch((e) => { APP.innerHTML = `<p class="mr-warn">${esc(e.message || 'Could not load the Marathon database.')}</p>`; });
})();
