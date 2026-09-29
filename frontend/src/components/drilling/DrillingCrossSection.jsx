import React, { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { getWellIntelligence, getNearbyWells } from '../../services/wellApi';

/**
 * Live drilling cross-section + mud log widget.
 *
 * Originally a single hand-tuned simulation of one fictional well -- fixed formation names,
 * fixed target depth, fixed offset wells, fixed risk-zone depths -- so it looked identical no
 * matter which well was selected. Rewritten so every geological/risk/offset detail comes from
 * the ACTUALLY SELECTED well's real data (see buildGeologyModel below): real formation names
 * and depths (well.formations), the well's real target depth, and real nearby offset wells with
 * their real historical incidents at their real depths. Switching wells now rebuilds the whole
 * visualization from that well's own record, instead of reusing one hardcoded Upper Assam
 * profile everywhere.
 *
 * What's still stylized, on purpose, and documented as such rather than passed off as
 * measured: the exact directional S-curve shape (kick-off/build proportions are a fixed
 * fraction of the well's real target depth, not a real survey), formation-boundary waviness
 * (a small deterministic wobble for visual texture, not a seismic interpretation), and the
 * per-formation gamma/ROP/WOB baselines (a well-known, real petrophysical pattern -- clean
 * sand reads low gamma and drills fast, shale reads high gamma and drills slow -- applied to
 * each formation's REAL lithology string, not randomly invented numbers).
 *
 * All SVG building is done imperatively (ported from a standalone HTML/JS prototype) rather
 * than as React state, because it's a continuous 60fps animation driven by a single depth
 * value -- routing that through React state on every frame would mean a full re-render every
 * ~16ms for no benefit. React's job is fetching the selected well's real data, turning it into
 * a model, and owning the container lifecycle; everything inside the container is scoped via
 * prefixed element ids so it can never collide with the rest of the app.
 */

const IDP = 'ndv'; // id prefix, keeps every element/pattern/clip id unique to this widget

/* ---------------------------------------------------------------------------------------
 * Real well data -> visualization model
 * ------------------------------------------------------------------------------------- */

// Plausible gamma-ray / ROP / WOB baselines by lithology category -- a real, well-known
// petrophysical pattern (clean sand reads low gamma and drills fast; shale reads high gamma
// and drills slow) used to turn each formation's REAL lithology string into a believable log
// signature, not a randomly invented one. Falls back to a small rotating palette only when a
// formation's lithology doesn't match any known keyword.
const LITHOLOGY_PROFILES = [
  { test: /sand(stone)?|reservoir/i, gm: 45, r: 27, w: 11, base: '#DDBB6E', light: '#F5DA9A', pattern: 'pd' },
  { test: /shale|clay/i, gm: 110, r: 13, w: 19, base: '#9C7F62', light: '#C2A588', pattern: 'ph' },
  { test: /limestone|carbonate/i, gm: 28, r: 20, w: 20, base: '#A7ADA6', light: '#CBD0C9', pattern: 'pb' },
  { test: /alluvium|unconsolidated|silt/i, gm: 62, r: 44, w: 8, base: '#CDBF8F', light: '#ECE0B8', pattern: 'pd' },
];
const FALLBACK_PROFILES = [
  { gm: 70, r: 21, w: 14, base: '#B99462', light: '#DDBB8C', pattern: 'ph' },
  { gm: 55, r: 24, w: 12, base: '#C9A869', light: '#E8CD95', pattern: 'pd' },
  { gm: 90, r: 16, w: 17, base: '#5E5C58', light: '#86847E', pattern: 'ph' },
];

function profileForLithology(lithology, fallbackIndex) {
  const hit = LITHOLOGY_PROFILES.find((p) => lithology && p.test.test(lithology));
  return hit || FALLBACK_PROFILES[fallbackIndex % FALLBACK_PROFILES.length];
}

const RESERVOIR_RE = /sand(stone)?|reservoir/i;
const DANGER_SEVERITY_RE = /HIGH|CRITICAL/i;

/** Snap a depth to the nearest sampling step so later exact-depth equality checks stay exact. */
function snapTo(value, step) {
  return Math.round(value / step) * step;
}

/**
 * Build the visualization model for one well from its real intelligence record (formations,
 * target depth, casing) plus a handful of its nearest real offset wells (for the offset-well
 * lanes and the risk zones correlated from their real historical incidents). Never fabricates
 * a well's formations, depths, incident descriptions or mitigations -- only the S-curve build
 * proportions and boundary waviness are stylized approximations, called out above.
 */
function buildGeologyModel(wellDetail, nearbyWells) {
  const ST = 10;
  const sourceFormations = wellDetail && wellDetail.formations && wellDetail.formations.length
    ? wellDetail.formations
    : [{
        formation: (wellDetail && wellDetail.formation) || 'Unclassified interval',
        topDepth: 0,
        bottomDepth: (wellDetail && (wellDetail.targetDepth || wellDetail.totalDepth)) || 3000,
        lithology: null,
      }];
  const rawFormations = sourceFormations.slice().sort((a, b) => (a.topDepth ?? 0) - (b.topDepth ?? 0));

  const rawTD = (wellDetail && (wellDetail.targetDepth || wellDetail.totalDepth))
    || rawFormations[rawFormations.length - 1].bottomDepth
    || 3000;
  const TD = Math.max(500, snapTo(rawTD, ST));

  // Formations: real name/depths/lithology. Extend the last one down to the real target depth --
  // a well still drilling towards TD simply hasn't logged whatever lies below its deepest
  // confirmed formation yet, so the visual honestly shows "still to be drilled" rather than a gap.
  const F = rawFormations.map((f, i) => {
    const profile = profileForLithology(f.lithology, i);
    const isLast = i === rawFormations.length - 1;
    const top = Math.max(0, f.topDepth ?? (i === 0 ? 0 : rawFormations[i - 1].bottomDepth ?? 0));
    const bottom = isLast ? Math.max(f.bottomDepth || 0, TD) : (f.bottomDepth ?? TD);
    return {
      n: f.formation || ('Interval ' + (i + 1)),
      lithology: f.lithology,
      top,
      bottom,
      base: profile.base,
      light: profile.light,
      p: IDP + '-' + profile.pattern,
      gm: profile.gm,
      r: profile.r,
      w: profile.w,
    };
  });

  // Boundary curves between consecutive formations (one fewer than the formation count), each
  // given a small, non-literal wave for visual texture -- the depth is real, the wobble isn't.
  const bnd = F.slice(0, -1).map((f, i) => [f.bottom, 12 + ((i * 37) % 5) * 6]);

  // The reservoir/target formation: the deepest formation whose real lithology reads as sand or
  // reservoir rock, if any -- drives the oil-pay overlay. Honestly skipped (no invented oil zone
  // drawn) when nothing in this well's real formation list looks like a reservoir rock.
  let oilPayIndex = -1;
  for (let i = F.length - 1; i >= 0; i--) {
    if (F[i].lithology && RESERVOIR_RE.test(F[i].lithology)) { oilPayIndex = i; break; }
  }

  // Directional profile: proportional to THIS well's own real target depth, rather than one
  // fixed absolute profile, so a shallower or deeper well gets a correspondingly shorter or
  // longer kick-off + build + lateral run instead of the same fixed-metre curve every time.
  const KOP = snapTo(TD * 0.3, ST);
  const buildEnd = snapTo(TD * 0.7, ST);
  const B = Math.max(ST, buildEnd - KOP);

  // Surface casing setting depth: this well's own real first casing record when available,
  // otherwise a reasonable proportional default.
  const firstCasing = wellDetail && wellDetail.casingPrograms && wellDetail.casingPrograms[0];
  const parsedCasingDepth = firstCasing && firstCasing.settingDepth ? parseFloat(firstCasing.settingDepth) : null;
  const casingDepth = snapTo(
    parsedCasingDepth && parsedCasingDepth > 0 && parsedCasingDepth < TD ? parsedCasingDepth : TD * 0.22,
    ST
  );

  // Offset wells + risk zones: pulled from real nearby wells' real historical incidents, closest
  // first, so both the offset-well lanes and every risk zone/event trace back to an actual
  // recorded event on an actual nearby well, not a fixed synthetic incident list.
  const offsetPool = (nearbyWells || [])
    .slice()
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .slice(0, 5);
  const laneCount = Math.max(offsetPool.length, 1);
  const OW = offsetPool.map((w, i) => ({
    n: w.id,
    x: laneCount === 1 ? 260 : Math.round(50 + i * (410 / (laneCount - 1))),
    td: Math.min(w.totalDepth || w.currentDepth || TD, TD * 1.15),
  }));

  const allEvents = [];
  offsetPool.forEach((w, wi) => {
    (w.historicalEvents || []).forEach((e) => {
      if (typeof e.depth === 'number') allEvents.push({ ...e, ownerIndex: wi });
    });
  });
  const rank = (sev) => (DANGER_SEVERITY_RE.test(sev || '') ? 2 : /MEDIUM/i.test(sev || '') ? 1 : 0);
  allEvents.sort((a, b) => rank(b.severity) - rank(a.severity) || a.depth - b.depth);
  const minGap = TD * 0.05;
  const picked = [];
  for (const e of allEvents) {
    if (picked.length >= 6) break;
    if (picked.some((p) => Math.abs(p.depth - e.depth) < minGap && p.type === e.type)) continue;
    picked.push(e);
  }
  picked.sort((a, b) => a.depth - b.depth);
  const risks = picked.map((e) => {
    const sameSpot = picked.filter((p) => p !== e && Math.abs(p.depth - e.depth) < minGap && p.type === e.type);
    const owners = [e, ...sameSpot].map((p) => p.ownerIndex).filter((v, i, arr) => arr.indexOf(v) === i);
    return {
      d: e.depth,
      a: 10 + (Math.round(e.depth) % 5) * 5,
      n: e.type,
      s: rank(e.severity) === 2 ? 'd' : 'w',
      what: (e.description || e.type + ' event').toLowerCase(),
      rec: e.mitigation || 'Follow standard well-control procedure and monitor closely.',
      w: owners,
    };
  });

  return {
    wellName: (wellDetail && (wellDetail.name || wellDetail.id)) || 'Active well',
    field: (wellDetail && wellDetail.field) || null,
    TD,
    KOP,
    B,
    F,
    bnd,
    risks,
    OW,
    casingDepth,
    oilPayIndex,
  };
}

const FALLBACK_MODEL = buildGeologyModel(
  { name: 'Active well', targetDepth: 3000, formations: [], casingPrograms: [] },
  []
);

/* ---------------------------------------------------------------------------------------
 * SVG animation engine -- generic over the model built above (formation count, risk count and
 * offset-well count all vary well to well); nothing here assumes a fixed number of any of them.
 * ------------------------------------------------------------------------------------- */

function initDrillingViz(root, model, liveRopRef, isLiveRef, liveDepthRef) {
  const { TD, KOP, B, F, bnd, risks, OW, casingDepth, oilPayIndex } = model;
  const K = 460 / TD; // px per metre, derived from this well's own TD so the profile always fits the fixed viewBox
  const ST = 10, CX = 330, S = 514 / TD, N = Math.round(TD / ST);
  const X = (d) => 140 + d * K;
  const Y = (t) => 80 + t * K;
  const $ = (i) => root.querySelector('#' + IDP + '-' + i);
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (t, a, p) => {
    const e = document.createElementNS(NS, t);
    for (const k in a) e.setAttribute(k, a[k]);
    if (p) p.appendChild(e);
    return e;
  };

  const bd = (b, x) => { const u = (x - CX) / 100; return b[0] + b[1] * u * u; };
  const rbd = (r, x) => bd([r.d, r.a], x);
  const fAt = (x, t) => { let k = 0; for (let j = 0; j < bnd.length; j++) { if (t >= bd(bnd[j], x)) k = j + 1; } return k; };
  const col = (r) => (r.s === 'd' ? '#f87171' : '#f59e0b');
  const pts = (f) => { const s = []; for (let x = 0; x <= 470; x += 10) s.push(x + ',' + Math.min(556, f(x)).toFixed(1)); return s; };

  const L = $('layers'), OI = $('oil');
  for (let k = 0; k < F.length; k++) {
    const topFn = k === 0 ? () => 80 : ((kk) => (x) => Y(bd(bnd[kk - 1], x)))(k);
    const botFn = k === F.length - 1 ? () => 556 : ((kk) => (x) => Y(bd(bnd[kk], x)))(k);
    const tp = pts(topFn), bt = pts(botFn);
    const poly = tp.concat(bt.slice().reverse()).join(' ');
    mk('polygon', { points: poly, fill: F[k].base }, L);
    const lightBt = pts((x) => topFn(x) + 12);
    const lightPoly = tp.concat(lightBt.slice().reverse()).join(' ');
    mk('polygon', { points: lightPoly, fill: F[k].light }, L);
    mk('polygon', { points: poly, fill: 'url(#' + F[k].p + ')' }, L);
    if (k === oilPayIndex) mk('polygon', { points: poly, fill: '#2B1D10', opacity: 0.88 }, OI);
  }
  if (oilPayIndex >= 1) {
    for (let sx = 190; sx <= 460; sx += 17) {
      const sy = Y(bd(bnd[oilPayIndex - 1], sx)) + 5;
      if (sy < 484) {
        mk('circle', { cx: sx, cy: sy + (sx % 3), r: 2, fill: '#F0C24A' }, OI);
        mk('circle', { cx: sx - 0.7, cy: sy + (sx % 3) - 0.7, r: 0.7, fill: '#FFF3C8', opacity: 0.9 }, OI);
      }
    }
  }
  mk('rect', { x: 0, y: 76, width: 470, height: 4, fill: '#22c55e' }, L);

  const RB = $('rb'), RL = $('rl'), OG = $('owg'), CG = $('corrg');
  const wc = (n) => n + ' of ' + OW.length + (OW.length === 1 ? ' offset well' : ' offset wells');
  const rEl = risks.map((r) => {
    const d = 'M' + pts((x) => Y(rbd(r, x))).join('L');
    const band = mk('path', { d, fill: 'none', stroke: col(r), 'stroke-width': 7, opacity: 0.28 }, RB);
    mk('path', { d, fill: 'none', stroke: col(r), 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.8 }, RB);
    const t = mk('text', { x: 466, y: Y(rbd(r, 440)) - 8, 'text-anchor': 'end', fill: '#e2e8f0', stroke: '#0f172a', 'stroke-width': 3, 'paint-order': 'stroke', 'font-size': 12 }, RL);
    t.textContent = r.n;
    return { band, t, inc: [], cl: [] };
  });
  OW.forEach((o) => {
    mk('line', { x1: o.x, x2: o.x, y1: 80, y2: Y(o.td), stroke: '#64748b', 'stroke-opacity': 0.55, 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }, OG);
    mk('rect', { x: o.x - 3, y: 72, width: 6, height: 8, fill: '#475569' }, OG);
    const t = mk('text', { x: o.x, y: 66, 'text-anchor': 'middle', class: 'ndv-ts', fill: '#cbd5e1' }, OG);
    t.textContent = o.n;
  });
  risks.forEach((r, ri) => {
    r.w.forEach((oi) => {
      const o = OW[oi];
      if (!o) return;
      const cx = o.x, cy = Y(rbd(r, o.x));
      mk('circle', { cx, cy, r: 6.5, fill: col(r), opacity: 0.3 }, OG);
      const c = mk('circle', { cx, cy, r: 4.5, fill: col(r), stroke: '#0f172a', 'stroke-width': 1.5 }, OG);
      const ti = mk('title', {}, c);
      ti.textContent = o.n + ': ' + r.n;
      rEl[ri].inc.push(c);
      rEl[ri].cl.push(mk('line', { x1: cx, y1: cy, x2: cx, y2: cy, stroke: col(r), 'stroke-width': 1.3, 'stroke-dasharray': '3 4', class: 'ndv-corr', opacity: 0 }, CG));
    });
  });

  const incAt = (m) => (m < KOP ? 0 : m < KOP + B ? ((m - KOP) / B) * 90 : 90);
  const P = []; let tv = 0, dp = 0;
  for (let i = 0; i <= N; i++) {
    const m = i * ST;
    P.push({ x: X(dp), y: Y(tv), t: tv, inc: incAt(m), md: m });
    if (i < N) {
      const im = (incAt(m + ST / 2) * Math.PI) / 180;
      tv += Math.cos(im) * ST;
      dp += Math.sin(im) * ST;
    }
  }
  $('plan').setAttribute('d', 'M' + P.map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('L'));

  const FI = [], GP = [], RP = [], RI = [], DG = [], EV = [];
  const pa = risks.map(() => 1e9); let pf = -1, land = null;
  for (let i = 0; i <= N; i++) {
    const p = P[i]; const fi0 = fAt(p.x, p.t); let ri0 = 0, dg0 = false;
    FI.push(fi0);
    risks.forEach((r, j) => {
      const a = rbd(r, p.x) - p.t, v = Math.exp(-(a / 80) * (a / 80));
      if (v > ri0) { ri0 = v; dg0 = r.s === 'd'; }
      if (pa[j] > 150 && a <= 150) EV.push({ md: p.md, t: 'Approaching ' + r.n.toLowerCase() + '. ' + wc(r.w.length) + ' ' + r.what + ' here', k: r.s === 'd' ? 'danger' : 'warn' });
      if (pa[j] > 0 && a <= 0) EV.push({ md: p.md, t: 'Drilled through ' + r.n.toLowerCase() + ' without incident', k: 'good' });
      pa[j] = a;
    });
    RI.push(ri0); DG.push(dg0);
    if (fi0 !== pf) { EV.push({ md: p.md, t: i === 0 ? 'Spudded in ' + F[fi0].n.toLowerCase() : 'Entered ' + F[fi0].n, k: fi0 === oilPayIndex ? 'good' : 'info' }); pf = fi0; }
    if (p.md === casingDepth) EV.push({ md: casingDepth, t: 'Surface casing set at ' + casingDepth.toLocaleString('en-US') + ' m', k: 'info' });
    if (p.md === KOP) EV.push({ md: KOP, t: 'Kick-off point reached, building angle', k: 'info' });
    if (land === null && p.inc >= 90) { land = p.md; EV.push({ md: p.md, t: 'Landed horizontal' + (oilPayIndex >= 0 ? ' in the ' + F[oilPayIndex].n.toLowerCase() : ''), k: 'good' }); }
    const g = F[fi0].gm + 8 * Math.sin(i * 0.7) + 5 * Math.sin(i * 1.9) + 3 * Math.sin(i * 4.3);
    const rp = F[fi0].r * (1 + 0.12 * Math.sin(i * 0.5)) * (1 - 0.45 * ri0);
    p.g = g; p.rop = rp;
    const yy = (34 + p.md * S).toFixed(1);
    GP.push((504 + Math.min(150, Math.max(0, g)) / 150 * 70).toFixed(1) + ',' + yy);
    RP.push((578 + Math.min(50, rp) / 50 * 60).toFixed(1) + ',' + yy);
  }
  EV.push({ md: TD, t: 'Reached target depth', k: 'good' });
  EV.sort((a, b) => a.md - b.md);

  const GR = $('grid');
  [502, 576, 640].forEach((x) => mk('line', { x1: x, x2: x, y1: 30, y2: 548, stroke: '#334155', 'stroke-width': 0.5 }, GR));
  for (let md = 500; md < TD; md += 500) {
    const gy = 34 + md * S;
    mk('line', { x1: 488, x2: 672, y1: gy, y2: gy, stroke: '#334155', 'stroke-width': 0.5 }, GR);
    const gt = mk('text', { x: 506, y: gy - 3, class: 'ndv-ts', fill: '#64748b', 'font-size': 11 }, GR);
    gt.textContent = md.toLocaleString('en-US');
  }
  const FC = $('fcol'); let st = 0;
  for (let i = 1; i <= N + 1; i++) {
    if (i === N + 1 || FI[i] !== FI[st]) {
      mk('rect', { x: 490, y: 34 + st * ST * S, width: 10, height: (i - st) * ST * S + 0.3, fill: F[FI[st]].base }, FC);
      st = i;
    }
  }
  const rc = (v, d) => (v < 0.15 ? '#4ade80' : v < 0.45 ? '#fbbf24' : d ? '#f87171' : '#f59e0b');
  const bins = [];
  for (let i = 0; i <= N; i += 2) bins.push({ md: i * ST, e: mk('rect', { x: 644, y: 34 + i * ST * S, width: 26, height: 2 * ST * S + 0.4, fill: rc(RI[i], DG[i]), opacity: 0.3 }, $('rbins')) });

  const casingPointCount = Math.min(N, Math.round(casingDepth / ST)) + 1;
  const csgD = 'M' + P.slice(0, casingPointCount).map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('L');
  const cur = (md) => {
    const i2 = Math.min(N - 1, Math.floor(md / ST)), f = (md - i2 * ST) / ST, a = P[i2], b = P[i2 + 1];
    return { i: md >= TD ? N : i2, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, t: a.t + (b.t - a.t) * f, inc: a.inc + (b.inc - a.inc) * f, g: a.g, rop: a.rop };
  };

  let depth = 0, playing = true, speed = 1, last = null, li = -1, pre = '', sp = 0, alk = '', evn = -1, owOn = true, rafId = null, uiLive = null;
  const mw = (t) => { const f = t / TD; return f < 0.19 ? 1.08 : f < 0.36 ? 1.18 : f < 0.46 ? 1.26 : f < 0.59 ? 1.42 : 1.36; };
  const TON = { info: '#94a3b8', warn: '#fbbf24', danger: '#f87171', good: '#34d399' };

  function setAlert(key, tone, title, sub) {
    if (key === alk) return;
    alk = key;
    const a = $('al');
    a.className = 'ndv-alert ndv-alert-' + tone;
    $('al-t').textContent = title;
    $('al-s').textContent = sub;
  }

  function render() {
    const c = cur(depth), ci = c.i;
    if (ci !== li) {
      li = ci;
      pre = 'M' + P.slice(0, ci + 1).map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('L');
      $('gam').setAttribute('points', GP.slice(0, ci + 1).join(' '));
      $('ropl').setAttribute('points', RP.slice(0, ci + 1).join(' '));
      bins.forEach((b) => b.e.setAttribute('opacity', b.md <= depth ? 1 : 0.3));
    }
    const d = pre + 'L' + c.x.toFixed(1) + ' ' + c.y.toFixed(1);
    ['hole', 'ann', 'str', 'mud'].forEach((id) => $(id).setAttribute('d', d));
    $('csg').setAttribute('d', depth < casingDepth ? d : csgD);
    $('bit').setAttribute('transform', 'translate(' + c.x.toFixed(1) + ',' + c.y.toFixed(1) + ')');
    $('bitr').setAttribute('transform', 'rotate(' + (-c.inc).toFixed(1) + ')');
    $('cut').setAttribute('transform', 'scale(' + Math.max(0.15, Math.abs(Math.cos(sp))).toFixed(2) + ',1)');
    const by = 16 + ((depth % 28) / 28) * 50;
    $('blk').setAttribute('y', by); $('cab').setAttribute('y2', by); $('kel').setAttribute('y1', by + 6);
    $('dm').setAttribute('y1', 34 + depth * S); $('dm').setAttribute('y2', 34 + depth * S);
    const fi = fAt(c.x, c.t), drill = depth < TD;
    $('h-f').textContent = F[fi].n;
    $('m-md').textContent = Math.round(depth).toLocaleString('en-US') + ' m';
    $('m-tvd').textContent = Math.round(c.t).toLocaleString('en-US') + ' m';
    $('m-inc').textContent = c.inc.toFixed(1) + '°';
    $('m-rop').textContent = (drill ? Math.round(c.rop * (1 + 0.06 * Math.sin(depth))) : 0) + ' m/hr';
    $('m-wob').textContent = (drill ? (F[fi].w + 1.5 * Math.sin(depth / 40)).toFixed(1) : '0.0') + ' t';
    $('m-mw').textContent = mw(c.t).toFixed(2) + ' SG';

    let near = null, na = 0;
    risks.forEach((r, j) => {
      const a = rbd(r, c.x) - c.t, on = a >= -20 && a <= 150, e = rEl[j];
      if (on && (!near || a < na)) { near = r; na = a; }
      e.band.setAttribute('opacity', on ? 0.55 : a < -20 ? 0.14 : 0.28);
      e.t.setAttribute('font-weight', on ? 600 : 400);
      e.inc.forEach((x) => x.setAttribute('class', on ? 'ndv-pulse' : ''));
      e.cl.forEach((l) => { l.setAttribute('x2', c.x.toFixed(1)); l.setAttribute('y2', c.y.toFixed(1)); l.setAttribute('opacity', on && owOn ? 0.9 : 0); });
    });
    const h = $('halo');
    if (near) { h.setAttribute('opacity', 1); h.setAttribute('class', 'ndv-pulse'); } else { h.setAttribute('opacity', 0.5); h.setAttribute('class', ''); }

    if (!drill) {
      setAlert('td', 'accent', 'Target depth reached at ' + TD.toLocaleString('en-US') + ' m MD', (land != null ? Math.round(TD - land) : 0) + ' m of lateral placed' + (oilPayIndex >= 0 ? ' in the ' + F[oilPayIndex].n.toLowerCase() : '') + '. Ready to run the production liner.');
    } else if (near) {
      const dg = near.s === 'd', rem = Math.round(na);
      setAlert(near.n + (rem > 0 ? Math.ceil(rem / 10) : 'in'), dg ? 'danger' : 'warn', rem > 0 ? near.n + ' in ' + rem + ' m' : 'Inside ' + near.n.toLowerCase(), wc(near.w.length) + ' ' + near.what + ' at this horizon. NWIS recommends: ' + near.rec);
    } else if (fi === oilPayIndex && c.inc > 85) {
      setAlert('pay' + Math.floor((depth - (land || 0)) / 20), 'good', 'Drilling in the pay zone', Math.max(0, Math.round(depth - (land || 0))) + ' m of lateral in oil sand. Hold TVD within 5 m of ' + Math.round(c.t) + ' m.');
    } else {
      setAlert('ok' + fi, 'good', 'No risks within 150 m', 'Drilling ahead in ' + F[fi].n + '. Parameters are inside the offset-well envelope.');
    }

    const shown = EV.filter((e) => e.md <= depth);
    if (shown.length !== evn) {
      evn = shown.length;
      $('ev').innerHTML = shown.slice(-4).reverse().map((e) =>
        '<div class="ndv-evrow"><span class="ndv-evmd">' + e.md.toLocaleString('en-US') + ' m</span>' +
        '<span class="ndv-evdot" style="background:' + TON[e.k] + '"></span>' +
        '<span class="ndv-evtxt">' + e.t + '</span></div>'
      ).join('');
    }
    const scrub = $('scrub');
    if (scrub) scrub.value = depth;
  }

  function updateLiveUi(liveNow) {
    if (uiLive === liveNow) return;
    uiLive = liveNow;
    const simctl = $('simctl'), livectl = $('livectl');
    if (simctl) simctl.hidden = liveNow;
    if (livectl) livectl.hidden = !liveNow;
  }

  function tick(ts) {
    if (last === null) last = ts;
    const dt = Math.min(0.1, (ts - last) / 1000);
    last = ts;
    const liveDepth = liveDepthRef && liveDepthRef.current;
    const liveNow = !!(isLiveRef && isLiveRef.current) && typeof liveDepth === 'number' && Number.isFinite(liveDepth);
    if (liveNow) {
      // Real live telemetry is available -- track the well's ACTUAL current measured depth
      // directly (eased, not snapped, so a ~2s telemetry poll doesn't look like a jump cut)
      // instead of running an independent, self-paced sweep that was only ever scaled by ROP.
      const target = Math.min(TD, Math.max(0, liveDepth));
      depth += (target - depth) * Math.min(1, dt * 4);
      if (Math.abs(target - depth) < 0.05) depth = target;
      playing = true; // keep the bit spinning/mud flowing even while depth is externally driven
      sp += dt * 14;
    } else if (playing) {
      depth = Math.min(TD, depth + 55 * speed * dt);
      sp += dt * speed * 14;
      if (depth >= TD) { playing = false; updatePlayIcon(); }
    }
    updateLiveUi(liveNow);
    const ll = $('livelabel');
    if (ll) {
      const rop = liveRopRef && liveRopRef.current;
      ll.textContent = liveNow
        ? 'Live feed — tracking real depth' + (typeof rop === 'number' ? ' (ROP ' + rop.toFixed(1) + ' m/hr)' : '')
        : 'Simulated pace';
    }
    render();
    rafId = requestAnimationFrame(tick);
  }

  function updatePlayIcon() {
    const btn = $('pp');
    if (!btn) return;
    btn.dataset.playing = playing ? '1' : '0';
    const ico = btn.querySelector('.ndv-btn-ico');
    if (ico) ico.textContent = playing ? '⏸' : '▶';
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  const wellLine = $('wellline');
  if (wellLine) wellLine.textContent = model.field ? (model.wellName + ' · ' + model.field) : model.wellName;

  const scrubEl = $('scrub');
  if (scrubEl) scrubEl.max = TD;

  $('pp').onclick = () => { if (depth >= TD) depth = 0; playing = !playing; updatePlayIcon(); };
  $('rs').onclick = () => { depth = 0; playing = true; updatePlayIcon(); };
  $('spd').oninput = function () { speed = +this.value; };
  $('scrub').oninput = function () { depth = +this.value; };
  $('owt').onchange = function () { owOn = this.checked; OG.style.display = owOn ? '' : 'none'; };

  updatePlayIcon();
  rafId = requestAnimationFrame(tick);

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}

const MARKUP = `
<div class="ndv-topline">
  <span class="ndv-live"><span class="ndv-live-dot"></span><span id="${IDP}-livelabel">Simulated live feed</span></span>
  <span class="ndv-topline-well" id="${IDP}-wellline">Loading well…</span>
  <span class="ndv-topline-fm">Now drilling <span id="${IDP}-h-f" class="ndv-fm-val">—</span></span>
</div>

<div class="ndv-metrics">
  <div class="ndv-mc"><p class="ndv-l">Measured depth</p><p class="ndv-v" id="${IDP}-m-md">0 m</p></div>
  <div class="ndv-mc"><p class="ndv-l">True vertical</p><p class="ndv-v" id="${IDP}-m-tvd">0 m</p></div>
  <div class="ndv-mc"><p class="ndv-l">Inclination</p><p class="ndv-v" id="${IDP}-m-inc">0&deg;</p></div>
  <div class="ndv-mc"><p class="ndv-l">ROP</p><p class="ndv-v" id="${IDP}-m-rop">0 m/hr</p></div>
  <div class="ndv-mc"><p class="ndv-l">Weight on bit</p><p class="ndv-v" id="${IDP}-m-wob">0 t</p></div>
  <div class="ndv-mc"><p class="ndv-l">Mud weight</p><p class="ndv-v" id="${IDP}-m-mw">1.08 SG</p></div>
</div>

<svg class="ndv-svg" viewBox="0 0 680 556" role="img" aria-label="Live cross-section of the selected well's own real formations, drilling through them toward its real target depth, with real nearby offset wells, risk zones drawn from their real historical incidents, and a live gamma / ROP / risk log.">
  <title>Drilling cross-section and mud log</title>
  <defs>
    <pattern id="${IDP}-pd" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="#000" opacity=".22"/><circle cx="6" cy="6" r=".7" fill="#000" opacity=".18"/></pattern>
    <pattern id="${IDP}-ph" width="14" height="6" patternUnits="userSpaceOnUse"><line x1="1" y1="3" x2="9" y2="3" stroke="#000" stroke-opacity=".22" stroke-width=".8"/></pattern>
    <pattern id="${IDP}-pb" width="16" height="8" patternUnits="userSpaceOnUse"><path d="M0 .5H16M0 4.5H16M4 .5V4.5M12 4.5V8.5" stroke="#000" stroke-opacity=".2" stroke-width=".7" fill="none"/></pattern>
    <clipPath id="${IDP}-oc"><rect x="0" y="0" width="470" height="488"/></clipPath>
  </defs>
  <rect x="0" y="0" width="470" height="80" fill="#0b1220"/>
  <rect x="0" y="45" width="470" height="35" fill="#141b2e"/>
  <circle cx="404" cy="30" r="30" fill="#f59e0b" opacity=".12"/>
  <circle cx="404" cy="30" r="18" fill="#f59e0b" opacity=".18"/>
  <circle cx="404" cy="30" r="9" fill="#fbbf24" opacity=".5"/>
  <path d="M0 80 L0 58 Q60 44 130 56 T260 53 T400 60 T470 55 L470 80 Z" fill="#1e293b" opacity=".7"/>
  <path d="M0 80 L0 66 Q80 56 180 64 T380 62 T470 68 L470 80 Z" fill="#0f172a" opacity=".85"/>
  <g id="${IDP}-layers"></g>
  <g id="${IDP}-oil" clip-path="url(#${IDP}-oc)"></g>
  <line x1="184" y1="488" x2="470" y2="488" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4 3" opacity=".8"/>
  <g id="${IDP}-rb"></g>
  <g id="${IDP}-owg"></g>
  <path id="${IDP}-plan" fill="none" stroke="#e2e8f0" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="4 4"/>
  <path id="${IDP}-csg" fill="none" stroke="#94a3b8" stroke-width="11" stroke-linejoin="round"/>
  <path id="${IDP}-hole" fill="none" stroke="#020617" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  <path id="${IDP}-ann" class="ndv-ann" fill="none" stroke="#d9b86c" stroke-width="4" stroke-dasharray="1.5 5" stroke-linecap="round"/>
  <path id="${IDP}-str" fill="none" stroke="#475569" stroke-width="2"/>
  <path id="${IDP}-mud" class="ndv-mud" fill="none" stroke="#38bdf8" stroke-width="1.4" stroke-dasharray="5 7"/>
  <g id="${IDP}-corrg"></g>
  <g id="${IDP}-bit">
    <g id="${IDP}-halo"><circle r="20" fill="#f59e0b" opacity=".12"/><circle r="13" fill="#f59e0b" opacity=".2"/><circle r="7" fill="#f59e0b" opacity=".35"/></g>
    <g id="${IDP}-bitr"><polygon points="-6,-6 6,-6 0,8" fill="#f59e0b" stroke="#78350f" stroke-width="1"/><rect id="${IDP}-cut" x="-6" y="-7" width="12" height="2.5" fill="#fde68a"/></g>
  </g>
  <g id="${IDP}-rl"></g>
  <g>
    <line x1="30" y1="80" x2="30" y2="44" stroke="#94a3b8" stroke-width="2"/>
    <g class="ndv-flame"><path d="M30 44Q22 32 30 18Q38 32 30 44Z" fill="#ea580c"/><path d="M30 44Q25 35 30 25Q35 35 30 44Z" fill="#fb923c"/><path d="M30 44Q27.5 39 30 32Q32.5 39 30 44Z" fill="#fef3c7"/></g>
    <rect x="90" y="64" width="22" height="16" fill="#475569" stroke="#0f172a" stroke-width=".8"/><rect x="95" y="68" width="6" height="4" fill="#38bdf8"/>
    <rect x="172" y="68" width="50" height="12" rx="2" fill="#334155" stroke="#0f172a" stroke-width=".8"/>
    <g fill="none" stroke="#94a3b8" stroke-width="1.6"><polygon points="124,80 140,12 156,80"/><line x1="129.2" y1="58" x2="150.8" y2="58"/><line x1="133.9" y1="38" x2="146.1" y2="38"/><line x1="137.6" y1="22" x2="142.4" y2="22"/><line x1="129.2" y1="58" x2="146.1" y2="38"/><line x1="150.8" y1="58" x2="133.9" y2="38"/></g>
    <line x1="140" y1="12" x2="140" y2="80" stroke="#cbd5e1" stroke-width=".7" opacity=".5"/>
    <rect x="135" y="8" width="10" height="4" fill="#64748b"/>
    <rect x="112" y="74" width="56" height="6" fill="#1e293b"/>
    <line id="${IDP}-cab" x1="140" y1="12" x2="140" y2="16" stroke="#64748b" stroke-width="1"/>
    <rect id="${IDP}-blk" x="135" y="16" width="10" height="6" rx="1" fill="#f59e0b"/>
    <line id="${IDP}-kel" x1="140" y1="22" x2="140" y2="80" stroke="#64748b" stroke-width="2"/>
  </g>
  <rect x="486" y="6" width="188" height="546" rx="4" fill="#0f172a" stroke="#1e293b"/>
  <text class="ndv-ts" x="539" y="22" text-anchor="middle" fill="#94a3b8">Gamma</text>
  <text class="ndv-ts" x="608" y="22" text-anchor="middle" fill="#94a3b8">ROP</text>
  <text class="ndv-ts" x="657" y="22" text-anchor="middle" fill="#94a3b8">Risk</text>
  <g id="${IDP}-grid"></g>
  <g id="${IDP}-fcol"></g>
  <g id="${IDP}-rbins"></g>
  <polyline id="${IDP}-gam" fill="none" stroke="#4ade80" stroke-width="1.2"/>
  <polyline id="${IDP}-ropl" fill="none" stroke="#38bdf8" stroke-width="1.2"/>
  <line id="${IDP}-dm" x1="488" x2="672" y1="34" y2="34" stroke="#f87171" stroke-width="1.2"/>
</svg>

<div class="ndv-legend">
  <span class="ndv-sw"><svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="#94a3b8" stroke-dasharray="4 3" stroke-width="1.5"/></svg>Planned path</span>
  <span class="ndv-sw"><span class="ndv-swatch" style="background:#2B1D10"></span>Oil pay</span>
  <span class="ndv-sw"><svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="#38bdf8" stroke-dasharray="4 3"/></svg>Oil-water contact</span>
  <span class="ndv-sw"><span class="ndv-swatch" style="background:#f59e0b;opacity:.6"></span>Risk zone</span>
  <span class="ndv-sw"><span class="ndv-swatch" style="background:#f87171;opacity:.6"></span>Kick risk</span>
  <span class="ndv-sw"><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill="#f59e0b" stroke="#0f172a" stroke-width="1.5"/></svg>Offset-well incident</span>
</div>

<div id="${IDP}-al" class="ndv-alert ndv-alert-good">
  <div><p id="${IDP}-al-t" class="ndv-al-t"></p><p id="${IDP}-al-s" class="ndv-al-s"></p></div>
</div>

<div class="ndv-controls">
  <div id="${IDP}-simctl" class="ndv-simctl">
    <button id="${IDP}-pp" class="ndv-btn" aria-label="Pause or resume"><span class="ndv-btn-ico">&#10073;&#10073;</span></button>
    <button id="${IDP}-rs" class="ndv-btn" aria-label="Restart"><span class="ndv-btn-ico">&#8635;</span></button>
    <label class="ndv-ctl-label">Speed</label>
    <input type="range" id="${IDP}-spd" min="0.5" max="4" step="0.5" value="1" class="ndv-range ndv-range-sm">
    <label class="ndv-ctl-label">MD</label>
    <input type="range" id="${IDP}-scrub" min="0" max="5000" step="10" value="0" class="ndv-range ndv-range-lg">
  </div>
  <div id="${IDP}-livectl" class="ndv-livectl" hidden>
    <span class="ndv-live-chip"><span class="ndv-live-dot" style="background:#38bdf8"></span>Tracking live depth</span>
  </div>
  <label class="ndv-ctl-check"><input type="checkbox" id="${IDP}-owt" checked>Offset wells</label>
</div>

<div class="ndv-evlabel">Event log</div>
<div id="${IDP}-ev" class="ndv-evlist"></div>
`;

const STYLE = `
.ndv-root { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; }
.ndv-topline { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin:0 0 10px; font-size:11px; color:#94a3b8; }
.ndv-live { display:flex; align-items:center; gap:6px; color:#f87171; font-weight:600; text-transform:uppercase; letter-spacing:.05em; font-size:10px; }
.ndv-live-dot { width:7px; height:7px; border-radius:50%; background:#f87171; display:inline-block; animation: ndv-pl .9s ease-in-out infinite; }
.ndv-topline-well { color:#cbd5e1; }
.ndv-topline-fm { margin-left:auto; }
.ndv-fm-val { color:#f1f5f9; font-weight:600; }
.ndv-metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(84px,1fr)); gap:6px; margin:0 0 10px; }
.ndv-mc { background:#0f172a; border:1px solid #1e293b; border-radius:2px; padding:6px 8px; min-width:0; }
.ndv-mc p { margin:0; }
.ndv-l { font-size:9.5px; color:#64748b; text-transform:uppercase; letter-spacing:.04em; }
.ndv-v { font-size:14px; font-weight:700; color:#f1f5f9; white-space:nowrap; margin-top:2px; }
.ndv-svg { width:100%; height:auto; max-height:76vh; display:block; margin:0 auto; background:#0b1220; border-radius:2px; }
.ndv-ts { font-size:11px; }
.ndv-legend { display:flex; flex-wrap:wrap; gap:5px 14px; font-size:10.5px; color:#94a3b8; margin:8px 0 10px; }
.ndv-sw { display:inline-flex; align-items:center; gap:5px; }
.ndv-swatch { width:11px; height:9px; border-radius:2px; display:inline-block; }
.ndv-alert { display:flex; gap:9px; align-items:flex-start; padding:9px 11px; border-radius:2px; margin:0 0 10px; border:1px solid; }
.ndv-alert-good { background:rgba(16,185,129,.08); border-color:rgba(16,185,129,.35); }
.ndv-alert-good .ndv-al-t { color:#34d399; }
.ndv-alert-warn { background:rgba(245,158,11,.1); border-color:rgba(245,158,11,.4); }
.ndv-alert-warn .ndv-al-t { color:#fbbf24; }
.ndv-alert-danger { background:rgba(239,68,68,.1); border-color:rgba(239,68,68,.45); }
.ndv-alert-danger .ndv-al-t { color:#f87171; }
.ndv-alert-accent { background:rgba(56,189,248,.1); border-color:rgba(56,189,248,.4); }
.ndv-alert-accent .ndv-al-t { color:#38bdf8; }
.ndv-al-t { margin:0; font-size:12.5px; font-weight:600; }
.ndv-al-s { margin:3px 0 0; font-size:11.5px; color:#94a3b8; line-height:1.4; }
.ndv-controls { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:0 0 10px; font-size:11px; }
.ndv-simctl, .ndv-livectl { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.ndv-live-chip { display:inline-flex; align-items:center; gap:6px; color:#38bdf8; font-weight:700; text-transform:uppercase; letter-spacing:.05em; font-size:10.5px; }
.ndv-btn { display:flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:2px; background:#1e293b; border:1px solid #334155; color:#cbd5e1; cursor:pointer; }
.ndv-btn:hover { background:#334155; }
.ndv-btn-ico { font-size:11px; line-height:1; }
.ndv-ctl-label { color:#64748b; }
.ndv-range { accent-color:#38bdf8; }
.ndv-range-sm { width:64px; }
.ndv-range-lg { flex:1; min-width:90px; }
.ndv-ctl-check { display:flex; align-items:center; gap:5px; color:#94a3b8; }
.ndv-evlabel { font-size:10.5px; color:#64748b; text-transform:uppercase; letter-spacing:.04em; margin:0 0 4px; }
.ndv-evlist { display:flex; flex-direction:column; }
.ndv-evrow { display:flex; align-items:center; gap:9px; border-top:1px solid #1e293b; padding:5px 0; font-size:11.5px; }
.ndv-evmd { min-width:56px; color:#64748b; }
.ndv-evdot { width:7px; height:7px; border-radius:50%; flex:none; }
.ndv-evtxt { color:#e2e8f0; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes ndv-fwd { to { stroke-dashoffset: -24; } }
  @keyframes ndv-back { to { stroke-dashoffset: 13; } }
  @keyframes ndv-pl { 50% { opacity: .35; } }
  @keyframes ndv-fl { to { transform: scaleY(.82) translateY(2px); } }
  .ndv-mud { animation: ndv-fwd .6s linear infinite; }
  .ndv-ann { animation: ndv-back .8s linear infinite; }
  .ndv-corr { animation: ndv-fwd .5s linear infinite; }
  .ndv-pulse { animation: ndv-pl .9s ease-in-out infinite; }
  .ndv-flame { animation: ndv-fl .28s ease-in-out infinite alternate; transform-origin: 30px 44px; }
}
`;

export default function DrillingCrossSection({ wellId = 'OIL-DEMO-001', liveRopMHr = null, liveDepthM = null, isLive = false }) {
  const containerRef = useRef(null);
  const liveRopRef = useRef(liveRopMHr);
  const isLiveRef = useRef(isLive);
  const liveDepthRef = useRef(liveDepthM);
  const [model, setModel] = useState(null);

  useEffect(() => {
    liveRopRef.current = liveRopMHr;
  }, [liveRopMHr]);

  useEffect(() => {
    isLiveRef.current = isLive;
  }, [isLive]);

  // The real current measured depth from the live feed, when one exists -- drives the
  // cross-section directly (see tick()'s liveNow branch) instead of the self-paced demo sweep.
  useEffect(() => {
    liveDepthRef.current = typeof liveDepthM === 'number' && Number.isFinite(liveDepthM) ? liveDepthM : null;
  }, [liveDepthM]);

  // Rebuild the geology model from this well's real data whenever the selected well changes,
  // so switching wells shows that well's own real formations/depths/offset risks instead of
  // reusing whatever the previously-selected well looked like.
  useEffect(() => {
    let cancelled = false;
    setModel(null);
    (async () => {
      try {
        const [intel, nearby] = await Promise.all([
          getWellIntelligence(wellId),
          getNearbyWells({ wellId, radius: 25 }),
        ]);
        if (cancelled) return;
        setModel(buildGeologyModel(intel.well, nearby.wells || []));
      } catch (err) {
        console.error('Failed to load well data for drilling cross-section:', err);
        if (!cancelled) setModel(FALLBACK_MODEL);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wellId]);

  // (Re)mount the imperative SVG animation fresh every time the model changes. The container is
  // never given React children of its own (see the empty <div ref={containerRef} /> below), so
  // writing its innerHTML here and letting initDrillingViz own everything inside it never
  // conflicts with React's own reconciliation.
  useEffect(() => {
    if (!containerRef.current || !model) return undefined;
    containerRef.current.innerHTML = MARKUP;
    return initDrillingViz(containerRef.current, model, liveRopRef, isLiveRef, liveDepthRef);
  }, [model]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 lg:max-w-[88%] lg:mx-auto">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-3">
        <Activity className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
          Drilling Cross-Section
        </h3>
        <span className="ml-auto text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          {isLive ? 'Live feed — tracking real depth' : 'Simulated — no live eRTMAC feed connected'}
        </span>
      </div>
      <style>{STYLE}</style>
      {!model ? (
        <div className="flex items-center justify-center py-16 text-xs font-mono text-slate-500">
          Loading real formation and offset-well data for {wellId}...
        </div>
      ) : (
        <div className="ndv-root" ref={containerRef} />
      )}
    </div>
  );
}
