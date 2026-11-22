/**
 * Validates every language pack (handover 5.1). Run by CI on every push.
 *
 *   npm run validate-packs            schema + integrity; missing recordings are warnings
 *   npm run validate-packs:release    also fails on anything unfinished (tags / release builds)
 *
 * Errors (always): invalid schema, duplicate ids, non-NFC text, dangling references, an item with no
 * outline or strokes, geometry out of date, a `verified` pack without `reviewedBy`.
 * Release errors: any pack not `verified`, any missing audio/image/prompt file, placeholder emoji,
 * strokes that were generated (`auto`) and never reviewed or recorded.
 */
import fs from 'node:fs';
import path from 'node:path';

import { PROMPTS } from '../src/audio/prompts';
import {
  GeometryFileSchema,
  PackContentSchema,
  type GeometryFile,
  type PackContent,
} from '../src/content/schema';

const ROOT = path.resolve(__dirname, '..');
const PACKS_DIR = path.join(ROOT, 'src/content/packs');
const PROMPTS_DIR = path.join(ROOT, 'src/audio/prompts');
const release = process.argv.includes('--release');

type Report = { errors: string[]; warnings: string[] };

/** Packs registered in src/content/packs/index.ts (the ones that ship). */
export function registeredPackIds(indexSource: string): string[] {
  const ids = new Set<string>();
  for (const m of indexSource.matchAll(/from '\.\/([a-z]{3}-[a-z]{4})\/pack\.json'/g)) {
    ids.add(m[1] as string);
  }
  return [...ids];
}

function isNfc(s: string): boolean {
  return s === s.normalize('NFC');
}

export function validatePack(
  content: unknown,
  geometryRaw: unknown,
  fileExists: (rel: string) => boolean,
  opts: { release: boolean },
): Report {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = PackContentSchema.safeParse(content);
  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map(i => `schema: ${i.path.join('.')}: ${i.message}`),
      warnings,
    };
  }
  const pack: PackContent = parsed.data;
  const geoParsed = GeometryFileSchema.safeParse(geometryRaw);
  if (!geoParsed.success) {
    return {
      errors: geoParsed.error.issues.map(i => `geometry: ${i.path.join('.')}: ${i.message}`),
      warnings,
    };
  }
  const geometry: GeometryFile = geoParsed.data;
  const missing = (msg: string) => (opts.release ? errors : warnings).push(msg);

  if (pack.status === 'verified' && !pack.reviewedBy?.length) {
    errors.push('status is verified but reviewedBy is empty');
  }
  if (opts.release && pack.status !== 'verified') {
    errors.push(`status is ${pack.status}: unverified packs cannot ship`);
  }

  const dup = (label: string, ids: (string | number)[]) => {
    const seen = new Set<string | number>();
    for (const id of ids) {
      if (seen.has(id)) {
        errors.push(`duplicate ${label} id: ${id}`);
      }
      seen.add(id);
    }
  };
  dup(
    'letter',
    pack.letters.map(l => l.id),
  );
  dup(
    'sign',
    (pack.signs ?? []).map(s => s.id),
  );
  dup(
    'word',
    pack.words.map(w => w.id),
  );
  dup(
    'number',
    pack.numbers.map(n => n.value),
  );
  dup(
    'letter order',
    pack.letters.map(l => l.order),
  );

  const texts: [string, string][] = [
    ...pack.letters.map(l => [`letter ${l.id}`, l.glyph] as [string, string]),
    ...(pack.signs ?? []).flatMap(s => [
      [`sign ${s.id} base`, s.base] as [string, string],
      [`sign ${s.id} sign`, s.sign] as [string, string],
      [`sign ${s.id} result`, s.result] as [string, string],
    ]),
    ...pack.words.map(w => [`word ${w.id}`, w.text] as [string, string]),
    ...pack.numbers.map(n => [`number ${n.value}`, n.numeral] as [string, string]),
    ...pack.numbers.flatMap(n =>
      n.word ? [[`number ${n.value} word`, n.word] as [string, string]] : [],
    ),
  ];
  if (opts.release) {
    for (const n of pack.numbers) {
      if (!n.word) {
        errors.push(`number ${n.value}: number word is missing`);
      }
    }
  }
  for (const [label, text] of texts) {
    if (!isNfc(text)) {
      errors.push(`${label}: text is not NFC-normalised`);
    }
  }

  const wordIds = new Set(pack.words.map(w => w.id));
  const letterIds = new Set(pack.letters.map(l => l.id));
  for (const l of pack.letters) {
    if (l.exampleWordId && !wordIds.has(l.exampleWordId)) {
      errors.push(`letter ${l.id}: exampleWordId ${l.exampleWordId} does not exist`);
    }
  }
  for (const w of pack.words) {
    if (w.startsWith && !letterIds.has(w.startsWith)) {
      errors.push(`word ${w.id}: startsWith ${w.startsWith} does not exist`);
    }
    if (w.placeholderEmoji && opts.release) {
      errors.push(`word ${w.id}: placeholderEmoji is not allowed in a release`);
    }
  }

  const traceables: { key: string; text: string }[] = [
    ...pack.letters.map(l => ({ key: `letter:${l.id}`, text: l.glyph })),
    ...(pack.signs ?? []).map(s => ({ key: `sign:${s.id}`, text: s.result })),
    ...pack.numbers.map(n => ({ key: `number:${n.value}`, text: n.numeral })),
  ];
  for (const t of traceables) {
    const g = geometry[t.key];
    if (!g) {
      errors.push(`${t.key}: no geometry (run npm run gen:geometry)`);
      continue;
    }
    if (g.text !== t.text) {
      errors.push(`${t.key}: geometry is for "${g.text}" but the text is "${t.text}" (regenerate)`);
    }
    if (!g.outline) {
      errors.push(`${t.key}: empty outline`);
    }
    if (g.strokes.length === 0) {
      errors.push(`${t.key}: no strokes`);
    }
    if (opts.release && g.strokeSource === 'auto') {
      errors.push(
        `${t.key}: strokes are auto-generated; a native writer must review or record them`,
      );
    }
  }
  const known = new Set(traceables.map(t => t.key));
  for (const key of Object.keys(geometry)) {
    if (!known.has(key)) {
      warnings.push(`geometry has an entry for unknown item ${key}`);
    }
  }

  const files = [
    ...pack.letters.map(l => l.audio),
    ...(pack.signs ?? []).map(s => s.audio),
    ...pack.words.flatMap(w => [w.audio, w.image]),
    ...pack.numbers.map(n => n.audio),
  ];
  const missingFiles = files.filter(f => !fileExists(f));
  if (missingFiles.length) {
    missing(
      `${missingFiles.length} missing audio/image files (e.g. ${missingFiles.slice(0, 3).join(', ')})`,
    );
  }
  return { errors, warnings };
}

