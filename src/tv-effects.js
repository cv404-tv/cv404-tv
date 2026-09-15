export function initTVEffects(reducedMotion) {
  const stage = document.querySelector(".tv-stage");
  const host = document.querySelector(".glass-art");
  const pointerFine = matchMedia("(hover: hover) and (pointer: fine)");
  const events = new AbortController();
  let state = { powered: false, channel: "home" };
  let scene,
    loading,
    disposed = false,
    visible = true;
  let frame = 0,
    x = 0,
    y = 0,
    targetX = 0,
    targetY = 0;
  const clamp = (value) => Math.max(-1, Math.min(1, value));

  function active() {
    return visible && !document.hidden && !disposed;
  }
  function draw() {
    frame = 0;
    if (!active()) return;
    const moving = !reducedMotion.matches && pointerFine.matches;
    x = moving ? x + (targetX - x) * 0.16 : 0;
    y = moving ? y + (targetY - y) * 0.16 : 0;
    stage.style.setProperty("--tv-rx", `${-y * 2}deg`);
    stage.style.setProperty("--tv-ry", `${x * 3}deg`);
    stage.style.setProperty("--scene-x", `${x * 8}px`);
    stage.style.setProperty("--scene-y", `${y * 5}px`);
    stage.style.setProperty("--light-x", `${50 + x * 38}%`);
    stage.style.setProperty("--light-y", `${35 + y * 28}%`);
    if (state.powered && state.channel === "home") scene?.render(x, y);
    if (
      moving &&
      (Math.abs(targetX - x) > 0.001 || Math.abs(targetY - y) > 0.001)
    ) {
      frame = requestAnimationFrame(draw);
    }
  }
  function requestDraw() {
    if (!frame && active()) frame = requestAnimationFrame(draw);
  }
  function reset() {
    targetX = 0;
    targetY = 0;
    requestDraw();
  }
  function updatePointer(event) {
    if (
      reducedMotion.matches ||
      !pointerFine.matches ||
      event.pointerType === "touch"
    )
      return;
    const rect = stage.getBoundingClientRect();
    targetX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1);
    targetY = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1);
    requestDraw();
  }
  async function ensureScene() {
    if (scene || loading || reducedMotion.matches || !active()) return;
    loading = import("./tv-scene.js")
      .then(({ createScene }) => {
        if (!disposed) scene = createScene(host);
      })
      .catch(() => {
        // The text, controls, and CSS illustration remain functional on failure.
        host.classList.remove("webgl-ready");
      })
      .finally(() => {
        loading = null;
        requestDraw();
      });
    await loading;
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      if (state.powered && state.channel === "home") ensureScene();
      requestDraw();
    }
  });
  observer.observe(stage);
  const resizeObserver = new ResizeObserver(requestDraw);
  resizeObserver.observe(host);
  stage.addEventListener("pointermove", updatePointer, {
    signal: events.signal,
    passive: true,
  });
  stage.addEventListener("pointerleave", reset, { signal: events.signal });
  stage.addEventListener("pointercancel", reset, { signal: events.signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (!document.hidden) {
        reset();
        if (state.powered && state.channel === "home") ensureScene();
      }
    },
    { signal: events.signal },
  );
  reducedMotion.addEventListener(
    "change",
    () => {
      reset();
      if (!reducedMotion.matches && state.powered && state.channel === "home")
        ensureScene();
    },
    { signal: events.signal },
  );
  pointerFine.addEventListener("change", reset, { signal: events.signal });
  return {
    setState(next) {
      state = next;
      if (state.powered && state.channel === "home") ensureScene();
      requestDraw();
    },
    dispose() {
      disposed = true;
      events.abort();
      observer.disconnect();
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      scene?.dispose();
    },
  };
}
