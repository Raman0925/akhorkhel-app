/**
 * Shared brand pieces for the store-asset tools: the mascot SVG, glyph outlines shaped with
 * HarfBuzz from the app's own Noto fonts (resvg never sees a system font), colours and fonts.
 */
import fs from 'node:fs';
import path from 'node:path';

import { fitToUnitBox, mapPath, shapeOutline, type PathCmd } from '../glyph-geometry';

export const ROOT = path.resolve(__dirname, '../..');
export const FONTS_DIR = path.join(ROOT, 'android/app/src/main/assets/fonts');
export const BRAND_DIR = path.join(ROOT, 'assets/brand');

/** Font files resvg loads for <text> (it is never allowed to fall back to system fonts). */
export const FONT_FILES = [
  'NotoSansBengali-Regular.ttf',
  'NotoSansBengali-Bold.ttf',
  'NotoSans-Regular.ttf',
  'NotoSans-Bold.ttf',
].map(f => path.join(FONTS_DIR, f));

/** Same values as src/theme/tokens.ts (kept as literals so this file does not import RN code). */
export const BRAND = {
  background: '#FFF8EC',
  surface: '#FFFFFF',
  surfaceAlt: '#FDEFD6',
  primary: '#E2574C',
  primaryDark: '#B8433A',
  secondary: '#2E8B57',
  accent: '#F4B400',
  sky: '#4A90D9',
  text: '#2B2118',
  textMuted: '#6B5E52',
  border: '#E8D9C2',
  guide: '#C9B8A3',
  ink: '#3A6FD8',
  startDot: '#2E8B57',
  arrow: '#E2574C',
  /** Icon background: a sunny yellow, lighter than the star gold. */
  sun: '#FFD45C',
  /** Rhino body grey (mascot-rhino.svg). */
  rhino: '#8C98AE',
} as const;

const MASCOT_VIEWBOX = 400;

/** Inner markup of assets/brand/mascot-rhino.svg (drawn in a 400 × 400 box). */
export function mascotInner(): string {
  const svg = fs.readFileSync(path.join(BRAND_DIR, 'mascot-rhino.svg'), 'utf8');
  const m = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg);
  if (!m) {
    throw new Error('mascot-rhino.svg: no <svg> element');
  }
  return (m[1] as string).replace(/<!--[\s\S]*?-->/g, '').trim();
}

/**
 * The mascot placed with its 400-unit box at (x, y) with side `size`. `bleed` continues the
 * shoulders below the box (for layouts where the body runs off the bottom edge).
 */
export function mascotAt(x: number, y: number, size: number, bleed = false): string {
  const s = size / MASCOT_VIEWBOX;
  const ext = bleed ? `<rect x="78" y="396" width="244" height="2000" fill="${BRAND.rhino}"/>` : '';
  return `<g transform="translate(${x} ${y}) scale(${s})">${ext}${mascotInner()}</g>`;
}

type HB = typeof import('harfbuzzjs');
let hbPromise: Promise<HB> | undefined;

/**
 * `text` shaped with a font from the app's fonts folder, fitted into the unit box (y down, aspect
 * kept, no margin). Exactly the glyphs the app draws.
 */
export async function glyphUnit(text: string, fontFile: string, lang = 'asm'): Promise<PathCmd[]> {
  hbPromise ??= import('harfbuzzjs') as Promise<HB>;
  const hb = await hbPromise;
  const data = fs.readFileSync(path.join(FONTS_DIR, fontFile));
  const blob = new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  const face = new hb.Face(blob, 0);
  const font = new hb.Font(face);
  return fitToUnitBox(shapeOutline(hb, font, text, lang), 0);
}

type HbFont = { font: InstanceType<HB['Font']>; upem: number };
const fontCache = new Map<string, HbFont>();

