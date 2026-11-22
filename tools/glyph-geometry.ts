/**
 * Glyph geometry generator (ADR 0001 point 3). `npm run gen:geometry`
 *
 * For every letter, vowel-sign syllable and numeral of every registered pack:
 *   1. shape the display text with HarfBuzz using the pack's font (conjuncts like ক্ষ and pre-base
 *      vowel signs like কি come out exactly as the app's text renderer draws them),
 *   2. build the outline as an SVG path, flipped to y-down and fitted into the unit box with a 10%
 *      margin (aspect ratio kept),
 *   3. derive PLACEHOLDER strokes: rasterise the outline, thin it (Zhang–Suen), trace the skeleton
 *      into polylines and clean them up: for Bengali/Devanagari letters and signs the headline
 *      (mātrā / śirorekhā) is cut out and redrawn as one straight left-to-right bar; pieces that
 *      continue each other smoothly (e.g. a stem split at the headline) are joined; short spurs
 *      touching other ink are dropped while isolated dots stay. Then simplify (RDP) and order:
 *      body and curves, then vertical stems left to right, then the headline, then marks above
 *      it and dots (numerals: digit by digit, left to right). `npm run render:geometry` draws
 *      contact sheets to check the result by eye,
 *   4. write src/content/packs/<id>/geometry.json (sorted keys, 3 decimals, prettier-formatted).
 *
 * Entries whose strokeSource is `recorded` or `reviewed` are never overwritten, unless the item's
 * text changed (then the entry is regenerated as `auto` and a loud warning is printed, because the
 * human-made strokes no longer match the glyph).
 *
 * Everything except `main()` is pure and unit-tested (tools/__tests__/glyph-geometry.test.ts).
 */
import fs from 'node:fs';
import path from 'node:path';

import type { GeometryFile, GlyphGeometry, PackContent, Script } from '../src/content/schema';

export type Pt = [number, number];
export type PathCmd =
  | { type: 'M' | 'L'; values: [number, number] }
  | { type: 'Q'; values: [number, number, number, number] }
  | { type: 'C'; values: [number, number, number, number, number, number] }
  | { type: 'Z'; values: [] };

/** Raster size used for skeletonising (pixels per unit box side). */
export const RASTER_SIZE = 192;
const MARGIN = 0.1;

export const round3 = (n: number): number => {
  const r = Math.round(n * 1000) / 1000;
  return r === 0 ? 0 : r; // no "-0"
};

// ---------------------------------------------------------------------------------------------
// SVG path data
// ---------------------------------------------------------------------------------------------

const ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6, Z: 0 };

/**
 * Parses absolute SVG path data using the commands M L H V Q C Z (what this tool and the Stroke
 * Recorder emit). H and V are converted to L. Throws on anything else.
 */
export function parseOutline(d: string): PathCmd[] {
  const tokens = d.match(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const rest = d.replace(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|[\s,]/g, '');
  if (rest.length > 0) {
    throw new Error(`unexpected characters in path: "${rest.slice(0, 10)}"`);
  }
  const cmds: PathCmd[] = [];
  let i = 0;
  let cur: Pt = [0, 0];
  let start: Pt = [0, 0];
  let cmd = '';
  while (i < tokens.length) {
    const t = tokens[i] as string;
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i++;
      if (!(cmd in ARITY)) {
        throw new Error(`unsupported path command "${cmd}" (use absolute M L H V Q C Z)`);
      }
      if (cmd === 'Z') {
        cmds.push({ type: 'Z', values: [] });
        cur = start;
        continue;
      }
    } else if (!cmd || cmd === 'Z') {
      throw new Error('path data must start with a command');
    }
    const n = ARITY[cmd] as number;
    const nums = tokens.slice(i, i + n).map(Number);
    if (nums.length < n || nums.some(v => !Number.isFinite(v))) {
      throw new Error(`command ${cmd} needs ${n} numbers`);
    }
    i += n;
    if (cmd === 'M') {
      cur = [nums[0] as number, nums[1] as number];
      start = cur;
      cmds.push({ type: 'M', values: [cur[0], cur[1]] });
      cmd = 'L'; // implicit lineto after moveto
    } else if (cmd === 'L' || cmd === 'H' || cmd === 'V') {
      const p: Pt =
        cmd === 'L'
          ? [nums[0] as number, nums[1] as number]
          : cmd === 'H'
            ? [nums[0] as number, cur[1]]
            : [cur[0], nums[0] as number];
      cur = p;
      cmds.push({ type: 'L', values: [p[0], p[1]] });
    } else if (cmd === 'Q') {
      cmds.push({ type: 'Q', values: nums as [number, number, number, number] });
      cur = [nums[2] as number, nums[3] as number];
    } else {
      cmds.push({ type: 'C', values: nums as [number, number, number, number, number, number] });
      cur = [nums[4] as number, nums[5] as number];
    }
  }
  return cmds;
}

export function formatOutline(cmds: PathCmd[]): string {
  return cmds.map(c => c.type + c.values.map(v => String(round3(v))).join(' ')).join('');
}

export function mapPath(cmds: PathCmd[], f: (p: Pt) => Pt): PathCmd[] {
  return cmds.map(c => {
    const v = c.values;
    const out: number[] = [];
    for (let k = 0; k < v.length; k += 2) {
      const [x, y] = f([v[k] as number, v[k + 1] as number]);
      out.push(x, y);
    }
    return { type: c.type, values: out } as PathCmd;
  });
}

/** Flattens a path into closed polygons (one per contour). Curves use a fixed segment count. */
export function flattenPath(cmds: PathCmd[], curveSegments = 10): Pt[][] {
  const contours: Pt[][] = [];
  let poly: Pt[] = [];
  let cur: Pt = [0, 0];
  const flush = () => {
    if (poly.length > 1) {
      contours.push(poly);
    }
    poly = [];
  };
  for (const c of cmds) {
    if (c.type === 'M') {
      flush();
      cur = [c.values[0], c.values[1]];
      poly.push(cur);
    } else if (c.type === 'L') {
      cur = [c.values[0], c.values[1]];
      poly.push(cur);
    } else if (c.type === 'Q') {
      const [x1, y1, x, y] = c.values;
      const [x0, y0] = cur;
      for (let s = 1; s <= curveSegments; s++) {
        const t = s / curveSegments;
        const u = 1 - t;
        poly.push([
          u * u * x0 + 2 * u * t * x1 + t * t * x,
          u * u * y0 + 2 * u * t * y1 + t * t * y,
        ]);
      }
      cur = [x, y];
    } else if (c.type === 'C') {
      const [x1, y1, x2, y2, x, y] = c.values;
      const [x0, y0] = cur;
      for (let s = 1; s <= curveSegments; s++) {
        const t = s / curveSegments;
        const u = 1 - t;
        poly.push([
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
        ]);
      }
      cur = [x, y];
    } else {
      flush();
    }
  }
  flush();
  return contours;
}

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

export function bbox(points: Pt[]): BBox {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of points) {
    b.minX = Math.min(b.minX, x);
    b.minY = Math.min(b.minY, y);
    b.maxX = Math.max(b.maxX, x);
    b.maxY = Math.max(b.maxY, y);
  }
  return b;
}

/**
 * Fits a font-unit path (y up) into the unit box (y down) with a margin, keeping the aspect ratio
 * and centring the glyph.
 */
