/**
 * The real, registered packs: they load, every traceable item has geometry, and every pack passes
 * the validator in non-release mode (drafts are allowed; the release gate is a separate check).
 */
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_PACK_ID, PACKS, getPack } from '@/content';
import { PackContentSchema } from '@/content/schema';

import { validatePack } from '../../../tools/validate-packs';

const PACKS_DIR = path.join(__dirname, '..', 'packs');
const read = (id: string, file: string) =>
  JSON.parse(fs.readFileSync(path.join(PACKS_DIR, id, file), 'utf8')) as unknown;

describe('registered packs', () => {
  it('ships Assamese first, then Bodo and Mising', () => {
    expect(PACKS.map(p => p.id)).toEqual(['asm-beng', 'brx-deva', 'mrg-latn']);
    expect(getPack(DEFAULT_PACK_ID).id).toBe('asm-beng');
    expect(getPack('unknown').id).toBe('asm-beng');
  });

  it.each(PACKS.map(p => p.id))('%s passes validatePack (non-release)', id => {
    const report = validatePack(
      read(id, 'pack.json'),
      read(id, 'geometry.json'),
      rel => fs.existsSync(path.join(PACKS_DIR, id, rel)),
      { release: false },
    );
    expect(report.errors).toEqual([]);
  });

  it.each(PACKS.map(p => p.id))('%s stays a cited draft until native review', id => {
    const content = PackContentSchema.parse(read(id, 'pack.json'));
    expect(content.status).toBe('draft-needs-native-review');
    expect(content.sources?.length).toBeGreaterThan(0);
  });

  it('every traceable item has an outline and placeholder or human strokes', () => {
    for (const pack of PACKS) {
      for (const t of [...pack.letters, ...pack.signs, ...pack.numbers]) {
        expect(t.outline.length).toBeGreaterThan(0);
        expect(t.strokes.length).toBeGreaterThan(0);
        for (const s of t.strokes) {
          for (const [x, y] of s.points) {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(1);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('Assamese has 11 vowels, ৰ and ৱ, ten vowel signs on ক and numbers ১–২০', () => {
    const asm = getPack('asm-beng');
    expect(asm.letters.filter(l => l.group === 'vowel')).toHaveLength(11);
    expect(asm.letters.map(l => l.glyph)).toEqual(expect.arrayContaining(['ৰ', 'ৱ', 'ক্ষ']));
    expect(asm.signs.map(s => s.result)).toEqual([
      'কা',
      'কি',
      'কী',
      'কু',
      'কূ',
      'কৃ',
      'কে',
      'কৈ',
      'কো',
      'কৌ',
    ]);
    expect(asm.numbers.map(n => n.numeral)).toEqual([
      '১',
      '২',
      '৩',
      '৪',
      '৫',
      '৬',
      '৭',
      '৮',
      '৯',
      '১০',
      '১১',
      '১২',
      '১৩',
      '১৪',
      '১৫',
      '১৬',
      '১৭',
      '১৮',
      '১৯',
      '২০',
    ]);
  });

  it('item audio follows the file naming convention', () => {
    for (const pack of PACKS) {
      for (const l of pack.letters) {
        expect(l.audio).toBe(`audio/letters/${l.id}.m4a`);
      }
      for (const s of pack.signs) {
        expect(s.audio).toBe(`audio/signs/${s.id}.m4a`);
      }
      for (const n of pack.numbers) {
        expect(n.audio).toBe(`audio/numbers/${n.value}.m4a`);
      }
    }
  });
});
