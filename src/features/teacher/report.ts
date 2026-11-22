/**
 * Class progress report: pure builders for the grid, CSV and HTML (→ PDF). No React, no native code,
 * so everything here is unit-tested.
 */
import type { Pack } from '@/content';
import { bestStars, type ItemProgress, type Profile, type Stars } from '@/progress';

export type TabId = 'letters' | 'signs' | 'numbers';
export const TAB_IDS: readonly TabId[] = ['letters', 'signs', 'numbers'];

export type Column = { key: string; label: string };

/** Columns (items) of one tab for a pack: item key + what to show in the header. */
export function tabColumns(pack: Pack, tab: TabId): Column[] {
  switch (tab) {
    case 'letters':
      return [...pack.letters]
        .sort((a, b) => a.order - b.order)
        .map(l => ({ key: l.key, label: l.glyph }));
    case 'signs':
      return pack.signs.map(s => ({ key: s.key, label: s.result }));
    case 'numbers':
      return [...pack.numbers]
        .sort((a, b) => a.value - b.value)
        .map(n => ({ key: n.key, label: n.numeral }));
  }
}

export type ReportSection = { title: string; columns: Column[] };
export type ReportRow = { name: string; stars: Stars[][] };
export type Report = { sections: ReportSection[]; rows: ReportRow[] };

/** Best stars per profile per item. `packProgress(profileId)` returns that child's items for the pack. */
export function buildReport(
  sections: ReportSection[],
  profiles: readonly Profile[],
  packProgress: (profileId: string) => Record<string, ItemProgress> | undefined,
): Report {
  return {
    sections,
    rows: profiles.map(p => {
      const items = packProgress(p.id) ?? {};
      return {
        name: p.nickname,
        stars: sections.map(sec => sec.columns.map(c => bestStars(items[c.key]))),
      };
    }),
  };
}

export function sumStars(stars: readonly Stars[]): number {
  return stars.reduce<number>((a, b) => a + b, 0);
}

/** Byte-order mark so Excel opens the UTF-8 file with Assamese text correctly. */
export const UTF8_BOM = '﻿';

/**
 * One CSV field (RFC 4180): quoted when it contains a comma, quote, CR/LF or edge spaces.
 * Values that a spreadsheet would run as a formula (= + - @ tab CR at the start) get a leading
 * apostrophe, so a nickname can never become a formula.
 */
export function csvField(value: string | number): string {
  let v = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(v)) {
    v = `'${v}`;
  }
  if (/[",\r\n]/.test(v) || v !== v.trim()) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export type ReportLabels = { name: string; total: string };

/** CSV: one header row, one row per child, every item of every section, then the total. */
export function buildCsv(report: Report, labels: ReportLabels): string {
  const header = [
    labels.name,
    ...report.sections.flatMap(s => s.columns.map(c => c.label)),
    labels.total,
  ];
  const lines = [header.map(csvField).join(',')];
  for (const row of report.rows) {
    const flat = row.stars.flat();
    lines.push([csvField(row.name), ...flat.map(String), String(sumStars(flat))].join(','));
  }
  return UTF8_BOM + lines.join('\r\n') + '\r\n';
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type HtmlMeta = ReportLabels & { title: string; subtitle: string; emptyText: string };

/** Printable HTML: one table per section (keeps pages readable), stars as numbers 0–3. */
export function buildHtml(report: Report, meta: HtmlMeta): string {
  const sections = report.sections.filter(s => s.columns.length > 0);
  const tables = sections.map((sec, si) => {
    const head = [meta.name, ...sec.columns.map(c => c.label), meta.total]
      .map(h => `<th>${escapeHtml(h)}</th>`)
      .join('');
    const body = report.rows
      .map(row => {
        const stars = row.stars[report.sections.indexOf(sec)] ?? [];
        const cells = stars.map(n => `<td class="s${n}">${n}</td>`).join('');
        return `<tr><th scope="row">${escapeHtml(row.name)}</th>${cells}<td class="t">${sumStars(stars)}</td></tr>`;
      })
      .join('');
    return `<h2 id="sec${si}">${escapeHtml(sec.title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  });
  const content =
    tables.length > 0 && report.rows.length > 0
      ? tables.join('')
      : `<p>${escapeHtml(meta.emptyText)}</p>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(meta.title)}</title><style>${CSS}</style></head><body><h1>${escapeHtml(meta.title)}</h1><p class="sub">${escapeHtml(meta.subtitle)}</p>${content}</body></html>`;
}

const CSS = [
  "body{font-family:'Noto Sans Bengali','Noto Sans Devanagari','Noto Sans',sans-serif;font-size:9px;color:#2B2118}",
  'h1{font-size:16px;margin:0}',
  '.sub{color:#6B5E52;margin:2px 0 8px}',
  'h2{font-size:12px;margin:12px 0 4px}',
  'table{border-collapse:collapse;page-break-inside:auto}',
  'tr{page-break-inside:avoid}',
  'th,td{border:1px solid #E8D9C2;padding:2px 3px;text-align:center}',
  'th[scope=row]{text-align:left;white-space:nowrap}',
  '.s0{color:#C9B8A3}.s3{background:#FDEFD6}.t{font-weight:bold}',
].join('');