export function fitToUnitBox(cmds: PathCmd[], margin = MARGIN): PathCmd[] {
  const b = bbox(flattenPath(cmds).flat());
  if (!Number.isFinite(b.minX)) {
    return [];
  }
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const s = (1 - 2 * margin) / Math.max(w, h, 1e-9);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return mapPath(cmds, ([x, y]) => [0.5 + (x - cx) * s, 0.5 - (y - cy) * s]);
}

// ---------------------------------------------------------------------------------------------
// Raster + thinning
// ---------------------------------------------------------------------------------------------

/**
 * Scanline fill with the non-zero winding rule (TrueType/CFF outlines). Contours are in pixel
 * coordinates; a pixel is set when its centre is inside. Returns a w*h grid of 0/1.
 */
export function rasterize(contours: Pt[][], w: number, h: number): Uint8Array {
  const grid = new Uint8Array(w * h);
  type E = { x0: number; y0: number; x1: number; y1: number; dir: number };
  const edges: E[] = [];
  for (const c of contours) {
    for (let k = 0; k < c.length; k++) {
      const a = c[k] as Pt;
      const b = c[(k + 1) % c.length] as Pt;
      if (a[1] === b[1]) {
        continue;
      }
      edges.push(
        a[1] < b[1]
          ? { x0: a[0], y0: a[1], x1: b[0], y1: b[1], dir: 1 }
          : { x0: b[0], y0: b[1], x1: a[0], y1: a[1], dir: -1 },
      );
    }
  }
  for (let j = 0; j < h; j++) {
    const yc = j + 0.5;
    const xs: { x: number; dir: number }[] = [];
    for (const e of edges) {
      if (yc >= e.y0 && yc < e.y1) {
        xs.push({ x: e.x0 + ((yc - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0), dir: e.dir });
      }
    }
    xs.sort((p, q) => p.x - q.x || p.dir - q.dir);
    let wind = 0;
    for (let k = 0; k < xs.length - 1; k++) {
      wind += (xs[k] as { dir: number }).dir;
      if (wind !== 0) {
        const xa = (xs[k] as { x: number }).x;
        const xb = (xs[k + 1] as { x: number }).x;
        const i0 = Math.max(0, Math.ceil(xa - 0.5));
        const i1 = Math.min(w - 1, Math.ceil(xb - 0.5) - 1);
        for (let i = i0; i <= i1; i++) {
          grid[j * w + i] = 1;
        }
      }
    }
  }
  return grid;
}

/** Zhang–Suen thinning. Returns a new grid; the input is not modified. */
export function zhangSuen(input: Uint8Array, w: number, h: number): Uint8Array {
  const g = Uint8Array.from(input);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x]!);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of [0, 1]) {
      const del: number[] = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!g[y * w + x]) {
            continue;
          }
          // P2..P9 clockwise from north
          const p = [
            at(x, y - 1),
            at(x + 1, y - 1),
            at(x + 1, y),
            at(x + 1, y + 1),
            at(x, y + 1),
            at(x - 1, y + 1),
            at(x - 1, y),
            at(x - 1, y - 1),
          ];
          const b = p.reduce((s, v) => s + v, 0);
          if (b < 2 || b > 6) {
            continue;
          }
          let a = 0;
          for (let k = 0; k < 8; k++) {
            if (p[k] === 0 && p[(k + 1) % 8] === 1) {
              a++;
            }
          }
          if (a !== 1) {
            continue;
          }
          const [p2, , p4, , p6, , p8] = p as [
            number,
            number,
            number,
            number,
            number,
            number,
            number,
          ];
          if (
            step === 0
              ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0
              : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0
          ) {
            del.push(y * w + x);
          }
        }
      }
      for (const idx of del) {
        g[idx] = 0;
      }
      changed ||= del.length > 0;
    }
  }
  keepSmallComponents(input, g, w, h);
  return g;
}

/**
 * Zhang–Suen erases tiny blobs (e.g. a 2x2 dot) completely. For every 8-connected part of the
 * input with no skeleton pixel left, keep the pixel nearest to its centroid.
 */
function keepSmallComponents(input: Uint8Array, sk: Uint8Array, w: number, h: number): void {
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!input[start] || seen[start]) {
      continue;
    }
    const comp: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop() as number;
      comp.push(i);
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          const j = yy * w + xx;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && input[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
    }
    if (comp.some(i => sk[i])) {
      continue;
    }
    const cx = comp.reduce((s, i) => s + (i % w), 0) / comp.length;
    const cy = comp.reduce((s, i) => s + Math.floor(i / w), 0) / comp.length;
    let best = comp[0] as number;
    let bestD = Infinity;
    for (const i of [...comp].sort((p, q) => p - q)) {
      const d = ((i % w) - cx) ** 2 + (Math.floor(i / w) - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    sk[best] = 1;
  }
}

// ---------------------------------------------------------------------------------------------
// Skeleton tracing
// ---------------------------------------------------------------------------------------------

/** A traced skeleton branch in pixel-centre coordinates, between node clusters a and b. */
export type Branch = { pts: Pt[]; a: number; b: number };

/**
 * Skeleton neighbours: 4-neighbours, plus diagonals that are not already bridged by a set
 * 4-neighbour (avoids fake junctions on staircase lines). Symmetric.
 */
function skeletonNeighbours(sk: Uint8Array, w: number, h: number, idx: number): number[] {
  const x = idx % w;
  const y = (idx - x) / w;
  const on = (xx: number, yy: number) =>
    xx >= 0 && yy >= 0 && xx < w && yy < h && sk[yy * w + xx] === 1;
  const res: number[] = [];
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const) {
    if (on(x + dx, y + dy)) {
      res.push((y + dy) * w + x + dx);
    }
  }
  for (const [dx, dy] of [
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ] as const) {
    if (on(x + dx, y + dy) && !on(x + dx, y) && !on(x, y + dy)) {
      res.push((y + dy) * w + x + dx);
    }
  }
  return res;
}

/**
 * Traces a one-pixel-wide skeleton into branches split at junctions. Adjacent junction pixels are
 * merged into one node cluster. Closed loops without junctions become one branch with a === b.
 * Isolated pixels become single-point branches.
 */
