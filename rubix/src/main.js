import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ---------- 1. Scene, camera, renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  45,                                     // field of view
  window.innerWidth / window.innerHeight, // aspect ratio
  0.1,                                    // nearest distance seen
  100                                     // farthest distance seen
);
camera.position.set(5, 4, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ---------- 2. Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(5, 10, 7);
scene.add(sun);

// ---------- 3. Building the cube ----------
const COLORS = {
  right:  0xb71234, // red     (+x)
  left:   0xff5800, // orange  (-x)
  top:    0xffffff, // white   (+y)
  bottom: 0xffd500, // yellow  (-y)
  front:  0x009b48, // green   (+z)
  back:   0x0046ad, // blue    (-z)
  inside: 0x111111, // hidden faces
};

function createCubie(x, y, z) {
  // Order Three.js expects: +x, -x, +y, -y, +z, -z
  const faceColors = [
    x ===  1 ? COLORS.right  : COLORS.inside,
    x === -1 ? COLORS.left   : COLORS.inside,
    y ===  1 ? COLORS.top    : COLORS.inside,
    y === -1 ? COLORS.bottom : COLORS.inside,
    z ===  1 ? COLORS.front  : COLORS.inside,
    z === -1 ? COLORS.back   : COLORS.inside,
  ];

  const materials = faceColors.map(
    (color) => new THREE.MeshStandardMaterial({ color })
  );

  const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95); // small gap
  const cubie = new THREE.Mesh(geometry, materials);
  cubie.position.set(x, y, z);
  return cubie;
}

const cube = new THREE.Group();
const cubies = [];

for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      const cubie = createCubie(x, y, z);
      cubies.push(cubie);
      cube.add(cubie);
    }
  }
}

scene.add(cube);

// ---------- 4. Layer helpers ----------
// All cubies where one coordinate equals a value (e.g. right face: x === 1)
function getLayer(axis, value) {
  return cubies.filter((c) => Math.round(c.position[axis]) === value);
}

// Round tiny maths errors away after each turn
function snap(cubie) {
  cubie.updateMatrix();
  const e = cubie.matrix.elements;
  for (let i = 0; i < 16; i++) e[i] = Math.round(e[i]);
  cubie.matrix.decompose(cubie.position, cubie.quaternion, cubie.scale);
}

// ---------- 5. Turning a layer (the pivot / turntable trick) ----------
let turning = false;

function turnLayer(axis, layerValue, direction = 1) {
  if (turning) return; // ignore input while a turn is running
  turning = true;

  const pivot = new THREE.Group();   // the turntable
  cube.add(pivot);

  const layer = getLayer(axis, layerValue);
  layer.forEach((c) => pivot.attach(c)); // put the 9 cubies on it

  const target = direction * (Math.PI / 2); // 90 degrees
  const duration = 300;                     // milliseconds
  const startTime = performance.now();

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1); // progress 0 -> 1
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    pivot.rotation[axis] = target * eased;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      pivot.rotation[axis] = target;
      pivot.updateMatrixWorld();
      layer.forEach((c) => {
        cube.attach(c); // put them back on the cube
        snap(c);
      });
      cube.remove(pivot);
      turning = false;
    }
  }
  requestAnimationFrame(step);
}

// ---------- 6. Keyboard controls ----------
// [axis, layer value, clockwise direction]
const MOVES = {
  r: ['x',  1, -1],
  l: ['x', -1,  1],
  u: ['y',  1, -1],
  d: ['y', -1,  1],
  f: ['z',  1, -1],
  b: ['z', -1,  1],
};

window.addEventListener('keydown', (e) => {
  const move = MOVES[e.key.toLowerCase()];
  if (!move) return;
  const [axis, layerValue, dir] = move;
  turnLayer(axis, layerValue, e.shiftKey ? -dir : dir); // Shift = reverse
});

// ---------- 7. Animation loop + resize ----------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});