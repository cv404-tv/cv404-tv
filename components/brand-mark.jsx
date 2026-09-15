"use client";

import { useEffect, useId, useRef } from "react";
import { Playback } from "../lib/brand-playback";
import { BRAND_PATH, HOME_POSITIONS, getTrianglePositions, getRingPose, getRingReturnPose } from "../lib/brand-motion";

function useBrandMotion(ref) {
  useEffect(() => {
    const svg = ref.current;
    const link = svg.closest(".brand");
    if (!link) return;
    const path = svg.querySelector("[data-orbit-path]");
    const markers = HOME_POSITIONS.map((_, index) => [...svg.querySelectorAll(`[data-marker="${index}"]`)]);
    const faces = [...svg.querySelectorAll("[data-ring-face]")];
    const sides = [...svg.querySelectorAll("[data-ring-side]")];
    const parkedDepth = svg.querySelector("[data-parked-depth]");
    const movingDepth = svg.querySelector("[data-moving-depth]");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const hover = matchMedia("(hover: hover)");
    const playback = new Playback();
    const length = path.getTotalLength();
    let maxRadius = 1;
    for (let i = 0; i < 256; i++) {
      const point = path.getPointAtLength(length * i / 256);
      maxRadius = Math.max(maxRadius, Math.hypot(point.x, point.y));
    }
    let frame = 0;
    let previous = null;
    let ringState = "idle";
    let displayedRing = { opening: 1, side: 0 };
    let ringReturnFrom = displayedRing;

    const render = () => {
      const { progress, blend } = playback;
      const positions = getTrianglePositions(progress);
      markers.forEach((nodes, index) => {
        const point = path.getPointAtLength(((positions[index] % 1 + 1) % 1) * length);
        const home = HOME_POSITIONS[index];
        const x = home.x + (point.x - home.x) * blend;
        const y = home.y + (point.y - home.y) * blend;
        const radius = Math.min(1, Math.hypot(point.x, point.y) / maxRadius);
        const ease = radius * radius * (3 - 2 * radius);
        const size = .4 + (.13 + .27 * ease - .4) * blend;
        nodes.forEach((node) => {
          node.setAttribute("transform", `translate(${x} ${y}) scale(${size})`);
          node.setAttribute("opacity", Number((node.dataset.plane === "front") === (y >= 0)));
        });
      });

      if (playback.state === "returning" && ringState !== "returning") ringReturnFrom = { ...displayedRing };
      ringState = playback.state;
      if (playback.state === "returning") {
        displayedRing = getRingReturnPose(ringReturnFrom, playback.transition.elapsed / playback.transition.duration);
      } else {
        const orbit = getRingPose(progress);
        displayedRing = { opening: 1 + (orbit.opening - 1) * blend, side: orbit.side * blend };
      }
      parkedDepth.setAttribute("opacity", 1 - blend);
      movingDepth.setAttribute("opacity", blend);
      const { opening, side } = displayedRing;
      faces.forEach((node) => node.setAttribute("transform", `scale(${opening} 1)`));
      const radius = 188.64;
      const rx = Math.max(.001, radius * opening);
      const left = Math.min(0, side), right = Math.max(0, side);
      const body = `M${left} ${-radius} H${right} A${rx} ${radius} 0 0 1 ${right} ${radius} H${left} A${rx} ${radius} 0 0 1 ${left} ${-radius}Z`;
      sides.forEach((node) => node.setAttribute("d", body));
      svg.dataset.motionState = playback.state;
    };

    const tick = (now) => {
      frame = 0;
      if (previous !== null) playback.advance(Math.min(now - previous, 100));
      previous = now;
      render();
      if (playback.state !== "idle") frame = requestAnimationFrame(tick);
      else previous = null;
    };
    const sync = () => {
      if (reduced.matches || document.hidden) {
        playback.wantsPlay = false;
        playback.settle();
      } else {
        playback.setPlaying((hover.matches && link.matches(":hover")) || link.matches(":focus-visible"));
      }
      render();
      if (playback.state === "idle") {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = null;
      } else if (!frame) {
        previous = null;
        frame = requestAnimationFrame(tick);
      }
    };
    const events = ["pointerenter", "pointerleave", "focusin", "focusout"];
    events.forEach((event) => link.addEventListener(event, sync));
    reduced.addEventListener("change", sync);
    hover.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      events.forEach((event) => link.removeEventListener(event, sync));
      reduced.removeEventListener("change", sync);
      hover.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ref]);
}