export function traceSkeleton(sk: Uint8Array, w: number, h: number): Branch[] {
  const nb = new Map<number, number[]>();
  for (let i = 0; i < w * h; i++) {
    if (sk[i]) {
      nb.set(i, skeletonNeighbours(sk, w, h, i));
    }
  }
  const deg = (i: number) => (nb.get(i) as number[]).length;
  const isNode = (i: number) => deg(i) !== 2;

  // union-find over adjacent node pixels
  const parent = new Map<number, number>();
  const find = (i: number): number => {
    let r = i;
    while (parent.get(r) !== r) {
      r = parent.get(r) as number;
    }
    parent.set(i, r);
    return r;
  };
  const pixels = [...nb.keys()].sort((p, q) => p - q);
  for (const i of pixels) {
    if (isNode(i)) {
      parent.set(i, i);
    }
  }
  for (const i of pixels) {
    if (!isNode(i)) {
      continue;
    }
    for (const j of nb.get(i) as number[]) {
      if (isNode(j)) {
        const ri = find(i);
        const rj = find(j);
        if (ri !== rj) {
          parent.set(Math.max(ri, rj), Math.min(ri, rj));
        }
      }
    }
  }

  const visited = new Set<number>();
  const ekey = (p: number, q: number) => (p < q ? p * w * h + q : q * w * h + p);
  const centre = (i: number): Pt => [(i % w) + 0.5, Math.floor(i / w) + 0.5];
  const branches: Branch[] = [];

  for (const i of pixels) {
    if (!isNode(i)) {
      continue;
    }
    if (deg(i) === 0) {
      branches.push({ pts: [centre(i)], a: find(i), b: find(i) });
      continue;
    }
    for (const first of nb.get(i) as number[]) {
      if (visited.has(ekey(i, first))) {
        continue;
      }
      visited.add(ekey(i, first));
      const trail = [i];
      let prev = i;
      let cur = first;
      while (!isNode(cur)) {
        trail.push(cur);
        const next = (nb.get(cur) as number[]).find(n => n !== prev && !visited.has(ekey(cur, n)));
        if (next === undefined) {
          break;
        }
        visited.add(ekey(cur, next));
        prev = cur;
        cur = next;
      }
      trail.push(cur);
      const a = find(i);
      const b = isNode(cur) ? find(cur) : a;
      if (a === b && trail.length <= 3 && isNode(cur)) {
        continue; // link inside a junction cluster
      }
      branches.push({ pts: trail.map(centre), a, b });
    }
  }
  // a cluster whose only links were internal (e.g. a tiny dot) still becomes a one-point branch
  const used = new Set(branches.flatMap(b => [b.a, b.b]));
  for (const i of pixels) {
    if (isNode(i) && find(i) === i && !used.has(i)) {
      branches.push({ pts: [centre(i)], a: i, b: i });
    }
  }
  // loops made only of degree-2 pixels
  let loopId = -1;
  for (const i of pixels) {
    if (isNode(i)) {
      continue;
    }
    const open = (nb.get(i) as number[]).find(n => !visited.has(ekey(i, n)));
    if (open === undefined) {
      continue;
    }
    const trail = [i];
    visited.add(ekey(i, open));
    let prev = i;
    let cur = open;
    while (cur !== i) {
      trail.push(cur);
      const next = (nb.get(cur) as number[]).find(n => n !== prev && !visited.has(ekey(cur, n)));
      if (next === undefined) {
        break;
      }
      visited.add(ekey(cur, next));
      prev = cur;
      cur = next;
    }
    trail.push(cur);
    branches.push({ pts: trail.map(centre), a: loopId, b: loopId });
    loopId--;
  }
  return branches;
}

// ---------------------------------------------------------------------------------------------
// Branch clean-up
// ---------------------------------------------------------------------------------------------

export function polylineLength(pts: Pt[]): number {
  let len = 0;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1] as Pt;
    const b = pts[k] as Pt;
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return len;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const first = (pts: Pt[]) => pts[0] as Pt;
const last = (pts: Pt[]) => pts[pts.length - 1] as Pt;

function degrees(branches: Branch[]): Map<number, number> {
  const d = new Map<number, number>();
  for (const b of branches) {
    d.set(b.a, (d.get(b.a) ?? 0) + 1);
    d.set(b.b, (d.get(b.b) ?? 0) + 1);
  }
  return d;
}

/** Joins two branches that share node `c` into one (c becomes an interior point). */
function joinAt(e1: Branch, e2: Branch, c: number): Branch {
  const p1 = e1.b === c ? e1.pts : [...e1.pts].reverse();
  const p2 = e2.a === c ? e2.pts : [...e2.pts].reverse();
  const a = e1.b === c ? e1.a : e1.b;
  const b = e2.a === c ? e2.b : e2.a;
  const joined = dist(last(p1), first(p2)) < 1e-9 ? [...p1, ...p2.slice(1)] : [...p1, ...p2];
  return { pts: joined, a, b };
}

/** Merges branches through nodes of degree exactly two (except the nodes in `skip`). */
export function mergeDegreeTwo(input: Branch[], skip?: ReadonlySet<number>): Branch[] {
  let branches = [...input];
  for (;;) {
    const d = degrees(branches);
    let done = true;
    for (const [c, n] of [...d.entries()].sort((p, q) => p[0] - q[0])) {
      if (n !== 2 || skip?.has(c)) {
        continue;
      }
      const at = branches.filter(b => b.a === c || b.b === c);
      if (at.length !== 2) {
        continue; // a single loop branch
      }
      const [e1, e2] = at as [Branch, Branch];
      branches = branches.filter(b => b !== e1 && b !== e2);
      branches.push(joinAt(e1, e2, c));
      done = false;
      break;
    }
    if (done) {
      return branches;
    }
  }
}

/** Removes short branches that hang off a junction (thinning noise), then re-merges. */
export function pruneSpurs(input: Branch[], minLength: number): Branch[] {
  let branches = mergeDegreeTwo(input);
  for (let pass = 0; pass < 4; pass++) {
    const d = degrees(branches);
    const spurs = branches.filter(b => {
      if (b.a === b.b) {
        return false;
      }
      const da = d.get(b.a) ?? 0;
      const db = d.get(b.b) ?? 0;
      return ((da === 1 && db >= 3) || (db === 1 && da >= 3)) && polylineLength(b.pts) < minLength;
    });
    if (spurs.length === 0) {
      break;
    }
    // remove at most (degree - 2) spurs per junction, shortest first, so a junction never vanishes
    const budget = new Map<number, number>();
    const removed = new Set<Branch>();
    for (const s of [...spurs].sort((p, q) => polylineLength(p.pts) - polylineLength(q.pts))) {
      const j = (d.get(s.a) ?? 0) >= 3 ? s.a : s.b;
      const left = budget.get(j) ?? (d.get(j) ?? 0) - 2;
      if (left > 0) {
        removed.add(s);
        budget.set(j, left - 1);
      }
    }
    branches = mergeDegreeTwo(branches.filter(b => !removed.has(b)));
  }
  return branches;
}

/**
 * Contracts short links between two junctions (dense crossings fall apart into many tiny
 * branches otherwise): the link is removed and its two nodes become one.
 */
export function contractShortLinks(input: Branch[], minLength: number): Branch[] {
  let branches = [...input];
  for (;;) {
    const d = degrees(branches);
    // tiny holes in the skeleton at a junction: drop the loop
    const hole = branches.find(
      b => b.a === b.b && (d.get(b.a) ?? 0) > 2 && polylineLength(b.pts) < minLength * 2,
    );
    if (hole) {
      branches = branches.filter(b => b !== hole);
      continue;
    }
    const link = branches
      .filter(b => b.a !== b.b && (d.get(b.a) ?? 0) >= 3 && (d.get(b.b) ?? 0) >= 3)
      .filter(b => polylineLength(b.pts) < minLength)
      .sort((p, q) => polylineLength(p.pts) - polylineLength(q.pts))[0];
    if (!link) {
      return branches;
    }
    const keep = Math.min(link.a, link.b);
    const gone = Math.max(link.a, link.b);
    branches = branches
      .filter(b => b !== link)
      .map(b => ({ pts: b.pts, a: b.a === gone ? keep : b.a, b: b.b === gone ? keep : b.b }));
  }
}

/**
 * Small holes between two junctions show up as two parallel branches joining the same two nodes:
 * drops the shorter one when it is shorter than `maxLength`, then re-merges.
 */
export function dropParallel(input: Branch[], maxLength: number): Branch[] {
  const byPair = new Map<string, Branch[]>();
  for (const b of input) {
    if (b.a !== b.b) {
      const key = `${Math.min(b.a, b.b)}:${Math.max(b.a, b.b)}`;
      byPair.set(key, [...(byPair.get(key) ?? []), b]);
    }
  }
  const drop = new Set<Branch>();
  for (const list of byPair.values()) {
    if (list.length < 2) {
      continue;
    }
    const sorted = [...list].sort((p, q) => polylineLength(p.pts) - polylineLength(q.pts));
    for (const b of sorted.slice(0, -1)) {
      if (polylineLength(b.pts) < maxLength) {
        drop.add(b);
      }
    }
  }
  return drop.size ? mergeDegreeTwo(input.filter(b => !drop.has(b))) : input;
}