function main() {
  const indexSource = fs.readFileSync(path.join(PACKS_DIR, 'index.ts'), 'utf8');
  const ids = registeredPackIds(indexSource);
  let failed = false;
  if (ids.length === 0) {
    console.error('No packs registered in src/content/packs/index.ts');
    process.exit(1);
  }
  for (const id of ids) {
    const dir = path.join(PACKS_DIR, id);
    const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as unknown;
    const content = read('pack.json');
    if ((content as { id?: string }).id !== id) {
      console.error(`✗ ${id}: pack.json id does not match its folder`);
      failed = true;
      continue;
    }
    const report = validatePack(
      content,
      read('geometry.json'),
      rel => fs.existsSync(path.join(dir, rel)),
      {
        release,
      },
    );
    for (const w of report.warnings) {
      console.warn(`  ⚠ ${id}: ${w}`);
    }
    for (const e of report.errors) {
      console.error(`  ✗ ${id}: ${e}`);
    }
    console.warn(`${report.errors.length ? '✗' : '✓'} ${id}`);
    failed ||= report.errors.length > 0;
  }

  const missingPrompts: string[] = [];
  for (const lang of ['as', 'en']) {
    for (const promptId of Object.keys(PROMPTS)) {
      if (!fs.existsSync(path.join(PROMPTS_DIR, lang, `${promptId}.m4a`))) {
        missingPrompts.push(`${lang}/${promptId}`);
      }
    }
  }
  if (missingPrompts.length) {
    const msg = `${missingPrompts.length} voice prompts not recorded yet (e.g. ${missingPrompts.slice(0, 3).join(', ')})`;
    if (release) {
      console.error(`✗ prompts: ${msg}`);
      failed = true;
    } else {
      console.warn(`⚠ prompts: ${msg}`);
    }
  }

  if (failed) {
    console.error(
      release ? '\nRelease gate failed: not shippable yet.' : '\nPack validation failed.',
    );
    process.exit(1);
  }
  console.warn(release ? '\nRelease gate passed.' : '\nAll packs valid.');
}

if (require.main === module) {
  main();
}
