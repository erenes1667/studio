// Mirror ornaments viewer. Loads the same STL files the page offers for download. three.js 0.160.0 from jsdelivr (import map in index.html).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const DATA = JSON.parse(document.getElementById('data').textContent);
const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]still/.test(location.search);
const IN = 25.4;
const api = (window.__ornaments = { ready: false, errors: [], active: null, sets: {} });

const view = $('#view'), canvas = $('#gl'), statusEl = $('#status');
const say = (t) => { statusEl.textContent = t; statusEl.hidden = !t; };

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  say('This viewer needs WebGL. The download links below still work.');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xfff1dd, 1.85); key.position.set(-120, 160, 220); scene.add(key);
const rim = new THREE.DirectionalLight(0xff8a50, 0.7); rim.position.set(160, -40, -80); scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.24));

const camera = new THREE.OrthographicCamera(-60, 60, 60, -60, 1, 2000);
camera.position.set(0, 0, 500);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = !reduce; controls.dampingFactor = 0.09;
controls.rotateSpeed = 0.9; controls.zoomSpeed = 0.9; controls.minZoom = 0.6; controls.maxZoom = 9;
controls.screenSpacePanning = true;
controls.listenToKeyEvents(canvas);
canvas.tabIndex = 0;

const root = new THREE.Group(); scene.add(root);     // sway happens on this group
const TARGET_X = -6, TARGET_Y = 5;                    // frame centre: ruler sits left of the part, headroom for the HUD
const sets = {};
let active = null, dirty = true, sway = reduce ? 0 : 1, swayTarget = sway;

// ---------------------------------------------------------------- scale bar (a real ruler in the model plane)
function label(text, h = 7) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.font = '700 54px "Hanken Grotesk", Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#efe9e1'; g.fillText(text, 6, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(h * (256 / 96), h, 1); s.center.set(0, 0.5); s.renderOrder = 10;
  return s;
}
function ruler(box) {
  const g = new THREE.Group();
  const H = box.max.y - box.min.y, x = box.min.x - 11, y0 = box.min.y;
  const pts = [x, y0, 0, x, y0 + H, 0];
  for (let mm = 0; mm <= H + 0.01; mm += IN / 4) {
    const big = Math.abs(mm % IN) < 0.01 || Math.abs((mm % IN) - IN) < 0.01;
    const len = big ? 6 : (Math.abs(mm % (IN / 2)) < 0.01 ? 4 : 2.4);
    pts.push(x, y0 + mm, 0, x + len, y0 + mm, 0);
  }
  pts.push(x, y0 + H, 0, x + 6, y0 + H, 0);
  const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xff6b2c, depthTest: false, transparent: true }));
  m.renderOrder = 9; g.add(m);
  for (let k = 0; k * IN <= H + 0.01; k++) { const s = label(String(k)); s.position.set(x - 7.5, y0 + k * IN, 0); g.add(s); }
  const top = label((H / IN).toFixed(2) + ' in', 6.5); top.position.set(x - 3, y0 + H + 6, 0); g.add(top);
  return g;
}

// ---------------------------------------------------------------- load
const loader = new STLLoader();
const loadBody = (b) => new Promise((res, rej) => loader.load(b.stl, (geo) => {
  const g = toCreasedNormals(geo, 0.62);
  const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.38, metalness: 0, envMapIntensity: 0.45 });
  const mesh = new THREE.Mesh(g, mat); mesh.userData.body = b;
  res(mesh);
}, undefined, (e) => rej(new Error('STL failed: ' + b.stl))));

async function loadSet(o) {
  const grp = new THREE.Group(); grp.visible = false; root.add(grp);
  const meshes = await Promise.all(o.bodies.map(loadBody));
  const box = new THREE.Box3();
  meshes.forEach((m, i) => { m.position.z = -2.5; grp.add(m); m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); });
  const rl = ruler(box); rl.position.z = -2.5; grp.add(rl);
  const s = { o, grp, meshes, box, ruler: rl, size: box.getSize(new THREE.Vector3()) };
  sets[o.slug] = s; api.sets[o.slug] = { bodies: meshes.length, tris: meshes.map((m) => m.geometry.attributes.position.count / 3), size_mm: s.size.toArray().map((v) => +v.toFixed(3)) };
  return s;
}

