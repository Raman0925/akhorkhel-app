/**
 * Level-1 ink snapping: pulls a touch point part of the way toward the nearest point of the reference
 * stroke, so young children see neat ink. Runs on the UI thread for every touch point, so it works on
 * flat number arrays (no allocations except the result) and is marked as a worklet.
 *
 * `ref` is a flat [x0, y0, x1, y1, ...] polyline in the same units as (x, y).
 */
export function snapPoint(
  x: number,
  y: number,
  ref: readonly number[],
  strength: number,
  radius: number,
): [number, number] {
  'worklet';
  if (strength <= 0 || ref.length < 2) {
    return [x, y];
  }
  let bx = ref[0] as number;
  let by = ref[1] as number;
  let bestD2 = (x - bx) * (x - bx) + (y - by) * (y - by);
  for (let i = 2; i + 1 < ref.length; i += 2) {
    const ax = ref[i - 2] as number;
    const ay = ref[i - 1] as number;
    const dx = (ref[i] as number) - ax;
    const dy = (ref[i + 1] as number) - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + t * dx;
    const qy = ay + t * dy;
    const d2 = (x - qx) * (x - qx) + (y - qy) * (y - qy);
    if (d2 < bestD2) {
      bestD2 = d2;
      bx = qx;
      by = qy;
    }
  }
  if (bestD2 > radius * radius) {
    return [x, y];
  }
  const s = strength > 1 ? 1 : strength;
  return [x + (bx - x) * s, y + (by - y) * s];
}
