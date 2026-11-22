/**
 * Frames raw app screenshots into Play-ready images. `npm run store:frame [-- --in DIR --out DIR]`
 *
 * Input (default `store-assets/raw`): `<device>/<lang>-<NN>-<slug>.png`, as written by the Maestro
 * flow e2e/screenshots/store.yaml and collected by tools/ci/store-screenshots.sh. `<device>` is
 * `phone`, `tablet7` or `tablet10`; `<lang>` is `as` or `en`; `<NN>` is the Play position.
 *
 * Output (default `store-assets/screenshots`): `<device>/screenshot-<lang>-<NN>.png`, 24-bit PNG
 * without alpha, 9:16 portrait:
 *   phone 1080 × 1920, tablet7 1152 × 2048, tablet10 1440 × 2560.
 *
 * Layout (graphics-spec section 3): a coloured background, a caption band on the top ~20% (the
 * Assamese caption large; the English listing adds the English line below it), then the real
 * screen capture with rounded corners and a soft shadow. No device frame. Captions come from
 * docs/store/screenshot-captions.json and are shaped with HarfBuzz from the app's Noto fonts.
 */
import fs from 'node:fs';
import path from 'node:path';

import { BRAND, FONT_FILES, ROOT, textPath, type TextStyle } from './store/brand';
import { encodeRgbPng, pngSize } from './store/png';

export const SIZES = {
  phone: { width: 1080, height: 1920 },
  tablet7: { width: 1152, height: 2048 },
  tablet10: { width: 1440, height: 2560 },
} as const;
export type Device = keyof typeof SIZES;

type Caption = { n: string; slug: string; as: string; en: string };

/** Background per screenshot, cycling through soft versions of the theme colours. */
const BACKGROUNDS = ['#FFE6A6', '#D9ECFF', '#DDF1E2', '#FFE1DB'] as const;

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return path.resolve(ROOT, v ?? fallback);
}

/** Lines of a caption: one line if it fits at `style.size`, else split at the middle space. */
async function captionLines(
  text: string,
  style: TextStyle,
  maxWidth: number,
): Promise<{ lines: string[]; size: number }> {
  const one = await textPath(text, 0, 0, style);
  if (one.width <= maxWidth) {
    return { lines: [text], size: style.size };
  }
  const spaces = [...text.matchAll(/ /g)].map(m => m.index as number);
  if (spaces.length > 0) {
    const mid = text.length / 2;
    const at = spaces.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
    const lines = [text.slice(0, at), text.slice(at + 1)];
    let widest = 0;
    for (const l of lines) {
      widest = Math.max(widest, (await textPath(l, 0, 0, style)).width);
    }
    return { lines, size: widest <= maxWidth ? style.size : (style.size * maxWidth) / widest };
  }
  return { lines: [text], size: (style.size * maxWidth) / one.width };
}

