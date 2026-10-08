// Draft art for the fish and the characters, designed from shapes rather than traced from today's sprites, so one
// design renders at every size it needs (2x sprite, 4x portrait, banquet dish). Owner's files in art/ are never touched.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pieces } from './art-kit.mjs';
import { encodePNG } from './png.mjs';

const toRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2; let h = 0, s = 0;
  if (M !== m) { const d = M - m; s = l > .5 ? d / (2 - M - m) : d / (M + m); h = (M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; }
  return [h, s, l];
}
function hsl2rgb([h, s, l]) { const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
const towards = (h, t, a) => (h + (((t - h + 540) % 360) - 180) * a + 360) % 360;
// Pixel-art ramp: shadows drift to blue-violet, lights to warm yellow, instead of plain darker/lighter.
function ramp(hex) {
  const [h, s, l] = rgb2hsl(toRgb(hex));
  return [hsl2rgb([towards(h, 250, .1), s * .92, Math.max(0, l - .13)]), toRgb(hex),
    hsl2rgb([towards(h, 55, .12), s * .95, Math.min(.94, l + .1)]), hsl2rgb([towards(h, 55, .22), s * .7, Math.min(.97, l + .2)])];
}
const ink = c => { const [h, s, l] = rgb2hsl(c); return hsl2rgb([towards(h, 250, .3), Math.min(1, s * .9), Math.min(l * .4, .19)]); };
const LIGHT = (() => { const v = [-.45, -.55, .7], n = Math.hypot(...v); return v.map(x => x / n); })();

// A canvas addressed in unit coordinates (0..1 each axis, 1 px margin kept for the outline). rot lays a tall design down.
function painter(W, H, rot = false) {
  const c = new Array(W * H).fill(null), ids = new Array(W * H).fill(null), sx = W - 2, sy = H - 2;
  const uv = (x, y) => rot ? [1 - (y + .5 - 1) / sy, (x + .5 - 1) / sx] : [(x + .5 - 1) / sx, (y + .5 - 1) / sy];
  const each = (fn, clip) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (clip && ids[i] !== clip) continue; fn(i, ...uv(x, y)); } };
  const put = (i, col, id) => { c[i] = col; if (id) ids[i] = id; };
  const toneOf = (nx, ny, shine) => { const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), [px, py] = rot ? [ny, -nx] : [nx, ny];
    const d = px * LIGHT[0] + py * LIGHT[1] + nz * LIGHT[2]; return d < .1 ? 0 : d < .6 ? 1 : d < .88 || !shine ? 2 : 3; };
  const P = {
    W, H, pxu: 1 / Math.min(sx, sy),
    ell(cx, cy, rx, ry, rp, o = {}) {
      each((i, u, v) => { const nx = (u - cx) / rx, ny = (v - cy) / ry; if (nx * nx + ny * ny > 1) return;
        const r = o.under && v > o.under.v ? o.under.ramp : rp;
        put(i, Array.isArray(r[0]) ? r[o.tone ?? toneOf(nx, ny, o.shine)] : r, o.id); }, o.clip);
    },
    poly(pts, rp, o = {}) {
      const vs = pts.map(p => p[1]), top = Math.min(...vs), bot = Math.max(...vs);
      each((i, u, v) => { let inside = false;
        for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) { const [ua, va] = pts[a], [ub, vb] = pts[b];
          if ((va > v) !== (vb > v) && u < (ub - ua) * (v - va) / (vb - va) + ua) inside = !inside; }
        if (!inside) return;
        const t = (v - top) / Math.max(1e-6, bot - top);
        put(i, Array.isArray(rp[0]) ? rp[o.tone ?? (t < .34 ? 2 : t < .72 ? 1 : 0)] : rp, o.id); }, o.clip);
    },
    rect(u0, v0, u1, v1, col, o = {}) { each((i, u, v) => { if (u >= u0 && u <= u1 && v >= v0 && v <= v1) put(i, col, o.id); }, o.clip); },
    line(u0, v0, u1, v1, col, o = {}) {
      const n = Math.ceil(Math.hypot((u1 - u0) * sx, (v1 - v0) * sy)) + 1;
      for (let k = 0; k <= n; k++) { const u = u0 + (u1 - u0) * k / n, v = v0 + (v1 - v0) * k / n;
        const [x, y] = rot ? [Math.floor(1 + v * sx), Math.floor(1 + (1 - u) * sy)] : [Math.floor(1 + u * sx), Math.floor(1 + v * sy)];
        if (x >= 0 && y >= 0 && x < W && y < H && (!o.clip || ids[y * W + x] === o.clip)) put(y * W + x, col, o.id); }
    },
    dot(u, v, col, o = {}) { P.line(u, v, u, v, col, o); },
    eye(u, v, r, o = {}) {
      const rpx = r / P.pxu, dark = [16, 22, 34];
      if (rpx < 3.5 && !o.iris) { P.ell(u, v, Math.max(r, .75 * P.pxu), Math.max(r, .75 * P.pxu), dark); P.dot(u - .3 * P.pxu, v - .3 * P.pxu, [255, 255, 255]); return; }
      P.ell(u, v, r, r * (o.tall ?? 1), o.iris ?? [250, 236, 200]); P.ell(u + r * .1, v, r * .62, r * .62 * (o.tall ?? 1), dark);
      P.dot(u - r * .2, v - r * .3, [255, 255, 255]);
    },
    outline() {
      const out = c.slice();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (c[y * W + x]) continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H ? c[(y + dy) * W + x + dx] : null).find(Boolean);
        if (n) out[y * W + x] = ink(n); }
      return out;
    },
  };
  return P;
}

