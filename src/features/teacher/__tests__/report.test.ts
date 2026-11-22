import type { Pack } from '@/content';
import type { ItemProgress, Profile } from '@/progress';

import { utf8Bytes, utf8ToBase64 } from '../base64';
import {
  buildCsv,
  buildHtml,
  buildReport,
  csvField,
  escapeHtml,
  tabColumns,
  UTF8_BOM,
  type ReportSection,
} from '../report';

const item = (best: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3]): ItemProgress => ({
  best,
  attempts: 1,
  lastAt: 1,
});

const profiles: Profile[] = [
  { id: 'a', nickname: 'মিনু', avatar: 'rhino', createdAt: 1 },
  { id: 'b', nickname: 'Bitu, "B"', avatar: 'deer', createdAt: 2 },
];

const sections: ReportSection[] = [
  {
    title: 'আখৰ',
    columns: [
      { key: 'letter:a', label: 'অ' },
      { key: 'letter:aa', label: 'আ' },
    ],
  },
  { title: 'সংখ্যা', columns: [{ key: 'number:1', label: '১' }] },
];

const progress: Record<string, Record<string, ItemProgress>> = {
  a: { 'letter:a': item([1, 3, 0]), 'number:1': item([2, 0, 0]) },
};

describe('csvField', () => {
  it('leaves plain values alone', () => {
    expect(csvField('Minu')).toBe('Minu');
    expect(csvField('মিনু')).toBe('মিনু');
    expect(csvField(3)).toBe('3');
  });

  it('quotes commas, quotes, newlines and edge spaces', () => {
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('line\nbreak')).toBe('"line\nbreak"');
    expect(csvField(' pad')).toBe('" pad"');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(csvField('=1+1')).toBe("'=1+1");
    expect(csvField('+91')).toBe("'+91");
    expect(csvField('@x')).toBe("'@x");
    expect(csvField('=A1,B1')).toBe('"\'=A1,B1"');
  });
});

describe('buildReport + buildCsv', () => {
  const report = buildReport(sections, profiles, id => progress[id]);

  it('takes the best stars across levels, 0 when never tried', () => {
    expect(report.rows[0]?.stars).toEqual([[3, 0], [2]]);
    expect(report.rows[1]?.stars).toEqual([[0, 0], [0]]);
  });

  it('starts with a UTF-8 BOM, keeps Assamese text and escapes names', () => {
    const csv = buildCsv(report, { name: 'আদৰৰ নাম', total: 'মুঠ' });
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'আদৰৰ নাম,অ,আ,১,মুঠ',
      'মিনু,3,0,2,5',
      '"Bitu, ""B""",0,0,0,0',
      '',
    ]);
  });
});

describe('buildHtml', () => {
  const report = buildReport(sections, profiles, id => progress[id]);
  const meta = {
    name: 'Nickname',
    total: 'Total',
    title: 'Class <progress>',
    subtitle: 'Assamese · 2026-11-22',
    emptyText: 'Nothing',
  };

  it('is UTF-8, escapes text and has one table per section', () => {
    const html = buildHtml(report, meta);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('Class &lt;progress&gt;');
    expect(html).toContain('Bitu, &quot;B&quot;');
    expect(html.match(/<table>/g)).toHaveLength(2);
    expect(html).toContain('<th scope="row">মিনু</th><td class="s3">3</td><td class="s0">0</td>');
  });

  it('shows the empty text with no children', () => {
    const html = buildHtml(
      buildReport(sections, [], () => undefined),
      meta,
    );
    expect(html).toContain('<p>Nothing</p>');
    expect(html).not.toContain('<table>');
  });

  it('escapes all HTML specials', () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('utf8ToBase64', () => {
  it.each(['', 'a', 'ab', 'abc', 'Minu,3', `${UTF8_BOM}আদৰৰ নাম,অ`, 'बरʼ', 'Mising é', '🦏🐘'])(
    'matches Node for %j',
    text => {
      expect(utf8ToBase64(text)).toBe(Buffer.from(text, 'utf8').toString('base64'));
      expect(utf8Bytes(text)).toEqual([...Buffer.from(text, 'utf8')]);
    },
  );
});

describe('tabColumns', () => {
  const pack = {
    letters: [
      { key: 'letter:aa', glyph: 'আ', order: 2 },
      { key: 'letter:a', glyph: 'অ', order: 1 },
    ],
    signs: [{ key: 'sign:ka-aa', result: 'কা' }],
    numbers: [
      { key: 'number:2', numeral: '২', value: 2 },
      { key: 'number:1', numeral: '১', value: 1 },
    ],
  } as unknown as Pack;

  it('orders letters and numbers and labels each item', () => {
    expect(tabColumns(pack, 'letters')).toEqual([
      { key: 'letter:a', label: 'অ' },
      { key: 'letter:aa', label: 'আ' },
    ]);
    expect(tabColumns(pack, 'signs')).toEqual([{ key: 'sign:ka-aa', label: 'কা' }]);
    expect(tabColumns(pack, 'numbers').map(c => c.label)).toEqual(['১', '২']);
  });
});