export async function frameSvg(
  raw: Buffer,
  device: Device,
  lang: 'as' | 'en',
  caption: Caption,
  index: number,
): Promise<string> {
  const { width: W, height: H } = SIZES[device];
  const bg = BACKGROUNDS[index % BACKGROUNDS.length] as string;
  const margin = Math.round(W * 0.07);
  const band = Math.round(H * 0.2);
  const maxText = W - margin * 2;

  // Caption band.
  const parts: string[] = [];
  const asStyle: TextStyle = { size: W * 0.066, bold: true, fill: BRAND.text, anchor: 'middle' };
  const enStyle: TextStyle = { size: W * 0.044, fill: BRAND.textMuted, anchor: 'middle' };
  const asCap = await captionLines(caption.as, asStyle, maxText);
  const enCap = lang === 'en' ? await captionLines(caption.en, enStyle, maxText) : null;
  const asLine = asCap.size * 1.45;
  const enLine = enCap ? enCap.size * 1.45 : 0;
  const block = asCap.lines.length * asLine + (enCap ? enCap.lines.length * enLine + W * 0.01 : 0);
  let y = Math.max(W * 0.02, (band - block) / 2 + W * 0.02);
  for (const l of asCap.lines) {
    y += asLine;
    parts.push((await textPath(l, W / 2, y - asLine * 0.28, { ...asStyle, size: asCap.size })).svg);
  }
  if (enCap) {
    y += W * 0.01;
    for (const l of enCap.lines) {
      y += enLine;
      parts.push(
        (await textPath(l, W / 2, y - enLine * 0.3, { ...enStyle, size: enCap.size })).svg,
      );
    }
  }

  // Screenshot, scaled to fit under the band, centred, rounded corners, soft shadow.
  const { width: rw, height: rh } = pngSize(raw);
  // A long caption (four lines) pushes the screenshot down instead of touching it.
  const top = Math.max(band + Math.round(H * 0.01), Math.round(y + H * 0.025));
  const availW = W - margin * 2;
  const availH = H - top - Math.round(H * 0.035);
  const scale = Math.min(availW / rw, availH / rh);
  const sw = Math.round(rw * scale);
  const sh = Math.round(rh * scale);
  const sx = Math.round((W - sw) / 2);
  const sy = top;
  const r = Math.round(sw * 0.06);
  const data = `data:image/png;base64,${raw.toString('base64')}`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs>` +
    `<clipPath id="shot"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${r}"/></clipPath>` +
    `<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${Math.round(W * 0.012)}"/></filter>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="${bg}"/>` +
    `<circle cx="${W * 0.92}" cy="${H * 0.04}" r="${W * 0.2}" fill="#FFFFFF" opacity="0.35"/>` +
    `<circle cx="${W * 0.05}" cy="${H * 0.16}" r="${W * 0.1}" fill="#FFFFFF" opacity="0.3"/>` +
    parts.join('') +
    `<rect x="${sx}" y="${sy + W * 0.012}" width="${sw}" height="${sh}" rx="${r}" fill="${BRAND.text}" opacity="0.28" filter="url(#shadow)"/>` +
    `<image x="${sx}" y="${sy}" width="${sw}" height="${sh}" preserveAspectRatio="xMidYMid slice" clip-path="url(#shot)" xlink:href="${data}"/>` +
    `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${r}" fill="none" stroke="${BRAND.text}" stroke-opacity="0.18" stroke-width="${Math.max(2, W * 0.003)}"/>` +
    `</svg>`
  );
}

async function main() {
  const inDir = arg('in', 'store-assets/raw');
  const outDir = arg('out', 'store-assets/screenshots');
  const { screens } = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs/store/screenshot-captions.json'), 'utf8'),
  ) as { screens: Caption[] };
  const { Resvg } = await import('@resvg/resvg-js');

  if (!fs.existsSync(inDir)) {
    console.error(`frame-screenshots: no input folder ${inDir}`);
    process.exit(1);
  }
  let count = 0;
  const missing: string[] = [];
  for (const device of Object.keys(SIZES) as Device[]) {
    const dir = path.join(inDir, device);
    if (!fs.existsSync(dir)) {
      continue;
    }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    for (const lang of ['as', 'en'] as const) {
      for (const [index, caption] of screens.entries()) {
        const file = files.find(f => f.startsWith(`${lang}-${caption.n}`));
        if (!file) {
          missing.push(`${device}/${lang}-${caption.n}-${caption.slug}.png`);
          continue;
        }
        const svg = await frameSvg(
          fs.readFileSync(path.join(dir, file)),
          device,
          lang,
          caption,
          index,
        );
        const { width, height } = SIZES[device];
        const img = new Resvg(svg, {
          fitTo: { mode: 'width', value: width },
          font: { loadSystemFonts: false, fontFiles: FONT_FILES },
        }).render();
        const out = path.join(outDir, device, `screenshot-${lang}-${caption.n}.png`);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, encodeRgbPng(width, height, new Uint8Array(img.pixels)));
        console.warn(`✎ ${path.relative(ROOT, out).replace(/\\/g, '/')}`);
        count++;
      }
    }
  }
  if (missing.length > 0) {
    console.warn(`frame-screenshots: ${missing.length} raw screenshot(s) missing:`);
    missing.forEach(m => console.warn(`  - ${m}`));
  }
  if (count === 0) {
    console.error('frame-screenshots: nothing to frame');
    process.exit(1);
  }
  console.warn(`frame-screenshots: framed ${count} screenshot(s) into ${outDir}`);
}

if (require.main === module) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