/** Unit direction leaving node c along branch b, measured `reach` pixels into the branch. */
function leavingDirection(b: Branch, c: number, reach: number): Pt {
  const pts = b.a === c ? b.pts : [...b.pts].reverse();
  const origin = first(pts);
  let target = last(pts);
  let acc = 0;
  for (let k = 1; k < pts.length; k++) {
    acc += dist(pts[k - 1] as Pt, pts[k] as Pt);
    if (acc >= reach) {
      target = pts[k] as Pt;
      break;
    }
  }
  const dx = target[0] - origin[0];
  const dy = target[1] - origin[1];
  const n = Math.hypot(dx, dy) || 1;
  return [dx / n, dy / n];
}

/**
 * At junctions of degree >= `minDegree` (default 3), joins the pair of branches that continue each other most
 * smoothly (angle between them close to 180°), so e.g. a headline crossed by stems stays one
 * stroke. Repeats while a pair is within `maxBendDeg`.
 */
export function mergeContinuations(
  input: Branch[],
  maxBendDeg = 45,
  reach = 10,
  minDegree = 3,
): Branch[] {
  let branches = [...input];
  const limit = -Math.cos((maxBendDeg * Math.PI) / 180);
  for (;;) {
    const d = degrees(branches);
    let merged = false;
    for (const [c, n] of [...d.entries()].sort((p, q) => p[0] - q[0])) {
      if (n < minDegree) {
        continue;
      }
      const at = branches.filter(b => (b.a === c) !== (b.b === c)); // exclude loops at c
      let best: { i: number; j: number; dot: number } | null = null;
      for (let i = 0; i < at.length; i++) {
        for (let j = i + 1; j < at.length; j++) {
          const di = leavingDirection(at[i] as Branch, c, reach);
          const dj = leavingDirection(at[j] as Branch, c, reach);
          const dot = di[0] * dj[0] + di[1] * dj[1];
          if (dot < limit && (!best || dot < best.dot)) {
            best = { i, j, dot };
          }
        }
      }
      if (best) {
        const e1 = at[best.i] as Branch;
        const e2 = at[best.j] as Branch;
        branches = branches.filter(b => b !== e1 && b !== e2);
        branches.push(joinAt(e1, e2, c));
        merged = true;
        break;
      }
    }
    if (!merged) {
      return branches;
    }
  }
}

/**
 * Where open branches meet one loop (e.g. the stem of ব entering its triangle, or the stem of ক
 * entering its bowl), joins one of them with the loop into one stroke: along the branch, then
 * round the loop the way that continues it most smoothly. With a single branch it is always
 * joined; with several, the smoothest one is joined if it bends less than 60°.
 */
export function joinLoops(input: Branch[], reach = 10): Branch[] {
  let branches = [...input];
  for (;;) {
    const d = degrees(branches);
    let joined = false;
    for (const [c, n] of [...d.entries()].sort((p, q) => p[0] - q[0])) {
      const loops = branches.filter(b => b.a === c && b.b === c);
      const open = branches.filter(b => (b.a === c) !== (b.b === c));
      if (n < 3 || loops.length !== 1 || open.length === 0) {
        continue;
      }
      const loop = loops[0] as Branch;
      const fwd = leavingDirection(loop, c, reach);
      const back = leavingDirection({ ...loop, pts: [...loop.pts].reverse() }, c, reach);
      let best: { stem: Branch; forward: boolean; score: number } | null = null;
      for (const stem of open) {
        const away = leavingDirection(stem, c, reach); // from c along the stem
        // arriving along the stem means moving in -away; a smooth way round keeps that heading
        for (const [dir, forward] of [
          [fwd, true],
          [back, false],
        ] as const) {
          const score = -(dir[0] * away[0] + dir[1] * away[1]);
          if (!best || score > best.score) {
            best = { stem, forward, score };
          }
        }
      }
      if (!best || (open.length > 1 && best.score < 0.5)) {
        continue;
      }
      const { stem, forward } = best;
      const ring = forward ? loop.pts : [...loop.pts].reverse();
      const p1 = stem.b === c ? stem.pts : [...stem.pts].reverse();
      branches = branches.filter(b => b !== loop && b !== stem);
      branches.push({ pts: [...p1, ...ring.slice(1)], a: stem.b === c ? stem.a : stem.b, b: c });
      joined = true;
      break;
    }
    if (!joined) {
      return branches;
    }
  }
}

/**
 * Joins free ends (degree-1 nodes) of different branches that are closer than `maxGap`. With
 * `maxBendDeg` < 180, only ends whose branches continue each other within that bend are joined.
 */
export function joinGaps(input: Branch[], maxGap: number, maxBendDeg = 180, reach = 10): Branch[] {
  let branches = [...input];
  const limit = -Math.cos((maxBendDeg * Math.PI) / 180);
  for (;;) {
    const d = degrees(branches);
    let best: { e1: Branch; e2: Branch; end1: 'a' | 'b'; end2: 'a' | 'b'; gap: number } | null =
      null;
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const e1 = branches[i] as Branch;
        const e2 = branches[j] as Branch;
        for (const end1 of ['a', 'b'] as const) {
          for (const end2 of ['a', 'b'] as const) {
            if (d.get(e1[end1]) !== 1 || d.get(e2[end2]) !== 1) {
              continue;
            }
            const p = end1 === 'a' ? first(e1.pts) : last(e1.pts);
            const q = end2 === 'a' ? first(e2.pts) : last(e2.pts);
            const gap = dist(p, q);
            if (gap >= maxGap || (best && gap >= best.gap)) {
              continue;
            }
            if (maxBendDeg < 180) {
              const di = leavingDirection(e1, e1[end1], reach);
              const dj = leavingDirection(e2, e2[end2], reach);
              if (di[0] * dj[0] + di[1] * dj[1] > limit) {
                continue;
              }
            }
            best = { e1, e2, end1, end2, gap };
          }
        }
      }
    }
    if (!best) {
      return branches;
    }
    const { e1, e2, end1, end2 } = best;
    const p1 = end1 === 'b' ? e1.pts : [...e1.pts].reverse();
    const p2 = end2 === 'a' ? e2.pts : [...e2.pts].reverse();
    const joined: Branch = {
      pts: [...p1, ...p2],
      a: end1 === 'b' ? e1.a : e1.b,
      b: end2 === 'a' ? e2.b : e2.a,
    };
    branches = branches.filter(b => b !== e1 && b !== e2);
    branches.push(joined);
  }
}

/**
 * Drops tiny branches, but never empties a connected part of the glyph: a dot (e.g. in ঃ) keeps
 * its longest branch.
 */
export function dropTiny(input: Branch[], minLength: number): Branch[] {
  const parent = new Map<number, number>();
  const find = (i: number): number => {
    if (!parent.has(i)) {
      parent.set(i, i);
    }
    let r = i;
    while (parent.get(r) !== r) {
      r = parent.get(r) as number;
    }
    return r;
  };
  for (const b of input) {
    const ra = find(b.a);
    const rb = find(b.b);
    if (ra !== rb) {
      parent.set(Math.max(ra, rb), Math.min(ra, rb));
    }
  }
  const groups = new Map<number, Branch[]>();
  for (const b of input) {
    const r = find(b.a);
    groups.set(r, [...(groups.get(r) ?? []), b]);
  }
  const out: Branch[] = [];
  for (const list of groups.values()) {
    const keep = list.filter(b => polylineLength(b.pts) >= minLength);
    if (keep.length) {
      out.push(...keep);
    } else {
      const longest = [...list].sort((p, q) => polylineLength(q.pts) - polylineLength(p.pts))[0];
      if (longest) {
        out.push(longest);
      }
    }
  }
  return out;
}

