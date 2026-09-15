export function createStaticEffect(canvas, media) {
  const context = canvas.getContext("2d");
  let animation = 0;
  function stop() {
    cancelAnimationFrame(animation);
    animation = 0;
    canvas.hidden = true;
  }
  function play() {
    stop();
    if (!context || media.matches || document.hidden) return;
    const frame = context.createImageData(canvas.width, canvas.height);
    const duration = 280 + Math.random() * 180;
    const range = 70 + Math.random() * 50;
    const start = performance.now();
    let lastPaint = -Infinity;
    canvas.hidden = false;
    function draw(now) {
      const elapsed = now - start;
      if (elapsed >= duration || document.hidden || media.matches) {
        stop();
        return;
      }
      if (now - lastPaint >= 1000 / 24) {
        for (let i = 0; i < frame.data.length; i += 4) {
          const value = 80 + Math.random() * range;
          frame.data[i] = value;
          frame.data[i + 1] = value;
          frame.data[i + 2] = value;
          frame.data[i + 3] = 255;
        }
        context.putImageData(frame, 0, 0);
        canvas.style.opacity = String(
          0.8 * Math.min(1, (duration - elapsed) / 140),
        );
        lastPaint = now;
      }
      animation = requestAnimationFrame(draw);
    }
    draw(start);
  }
  return { play, stop };
}