// ---------------------------------------------------------------- panel
const tabs = [...document.querySelectorAll('[data-tab]')];
const list = $('#bodies');
function showPanel(s) {
  list.innerHTML = '';
  s.o.bodies.forEach((b, i) => {
    const li = document.createElement('li');
    const id = 'b-' + b.id;
    li.innerHTML = `<input type="checkbox" id="${id}" checked><label for="${id}"><i style="background:${b.color}"></i><span><b>${b.name}</b><small>z ${b.z0.toFixed(1)} to ${b.z1.toFixed(1)} mm</small></span></label>`;
    li.querySelector('input').addEventListener('change', (e) => { s.meshes[i].visible = e.target.checked; dirty = true; });
    list.appendChild(li);
  });
  $('#wire').checked = !!s.wire; $('#explode').value = s.explode || 0; applyExplode(s);
  const [w, h, t] = s.size.toArray();
  $('#dims').textContent = `${w.toFixed(1)} x ${h.toFixed(1)} x ${t.toFixed(1)} mm`;
  $('#hud-name').textContent = s.o.name;
  $('#scale-readout').innerHTML = `Scale bar: 0 to <b>${(h / IN).toFixed(2)} in</b> (${h.toFixed(1)} mm). Part: ${(w / IN).toFixed(2)} x ${(h / IN).toFixed(2)} x ${(t / IN).toFixed(2)} in, measured from the loaded STL files.`;
}
function applyExplode(s) {
  const k = +$('#explode').value;
  s.explode = k;
  s.meshes.forEach((m, i) => { m.position.z = -2.5 + i * k * 11; });
  dirty = true;
}
function setActive(slug) {
  const s = sets[slug]; if (!s) return;
  active = s; api.active = slug;
  Object.values(sets).forEach((x) => (x.grp.visible = x === s));
  tabs.forEach((t) => { const on = t.dataset.tab === slug; t.setAttribute('aria-pressed', on); });
  showPanel(s); fit(); dirty = true;
}
tabs.forEach((t) => t.addEventListener('click', () => setActive(t.dataset.tab)));
$('#wire').addEventListener('change', (e) => { if (!active) return; active.wire = e.target.checked; active.meshes.forEach((m) => (m.material.wireframe = e.target.checked)); dirty = true; });
$('#explode').addEventListener('input', () => active && applyExplode(active));

function look(az, el) {
  const R = 500, a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  controls.target.set(TARGET_X, TARGET_Y, 0);
  camera.position.set(TARGET_X + R * Math.sin(a) * Math.cos(e), TARGET_Y + R * Math.sin(e), R * Math.cos(a) * Math.cos(e));
  camera.zoom = 1; camera.updateProjectionMatrix();
  swayTarget = 0; root.rotation.set(0, 0, 0); sway = 0;
  controls.update(); dirty = true;
}
$('#v-front').addEventListener('click', () => look(0, 0));
$('#v-angle').addEventListener('click', () => look(32, 18));
$('#v-back').addEventListener('click', () => look(180, 0));

// ---------------------------------------------------------------- framing
function fit() {
  const w = view.clientWidth, h = view.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false);
  const aspect = w / h, size = active ? active.size : new THREE.Vector3(96, 101.6, 5);
  const needH = size.y * 1.2 + 26, needW = size.x + 38;
  const half = Math.max(needH / 2, needW / 2 / aspect);
  camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
  camera.updateProjectionMatrix(); dirty = true;
}
new ResizeObserver(fit).observe(view);

// ---------------------------------------------------------------- loop
controls.addEventListener('start', () => { swayTarget = 0; });
controls.addEventListener('change', () => { dirty = true; });
let t0 = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) return;
  if (sway > 0.001 || swayTarget > 0) {
    sway += (swayTarget - sway) * 0.06;
    const t = (now - t0) / 1000;
    root.rotation.y = Math.sin(t * 0.7) * 0.5 * sway; root.rotation.x = Math.sin(t * 0.5 + 1) * 0.1 * sway;
    dirty = true;
  }
  if (controls.update()) dirty = true;
  if (dirty) { renderer.render(scene, camera); dirty = false; }
}

(async function init() {
  say('Loading the STL files');
  try {
    for (const o of DATA) await loadSet(o);
    camera.position.set(TARGET_X, TARGET_Y, 500); controls.target.set(TARGET_X, TARGET_Y, 0); controls.update();
    setActive(DATA[0].slug);
    say('');
    api.ready = true; document.documentElement.dataset.viewer = 'ready';
  } catch (e) {
    api.errors.push(String(e)); say('Could not load the models: ' + e.message);
    console.error(e);
  }
  requestAnimationFrame(frame);
})();
window.addEventListener('error', (e) => api.errors.push(String(e.message)));