const WHITE = '#F4EFE6', DARK = [16, 22, 34];
// Side-view fish, head to the left: tail and fins behind, body with a lighter belly, gill, pectoral fin, mouth, eye.
function fish(P, o) {
  const { cx = .45, cy = .5, rx = .37, ry = .3 } = o, B = ramp(o.body), F = ramp(o.fin ?? o.body), Bl = o.belly && ramp(o.belly);
  const tx = cx + rx * .78, th = o.tailH ?? ry * 1.05;
  if (o.tail === 'round') P.ell(Math.min(.9, cx + rx + .05), cy, .09, th * .62, F);
  else if (o.tail === 'fan') P.poly([[tx, cy], [.995, cy - th], [.995, cy + th]], F);
  else P.poly([[tx, cy], [.995, cy - th], [.9, cy], [.995, cy + th]], F);
  if (o.dorsal !== 0) P.poly([[cx - rx * .5, cy - ry * .78], [cx + rx * (o.dorsalAt ?? .05), cy - ry - (o.dorsal ?? .16)], [cx + rx * .62, cy - ry * .55]], F);
  if (o.anal !== 0) P.poly([[cx + rx * .02, cy + ry * .75], [cx + rx * .35, cy + ry + (o.anal ?? .1)], [cx + rx * .66, cy + ry * .5]], F);
  P.ell(cx, cy, rx, ry, B, { id: 'body', shine: true, under: Bl && { v: cy + ry * (o.bellyAt ?? .22), ramp: Bl } });
  o.pattern?.(P, { cx, cy, rx, ry, B, F });
  if (o.pectoral !== false) P.poly([[cx - rx * .3, cy + ry * .1], [cx + rx * .05, cy + ry * .42], [cx - rx * .02, cy - ry * .02]], F, { tone: 2 });
  P.line(cx - rx * .99, cy + ry * .14, cx - rx * .8, cy + ry * .1, ink(B[1]));
  P.eye(cx - rx * .58, cy - ry * .2, o.eye ?? .075);
}
const bands = (cols, at, w, edge) => (P, { cx, rx }) => at.forEach(t => {
  const u = cx - rx + t * 2 * rx;
  if (edge) P.rect(u - w / 2 - P.pxu, 0, u + w / 2 + P.pxu, 1, edge, { clip: 'body' });
  P.rect(u - w / 2, 0, u + w / 2, 1, cols, { clip: 'body' });
});
const spots = (col, list) => (P, { cx, cy, rx, ry }) => list.forEach(([a, b, r]) => P.ell(cx + a * rx, cy + b * ry, r, r * 1.2, col, { clip: 'body' }));

