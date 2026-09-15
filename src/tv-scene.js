import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Group,
  Shape,
  Path,
  ExtrudeGeometry,
  Mesh,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  HemisphereLight,
  DirectionalLight,
  TorusGeometry,
  SRGBColorSpace,
} from "three";

// Original geometric lettering; no font, texture, or model requests are needed.
function four() {
  const shape = new Shape();
  [
    [0.61, 1.4],
    [0, 0.48],
    [0, 0.26],
    [0.59, 0.26],
    [0.59, 0],
    [0.86, 0],
    [0.86, 0.26],
    [1.02, 0.26],
    [1.02, 0.52],
    [0.86, 0.52],
    [0.86, 1.4],
  ].forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  const hole = new Path();
  hole.moveTo(0.25, 0.52);
  hole.lineTo(0.59, 1.04);
  hole.lineTo(0.59, 0.52);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

function zero() {
  const shape = new Shape();
  shape.absellipse(0.47, 0.7, 0.47, 0.7, 0, Math.PI * 2, false);
  const hole = new Path();
  hole.absellipse(0.47, 0.7, 0.23, 0.43, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

export function createScene(host) {
  const canvas = document.createElement("canvas");
  canvas.className = "three-art";
  canvas.setAttribute("aria-hidden", "true");
  // Fall back to the existing CSS illustration if WebGL is unavailable.
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!context) return null;
  const renderer = new WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 30);
  const sculpture = new Group();
  const front = new MeshPhysicalMaterial({
    color: 0xfffcf3,
    roughness: 0.27,
    metalness: 0.08,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
  });
  const edge = new MeshStandardMaterial({
    color: 0xc83832,
    roughness: 0.35,
    metalness: 0.12,
  });
  const options = {
    depth: 0.28,
    bevelEnabled: true,
    bevelSize: 0.022,
    bevelThickness: 0.025,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 28,
  };
  const fourGeometry = new ExtrudeGeometry(four(), options);
  const zeroGeometry = new ExtrudeGeometry(zero(), options);
  [fourGeometry, zeroGeometry, fourGeometry].forEach((geometry, i) => {
    const mesh = new Mesh(geometry, [front, edge]);
    mesh.position.set(-1.63 + i * 1.12, -0.7, -0.14);
    sculpture.add(mesh);
  });
  const ringMaterial = new MeshStandardMaterial({
    color: 0xd7c8b3,
    transparent: true,
    opacity: 0.58,
    roughness: 0.28,
    metalness: 0.65,
  });
  const ringGeometry = new TorusGeometry(1.9, 0.012, 6, 100);
  const ring = new Mesh(ringGeometry, ringMaterial);
  ring.rotation.set(1.12, 0.3, 0.18);
  sculpture.add(ring);
  scene.add(sculpture);
  scene.add(new HemisphereLight(0xfff8eb, 0x615048, 2.5));
  const key = new DirectionalLight(0xffffff, 3.3);
  key.position.set(-3, 5, 7);
  scene.add(key);
  const rim = new DirectionalLight(0xffa293, 1.5);
  rim.position.set(4, -1, -3);
  scene.add(rim);
  let lost = false;
  let disposed = false;
  let dimensions = "";
  function resize() {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return false;
    const next = `${width}:${height}`;
    if (next !== dimensions) {
      dimensions = next;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = Math.max(5.8, 6.8 / camera.aspect);
      camera.updateProjectionMatrix();
    }
    return true;
  }
  function render(x = 0, y = 0) {
    if (lost || disposed || !resize()) return;
    sculpture.rotation.set(0.12 + y * 0.1, -0.28 + x * 0.22, 0.025);
    key.position.x = -3 + x * 2;
    key.position.y = 5 - y * 2;
    renderer.render(scene, camera);
    host.classList.add("webgl-ready");
  }
  function onLost(event) {
    event.preventDefault();
    lost = true;
    host.classList.remove("webgl-ready");
  }
  function onRestored() {
    lost = false;
    if (host.getClientRects().length && !document.hidden) render();
  }
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  host.append(canvas);
  return {
    render,
    dispose() {
      disposed = true;
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      fourGeometry.dispose();
      zeroGeometry.dispose();
      ringGeometry.dispose();
      front.dispose();
      edge.dispose();
      ringMaterial.dispose();
      renderer.dispose();
      canvas.remove();
      host.classList.remove("webgl-ready");
    },
  };
}