/** Ramer–Douglas–Peucker simplification. Keeps first and last points. */
export function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) {
    return [...pts];
  }
  const a = first(pts);
  const b = last(pts);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  let maxD = -1;
  let idx = 0;
  for (let k = 1; k < pts.length - 1; k++) {
    const p = pts[k] as Pt;
    const dd =
      len < 1e-9 ? dist(p, a) : Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
    if (dd > maxD) {
      maxD = dd;
      idx = k;
    }
  }
  if (maxD <= eps) {
    return [a, b];
  }
  const left = rdp(pts.slice(0, idx + 1), eps);
  const right = rdp(pts.slice(idx), eps);
  return [...left.slice(0, -1), ...right];
}

// ---------------------------------------------------------------------------------------------
// Headline (Bengali mātrā / Devanagari śirorekhā) and spurs
// ---------------------------------------------------------------------------------------------

/** Rows y0..y1 (inclusive, pixels) of a headline bar found in a raster. */
export type Band = { y0: number; y1: number };

/** Labels the 8-connected parts of a 0/1 grid (0 = background, parts numbered from 1). */
export function labelComponents(grid: Uint8Array, w: number, h: number): Int32Array {
  const labels = new Int32Array(w * h);
  let next = 0;
  for (let start = 0; start < w * h; start++) {
    if (!grid[start] || labels[start]) {
      continue;
    }
    next++;
    labels[start] = next;
    const stack = [start];
    while (stack.length) {
      const i = stack.pop() as number;
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          const j = yy * w + xx;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && grid[j] && !labels[j]) {
            labels[j] = next;
            stack.push(j);
          }
        }
      }
    }
  }
  return labels;
}

/** Runs of set pixels in row y, as [start, end] (inclusive). */
function rowRuns(grid: Uint8Array, w: number, y: number): [number, number][] {
  const runs: [number, number][] = [];
  let s = -1;
  for (let x = 0; x <= w; x++) {
    const on = x < w && grid[y * w + x] === 1;
    if (on && s < 0) {
      s = x;
    } else if (!on && s >= 0) {
      runs.push([s, x - 1]);
      s = -1;
    }
  }
  return runs;
}

/**
 * Typical pen width of a glyph in pixels: the median, over skeleton pixels, of the shorter of the
 * horizontal and vertical ink runs through that pixel.
 */
export function strokeWidth(grid: Uint8Array, skeleton: Uint8Array, w: number, h: number): number {
  const widths: number[] = [];
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && grid[y * w + x] === 1;
  for (let i = 0; i < w * h; i++) {
    if (!skeleton[i]) {
      continue;
    }
    const x = i % w;
    const y = (i - x) / w;
    let l = x;
    let r = x;
    let t = y;
    let b = y;
    while (on(l - 1, y)) {
      l--;
    }
    while (on(r + 1, y)) {
      r++;
    }
    while (on(x, t - 1)) {
      t--;
    }
    while (on(x, b + 1)) {
      b++;
    }
    widths.push(Math.min(r - l + 1, b - t + 1));
  }
  widths.sort((p, q) => p - q);
  return widths[Math.floor(widths.length / 2)] ?? 0;
}

/**
 * Finds the headline bar in a raster: in the upper part of the glyph, a straight horizontal bar of
 * ink (at least `minRows` (and 3) rows that start and end at nearly the same x, unlike the top of
 * a curve) that is at least `minWidth` of the glyph wide. Of several, the one with the largest
 * area wins. Null when there is none.
 */
