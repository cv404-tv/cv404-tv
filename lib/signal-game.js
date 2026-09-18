// Pure simulation: time is supplied by the caller so pausing never costs time.
export const GAME_DURATION = 40.4;
export const LOCK_DURATION = 1.5;
export const ISSUE = "001";
export const CHANNELS = [
  { frequency: 29, word: "BUILD", href: "/events#works" },
  { frequency: 74, word: "MEET", href: "/events#events" },
  { frequency: 48, word: "MAKE", href: "/guide" },
];

export function newGame() {
  return { phase: "ready", round: 0, elapsed: 0, roundTime: 0, lock: 0, tuning: 50, captures: [] };
}
export function targetFrequency(round, time) {
  const base = CHANNELS[round].frequency;
  return base + (round === 0 ? 0 : Math.sin(time * (round === 1 ? 0.8 : 1.05)) * (round === 1 ? 4 : 6));
}
export function signalReading(game) {
  const target = targetFrequency(game.round, game.roundTime);
  const distance = Math.abs(game.tuning - target);
  const interference = game.round === 2 && game.roundTime % 6 >= 4.7;
  return { target, strength: Math.max(0, 1 - distance / 28), locked: distance <= 4, interference };
}
export function tune(game, value) {
  if (!Number.isFinite(value)) return game;
  return { ...game, tuning: Math.max(0, Math.min(100, value)) };
}
export function startGame() {
  return { ...newGame(), phase: "playing" };
}
export function advanceGame(game) {
  if (game.phase !== "captured") return game;
  return { ...game, phase: "playing", round: game.round + 1, roundTime: 0, lock: 0 };
}
export function tickGame(game, delta) {
  if (game.phase !== "playing" || !Number.isFinite(delta) || delta <= 0) return game;
  const dt = Math.min(delta, GAME_DURATION - game.elapsed);
  const next = { ...game, elapsed: game.elapsed + dt, roundTime: game.roundTime + dt };
  const reading = signalReading(next);
  // Interference freezes a good lock; it never wipes out the player's progress.
  next.lock = reading.interference ? game.lock : reading.locked ? Math.min(LOCK_DURATION, game.lock + dt) : Math.max(0, game.lock - dt * 0.8);
  if (next.lock >= LOCK_DURATION - 1e-9) {
    next.captures = [...game.captures, next.elapsed];
    next.phase = next.round === 2 ? "won" : "captured";
  } else if (next.elapsed >= GAME_DURATION) {
    next.phase = "lost";
  }
  return next;
}
export function scoreGame(game) {
  return game.phase === "won" ? 300 + Math.round((GAME_DURATION - game.elapsed) * 25) : game.captures.length * 100;
}
export function formatFrequency(tuning) {
  return (88 + tuning * 0.2).toFixed(1);
}
