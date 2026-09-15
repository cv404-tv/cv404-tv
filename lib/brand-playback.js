export const START_PHASE = 1 / 16;
const RETURN_MS = 1200;

function curve(from, velocity, to, duration, t) {
  const value = (2 * t ** 3 - 3 * t * t + 1) * from +
    (t ** 3 - 2 * t * t + t) * duration * velocity +
    (-2 * t ** 3 + 3 * t * t) * to;
  const speed = (6 * t * t - 6 * t) * (from - to) / duration +
    (3 * t * t - 4 * t + 1) * velocity;
  return { value, speed };
}

export class Playback {
  constructor() {
    this.state = "idle";
    this.wantsPlay = false;
    this.progress = START_PHASE;
    this.blend = 0;
    this.velocity = 0;
    this.loopMs = 8000;
    this.transition = null;
    this.wait = 0;
  }

  transitionTo(to, duration) {
    // Carry the current blend velocity into the new curve. If interrupted
    // near an endpoint, shorten the return enough to keep it within bounds.
    while (duration > 20) {
      let inside = true;
      for (let i = 0; i <= 100; i++) {
        const { value } = curve(this.blend, this.velocity, to, duration, i / 100);
        if (value < -1e-8 || value > 1 + 1e-8) { inside = false; break; }
      }
      if (inside) break;
      duration *= .75;
    }
    this.transition = { from: this.blend, velocity: this.velocity, to, duration, elapsed: 0 };
    this.state = to === 1 ? "entering" : "returning";
  }

  enter() {
    this.progress = START_PHASE;
    // Join the orbit before either triangle reaches the first crossing.
    this.transitionTo(1, Math.min(900, this.loopMs * (.25 - START_PHASE) * .8));
  }

  setPlaying(playing) {
    this.wantsPlay = playing;
    if (playing) {
      if (this.state === "idle") this.enter();
      // During a return, finish at the default pose before opening again.
    } else if (this.state === "waiting" || this.blend === 0) {
      this.settle();
    } else if (this.state !== "returning") {
      this.transitionTo(0, RETURN_MS);
    }
  }

  restart() {
    this.wantsPlay = true;
    if (this.blend === 0) this.settle();
    else if (this.state !== "returning") this.transitionTo(0, RETURN_MS);
  }

  settle() {
    this.blend = 0;
    this.velocity = 0;
    this.progress = START_PHASE;
    this.transition = null;
    this.state = this.wantsPlay ? "waiting" : "idle";
    this.wait = this.wantsPlay ? 200 : 0;
  }

  advance(milliseconds) {
    let remaining = milliseconds;
    while (remaining > 0 && this.state !== "idle") {
      if (this.state === "waiting") {
        const used = Math.min(remaining, this.wait);
        remaining -= used;
        this.wait -= used;
        if (this.wait === 0) this.enter();
      } else if (this.state === "running") {
        this.progress += remaining / this.loopMs;
        remaining = 0;
      } else {
        const transition = this.transition;
        const used = Math.min(remaining, transition.duration - transition.elapsed);
        remaining -= used;
        this.progress += used / this.loopMs;
        transition.elapsed += used;
        const t = transition.elapsed / transition.duration;
        const pose = curve(transition.from, transition.velocity, transition.to, transition.duration, t);
        this.blend = Math.max(0, Math.min(1, pose.value));
        this.velocity = pose.speed;
        if (t >= 1) {
          this.blend = transition.to;
          this.velocity = 0;
          this.transition = null;
          if (transition.to === 0) this.settle();
          else this.state = "running";
        }
      }
    }
  }
}
