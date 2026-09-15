// The approved symmetric path is compacted uniformly to 36.3% in local space.
// Keep the logo itself at its original scale; only its travel range contracts.
export const BRAND_PATH = "M0 0 C-31.944 -39.93 -90.024 -51.909 -90.024 0 C-90.024 51.909 -31.944 39.93 0 0 C31.944 -39.93 90.024 -51.909 90.024 0 C90.024 51.909 31.944 39.93 0 0Z";
export const HOME_POSITIONS = [{ x: -76.32, y: -32 }, { x: 76.32, y: 32 }];
// One linear clock drives all three elements. Each triangle travels at
// constant arc-length speed, with a quarter-lap gap to alternate crossings.
export function getTrianglePositions(progress) {
  // The second triangle trails by a quarter lap so the opening starts with
  // the first on the upper-left arc and the second on the lower-right arc.
  return [progress, progress + .75];
}

export function getRingPose(progress) {
  // A half-turn per quarter-lap: the aperture is fully open at every crossing.
  // Constant angular speed avoids slowing down and accelerating at each pass.
  const angle = progress * 4 * Math.PI;
  return { angle, opening: Math.abs(Math.cos(angle)), side: 42 * Math.sin(angle) };
}

export function getRingReturnPose(from, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const ease = t * t * (3 - 2 * t);
  return {
    opening: from.opening + (1 - from.opening) * ease,
    side: from.side * (1 - ease),
  };
}