export function BrandMark() {
  const instance = useId().replace(/:/g, "");
  const id = (name) => `brand-${instance}-${name}`;
  const href = (name) => `#${id(name)}`;
  const mask = (name) => `url(#${id(name)})`;
  const ref = useRef(null);
  useBrandMotion(ref);

  const triangle = (index, plane) => (
    <g key={`${index}-${plane}`} data-marker={index} data-plane={plane}
      opacity={Number((plane === "front") === (index === 1))}
      transform={`translate(${HOME_POSITIONS[index].x} ${HOME_POSITIONS[index].y}) scale(.4)`}>
      <use href={href("triangle-art")} />
    </g>
  );
  return (
    <svg ref={ref} className="brand-mark" xmlns="http://www.w3.org/2000/svg"
      viewBox="96 212 832 600" width="72" height="52" aria-hidden="true" focusable="false" data-motion-state="idle">
      <defs>
        <path data-orbit-path="" d={BRAND_PATH} />
        <path id={id("triangle")} d="M240 60 430 420H50Z" transform="translate(-172.8 -172.8) scale(.72)" />
        <circle id={id("circle")} cx="240" cy="240" r="190" transform="translate(-172.8 -172.8) scale(.72)" />
        <mask id={id("triangle-cutout")} maskUnits="userSpaceOnUse" x="-260" y="-260" width="650" height="650" style={{ maskType: "luminance" }}>
          <g stroke="white" strokeLinejoin="round" strokeLinecap="round">
            <use href={href("triangle")} fill="none" strokeWidth="122" transform="translate(42 48)" />
            <use href={href("triangle")} fill="black" strokeWidth="156" />
          </g>
        </mask>
        <mask id={id("circle-cutout")} maskUnits="userSpaceOnUse" x="-260" y="-260" width="650" height="650" style={{ maskType: "luminance" }}>
          <path data-ring-side="" fill="white" />
          <use data-ring-face="" href={href("circle")} fill="black" stroke="white" strokeWidth="144" />
        </mask>
        <g id={id("triangle-art")} mask={mask("triangle-cutout")} strokeLinejoin="round" strokeLinecap="round">
          <use href={href("triangle")} fill="none" stroke="#C83832" strokeWidth="122" transform="translate(42 48)" />
          <use href={href("triangle")} fill="#22272A" stroke="#22272A" strokeWidth="156" />
          <use href={href("triangle")} fill="none" stroke="#FFFFFF" strokeWidth="122" />
        </g>
        <mask id={id("parked-cutout")} maskUnits="userSpaceOnUse" x="-260" y="-260" width="650" height="650" style={{ maskType: "luminance" }}>
          <use href={href("circle")} fill="none" stroke="white" strokeWidth="110" transform="translate(42 48)" />
          <use href={href("circle")} fill="black" stroke="white" strokeWidth="144" />
        </mask>
      </defs>
      <g data-scene="" transform="translate(497.12 494.12) scale(2.5)">
        {triangle(0, "back")}{triangle(1, "back")}
        <g transform="scale(.4)" strokeLinejoin="round" strokeLinecap="round">
          <g data-parked-depth="" mask={mask("parked-cutout")}>
            <use href={href("circle")} fill="none" stroke="#C83832" strokeWidth="110" transform="translate(42 48)" />
          </g>
          <g mask={mask("circle-cutout")}>
            <path data-ring-side="" data-moving-depth="" fill="#C83832" opacity="0" />
            <g data-ring-face="">
              <use href={href("circle")} fill="#22272A" stroke="#22272A" strokeWidth="144" />
              <use href={href("circle")} fill="none" stroke="#FFFFFF" strokeWidth="110" />
            </g>
          </g>
        </g>
        {triangle(0, "front")}{triangle(1, "front")}
      </g>
    </svg>
  );
}
