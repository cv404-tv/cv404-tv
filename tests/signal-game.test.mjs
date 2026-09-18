import test from "node:test";
import assert from "node:assert/strict";
import { CHANNELS, GAME_DURATION, LOCK_DURATION, advanceGame, formatFrequency, newGame, scoreGame, signalReading, startGame, targetFrequency, tickGame, tune } from "../lib/signal-game.js";

test("all three channels can be captured while following their signals", () => {
  let game = startGame();
  for (let round = 0; round < 3; round++) {
    assert.equal(game.round, round);
    for (let tick = 0; tick < 100 && game.phase === "playing"; tick++) {
      game = tune(game, targetFrequency(round, game.roundTime + .05));
      game = tickGame(game, .05);
    }
    assert.equal(game.captures.length, round + 1);
    assert.equal(game.phase, round === 2 ? "won" : "captured");
    if (round < 2) game = advanceGame(game);
  }
  assert.ok(game.elapsed < GAME_DURATION);
  assert.ok(scoreGame(game) > 300);
  assert.equal(tickGame(game, 3), game);
});
test("an untuned receiver times out without producing captures", () => {
  const game = tickGame(tune(startGame(), 100), 50);
  assert.equal(game.phase, "lost");
  assert.equal(game.elapsed, GAME_DURATION);
  assert.deepEqual(game.captures, []);
  assert.equal(scoreGame(game), 0);
  assert.equal(advanceGame(game), game);
});
test("losing the frequency drains lock progress; noise freezes it", () => {
  let game = tickGame(tune(startGame(), CHANNELS[0].frequency), .75);
  assert.equal(game.lock, .75);
  game = tickGame(tune(game, 100), .25);
  assert.ok(game.lock < .75 && game.lock > 0);
  game = { ...game, round: 2, roundTime: 4.8, lock: 1 };
  assert.equal(signalReading(game).interference, true);
  const noisy = tickGame(game, .2);
  assert.equal(noisy.lock, 1);
  assert.ok(noisy.elapsed > game.elapsed);
});
test("inter-round reading never consumes the timer, replay resets the run", () => {
  const captured = tickGame(tune(startGame(), 29), LOCK_DURATION);
  assert.equal(captured.phase, "captured");
  assert.equal(tickGame(captured, 30), captured);
  const next = advanceGame(captured);
  assert.equal(next.elapsed, captured.elapsed);
  assert.equal(next.lock, 0);
  assert.equal(next.roundTime, 0);
  assert.equal(next.round, 1);
  assert.deepEqual(startGame().captures, []);
  assert.equal(startGame().elapsed, 0);
});
test("frequency stays in band and bad input cannot corrupt a run", () => {
  const game = newGame();
  assert.equal(tune(game, NaN), game);
  assert.equal(tune(game, Infinity), game);
  assert.equal(tune(game, -100).tuning, 0);
  assert.equal(tune(game, 150).tuning, 100);
  assert.equal(formatFrequency(0), "88.0");
  assert.equal(formatFrequency(100), "108.0");
  assert.equal(tickGame(game, 5), game);
  assert.equal(tickGame(game, NaN), game);
  for (let round = 0; round < 3; round++) {
    for (let t = 0; t < 50; t += .1) assert.ok(targetFrequency(round, t) >= 0 && targetFrequency(round, t) <= 100);
  }
});
