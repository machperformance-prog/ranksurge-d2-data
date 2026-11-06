/* RankSurge Stats Badge Maker. Mount: <div id="rsbadge" data-cdn=".../badges/"></div>
   Makes a personal badge (PNG download, drawn in the browser) and embed codes that link back to the player's RankSurge profile. */
(function () {
  var root = document.getElementById('rsbadge');
  if (!root) return;
  var CDN = root.getAttribute('data-cdn') || 'https://cdn.jsdelivr.net/gh/machperformance-prog/ranksurge-d2-data@main/badges/';
  var SITE = 'https://ranksurge.games';
  var G = [
    ['cs2','CS2','Counter-Strike 2','#F5A623','/pages/cs2-stats',['Premier','K/D','HLTV 2.0']],
    ['deadlock','Deadlock','Deadlock','#C9A86A','/pages/deadlock-stats',['Rank','KDA','Souls/min']],
    ['destiny-2','Destiny 2','Destiny 2','#9FB8D6','/pages/destiny-2-stats',['Trials K/D','Raids','Power']],
    ['dota-2','Dota 2','Dota 2','#E0453A','/pages/dota-2-stats',['Rank','Win rate','GPM']],
    ['fortnite','Fortnite','Fortnite','#8F6BFF','/pages/fortnite-stats',['Wins','K/D','Win rate']],
    ['pubg','PUBG','PUBG: Battlegrounds','#F2A900','/pages/pubg-stats',['Tier','K/D','Wins']],
    ['wow','WoW','World of Warcraft','#F8B700','/pages/wow-stats',['M+ rating','Item level','Class']],
    ['starcraft-2','StarCraft II','StarCraft II','#2EA6FF','/pages/starcraft-2-stats',['League','MMR','Race']],
    ['brawl-stars','Brawl Stars','Brawl Stars','#FFC21A','/pages/brawl-stars-stats',['Trophies','Ranked','3v3 wins']],
    ['clash-royale','Clash Royale','Clash Royale','#3D8BFF','/pages/clash-royale-stats',['Trophies','Best','Wins']],
    ['clash-of-clans','Clash of Clans','Clash of Clans','#F7B531','/pages/clash-of-clans-stats',['Town Hall','Trophies','War stars']],
    ['chess','Chess.com','Chess.com','#81B64C','/pages/chess-stats',['Rapid','Blitz','Puzzles']],
    ['lichess','Lichess','Lichess','#D9D9D9','/pages/lichess-stats',['Rapid','Blitz','Bullet']],
    ['rust','Rust','Rust','#E8743B','/pages/rust-stats',['K/D','Hours','Headshots']],
    ['tf2','TF2','Team Fortress 2','#E0523A','/pages/tf2-stats',['Hours','Main class','Kills']]
  ];
  function gById(id) { for (var i = 0; i < G.length; i++) if (G[i][0] === id) return G[i]; return G[0]; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(s, n) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n); }
  function safeUrl(u, g) {
    u = String(u || '').trim();
    if (!u) return SITE + g[4];
    if (u.charAt(0) === '/') u = SITE + u;
    try {
      var x = new URL(u);
      if (x.protocol === 'https:' && (x.hostname === 'ranksurge.games' || x.hostname === 'www.ranksurge.games')) return SITE + x.pathname + x.search;
    } catch (e) {}
    return null;
  }
  var q = new URLSearchParams(location.search);
  var st = { g: gById(q.get('g') || 'cs2'), u: q.get('u') || '', name: clean(q.get('n'), 24), style: 'neon', s: [['', ''], ['', ''], ['', '']] };

  var css = '#rsbadge{--c:#22D3EE;margin:8px 0 28px}#rsbadge *{box-sizing:border-box}' +
    '.rb-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:20px;align-items:start}' +
    '@media(max-width:860px){.rb-grid{grid-template-columns:1fr}}' +
    '.rb-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:18px}' +
    '.rb-card h3{margin:0 0 12px;font-size:18px}' +
    '.rb-f{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}.rb-f label{font-size:14px;font-weight:600;opacity:.9}' +
    '.rb-f input,.rb-f select{width:100%;min-height:44px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#0B0E17;color:#fff;font:inherit;font-size:16px}' +
    '.rb-f small{font-size:13px;opacity:.75}.rb-err{color:#FF8A8A!important;opacity:1!important}' +
    '.rb-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
    '.rb-seg{display:flex;gap:8px}.rb-seg button{flex:1;min-height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#fff;font:inherit;font-size:15px;cursor:pointer}' +
    '.rb-seg button[aria-pressed=true]{border-color:var(--c);background:rgba(34,211,238,.12)}' +
    '.rb-prev{display:flex;flex-direction:column;gap:14px}.rb-prev canvas{display:block;max-width:100%;height:auto;border-radius:10px}' +
    '.rb-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.rb-btn{min-height:44px;padding:10px 16px;border-radius:10px;border:0;background:linear-gradient(90deg,#22D3EE,#8B5CF6);color:#0B0E17;font:inherit;font-size:15px;font-weight:700;cursor:pointer}' +
    '.rb-btn.alt{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}' +
    '.rb-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}.rb-tabs button{min-height:40px;padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;font:inherit;font-size:14px;cursor:pointer}' +
    '.rb-tabs button[aria-selected=true]{background:#fff;color:#0B0E17}' +
    '.rb-code{width:100%;min-height:96px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#05070C;color:#CFE8FF;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;resize:vertical}' +
    '.rb-tip{font-size:14px;opacity:.85;margin:6px 0 0}.rb-ok{font-size:14px;color:#7CF2B0;min-height:20px}';
  var sty = document.createElement('style'); sty.textContent = css; document.head.appendChild(sty);

  var opts = G.map(function (g) { return '<option value="' + g[0] + '">' + esc(g[2]) + '</option>'; }).join('');
  root.innerHTML =
    '<div class="rb-grid"><div class="rb-card"><h3>1. Your details</h3>' +
    '<div class="rb-f"><label for="rb-g">Game</label><select id="rb-g">' + opts + '</select></div>' +
    '<div class="rb-f"><label for="rb-n">Player name</label><input id="rb-n" maxlength="24" autocomplete="nickname" placeholder="Your in-game name"></div>' +
    '<div class="rb-f"><label for="rb-u">Your RankSurge profile link (optional)</label><input id="rb-u" inputmode="url" placeholder="https://ranksurge.games/pages/..."><small id="rb-uh">Look yourself up, then copy the address from your browser. Leave blank to link to the game\'s stats page.</small></div>' +
    '<div class="rb-f"><label>Up to 3 stats to show</label><div class="rb-stats" id="rb-s"></div><small>Copy the numbers from your RankSurge profile so your badge stays honest.</small></div>' +
    '<div class="rb-f"><label>Style</label><div class="rb-seg" role="group" aria-label="Badge style"><button type="button" data-st="neon">RankSurge neon</button><button type="button" data-st="game">Game color</button></div></div>' +
    '</div><div class="rb-card rb-prev"><h3>2. Download your badge</h3>' +
    '<canvas id="rb-c1" width="936" height="120" aria-label="Forum signature badge preview"></canvas>' +
    '<div class="rb-row"><button class="rb-btn" type="button" data-dl="1">Download signature (468\u00d760)</button></div>' +
    '<canvas id="rb-c2" width="640" height="320" aria-label="Twitch panel badge preview" style="max-width:320px"></canvas>' +
    '<div class="rb-row"><button class="rb-btn" type="button" data-dl="2">Download Twitch panel (320\u00d7160)</button></div>' +
    '<h3 style="margin-top:6px">3. Copy the embed code</h3>' +
    '<div class="rb-tabs" role="tablist"><button role="tab" data-t="html" aria-selected="true">Website (HTML)</button><button role="tab" data-t="bb" aria-selected="false">Forum (BBCode)</button><button role="tab" data-t="md" aria-selected="false">GitHub / Reddit</button><button role="tab" data-t="link" aria-selected="false">Twitch, Discord, Steam</button></div>' +
    '<textarea class="rb-code" id="rb-code" readonly aria-label="Embed code"></textarea>' +
    '<div class="rb-row"><button class="rb-btn" type="button" id="rb-copy">Copy code</button><span class="rb-ok" id="rb-ok" aria-live="polite"></span></div>' +
    '<p class="rb-tip" id="rb-tip"></p></div></div>';

  var $ = function (id) { return document.getElementById(id); };
  var tab = 'html';
  function renderStatInputs() {
    var ph = st.g[5], h = '';
    for (var i = 0; i < 3; i++) {
      h += '<input aria-label="Stat ' + (i + 1) + ' name" maxlength="12" data-i="' + i + '" data-k="0" placeholder="' + esc(ph[i]) + '" value="' + esc(st.s[i][0]) + '">' +
        '<input aria-label="Stat ' + (i + 1) + ' value" maxlength="14" data-i="' + i + '" data-k="1" placeholder="Value" value="' + esc(st.s[i][1]) + '">';
    }
    $('rb-s').innerHTML = h;
  }
  function rr(x, c, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
  function fit(x, t, max, size, weight) { var s = size; do { x.font = weight + ' ' + s + 'px Inter,Segoe UI,Helvetica,Arial,sans-serif'; s--; } while (x.measureText(t).width > max && s > 9); return t; }
  function glyph(x, X, Y, k, c) {
    x.fillStyle = c; x.globalAlpha = 1; x.fillRect(X, Y + 18 * k, 7 * k, 14 * k); x.globalAlpha = .85; x.fillRect(X + 10 * k, Y + 11 * k, 7 * k, 21 * k); x.globalAlpha = .7; x.fillRect(X + 20 * k, Y + 4 * k, 7 * k, 28 * k); x.globalAlpha = 1;
    x.strokeStyle = '#fff'; x.lineWidth = 2.4 * k; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(X + 1 * k, Y + 12 * k); x.lineTo(X + 11 * k, Y + 6 * k); x.lineTo(X + 18 * k, Y + 9 * k); x.lineTo(X + 28 * k, Y + 1 * k); x.stroke();
  }
  function pairs() { var r = []; for (var i = 0; i < 3; i++) if (st.s[i][1]) r.push([st.s[i][0] || st.g[5][i], st.s[i][1]]); return r; }
  function stats() { return pairs().map(function (p) { return p[0] + ' ' + p[1]; }); }
  function bg(x, W, H, k) {
    var g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#0B0E17'); g.addColorStop(1, '#151A2B');
    rr(x, 0, 0, 0, W, H, 8 * k); x.fillStyle = g; x.fill();
    var n = x.createLinearGradient(0, 0, W, 0);
    if (st.style === 'game') { n.addColorStop(0, st.g[3]); n.addColorStop(1, st.g[3]); } else { n.addColorStop(0, '#22D3EE'); n.addColorStop(1, '#8B5CF6'); }
    x.lineWidth = 1.5 * k; x.strokeStyle = n; x.globalAlpha = .7; rr(x, 0, .75 * k, .75 * k, W - 1.5 * k, H - 1.5 * k, 7.5 * k); x.stroke(); x.globalAlpha = 1;
    x.fillStyle = st.g[3]; rr(x, 0, 0, 0, 6 * k, H, 3 * k); x.fill();
    return n;
  }
  function drawSig() {
    var c = $('rb-c1'), x = c.getContext('2d'), k = 2, W = 468 * k, H = 60 * k; x.clearRect(0, 0, W, H);
    var n = bg(x, W, H, k); glyph(x, 20 * k, 14 * k, k, st.g[3]);
    var nm = st.name || ('My ' + st.g[1] + ' stats');
    x.fillStyle = '#fff'; x.textBaseline = 'alphabetic'; fit(x, nm, 250 * k, 17 * k, '800'); x.fillText(nm, 62 * k, 28 * k);
    var line = stats(); line = line.length ? line.join('  \u00b7  ') : (st.g[2] + ' stats \u00b7 rank, stats and AI compare');
    x.fillStyle = '#C5CEE0'; fit(x, line, 280 * k, 12 * k, '600'); x.fillText(line, 62 * k, 46 * k);
    x.textAlign = 'right'; x.font = '800 ' + 15 * k + 'px Inter,Segoe UI,Helvetica,Arial,sans-serif'; x.fillStyle = n; x.fillText('RankSurge', 452 * k, 36 * k); x.textAlign = 'left';
  }
  function drawPanel() {
    var c = $('rb-c2'), x = c.getContext('2d'), k = 2, W = 320 * k, H = 160 * k; x.clearRect(0, 0, W, H);
    var n = bg(x, W, H, k); glyph(x, 20 * k, 18 * k, k, st.g[3]);
    x.fillStyle = st.g[3]; x.font = '800 ' + 12 * k + 'px Inter,Segoe UI,Helvetica,Arial,sans-serif'; x.fillText(st.g[2].toUpperCase() + ' STATS', 60 * k, 30 * k);
    var nm = st.name || 'My stats'; x.fillStyle = '#fff'; fit(x, nm, 240 * k, 20 * k, '800'); x.fillText(nm, 60 * k, 52 * k);
    var s = pairs(); if (!s.length) s = [['Rank', '\u2014'], ['Stats', 'Live'], ['AI', 'Compare']];
    var cw = (W - 40 * k - (s.length - 1) * 8 * k) / s.length;
    s.forEach(function (p, i) {
      var X = 20 * k + i * (cw + 8 * k), Y = 70 * k; x.fillStyle = 'rgba(255,255,255,.06)'; rr(x, 0, X, Y, cw, 52 * k, 8 * k); x.fill();
      x.fillStyle = '#A9B4CC'; fit(x, p[0] || 'Stat', cw - 16 * k, 11 * k, '600'); x.fillText(p[0] || 'Stat', X + 8 * k, Y + 18 * k);
      x.fillStyle = '#fff'; fit(x, p[1], cw - 16 * k, 17 * k, '800'); x.fillText(p[1], X + 8 * k, Y + 42 * k);
    });
    x.fillStyle = '#A9B4CC'; x.font = '600 ' + 11 * k + 'px Inter,Segoe UI,Helvetica,Arial,sans-serif'; x.fillText('Free stats tracker', 20 * k, 146 * k);
    x.textAlign = 'right'; x.font = '800 ' + 14 * k + 'px Inter,Segoe UI,Helvetica,Arial,sans-serif'; x.fillStyle = n; x.fillText('RankSurge', 300 * k, 147 * k); x.textAlign = 'left';
  }
  function link() { return safeUrl(st.u, st.g) || (SITE + st.g[4]); }
  function code() {
    var u = link(), img = CDN + st.g[0] + '-468x60.png', who = st.name ? st.name + "'s " : 'My ';
    var alt = who + st.g[2] + ' stats on RankSurge';
    if (tab === 'html') return '<a href="' + esc(u) + '" title="' + esc(alt) + '"><img src="' + img + '" width="468" height="60" style="max-width:100%;height:auto" alt="' + esc(alt) + '" loading="lazy"></a>';
    if (tab === 'bb') return '[url=' + u + '][img]' + img + '[/img][/url]';
    if (tab === 'md') return '[![' + alt.replace(/[\[\]]/g, '') + '](' + img + ')](' + u + ')';
    return u;
  }
  var TIPS = {
    html: 'Paste into your website, blog sidebar or link-in-bio page. The badge links to your RankSurge profile.',
    bb: 'Paste into your forum signature. Most gaming forums accept BBCode images up to 468\u00d760.',
    md: 'Paste into a GitHub profile README, a Reddit post or anywhere that supports Markdown.',
    link: 'Twitch: add a panel, upload the panel image, and paste this link as the image link. Discord and Steam: paste the link in your About Me or profile summary next to your downloaded badge.'
  };
  function update() {
    var ok = !st.u || safeUrl(st.u, st.g); $('rb-uh').className = ok ? '' : 'rb-err';
    $('rb-uh').textContent = ok ? 'Look yourself up, then copy the address from your browser. Leave blank to link to the game\'s stats page.' : 'Use a ranksurge.games link. Until then your badge links to the ' + st.g[2] + ' stats page.';
    drawSig(); drawPanel(); $('rb-code').value = code(); $('rb-tip').textContent = TIPS[tab]; $('rb-ok').textContent = '';
    var bs = root.querySelectorAll('[data-st]'); for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].getAttribute('data-st') === st.style ? 'true' : 'false');
  }
  $('rb-g').value = st.g[0]; $('rb-n').value = st.name; $('rb-u').value = st.u; renderStatInputs();
  $('rb-g').addEventListener('change', function () { st.g = gById(this.value); renderStatInputs(); update(); });
  $('rb-n').addEventListener('input', function () { st.name = clean(this.value, 24); update(); });
  $('rb-u').addEventListener('input', function () { st.u = this.value; update(); });
  $('rb-s').addEventListener('input', function (e) { var t = e.target; if (t.dataset.i == null) return; st.s[+t.dataset.i][+t.dataset.k] = clean(t.value, t.dataset.k === '0' ? 12 : 14); update(); });
  root.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.st) { st.style = t.dataset.st; update(); }
    if (t.dataset.t) { tab = t.dataset.t; var ts = root.querySelectorAll('[data-t]'); for (var i = 0; i < ts.length; i++) ts[i].setAttribute('aria-selected', ts[i] === t ? 'true' : 'false'); update(); }
    if (t.dataset.dl) {
      var src = $(t.dataset.dl === '1' ? 'rb-c1' : 'rb-c2'), w = t.dataset.dl === '1' ? 468 : 320, h = t.dataset.dl === '1' ? 60 : 160;
      var out = document.createElement('canvas'); out.width = w; out.height = h; var ox = out.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(src, 0, 0, w, h);
      out.toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'ranksurge-' + st.g[0] + (t.dataset.dl === '1' ? '-signature' : '-twitch-panel') + '.png'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, 'image/png');
    }
    if (t.id === 'rb-copy') {
      var v = $('rb-code').value, done = function () { $('rb-ok').textContent = 'Copied'; };
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, function () { $('rb-code').select(); document.execCommand('copy'); done(); });
      else { $('rb-code').select(); document.execCommand('copy'); done(); }
    }
  });
  update();
})();