export function findHeadlineBand(
  grid: Uint8Array,
  w: number,
  h: number,
  minWidth = 0.3,
  minRows = 3,
): Band | null {
  let minX = w;
  let maxX = -1;
  let minY = h;
  let maxY = -1;
  for (let i = 0; i < w * h; i++) {
    if (grid[i]) {
      const x = i % w;
      const y = (i - x) / w;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) {
    return null;
  }
  const gw = maxX - minX + 1;
  const gh = maxY - minY + 1;
  const yLimit = minY + Math.floor(0.45 * gh);
  const runs = new Map<number, [number, number][]>();
  for (let y = minY; y <= yLimit + 1; y++) {
    runs.set(y, rowRuns(grid, w, y));
  }
  let best: (Band & { area: number }) | null = null;
  for (let y = minY; y <= yLimit; y++) {
    for (const [s, e] of runs.get(y) ?? []) {
      const width = e - s + 1;
      if (width < minWidth * gw) {
        continue;
      }
      const slack = Math.max(3, 0.06 * width);
      const matches = (yy: number) =>
        (runs.get(yy) ?? []).some(r => Math.abs(r[0] - s) <= slack && Math.abs(r[1] - e) <= slack);
      if (matches(y - 1)) {
        continue; // not the top row of this bar
      }
      let y1 = y;
      while (y1 + 1 <= yLimit + 1 && matches(y1 + 1)) {
        y1++;
      }
      const rows = y1 - y + 1;
      const area = rows * width;
      if (rows >= Math.max(3, minRows) && rows <= 0.15 * gh && (!best || area > best.area)) {
        best = { y0: y, y1, area };
      }
    }
  }
  return best ? { y0: best.y0, y1: best.y1 } : null;
}

/**
 * Cuts the headline out of the skeleton: every run of branch points inside the band that is
 * horizontal, at least `minRun` pixels wide, lies on solid ink of the bar and (if given) is centred
 * within one of the x ranges `within`, is a headline piece. What is left of each branch
 * stays a branch; nodes where something touched the headline are returned in `attached`.
 */
export function extractHeadline(
  input: Branch[],
  band: Band,
  minRun: number,
  grid: Uint8Array,
  w: number,
  within?: [number, number][],
): { rest: Branch[]; pieces: Pt[][]; attached: Set<number> } {
  // the skeleton of the bar runs along its middle row
  const mid = (band.y0 + band.y1 + 1) / 2;
  const tol = Math.max(2, 0.25 * (band.y1 - band.y0 + 1));
  const inBand = (p: Pt) => Math.abs(p[1] - mid) <= tol;
  // the bar's full thickness is ink above and below this point, and there is no ink just above
  // the bar (not the thick top of a curve)
  const solid = (p: Pt) => {
    const x = Math.floor(p[0]);
    if (band.y0 >= 2 && grid[(band.y0 - 2) * w + x] === 1) {
      return false;
    }
    for (let y = band.y0 + 1; y < band.y1; y++) {
      if (grid[y * w + x] !== 1) {
        return false;
      }
    }
    return true;
  };
  const rest: Branch[] = [];
  const pieces: Pt[][] = [];
  const attached = new Set<number>();
  let cutId = Math.min(0, ...input.flatMap(b => [b.a, b.b])) - 1;
  for (const b of input) {
    const runs: [number, number][] = [];
    let s = -1;
    for (let k = 0; k <= b.pts.length; k++) {
      const on = k < b.pts.length && inBand(b.pts[k] as Pt);
      if (on && s < 0) {
        s = k;
      } else if (!on && s >= 0) {
        const run = b.pts.slice(s, k);
        const bb = bbox(run);
        const dx = bb.maxX - bb.minX;
        const cx = (bb.minX + bb.maxX) / 2;
        if (
          dx >= minRun &&
          run.filter(solid).length >= 0.7 * run.length &&
          (!within || within.some(([x0, x1]) => cx >= x0 - 2 && cx <= x1 + 2))
        ) {
          runs.push([s, k - 1]);
        }
        s = -1;
      }
    }
    if (runs.length === 0) {
      rest.push(b);
      continue;
    }
    let from = 0;
    let fromNode = b.a;
    runs.forEach(([r0, r1], idx) => {
      pieces.push(b.pts.slice(r0, r1 + 1));
      if (r0 === 0) {
        attached.add(b.a);
      }
      if (r1 === b.pts.length - 1) {
        attached.add(b.b);
      }
      if (r0 > from) {
        const node = cutId--;
        attached.add(node);
        rest.push({ pts: b.pts.slice(from, r0 + 1), a: fromNode, b: node });
      }
      from = r1;
      fromNode = cutId--;
      attached.add(fromNode);
      if (idx === runs.length - 1 && r1 < b.pts.length - 1) {
        rest.push({ pts: b.pts.slice(r1), a: fromNode, b: b.b });
      }
    });
  }
  return { rest, pieces, attached };
}

/**
 * Turns headline pieces into whole bars: pieces whose gap is bridged by ink in the raster become
 * one straight left-to-right bar from the left to the right end of the ink (minus half the bar
 * thickness). Bars shorter than `minLength` pixels are dropped.
 */
export function mergeHeadPieces(
  pieces: Pt[][],
  grid: Uint8Array,
  w: number,
  band: Band,
  minLength: number,
): Pt[][] {
  const row = Math.round((band.y0 + band.y1) / 2);
  const ink = (x: number) => x >= 0 && x < w && grid[row * w + x] === 1;
  const sorted = pieces
    .map(p => ({ pts: p, b: bbox(p) }))
    .sort((p, q) => p.b.minX - q.b.minX || p.b.minY - q.b.minY);
  const clusters: Pt[][][] = [];
  let right = -Infinity;
  for (const { pts, b } of sorted) {
    let bridged = false;
    if (clusters.length) {
      bridged = b.minX <= right + 1;
      if (!bridged) {
        let on = 0;
        const xs = Math.floor(right);
        const xe = Math.ceil(b.minX);
        for (let x = xs; x <= xe; x++) {
          on += ink(x) ? 1 : 0;
        }
        bridged = on >= 0.9 * (xe - xs + 1);
      }
    }
    if (bridged) {
      (clusters[clusters.length - 1] as Pt[][]).push(pts);
    } else {
      clusters.push([pts]);
    }
    right = Math.max(bridged ? right : -Infinity, b.maxX);
  }
  const half = (band.y1 - band.y0 + 1) / 2;
  const out: Pt[][] = [];
  for (const c of clusters) {
    const all = c.flat();
    const b = bbox(all);
    let l = Math.floor(b.minX);
    while (ink(l - 1)) {
      l--;
    }
    let r = Math.floor(b.maxX);
    while (ink(r + 1)) {
      r++;
    }
    const x0 = Math.min(b.minX, l + half);
    const x1 = Math.max(b.maxX, r + 1 - half);
    const ys = all.map(p => p[1]).sort((p, q) => p - q);
    const y = ys[Math.floor(ys.length / 2)] as number;
    if (x1 - x0 >= minLength) {
      out.push([
        [x0, y],
        [x1, y],
      ]);
    }
  }
  return out;
}

/**
 * Drops short branches (< `minLength`, measured on the smoothed line) that touch other strokes: their part of the raster also
 * holds another branch or one of `others` (e.g. the headline). Shortest first, one at a time, so
 * an isolated dot made of two crumbs keeps one of them.
 */
export function dropSpurs(
  input: Branch[],
  others: Pt[][],
  labels: Int32Array,
  w: number,
  minLength: number,
): Branch[] {
  const labelOf = (pts: Pt[]) => {
    for (const [x, y] of pts) {
      const l = labels[Math.floor(y) * w + Math.floor(x)] ?? 0;
      if (l) {
        return l;
      }
    }
    return 0;
  };
  const otherLabels = others.map(labelOf);
  let branches = [...input];
  for (;;) {
    const lab = branches.map(b => labelOf(b.pts));
    const spur = branches
      .map((b, i) => ({ b, i, len: polylineLength(rdp(b.pts, 1)) }))
      .filter(({ len }) => len < minLength)
      .filter(
        ({ i }) =>
          lab[i] !== 0 &&
          (otherLabels.includes(lab[i] as number) || lab.some((l, j) => j !== i && l === lab[i])),
      )
      .sort((p, q) => p.len - q.len || p.i - q.i)[0];
    if (!spur) {
      return branches;
    }
    branches = branches.filter(b => b !== spur.b);
  }
}

// ---------------------------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------------------------

const isClosed = (pts: Pt[]) => pts.length > 3 && dist(first(pts), last(pts)) < 0.02;

/**
 * Starts loops at their top point; near-horizontal open strokes at their left end; other open
 * strokes at their upper end.
 */
export function orientStroke(pts: Pt[]): Pt[] {
  if (isClosed(pts)) {
    const ring = pts.slice(0, -1);
    let k = 0;
    ring.forEach((p, i) => {
      const q = ring[k] as Pt;
      if (p[1] < q[1] - 1e-9 || (Math.abs(p[1] - q[1]) <= 1e-9 && p[0] < q[0])) {
        k = i;
      }
    });
    const rotated = [...ring.slice(k), ...ring.slice(0, k)];
    return [...rotated, rotated[0] as Pt];
  }
  const a = first(pts);
  const b = last(pts);
  const dx = Math.abs(a[0] - b[0]);
  const dy = Math.abs(a[1] - b[1]);
  const flip = dy > 0.05 && dx < 3 * dy ? b[1] < a[1] : b[0] < a[0];
  return flip ? [...pts].reverse() : [...pts];
}

/**
 * True for a Bengali/Devanagari headline (mātrā): a long, flat, horizontal stroke near the top
 * of the glyph, or a shorter but perfectly flat one at the very top (e.g. the bit of mātrā right
 * of the stem in প or গ).
 */
export function isHeadline(pts: Pt[], glyph: BBox): boolean {
  const b = bbox(pts);
  const gw = glyph.maxX - glyph.minX;
  const gh = glyph.maxY - glyph.minY;
  const meanY = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const width = b.maxX - b.minX;
  const height = b.maxY - b.minY;
  return (
    gw > 0 &&
    ((height <= 0.08 && width >= 0.35 * gw && meanY <= glyph.minY + 0.25 * gh) ||
      (height <= 0.02 && width >= 0.08 && meanY <= glyph.minY + 0.15 * gh))
  );
}

function segmentDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t =
    len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return dist(p, [a[0] + t * dx, a[1] + t * dy]);
}

/** Smallest distance between two polylines (vertex to segment, both ways). */
export function polylineDistance(p: Pt[], q: Pt[]): number {
  const one = (u: Pt[], v: Pt[]) => {
    let best = Infinity;
    for (const pt of u) {
      if (v.length === 1) {
        best = Math.min(best, dist(pt, v[0] as Pt));
      }
      for (let k = 1; k < v.length; k++) {
        best = Math.min(best, segmentDistance(pt, v[k - 1] as Pt, v[k] as Pt));
      }
    }
    return best;
  };
  return Math.min(one(p, q), one(q, p));
}

