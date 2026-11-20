/**
 * Homography from a srcW x srcH rectangle to a quad (TL, TR, BR, BL, as fractions of a W x H area),
 * as a CSS matrix3d. This is the whole "corner pin": the browser does the perspective warp.
 */
export function warpTransform(quad: number[][], W: number, H: number, srcW: number, srcH: number) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad.map(([x, y]) => [x * W, y * H]);
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det, h = (dx1 * dy3 - dx3 * dy1) / det;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
  const sx = 1 / srcW, sy = 1 / srcH;
  return `matrix3d(${a * sx},${d * sx},0,${g * sx},${b * sy},${e * sy},0,${h * sy},0,0,1,0,${x0},${y0},0,1)`;
}