async function loadFont(fontFile: string): Promise<{ hb: HB; f: HbFont }> {
  hbPromise ??= import('harfbuzzjs') as Promise<HB>;
  const hb = await hbPromise;
  let f = fontCache.get(fontFile);
  if (!f) {
    const data = fs.readFileSync(path.join(FONTS_DIR, fontFile));
    const blob = new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    const face = new hb.Face(blob, 0);
    f = { font: new hb.Font(face), upem: face.upem };
    fontCache.set(fontFile, f);
  }
  return { hb, f };
}

export type TextStyle = {
  size: number;
  bold?: boolean;
  fill: string;
  /** Where `x` sits on the line. */
  anchor?: 'start' | 'middle' | 'end';
};

const isBengali = (ch: string) => /[ঀ-৿‌‍]/.test(ch);

/** Splits text into runs for the Bengali and the Latin font; spaces stay with the run before. */
function runs(text: string): { bn: boolean; text: string }[] {
  const out: { bn: boolean; text: string }[] = [];
  for (const ch of text) {
    const last = out[out.length - 1];
    const bn = ch === ' ' && last ? last.bn : isBengali(ch);
    if (last && last.bn === bn) {
      last.text += ch;
    } else {
      out.push({ bn, text: ch });
    }
  }
  return out;
}

/**
 * One line of text as SVG path data, shaped with HarfBuzz from the app's Noto fonts (Bengali runs
 * with Noto Sans Bengali, everything else with Noto Sans). resvg's own text shaping drops spaces
 * and misorders Assamese vowel signs, so store graphics never use <text>.
 * Returns the path markup and the line width in px.
 */
export async function textPath(
  text: string,
  x: number,
  baseline: number,
  style: TextStyle,
): Promise<{ svg: string; width: number }> {
  const weight = style.bold ? 'Bold' : 'Regular';
  const glyphs: { cmds: PathCmd[]; scale: number }[] = [];
  let pen = 0;
  for (const run of runs(text)) {
    const { hb, f } = await loadFont(
      run.bn ? `NotoSansBengali-${weight}.ttf` : `NotoSans-${weight}.ttf`,
    );
    const scale = style.size / f.upem;
    const buffer = new hb.Buffer();
    buffer.addText(run.text);
    buffer.guessSegmentProperties();
    hb.shape(f.font, buffer);
    for (const g of buffer.getGlyphInfosAndPositions()) {
      const ox = pen + (g.xOffset ?? 0) * scale;
      const oy = (g.yOffset ?? 0) * scale;
      const cmds: PathCmd[] = [];
      for (const c of f.font.glyphToJson(g.codepoint)) {
        const type = c.type.toUpperCase();
        if (type === 'Z') {
          cmds.push({ type: 'Z', values: [] });
          continue;
        }
        cmds.push({
          type,
          values: c.values.map((v, k) => (k % 2 === 0 ? ox + v * scale : -(oy + v * scale))),
        } as PathCmd);
      }
      glyphs.push({ cmds, scale });
      pen += (g.xAdvance ?? 0) * scale;
    }
  }
  const dx = style.anchor === 'middle' ? x - pen / 2 : style.anchor === 'end' ? x - pen : x;
  const r = (n: number) => String(Math.round(n * 100) / 100);
  const d = glyphs
    .map(g =>
      mapPath(g.cmds, ([px, py]) => [px + dx, py + baseline])
        .map(c => c.type + c.values.map(r).join(' '))
        .join(''),
    )
    .join('');
  return { svg: `<path d="${d}" fill="${style.fill}"/>`, width: pen };
}

/** Unit-box path data placed into the square (x, y, size), as SVG path data with 2 decimals. */
export function pathAt(cmds: PathCmd[], x: number, y: number, size: number): string {
  const r = (n: number) => String(Math.round(n * 100) / 100);
  return mapPath(cmds, ([px, py]) => [x + px * size, y + py * size])
    .map(c => c.type + c.values.map(r).join(' '))
    .join('');
}

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
