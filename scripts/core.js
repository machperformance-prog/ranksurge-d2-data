/* RankSurge D2 data core: turns Bungie manifest tables into slim JSON for ranksurge.games.
   Pure function, no I/O. Runs in Node (build.js) and in a browser (for testing). */
(function (root) {
  const BUCKET = { 1498876634: 'kinetic', 2465295065: 'energy', 953998645: 'power',
    3448274439: 'helmet', 3551918588: 'arms', 14239492: 'chest', 20886954: 'legs', 1585787867: 'class' };
  const CLASS = { 0: 'titan', 1: 'hunter', 2: 'warlock', 3: 'any' };
  const AMMO = { 1: 'primary', 2: 'special', 3: 'heavy' };
  const DUMMY_CAT = 3109687656;
  const WEAPON_STAT_ORDER = ['Impact', 'Range', 'Stability', 'Handling', 'Reload Speed', 'Aim Assistance', 'Airborne Effectiveness',
    'Zoom', 'Recoil Direction', 'Ammo Generation', 'Blast Radius', 'Velocity', 'Accuracy', 'Draw Time', 'Charge Time',
    'Swing Speed', 'Guard Efficiency', 'Guard Resistance', 'Charge Rate', 'Ammo Capacity', 'Guard Endurance', 'Shield Duration',
    'Magazine', 'Rounds Per Minute', 'Inventory Size', 'Heat Generated', 'Cooling Efficiency', 'Vent Speed', 'Persistence'];
  const ARMOR_STATS = ['Weapons', 'Health', 'Class', 'Grenade', 'Super', 'Melee'];
  // Stats that are not useful to show as bars
  const HIDDEN_BAR = new Set(['Rounds Per Minute', 'Magazine', 'Draw Time', 'Charge Time', 'Inventory Size']);

  function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
  function relOf(traits) {
    const t = (traits || []).find((x) => /^releases\./.test(x));
    return t ? t.replace('releases.', '') : '';
  }

  function build(T, opts) {
    opts = opts || {};
    const I = T.DestinyInventoryItemDefinition, S = T.DestinyStatDefinition, SG = T.DestinyStatGroupDefinition,
      PS = T.DestinyPlugSetDefinition, DMG = T.DestinyDamageTypeDefinition, SP = T.DestinySandboxPerkDefinition,
      COL = T.DestinyCollectibleDefinition || {}, SET = T.DestinyEquipableItemSetDefinition || {},
      SC = T.DestinySocketCategoryDefinition || {}, BR = T.DestinyBreakerTypeDefinition || {};

    const statName = (h) => (S[h] && S[h].displayProperties && S[h].displayProperties.name) || '';
    const perks = {};       // plugHash -> slim perk
    const usedGroups = {};  // statGroupHash -> true

    function perkText(d) {
      let desc = clean(d.displayProperties && d.displayProperties.description);
      const extra = [];
      for (const p of d.perks || []) {
        const sp = SP[p.perkHash];
        if (!sp || !sp.isDisplayable) continue;
        const t = clean(sp.displayProperties && sp.displayProperties.description);
        if (t && !(desc && desc.includes(t)) && !extra.includes(t)) extra.push(t);
      }
      if (!desc && extra.length) desc = extra.shift();
      const seen = new Set();
      return [desc, extra.join(' ')].filter(Boolean).join(' ').split(/(?<=[.!?])\s+/).filter((x) => { const k = x.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; }).join(' ');
    }
    function addPerk(h) {
      if (perks[h] !== undefined) return perks[h] ? h : 0;
      const d = I[h];
      if (!d || !d.displayProperties || !d.displayProperties.name || d.redacted) { perks[h] = null; return 0; }
      const inv = {};
      for (const s of d.investmentStats || []) {
        const n = statName(s.statTypeHash);
        if (n && s.value && !s.isConditionallyActive) inv[n] = s.value;
      }
      const cond = {};
      for (const s of d.investmentStats || []) {
        const n = statName(s.statTypeHash);
        if (n && s.value && s.isConditionallyActive) cond[n] = s.value;
      }
      const o = { n: d.displayProperties.name, d: perkText(d), i: d.displayProperties.icon || '',
        c: (d.plug && d.plug.plugCategoryIdentifier) || '', t: clean(d.itemTypeDisplayName) };
      if (Object.keys(inv).length) o.s = inv;
      if (Object.keys(cond).length) o.cs = cond;
      if (/enhanced/i.test(o.t)) o.e = 1;
      if (o.c === 'armor_archetypes') {
        const pm = /Primary Stat:\s*([A-Za-z]+)/i.exec(o.d), sm = /Secondary Stat:\s*([A-Za-z]+)/i.exec(o.d);
        if (pm) o.pr = pm[1];
        if (sm) o.se = sm[1];
      }
      perks[h] = o;
      return h;
    }
    function plugSet(h, onlyCurrent) {
      const ps = PS[h];
      if (!ps) return [];
      const out = [];
      for (const p of ps.reusablePlugItems || []) {
        if (onlyCurrent && p.currentlyCanRoll === false) continue;
        if (addPerk(p.plugItemHash) && !out.includes(p.plugItemHash)) out.push(p.plugItemHash);
      }
      return out;
    }
    function source(d) {
      const c = COL[d.collectibleHash];
      return clean((c && c.sourceString) || d.displaySource || '');
    }
    function investment(d) {
      const o = {};
      for (const s of d.investmentStats || []) {
        const n = statName(s.statTypeHash);
        if (n && s.value) o[n] = s.value;
      }
      return o;
    }

    /* ---------- Weapons ---------- */
    const wRaw = Object.values(I).filter((d) => d.itemType === 3 && !d.redacted && !d.blacklisted && d.inventory &&
      (d.inventory.tierType === 5 || d.inventory.tierType === 6) && BUCKET[d.inventory.bucketTypeHash] &&
      !(d.itemCategoryHashes || []).includes(DUMMY_CAT) && d.displayProperties && d.displayProperties.name &&
      d.sockets && d.stats && d.stats.statGroupHash);
    // Keep the newest version of each name (+adept separately).
    const byKey = {}, wAlt = {};
    for (const d of wRaw) {
      const k = d.displayProperties.name + (d.isAdept ? '|adept' : '');
      (wAlt[k] = wAlt[k] || []).push(d.hash);
      const prev = byKey[k];
      const score = (x) => (x.collectibleHash ? 1e9 : 0) + (x.index || 0);
      if (!prev || score(d) > score(prev)) byKey[k] = d;
    }
    const weapons = [];
    for (const d of Object.values(byKey)) {
      const entries = d.sockets.socketEntries || [];
      const cats = d.sockets.socketCategories || [];
      const catIdx = (name) => { const c = cats.find((c) => SC[c.socketCategoryHash] && SC[c.socketCategoryHash].displayProperties.name === name); return c ? c.socketIndexes : []; };
      const intrinsicIdx = catIdx('INTRINSIC TRAITS');
      const perkIdx = catIdx('WEAPON PERKS');
      let frame = 0;
      for (const i of intrinsicIdx) { const e = entries[i]; if (e && e.singleInitialItemHash && addPerk(e.singleInitialItemHash)) { frame = e.singleInitialItemHash; break; } }
      const cols = [];
      for (const i of perkIdx) {
        const e = entries[i];
        if (!e) continue;
        let opts = [];
        if (e.randomizedPlugSetHash) opts = plugSet(e.randomizedPlugSetHash, true);
        else if (e.reusablePlugSetHash) opts = plugSet(e.reusablePlugSetHash, true);
        if (!opts.length && e.reusablePlugItems && e.reusablePlugItems.length) opts = e.reusablePlugItems.map((p) => addPerk(p.plugItemHash)).filter(Boolean);
        if (!opts.length && e.singleInitialItemHash && addPerk(e.singleInitialItemHash)) opts = [e.singleInitialItemHash];
        const cat = opts.length && perks[opts[0]] ? perks[opts[0]].c : '';
        // Skip trackers, deepsight, mementos, level boosts.
        if (/tracker|memento|crafting|deepsight|levels|empty/i.test(cat) || !opts.length) continue;
        if (opts.every((h) => /Kill Tracker|Empty/i.test(perks[h].n))) continue;
        cols.push(opts);
      }
      const stats = {};
      for (const s of Object.values(d.stats.stats || {})) {
        const n = statName(s.statHash);
        if (n && (s.value || n === 'Recoil Direction')) stats[n] = s.value;
      }
      const sg = d.stats.statGroupHash;
      usedGroups[sg] = true;
      const dmgH = d.defaultDamageTypeHash;
      const dmg = DMG[dmgH] && DMG[dmgH].displayProperties.name;
      const o = {
        h: d.hash, n: d.displayProperties.name, ic: d.displayProperties.icon || '', wm: d.iconWatermark || '',
        ty: clean(d.itemTypeDisplayName), st: d.itemSubType, r: d.inventory.tierType === 6 ? 'exotic' : 'legendary',
        sl: BUCKET[d.inventory.bucketTypeHash], am: AMMO[d.equippingBlock && d.equippingBlock.ammoType] || '',
        el: dmg || '', fr: frame, rpm: stats['Rounds Per Minute'] || stats['Charge Time'] || stats['Draw Time'] || 0,
        s: stats, inv: investment(d), sg, pk: cols, src: source(d), rel: relOf(d.traitIds), fl: clean(d.flavorText),
      };
      const alt = wAlt[d.displayProperties.name + (d.isAdept ? '|adept' : '')].filter((h) => h !== d.hash);
      if (alt.length) o.alt = alt; // other versions of the same weapon (reissues), used to match a player's copies
      if (d.isAdept) o.ad = 1;
      if (d.breakerType && BR[d.breakerType]) o.br = BR[d.breakerType] ? clean(BR[d.breakerType].displayProperties.name) : '';
      if (d.inventory.recipeItemHash) o.cr = 1;
      if (d.equippingBlock && d.equippingBlock.equipableItemSetHash) o.set = d.equippingBlock.equipableItemSetHash;
      weapons.push(o);
    }
    weapons.sort((a, b) => a.n.localeCompare(b.n));

    /* ---------- Armor ---------- */
    const aRaw = Object.values(I).filter((d) => d.itemType === 2 && !d.redacted && !d.blacklisted && d.inventory &&
      (d.inventory.tierType === 5 || d.inventory.tierType === 6) && BUCKET[d.inventory.bucketTypeHash] &&
      d.displayProperties && d.displayProperties.name && d.sockets && d.collectibleHash &&
      !(d.itemCategoryHashes || []).includes(DUMMY_CAT));
    const aByKey = {}, aAlt = {};
    for (const d of aRaw) {
      const k = d.displayProperties.name + '|' + d.classType;
      (aAlt[k] = aAlt[k] || []).push(d.hash);
      const prev = aByKey[k];
      if (!prev || (d.index || 0) > (prev.index || 0)) aByKey[k] = d;
    }
    const armor = [];
    for (const d of Object.values(aByKey)) {
      const entries = d.sockets.socketEntries || [];
      let exotic = 0, archetypes = [], statRolls = [];
      for (const e of entries) {
        const ini = e.singleInitialItemHash && I[e.singleInitialItemHash];
        const cat = ini && ini.plug && ini.plug.plugCategoryIdentifier;
        if (d.inventory.tierType === 6 && !exotic && ini && cat === 'intrinsics' && ini.displayProperties.name) exotic = addPerk(e.singleInitialItemHash);
        if (e.randomizedPlugSetHash) {
          // Stat plugs have no name, so read them straight from the plug set (they are not kept as perks).
          const raw = ((PS[e.randomizedPlugSetHash] || {}).reusablePlugItems || []).filter((p) => p.currentlyCanRoll !== false).map((p) => I[p.plugItemHash]).filter(Boolean);
          if (raw.length && raw[0].plug && raw[0].plug.plugCategoryIdentifier === 'armor_stats') {
            let lo = Infinity, hi = 0;
            for (const it of raw) for (const st of it.investmentStats || []) if (st.value > 0) { lo = Math.min(lo, st.value); hi = Math.max(hi, st.value); }
            if (hi) statRolls.push([lo, hi]);
            continue;
          }
          const opts = plugSet(e.randomizedPlugSetHash, true);
          const c0 = opts.length && perks[opts[0]] ? perks[opts[0]].c : '';
          if (c0 === 'armor_archetypes') archetypes = opts;
        }
      }
      // Exotic intrinsic may live under a reusable plug set too.
      if (d.inventory.tierType === 6 && !exotic) {
        for (const e of entries) {
          const ini = e.singleInitialItemHash && I[e.singleInitialItemHash];
          if (ini && ini.displayProperties && ini.displayProperties.name && /intrinsic/i.test(clean(ini.itemTypeDisplayName))) { exotic = addPerk(e.singleInitialItemHash); break; }
        }
      }
      // Stat roll range per socket position (primary, secondary, tertiary): [min, max]. Every stat shares the range.
      const rolls = statRolls;
      const o = {
        h: d.hash, n: d.displayProperties.name, ic: d.displayProperties.icon || '', wm: d.iconWatermark || '',
        ty: clean(d.itemTypeDisplayName), cl: CLASS[d.classType] || 'any', sl: BUCKET[d.inventory.bucketTypeHash],
        r: d.inventory.tierType === 6 ? 'exotic' : 'legendary', src: source(d), rel: relOf(d.traitIds), fl: clean(d.flavorText),
        base: investment(d),
      };
      const aalt = aAlt[d.displayProperties.name + '|' + d.classType].filter((h) => h !== d.hash);
      if (aalt.length) o.alt = aalt;
      if (exotic) o.ex = exotic;
      if (archetypes.length) o.at = archetypes;
      if (rolls.length) o.ro = rolls;
      if (d.equippingBlock && d.equippingBlock.equipableItemSetHash) o.set = d.equippingBlock.equipableItemSetHash;
      // Drop old armor 1.0/2.0 pieces with no stats, archetype, set or exotic perk – nothing useful to show.
      armor.push(o);
    }
    armor.sort((a, b) => a.n.localeCompare(b.n));

    /* ---------- Sets ---------- */
    const sets = {};
    for (const it of [...armor, ...weapons]) {
      if (!it.set || sets[it.set]) continue;
      const s = SET[it.set];
      if (!s) { delete it.set; continue; }
      sets[it.set] = { n: s.displayProperties.name, d: clean(s.displayProperties.description),
        p: (s.setPerks || []).map((p) => { const sp = SP[p.sandboxPerkHash]; return [p.requiredSetCount, sp ? sp.displayProperties.name : '', sp ? clean(sp.displayProperties.description) : '']; }) };
    }

    /* ---------- Stat groups (for perk / masterwork recompute) ---------- */
    const groups = {};
    for (const h of Object.keys(usedGroups)) {
      const g = SG[h];
      if (!g) continue;
      const o = {};
      for (const sc of g.scaledStats || []) {
        const n = statName(sc.statHash);
        if (!n) continue;
        o[n] = { m: sc.maximumValue, b: sc.displayAsNumeric ? 1 : 0, p: (sc.displayInterpolation || []).map((x) => [x.value, x.weight]) };
      }
      groups[h] = o;
    }

    /* ---------- Stats, elements ---------- */
    const stats = {};
    for (const n of [...WEAPON_STAT_ORDER, ...ARMOR_STATS]) {
      const d = Object.values(S).find((s) => s.displayProperties && s.displayProperties.name === n);
      if (d) stats[n] = { d: clean(d.displayProperties.description), bar: HIDDEN_BAR.has(n) ? 0 : 1 };
    }
    const elements = {};
    for (const d of Object.values(DMG)) {
      if (!d.displayProperties || !d.displayProperties.name || d.redacted) continue;
      elements[d.displayProperties.name] = { ic: d.displayProperties.icon || '', c: d.color ? `#${[d.color.red, d.color.green, d.color.blue].map((x) => x.toString(16).padStart(2, '0')).join('')}` : '' };
    }
    // Prune perks we did not keep.
    const outPerks = {};
    for (const [k, v] of Object.entries(perks)) if (v) outPerks[k] = v;

    return {
      meta: { v: opts.version || '', built: opts.built || new Date().toISOString(), counts: { weapons: weapons.length, armor: armor.length, perks: Object.keys(outPerks).length, sets: Object.keys(sets).length },
        statOrder: WEAPON_STAT_ORDER, armorStats: ARMOR_STATS, stats, elements, icon: 'https://www.bungie.net' },
      weapons, armor, perks: outPerks, sets, groups,
    };
  }

  /* Interpolate an investment value to a display value with a stat group entry ({m,p}). */
  function interp(value, g) {
    if (!g || !g.p || !g.p.length) return value;
    const pts = g.p, v = Math.min(value, g.m || value);
    if (v <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (v <= pts[i][0]) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        return Math.round(y0 + ((v - x0) * (y1 - y0)) / (x1 - x0));
      }
    }
    return pts[pts.length - 1][1];
  }

  const api = { build, interp, BUCKET, CLASS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RSD2Core = api;
})(typeof window !== 'undefined' ? window : globalThis);
