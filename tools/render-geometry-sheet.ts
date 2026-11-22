/**
 * Dev-only: renders every registered pack's geometry.json into PNG contact sheets so generated
 * strokes can be checked by eye. `npm run render:geometry [packId...]`
 *
 * Each cell shows the outline (filled light), every stroke as a coloured polyline with a start dot
 * and its number, and the item key. Sheets go to `.geometry-sheets/` (gitignored). Also prints the
 * average stroke count per pack.
 */
import fs from 'node:fs';
import path from 'node:path';

import type { GeometryFile } from '../src/content/schema';
import { registeredPackIds } from './glyph-geometry';

const ROOT = path.resolve(__dirname, '..');
const PACKS_DIR = path.join(ROOT, 'src/content/packs');
const OUT_DIR = path.join(ROOT, '.geometry-sheets');

const CELL = 180;
const COLS = 8;
const PER_SHEET = 48;
const COLOURS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#008080', '#9a6324'];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** SVG markup of one cell (glyph box drawn into a CELL x CELL square at x0, y0). */
export function cellSvg(key: string, entry: GeometryFile[string], x0: number, y0: number): string {
  const pad = 6;
  const box = CELL - 2 * pad - 14;
  const tx = x0 + pad + (CELL - 2 * pad - box) / 2;
  const ty = y0 + pad;
  const parts: string[] = [
    `<rect x="${x0 + 1}" y="${y0 + 1}" width="${CELL - 2}" height="${CELL - 2}" fill="#fff" stroke="#ccc"/>`,
    `<g transform="translate(${tx} ${ty}) scale(${box})">`,
    `<path d="${entry.outline}" fill="#dde3ea" fill-rule="nonzero"/>`,
  ];
  entry.strokes.forEach((s, i) => {
    const c = COLOURS[i % COLOURS.length] as string;
    const pts = s.points.map(([x, y]) => `${x},${y}`).join(' ');
    parts.push(
      `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="0.022" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>`,
    );
  });
  parts.push('</g>');
  entry.strokes.forEach((s, i) => {
    const c = COLOURS[i % COLOURS.length] as string;
    const [x, y] = s.points[0] as [number, number];
    const cx = tx + x * box;
    const cy = ty + y * box;
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="7" fill="${c}" stroke="#fff" stroke-width="1"/>`,
      `<text x="${cx}" y="${cy + 3.5}" font-size="10" font-family="sans-serif" font-weight="bold" fill="#fff" text-anchor="middle">${i + 1}</text>`,
    );
  });
  const tag = entry.strokeSource === 'auto' ? '' : ` [${entry.strokeSource}]`;
  parts.push(
    `<text x="${x0 + CELL / 2}" y="${y0 + CELL - 6}" font-size="11" font-family="sans-serif" fill="#333" text-anchor="middle">${esc(key + tag)} (${entry.strokes.length})</text>`,
  );
  return parts.join('');
}

export function sheetSvg(entries: [string, GeometryFile[string]][]): string {
  const rows = Math.ceil(entries.length / COLS);
  const w = COLS * CELL;
  const h = rows * CELL;
  const cells = entries.map(([k, e], i) =>
    cellSvg(k, e, (i % COLS) * CELL, Math.floor(i / COLS) * CELL),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#f4f4f4"/>${cells.join('')}</svg>`;
}

async function main() {
  const { Resvg } = await import('@resvg/resvg-js');
  const all = registeredPackIds(fs.readFileSync(path.join(PACKS_DIR, 'index.ts'), 'utf8'));
  const args = process.argv.slice(2);
  const ids = args.length ? all.filter(id => args.includes(id)) : all;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const id of ids) {
    const geo = JSON.parse(
      fs.readFileSync(path.join(PACKS_DIR, id, 'geometry.json'), 'utf8'),
    ) as GeometryFile;
    const groups = new Map<string, [string, GeometryFile[string]][]>();
    for (const [k, e] of Object.entries(geo)) {
      const kind = k.split(':')[0] as string;
      groups.set(kind, [...(groups.get(kind) ?? []), [k, e]]);
    }
    for (const [kind, list] of groups) {
      list.sort((p, q) => p[0].localeCompare(q[0], 'en', { numeric: true }));
      for (let s = 0; s * PER_SHEET < list.length; s++) {
        const svg = sheetSvg(list.slice(s * PER_SHEET, (s + 1) * PER_SHEET));
        const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
        const file = path.join(OUT_DIR, `${id}-${kind}-${s + 1}.png`);
        fs.writeFileSync(file, png);
        console.warn(`wrote ${path.relative(ROOT, file)}`);
      }
    }
    const counts = Object.values(geo).map(e => e.strokes.length);
    const avg = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
    console.warn(`${id}: ${counts.length} glyphs, ${avg.toFixed(2)} strokes on average`);
  }
}

if (require.main === module) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
