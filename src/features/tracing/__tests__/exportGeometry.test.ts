import { GeometryFileSchema } from '@/content/schema';

import {
  buildGeometryEntry,
  geometryJson,
  normaliseRecordedStroke,
} from '../recorder/exportGeometry';

const item = { key: 'letter:ka', display: 'ক', outline: 'M0 0L1 1Z' };

describe('normaliseRecordedStroke', () => {
  it('normalises pixels to the unit box and simplifies', () => {
    const flat: number[] = [];
    for (let i = 0; i <= 80; i++) {
      flat.push(20 + i * 2, 100); // a straight line of 81 points on a 200px canvas
    }
    const s = normaliseRecordedStroke(flat, 200);
    expect(s).toEqual([
      [0.1, 0.5],
      [0.9, 0.5],
    ]);
  });

  it('clamps points outside the box', () => {
    const s = normaliseRecordedStroke([-10, 50, 250, 50], 200);
    expect(s).toEqual([
      [0, 0.25],
      [1, 0.25],
    ]);
  });

  it('drops taps and handles a bad size', () => {
    expect(normaliseRecordedStroke([10, 10, 10.5, 10], 200)).toEqual([]);
    expect(normaliseRecordedStroke([10, 10, 100, 10], 0)).toEqual([]);
  });
});

describe('buildGeometryEntry', () => {
  it('produces a schema-valid recorded entry keyed by item key', () => {
    const entry = buildGeometryEntry(item, [
      [
        [0.1, 0.1],
        [0.9, 0.1],
      ],
      [[0.5, 0.5]],
    ]);
    expect(GeometryFileSchema.safeParse(entry).success).toBe(true);
    expect(entry['letter:ka']).toEqual({
      text: 'ক',
      outline: 'M0 0L1 1Z',
      strokes: [
        {
          points: [
            [0.1, 0.1],
            [0.9, 0.1],
          ],
        },
      ],
      strokeSource: 'recorded',
    });
  });

  it('serialises to pretty JSON', () => {
    const json = geometryJson(item, []);
    expect(JSON.parse(json)).toEqual({
      'letter:ka': { text: 'ক', outline: 'M0 0L1 1Z', strokes: [], strokeSource: 'recorded' },
    });
    expect(json).toContain('\n  ');
  });
});
