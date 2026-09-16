import test from "node:test";
import assert from "node:assert/strict";

import { Playback, START_PHASE } from "../lib/brand-playback.js";
import { getRingPose, getRingReturnPose, getTrianglePositions } from "../lib/brand-motion.js";

test("header triangles keep the intended quarter-lap crossing offset", () => {
  const [first, second] = getTrianglePositions(.2);
  assert.equal(first, .2);
  assert.equal((second - first) % 1, .75);
});

test("header ring faces forward whenever a triangle crosses the center", () => {
  for (const progress of [0, .25, .5, .75, 1]) {
    const pose = getRingPose(progress);
    assert.ok(Math.abs(pose.opening - 1) < 1e-12);
    assert.ok(Math.abs(pose.side) < 1e-12);
  }
});

test("header ring return ends in the exact front-facing pose", () => {
  const pose = getRingReturnPose({ opening: .2, side: -32 }, 1);
  assert.equal(pose.opening, 1);
  assert.equal(Math.abs(pose.side), 0);
});

test("header playback settles to the static logo after stopping", () => {
  const playback = new Playback();
  playback.loopMs = 6000;
  playback.setPlaying(true);
  playback.advance(1200);
  assert.ok(playback.blend > 0);

  playback.setPlaying(false);
  playback.advance(2000);
  assert.equal(playback.state, "idle");
  assert.equal(playback.blend, 0);
  assert.equal(playback.progress, START_PHASE);
});