const FISH = {
  dourado: P => fish(P, { body: '#F2C84B', belly: '#FFE9A0', fin: '#E0A030', pattern: (P, g) => { for (let k = 0; k < 4; k++) P.line(g.cx - g.rx * .2 + k * g.rx * .22, g.cy - g.ry * .6, g.cx - g.rx * .1 + k * g.rx * .22, g.cy + g.ry * .1, g.B[2], { clip: 'body' }); } }),
  palhaco: P => fish(P, { body: '#F28A30', fin: '#F28A30', tail: 'round', ry: .33, dorsal: .12, pattern: bands([250, 250, 246], [.2, .52, .86], .07, DARK) }),
  cirurgiao: P => fish(P, { body: '#3E6FD8', fin: '#2F58B8', ry: .34, pattern: (P, g) => { P.poly([[g.cx - g.rx * .4, g.cy - g.ry * .55], [g.cx + g.rx * .9, g.cy - g.ry * .2], [g.cx + g.rx * .7, g.cy + g.ry * .25], [g.cx + g.rx * .1, g.cy - g.ry * .05]], [20, 40, 90], { clip: 'body' }); P.poly([[g.cx + g.rx * .78, g.cy], [.995, g.cy - g.ry * 1.05], [.9, g.cy], [.995, g.cy + g.ry * 1.05]], ramp('#F2C84B')); } }),
  garoupa: P => fish(P, { body: '#A0744A', belly: '#C9A070', fin: '#7A5230', rx: .4, ry: .31, tail: 'round', eye: .06, pattern: spots(toRgb('#5E3A1A'), [[-.3, -.45, .025], [0, -.6, .03], [.3, -.4, .025], [.55, -.1, .03], [.1, -.1, .03], [-.2, .05, .025], [.4, .25, .025]]) }),
  baiacu: P => fish(P, { body: '#D9B460', belly: '#F4E6BE', fin: '#C79A40', cx: .44, rx: .36, ry: .42, tail: 'round', dorsal: .06, anal: 0, eye: .085, bellyAt: .1, pattern: (P, g) => { for (let a = -2.6; a < 0; a += .45) P.dot(g.cx + Math.cos(a) * g.rx * .82, g.cy + Math.sin(a) * g.ry * .82, ramp('#6B4A2A')[1], { clip: 'body' }); spots(toRgb('#6B4A2A'), [[0, -.35, .022], [.3, -.2, .022], [-.15, -.15, .02]])(P, g); } }),
  papagaio: P => fish(P, { body: '#3FBF8F', belly: '#7FE0B8', fin: '#2E8F6A', pattern: (P, g) => { bands(toRgb('#F2A0C8'), [.42, .7], .035)(P, g); P.ell(g.cx - g.rx * .93, g.cy + g.ry * .05, .05, .07, ramp('#F4E6BE'), { tone: 2 }); } }),
  linguado: P => fish(P, { body: '#C9A56A', fin: '#A8844E', cy: .55, rx: .4, ry: .22, dorsal: .12, dorsalAt: .1, anal: .12, tail: 'round', pectoral: false, eye: .045, pattern: (P, g) => { spots(toRgb('#8A6A40'), [[-.1, -.3, .02], [.2, .1, .025], [.45, -.25, .02], [.0, .35, .02], [.6, .2, .02]])(P, g); P.eye(g.cx - g.rx * .3, g.cy - g.ry * .55, .045); } }),
  sardinha: P => fish(P, { body: '#8FB8D8', belly: '#E4EEF4', fin: '#6E98BA', ry: .2, rx: .4, dorsal: .1, anal: .06, eye: .07, bellyAt: 0, pattern: (P, g) => { P.rect(0, g.cy - g.ry, 1, g.cy - g.ry * .35, ramp('#4E7FA8')[1], { clip: 'body' }); spots(toRgb('#2E4F78'), [[-.1, -.15, .02], [.15, -.15, .02], [.4, -.15, .02]])(P, g); } }),
  anjo: P => fish(P, { body: '#F2D24B', belly: '#FFE88A', fin: '#3E6FD8', cx: .45, rx: .3, ry: .3, dorsal: .32, dorsalAt: .3, anal: .32, tail: 'fan', tailH: .3, pattern: bands(toRgb('#1A1A2A'), [.35, .7], .05) }),
  leao: P => {
    const R = ramp('#E89080');
    for (let a = .4; a < 2.8; a += .32) P.line(.45, .55, .45 + Math.cos(a) * .4, .55 + Math.sin(a) * .42, R[a < 1.6 ? 2 : 1]);
    for (let k = 0; k < 6; k++) P.line(.28 + k * .07, .3, .24 + k * .08, .02, ramp('#D8553A')[0]);
    fish(P, { body: '#D8553A', belly: '#F4D8C8', fin: '#E89080', ry: .27, dorsal: 0, pattern: bands([250, 244, 236], [.2, .4, .6, .8], .035) });
  },
  cavalo: (P) => {
    const B = ramp('#F28A30'), C = ramp('#FFC07A');
    [[.62, .86, .1], [.74, .8, .08], [.78, .7, .06], [.7, .65, .05]].forEach(([u, v, r]) => P.ell(u, v, r, r * .7, B));
    P.ell(.5, .55, .2, .2, B, { id: 'body', shine: true, under: { v: .58, ramp: C } });
    P.ell(.5, .33, .14, .1, B, { id: 'body' });
    P.ell(.42, .17, .17, .1, B, { shine: true });
    P.poly([[.3, .16], [.02, .2], [.02, .26], [.3, .22]], B);
    P.poly([[.6, .08], [.66, .0], [.58, .12]], B);
    P.poly([[.68, .45], [.92, .38], [.78, .6]], ramp('#FFD08A'));
    for (let v = .4; v < .74; v += .08) P.line(.32, v, .66, v, B[0], { clip: 'body' });
    P.eye(.44, .15, .055);
  },
  manta: P => {
    const B = ramp('#2A4A7A');
    P.line(.5, .8, .5, .995, B[0]);
    P.poly([[.5, .18], [.99, .52], [.85, .6], [.5, .82], [.15, .6], [.01, .52]], B, { id: 'body' });
    P.ell(.5, .5, .2, .3, B, { id: 'body', shine: true });
    P.poly([[.38, .2], [.42, .03], [.47, .2]], B); P.poly([[.53, .2], [.58, .03], [.62, .2]], B);
    spots([226, 236, 244], [[-.4, -.1, .025], [.4, -.1, .025], [-.2, .35, .02], [.2, .35, .02]])(P, { cx: .5, cy: .5, rx: .5, ry: .5 });
    P.eye(.39, .24, .035); P.eye(.61, .24, .035);
  },
};