/** True for a vertical stem: a long, straight, near-vertical stroke. */
export function isStem(pts: Pt[], glyph: BBox): boolean {
  const a = first(pts);
  const b = last(pts);
  const dx = Math.abs(b[0] - a[0]);
  const dy = Math.abs(b[1] - a[1]);
  const gh = glyph.maxY - glyph.minY;
  return (
    !isClosed(pts) &&
    dy >= 0.3 * gh &&
    dx <= 0.2 * dy &&
    pts.every(p => segmentDistance(p, a, b) <= 0.04)
  );
}

/** A dot (nukta, anusvāra, the dot of a candrabindu): tiny and apart from every other stroke. */
function isDot(s: Pt[], all: Pt[][]): boolean {
  const b = bbox(s);
  return (
    Math.hypot(b.maxX - b.minX, b.maxY - b.minY) < 0.06 &&
    all.every(o => o === s || polylineDistance(s, o) > 0.03)
  );
}

/**
 * Placeholder stroke order. Latin: top-to-bottom, then left-to-right by start point.
 * Bengali/Devanagari: body strokes and curves first (top-to-bottom, then left-to-right by start),
 * then the vertical stems (left to right), then the headline (left to right), then marks floating
 * above the headline, then dots. Without a headline (e.g. numerals), strokes that touch form a
 * group and groups go left to right, so multi-digit numbers are written digit by digit.
 * `headlines` are strokes known to be headlines.
 */
export function orderStrokes(strokes: Pt[][], script: Script, headlines: Pt[][] = []): Pt[][] {
  const oriented = strokes.map(orientStroke);
  const byStart = (p: Pt[], q: Pt[]) => {
    const a = first(p);
    const b = first(q);
    return Math.round(a[1] * 10) - Math.round(b[1] * 10) || a[0] - b[0] || a[1] - b[1];
  };
  if (script === 'Latn') {
    return [...oriented, ...headlines.map(orientStroke)].sort(byStart);
  }
  const ltr = (s: Pt[]) => (first(s)[0] > last(s)[0] ? [...s].reverse() : s);
  const glyph = bbox([...oriented, ...headlines].flat());
  const head = new Set<Pt[]>();
  const all: Pt[][] = [];
  for (const s of [...oriented, ...headlines]) {
    if (headlines.includes(s) || isHeadline(s, glyph)) {
      const h = ltr(s);
      head.add(h);
      all.push(h);
    } else {
      all.push(s);
    }
  }
  const dots = all.length > 1 ? all.filter(s => !head.has(s) && isDot(s, all)) : [];
  const rest = all.filter(s => !dots.includes(s));
  // strokes that touch form a group
  const parent = rest.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      i = parent[i] as number;
    }
    return i;
  };
  for (let i = 0; i < rest.length; i++) {
    for (let j = i + 1; j < rest.length; j++) {
      const ri = find(i);
      const rj = find(j);
      if (ri !== rj && polylineDistance(rest[i] as Pt[], rest[j] as Pt[]) <= 0.04) {
        parent[Math.max(ri, rj)] = Math.min(ri, rj);
      }
    }
  }
  const groupMap = new Map<number, Pt[][]>();
  rest.forEach((s, i) => groupMap.set(find(i), [...(groupMap.get(find(i)) ?? []), s]));
  let groups = [...groupMap.values()];
  // With a headline the letter is one unit, except marks floating above it (e.g. the arc of a
  // candrabindu), which are written after the headline.
  let marks: Pt[][] = [];
  if (head.size > 0) {
    const headTop = Math.min(...[...head].map(h => bbox(h).minY));
    const above = (g: Pt[][]) => !g.some(x => head.has(x)) && bbox(g.flat()).maxY < headTop;
    marks = groups.filter(above).flat();
    groups = [groups.filter(g => !above(g)).flat()];
  }
  const ordered = groups.sort((p, q) => {
    const a = bbox(p.flat());
    const b = bbox(q.flat());
    return a.minX - b.minX || a.minY - b.minY;
  });
  const byX = (p: Pt[], q: Pt[]) => first(p)[0] - first(q)[0] || first(p)[1] - first(q)[1];
  const out: Pt[][] = [];
  for (const g of ordered) {
    const heads = g.filter(s => head.has(s));
    const stems = g.filter(s => !head.has(s) && isStem(s, glyph));
    const body = g.filter(s => !head.has(s) && !stems.includes(s));
    out.push(...body.sort(byStart), ...stems.sort(byX), ...heads.sort(byX));
  }
  return [...out, ...marks.sort(byStart), ...dots.sort(byStart)];
}

// ---------------------------------------------------------------------------------------------
// Outline -> placeholder strokes
// ---------------------------------------------------------------------------------------------

export type StrokeOptions = {
  /** Look for a headline (Bengali/Devanagari letters and signs; not numerals). Default true. */
  headline?: boolean;
};

/** Placeholder strokes (unit box, 3 decimals) for an outline already in the unit box. */
export function strokesFromOutline(
  outline: string,
  script: Script,
  size = RASTER_SIZE,
  options: StrokeOptions = {},
): Pt[][] {
  const contours = flattenPath(parseOutline(outline)).map(c =>
    c.map(([x, y]) => [x * size, y * size] as Pt),
  );
  const grid = rasterize(contours, size, size);
  const skeleton = zhangSuen(grid, size, size);
  let branches = traceSkeleton(skeleton, size, size);
  branches = pruneSpurs(branches, size * 0.07);
  branches = contractShortLinks(branches, size * 0.06);
  branches = dropParallel(branches, size * 0.12);
  branches = pruneSpurs(branches, size * 0.07);
  let heads: Pt[][] = [];
  let attached = new Set<number>();
  if (script !== 'Latn' && (options.headline ?? true)) {
    const band = findHeadlineBand(
      grid,
      size,
      size,
      0.3,
      0.7 * strokeWidth(grid, skeleton, size, size),
    );
    if (band) {
      // keep the main bar and bars nearly as wide; a short flat bit apart from it (e.g. the flat
      // top of the curve of Devanagari अ) stays part of its stroke
      const bars = mergeHeadPieces(
        extractHeadline(branches, band, size * 0.03, grid, size).pieces,
        grid,
        size,
        band,
        size * 0.1,
      );
      const width = (s: Pt[]) => last(s)[0] - first(s)[0];
      const widest = Math.max(0, ...bars.map(width));
      heads = bars.filter(s => width(s) >= 0.6 * widest);
      const cut = extractHeadline(
        branches,
        band,
        size * 0.03,
        grid,
        size,
        heads.map(s => [first(s)[0], last(s)[0]] as [number, number]),
      );
      if (heads.length) {
        // bits left lying inside a bar (e.g. under the hook of ই) are covered by the headline
        const half = (band.y1 - band.y0 + 1) / 2 + 1;
        const mid = (band.y0 + band.y1 + 1) / 2;
        const covered = (p: Pt) =>
          Math.abs(p[1] - mid) <= half &&
          heads.some(s => p[0] >= first(s)[0] - 2 && p[0] <= last(s)[0] + 2);
        branches = cut.rest.filter(b => !b.pts.every(covered));
        attached = cut.attached;
      }
    }
  }
  branches = mergeContinuations(branches);
  branches = mergeDegreeTwo(branches, attached);
  branches = mergeContinuations(branches, 50, 10, 2);
  if (script !== 'Latn') {
    branches = joinLoops(branches);
  }
  branches = joinGaps(branches, size * 0.025, heads.length ? 60 : 180);
  branches = dropTiny(branches, size * 0.04);
  if (script !== 'Latn') {
    branches = dropSpurs(branches, heads, labelComponents(grid, size, size), size, size * 0.09);
    branches = mergeDegreeTwo(branches, attached);
    branches = mergeContinuations(branches, 50, 10, 2);
    branches = joinLoops(branches);
  }
  const toUnit = (pts: Pt[]): Pt[] => {
    const simple = rdp(pts, 1.0).map(([x, y]) => [x / size, y / size] as Pt);
    if (simple.length === 1 || polylineLength(simple) < 0.005) {
      // a dot becomes a tiny dash, long enough not to count as a tap for the scorer
      const [x, y] = first(simple);
      return [
        [x - 0.015, y],
        [x + 0.015, y],
      ] as Pt[];
    }
    return simple;
  };
  const clamp = (v: number) => round3(Math.min(1, Math.max(0, v)));
  return orderStrokes(
    branches.map(b => toUnit(b.pts)),
    script,
    heads.map(toUnit),
  ).map(s => s.map(([x, y]) => [clamp(x), clamp(y)] as Pt));
}

