/**
 * Content loader (frozen contract, owner A0/A3).
 * Merges pack.json + geometry.json into runtime Pack objects. Pure functions; no I/O.
 */
import { letterKey, numberKey, signKey } from './keys';
import type { GeometryFile, GlyphGeometry, Pack, PackContent } from './schema';

const EMPTY_GEOMETRY: GlyphGeometry = { text: '', outline: '', strokes: [], strokeSource: 'auto' };

function geometryFor(geometry: GeometryFile, key: string): GlyphGeometry {
  return geometry[key] ?? EMPTY_GEOMETRY;
}

/** Merge authored content with tool-generated geometry. Items keep the order of pack.json. */
export function buildPack(content: PackContent, geometry: GeometryFile): Pack {
  return {
    ...content,
    letters: [...content.letters]
      .sort((a, b) => a.order - b.order)
      .map(l => {
        const key = letterKey(l.id);
        const g = geometryFor(geometry, key);
        return {
          ...l,
          key,
          display: l.glyph,
          outline: g.outline,
          strokes: g.strokes,
          strokeSource: g.strokeSource,
        };
      }),
    signs: (content.signs ?? []).map(s => {
      const key = signKey(s.id);
      const g = geometryFor(geometry, key);
      return {
        ...s,
        key,
        display: s.result,
        outline: g.outline,
        strokes: g.strokes,
        strokeSource: g.strokeSource,
      };
    }),
    words: content.words,
    numbers: content.numbers.map(n => {
      const key = numberKey(n.value);
      const g = geometryFor(geometry, key);
      return {
        ...n,
        key,
        display: n.numeral,
        outline: g.outline,
        strokes: g.strokes,
        strokeSource: g.strokeSource,
      };
    }),
  };
}