function cat(P, happy) {
  const O = ramp('#E0703A'), K = ramp('#F2A0A8'), Wh = ramp(WHITE);
  for (const s of [-1, 1]) { const m = u => .5 + s * (u - .5);
    P.poly([[m(.12), .46], [m(.17), .03], [m(.45), .22]], O); P.poly([[m(.19), .38], [m(.21), .13], [m(.36), .25]], K, { tone: 1 }); }
  P.ell(.5, .56, .43, .38, O, { id: 'head', shine: true });
  [.42, .5, .58].forEach((u, k) => P.rect(u - .02, .2, u + .02, .3 - (k === 1 ? 0 : .04), O[0], { clip: 'head' }));
  P.ell(.18, .62, .07, .05, K[2], { clip: 'head' }); P.ell(.82, .62, .07, .05, K[2], { clip: 'head' });
  P.ell(.41, .73, .13, .1, Wh, { clip: 'head' }); P.ell(.59, .73, .13, .1, Wh, { clip: 'head' }); P.ell(.5, .84, .1, .07, Wh, { clip: 'head' });
  P.poly([[.45, .63], [.55, .63], [.5, .69]], K, { tone: 1 });
  if (happy) {
    for (const s of [-1, 1]) { const u = .5 + s * .17; P.line(u - .08, .54, u, .46, DARK); P.line(u, .46, u + .08, .54, DARK); }
    P.ell(.5, .79, .08, .07, [70, 30, 40], { clip: 'head' }); P.ell(.5, .83, .05, .03, K[1], { clip: 'head' });
  } else {
    P.eye(.33, .5, .075, { tall: 1.25, iris: [120, 180, 90] }); P.eye(.67, .5, .075, { tall: 1.25, iris: [120, 180, 90] });
    P.line(.5, .69, .44, .76, ink(O[1])); P.line(.5, .69, .56, .76, ink(O[1]));
  }
  for (const s of [-1, 1]) { P.line(.5 + s * .3, .7, .5 + s * .49, .66, Wh[2]); P.line(.5 + s * .3, .74, .5 + s * .49, .77, Wh[2]); }
}
function catBack(P) {
  const O = ramp('#E0703A'), K = ramp('#F2A0A8');
  [[.86, .84, .09], [.92, .7, .07], [.88, .57, .06]].forEach(([u, v, r]) => P.ell(u, v, r, r * 1.1, O));
  P.ell(.47, .7, .36, .29, O, { id: 'back', shine: true });
  for (let v = .52; v < .9; v += .1) P.line(.3, v, .64, v + .02, O[0], { clip: 'back' });
  for (const s of [-1, 1]) { const m = u => .47 + s * (u - .47); P.poly([[m(.25), .3], [m(.28), .02], [m(.44), .16]], O); P.poly([[m(.29), .24], [m(.3), .08], [m(.39), .16]], K, { tone: 1 }); }
  P.ell(.47, .3, .25, .2, O, { id: 'head', shine: true });
  P.rect(.45, .14, .49, .24, O[0], { clip: 'head' });
}
const GUESTS = {
  lontra(P) {
    const Br = ramp('#8B5A3C'), Lt = ramp('#D9B48A'), Hat = ramp(WHITE);
    P.ell(.2, .48, .09, .09, Br); P.ell(.8, .48, .09, .09, Br);
    P.ell(.5, .64, .37, .31, Br, { id: 'head', shine: true });
    P.ell(.5, .77, .21, .14, Lt, { clip: 'head' });
    P.ell(.5, .69, .06, .045, DARK);
    P.eye(.35, .58, .05); P.eye(.65, .58, .05);
    [.33, .67].forEach(u => P.dot(u, .8, Br[0]));
    P.rect(.28, .3, .72, .4, Hat[1]);
    [[.33, .2, .16], [.5, .13, .2], [.67, .2, .16]].forEach(([u, v, r]) => P.ell(u, v, r, r * .85, Hat, { shine: true }));
  },
  pelicano(P) {
    const Wt = ramp('#EDEAE0'), Bk = ramp('#E9C25A'), Pu = ramp('#E08A3A');
    P.ell(.4, .78, .26, .2, Wt);
    P.ell(.4, .42, .27, .26, Wt, { shine: true });
    P.poly([[.5, .5], [.99, .6], [.6, .74]], Pu);
    P.poly([[.5, .4], [.99, .55], [.99, .6], [.5, .52]], Bk);
    P.poly([[.22, .2], [.3, .05], [.36, .2]], Wt);
    P.eye(.47, .36, .05);
  },
  guaxinim(P) {
    const G = ramp('#8A989B'), M = ramp('#36454A'), Wt = ramp('#E8EEF0');
    for (const s of [-1, 1]) { const m = u => .5 + s * (u - .5); P.poly([[m(.13), .45], [m(.2), .1], [m(.42), .3]], G); P.poly([[m(.2), .37], [m(.23), .2], [m(.34), .3]], M, { tone: 1 }); }
    P.ell(.5, .6, .4, .33, G, { id: 'head', shine: true });
    P.ell(.5, .43, .3, .07, Wt[2], { clip: 'head' });
    P.ell(.5, .55, .4, .11, M, { clip: 'head', tone: 0 });
    P.ell(.5, .76, .17, .11, Wt, { clip: 'head' });
    P.ell(.5, .69, .06, .04, DARK);
    P.eye(.34, .55, .055, { iris: [210, 220, 225] }); P.eye(.66, .55, .055, { iris: [210, 220, 225] });
  },
  vovo(P) {
    const G = ramp('#C9D3D6'), K = ramp('#F2A0A8'), S = ramp('#D98BB0'), Gl = [16, 50, 74];
    for (const s of [-1, 1]) { const m = u => .5 + s * (u - .5); P.poly([[m(.14), .45], [m(.19), .06], [m(.42), .25]], G); P.poly([[m(.2), .38], [m(.22), .15], [m(.35), .27]], K, { tone: 1 }); }
    P.poly([[.1, .78], [.9, .78], [.98, .99], [.02, .99]], S);
    P.ell(.5, .55, .38, .32, G, { id: 'head', shine: true });
    P.ell(.5, .26, .1, .06, ramp('#F4F6F7'), { clip: 'head' });
    P.ell(.5, .7, .15, .09, ramp('#F4F6F7'), { clip: 'head' });
    P.poly([[.46, .62], [.54, .62], [.5, .66]], K, { tone: 1 });
    for (const u of [.34, .66]) { P.ell(u, .52, .12, .11, Gl); P.ell(u, .52, .085, .075, [200, 225, 235]); P.dot(u, .53, DARK); }
    P.line(.44, .52, .56, .52, Gl);
  },
};

