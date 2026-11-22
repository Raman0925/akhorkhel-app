/* eslint-disable no-bitwise -- CRC-32 and colour unpacking are bit arithmetic by nature. */
/**
 * Minimal PNG helpers for the store-asset tools (dev only, no extra dependencies).
 *
 * resvg always renders RGBA. Play wants 24-bit PNGs without alpha for the feature graphic and the
 * screenshots, so `encodeRgbPng` flattens the pixels onto a background colour and writes RGB.
 */
import zlib from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) {
    c = (CRC_TABLE[(c ^ byte) & 0xff] as number) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** '#RRGGBB' → [r, g, b]. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) {
    throw new Error(`Not a #RRGGBB colour: ${hex}`);
  }
  const v = parseInt(m[1] as string, 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

/** Encodes RGBA pixels as a 24-bit RGB PNG (alpha composited onto `background`). */
export function encodeRgbPng(
  width: number,
  height: number,
  rgba: Uint8Array,
  background = '#FFFFFF',
): Buffer {
  if (rgba.length !== width * height * 4) {
    throw new Error('encodeRgbPng: pixel buffer size does not match width × height × 4');
  }
  const [br, bg, bb] = hexToRgb(background);
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = (rgba[i + 3] as number) / 255;
      const o = y * stride + 1 + x * 3;
      raw[o] = Math.round((rgba[i] as number) * a + br * (1 - a));
      raw[o + 1] = Math.round((rgba[i + 1] as number) * a + bg * (1 - a));
      raw[o + 2] = Math.round((rgba[i + 2] as number) * a + bb * (1 - a));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour (RGB)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Width and height from a PNG header. */
export function pngSize(png: Buffer): { width: number; height: number } {
  if (png.length < 24 || png.readUInt32BE(12) !== 0x49484452) {
    throw new Error('Not a PNG file');
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}
