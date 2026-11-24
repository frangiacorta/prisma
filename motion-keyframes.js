export const MAX_MOTION_POINTS = 48;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrap = (value, period) => value - Math.floor((value + period/2)/period)*period;
const parameters = new Set(['scale','positionX','positionY','rotateX','rotateY','rotateZ','stretchX','stretchY','stretchZ',
 'pBreath','pSignal','pPropagation','pOpening','pTravel','pVortex','exposure','transparency','roughness','focusBlur','focusDepth',
 'structWeaveBranching','structWeaveNodes','structWeaveMembrane','structWeaveFinesse','structWeaveGrowth','structWeaveReach','structWeaveRelease','structWeaveCup']);

export const supportsMotionPoints = key => parameters.has(key);
export const isMotionAngle = key => ['rotateX','rotateY','rotateZ'].includes(key);

export function motionPointValue(key, base, offset, range) {
 const value = base + offset;
 if (isMotionAngle(key) && (value < range[1] || value > range[2])) return wrap(value, 360);
 return clamp(value, range[1], range[2]);
}

export function normalizeMotionPoints(input, range) {
 if (!Array.isArray(input) || !range) return [];
 const span = range[2] - range[1];
 const points = new Map();
 for (const point of input.slice(0, MAX_MOTION_POINTS * 2)) {
  if (!Number.isFinite(point?.at) || point.at < 0 || point.at >= 1 || !Number.isFinite(point.offset)) continue;
  const time = Math.min(.999999, Math.round(point.at * 1e6) / 1e6);
  points.set(time, {at:time, offset:clamp(point.offset, -span, span)});
 }
 return [...points.values()].sort((a, b) => a.at - b.at).slice(0, MAX_MOTION_POINTS);
}

export function hasMotionPoints(track) {
 return track?.enabled === true && track.mode === 'points' && Array.isArray(track.points) && track.points.length > 1;
}

// Periodic monotone Hermite interpolation: adjacent segments share a tangent,
// including across the seam. Extrema cannot overshoot their authored values.
function tangent(a, b, leftSpan, rightSpan) {
 if (a * b <= 0) return 0;
 const leftWeight = 2 * rightSpan + leftSpan;
 const rightWeight = rightSpan + 2 * leftSpan;
 return (leftWeight + rightWeight) / (leftWeight / a + rightWeight / b);
}

export function motionPointOffset(points, turns, angular = false) {
 const count = points.length;
 let time = turns - Math.floor(turns);
 let last = points.findIndex(point => point.at > time);
 if (last < 0) last = 0;
 const at = index => points[(index + count) % count];
 const before = at(last - 2), a = at(last - 1), b = at(last), after = at(last + 1);
 const gap = (x, y) => y.at > x.at ? y.at - x.at : 1 + y.at - x.at;
 const delta = (x, y) => angular ? wrap(y.offset - x.offset, 360) : y.offset - x.offset;
 if (time < a.at) time += 1;
 const leftSpan = gap(before, a), span = gap(a, b), rightSpan = gap(b, after);
 const change = delta(a, b), rate = change / span;
 const m0 = tangent(delta(before, a) / leftSpan, rate, leftSpan, span);
 const m1 = tangent(rate, delta(b, after) / rightSpan, span, rightSpan);
 const u = clamp((time - a.at) / span, 0, 1), v = 1 - u;
 return a.offset + u*u*(1+2*v)*change + u*v*span*(v*m0-u*m1);
}