const DRAWN = { fish: FISH, portrait: { ...FISH, catFace: P => cat(P, false), catHappy: P => cat(P, true) }, plate: FISH, guests: GUESTS, ui: { catFace: P => cat(P, false), catHappy: P => cat(P, true), catBack } };
export const drawnPiece = p => !!DRAWN[p.group]?.[p.name];

function render(p) {
  const { w, h } = p.tpl, rot = p.name === 'cavalo' && w > h, P = painter(w, h, rot);
  DRAWN[p.group][p.name](P);
  const px = P.outline(), rgba = new Uint8Array(w * h * 4);
  px.forEach((c, i) => { if (c) rgba.set([...c, 255], i * 4); });
  return encodePNG(w, h, rgba);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const root = new URL('../', import.meta.url), ledger = new URL('art/.drafts', root);
  const drafts = new Set(existsSync(ledger) ? readFileSync(ledger, 'utf8').split('\n').filter(Boolean) : []);
  let wrote = 0, kept = 0;
  for (const p of pieces().filter(drawnPiece)) {
    const f = new URL(p.path, root);
    if (existsSync(f) && !drafts.has(p.path)) { kept++; continue; }
    mkdirSync(new URL('.', f), { recursive: true });
    writeFileSync(f, render(p)); drafts.add(p.path); wrote++;
  }
  writeFileSync(ledger, [...drafts].sort().join('\n') + '\n');
  console.log(`art draw: ${wrote} fish and character drafts written, ${kept} owner files left alone`);
}