// ---------------------------------------------------------------------------------------------
// geometry.json merge
// ---------------------------------------------------------------------------------------------

export type Traceable = { key: string; text: string };

export function traceablesOf(pack: PackContent): Traceable[] {
  return [
    ...pack.letters.map(l => ({ key: `letter:${l.id}`, text: l.glyph })),
    ...(pack.signs ?? []).map(s => ({ key: `sign:${s.id}`, text: s.result })),
    ...pack.numbers.map(n => ({ key: `number:${n.value}`, text: n.numeral })),
  ];
}

/**
 * Combines freshly generated entries with the existing file. Human strokes (`reviewed`,
 * `recorded`) are kept unless the text changed; entries for removed items are dropped unless
 * human-made (kept with a warning so no work is lost).
 */
export function mergeGeometry(
  existing: GeometryFile,
  items: Traceable[],
  generate: (t: Traceable) => GlyphGeometry,
  warn: (msg: string) => void,
): GeometryFile {
  const out: GeometryFile = {};
  for (const t of items) {
    const prev = existing[t.key];
    if (prev && prev.strokeSource !== 'auto') {
      if (prev.text === t.text) {
        out[t.key] = prev;
        continue;
      }
      warn(
        `!!! ${t.key}: text changed from "${prev.text}" to "${t.text}"; ${prev.strokeSource} strokes were REPLACED by auto strokes. Re-review or re-record them.`,
      );
    }
    out[t.key] = generate(t);
  }
  for (const [key, prev] of Object.entries(existing)) {
    if (!(key in out) && prev.strokeSource !== 'auto') {
      warn(`${key}: item no longer exists; keeping its ${prev.strokeSource} geometry`);
      out[key] = prev;
    }
  }
  return out;
}

/** Stable JSON: sorted keys everywhere, numbers rounded to 3 decimals. */
export function stableGeometryJson(geometry: GeometryFile): string {
  const sortKeys = (v: unknown): unknown => {
    if (Array.isArray(v)) {
      return v.map(sortKeys);
    }
    if (typeof v === 'number') {
      return round3(v);
    }
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map(k => [k, sortKeys((v as Record<string, unknown>)[k])]),
      );
    }
    return v;
  };
  return `${JSON.stringify(sortKeys(geometry), null, 2)}\n`;
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const PACKS_DIR = path.join(ROOT, 'src/content/packs');
const FONTS_DIR = path.join(ROOT, 'android/app/src/main/assets/fonts');

type HB = typeof import('harfbuzzjs');

/** Shapes `text` and returns its outline in font units (y up), glyphs placed along the pen. */
function shapeOutline(
  hb: HB,
  font: InstanceType<HB['Font']>,
  text: string,
  lang: string,
): PathCmd[] {
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  buffer.setLanguage(lang);
  // Standalone marks (ং ঃ ঁ) must not get a dotted circle drawn into the tracing outline.
  buffer.setFlags(hb.BufferFlag.DO_NOT_INSERT_DOTTED_CIRCLE);
  hb.shape(font, buffer);
  const cmds: PathCmd[] = [];
  let penX = 0;
  let penY = 0;
  for (const g of buffer.getGlyphInfosAndPositions()) {
    const ox = penX + (g.xOffset ?? 0);
    const oy = penY + (g.yOffset ?? 0);
    for (const c of font.glyphToJson(g.codepoint)) {
      const type = c.type.toUpperCase();
      if (type === 'Z') {
        cmds.push({ type: 'Z', values: [] });
        continue;
      }
      const vals = c.values.map((v, k) => v + (k % 2 === 0 ? ox : oy));
      cmds.push({ type, values: vals } as PathCmd);
    }
    penX += g.xAdvance ?? 0;
    penY += g.yAdvance ?? 0;
  }
  return cmds;
}

export function registeredPackIds(indexSource: string): string[] {
  const ids = new Set<string>();
  for (const m of indexSource.matchAll(/from '\.\/([a-z]{3}-[a-z]{4})\/pack\.json'/g)) {
    ids.add(m[1] as string);
  }
  return [...ids];
}

async function main() {
  const hb: HB = await import('harfbuzzjs');
  const prettier = await import('prettier');
  const ids = registeredPackIds(fs.readFileSync(path.join(PACKS_DIR, 'index.ts'), 'utf8'));
  let warnings = 0;
  for (const id of ids) {
    const dir = path.join(PACKS_DIR, id);
    const pack = JSON.parse(fs.readFileSync(path.join(dir, 'pack.json'), 'utf8')) as PackContent;
    const fontFile = path.join(FONTS_DIR, `${pack.fontFamily}.ttf`);
    if (!fs.existsSync(fontFile)) {
      throw new Error(`${id}: font ${fontFile} not found`);
    }
    const data = fs.readFileSync(fontFile);
    const blob = new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    const face = new hb.Face(blob, 0);
    const font = new hb.Font(face);
    const geoPath = path.join(dir, 'geometry.json');
    const existing = fs.existsSync(geoPath)
      ? (JSON.parse(fs.readFileSync(geoPath, 'utf8')) as GeometryFile)
      : {};
    const result = mergeGeometry(
      existing,
      traceablesOf(pack),
      t => {
        const fitted = fitToUnitBox(shapeOutline(hb, font, t.text, pack.language.iso639_3));
        if (fitted.length === 0) {
          throw new Error(`${id} ${t.key}: "${t.text}" has no outline in ${pack.fontFamily}`);
        }
        const outline = formatOutline(fitted);
        return {
          text: t.text,
          outline,
          strokes: strokesFromOutline(outline, pack.script, RASTER_SIZE, {
            headline: !t.key.startsWith('number:'),
          }).map(points => ({ points })),
          strokeSource: 'auto',
        };
      },
      msg => {
        warnings++;
        console.warn(`  ⚠ ${id}: ${msg}`);
      },
    );
    const options = (await prettier.resolveConfig(geoPath)) ?? {};
    const formatted = await prettier.format(stableGeometryJson(result), {
      ...options,
      filepath: geoPath,
    });
    const before = fs.existsSync(geoPath) ? fs.readFileSync(geoPath, 'utf8') : '';
    if (before !== formatted) {
      fs.writeFileSync(geoPath, formatted);
    }
    console.warn(`${before === formatted ? '=' : '✎'} ${id}: ${Object.keys(result).length} glyphs`);
  }
  if (warnings) {
    console.warn(`\n${warnings} warning(s): read them above.`);
  }
}

if (require.main === module) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
