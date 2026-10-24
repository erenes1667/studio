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
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xfff1dd, 1.85); key.position.set(-120, 160, 220); scene.add(key);
// soft drop shadow on a wall just behind the part: the 5 mm thickness reads as real, and the layers show it when pulled apart
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 7; key.shadow.blurSamples = 16; key.shadow.bias = -0.0004;
Object.assign(key.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 50, far: 700 }); key.shadow.camera.updateProjectionMatrix();
const wall = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.ShadowMaterial({ opacity: 0.4 }));
wall.position.z = -9; wall.receiveShadow = true; scene.add(wall);
// soft blurred contact shadow: a dark radial disc just in front of the wall, so the part sits in the scene instead of floating
const blob = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(0,0,0,0.62)'); r.addColorStop(0.55, 'rgba(0,0,0,0.3)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.position.z = -8.6; m.renderOrder = -1; scene.add(m); return m;
})();
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

// Page scroll first. Wheel zooms only with Ctrl. A finger rotates only after one tap on the model (tap outside to give scroll back).
const hint = $('#hint'), coarse = matchMedia('(pointer: coarse)').matches;
let armed = false, tap = null;
function setArmed(v) {
  armed = v; canvas.style.touchAction = v ? 'none' : 'pan-y';
  if (hint) hint.textContent = !coarse ? 'Drag to rotate. Ctrl and scroll to zoom.' : v ? 'Drag to rotate. Pinch to zoom.' : 'Tap the model to rotate';
}
setArmed(false);
const viewEl = document.getElementById('view');
viewEl.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey)) e.stopImmediatePropagation(); }, true);
viewEl.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') { controls.enabled = true; return; }
  controls.enabled = armed; tap = { x: e.clientX, y: e.clientY, t: e.timeStamp };
}, true);
viewEl.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'touch' || !tap) return;
  if (!armed && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10 && e.timeStamp - tap.t < 500) setArmed(true);
  tap = null;
}, true);
viewEl.addEventListener('pointercancel', () => { tap = null; }, true);
document.addEventListener('pointerdown', (e) => { if (armed && e.pointerType === 'touch' && !viewEl.contains(e.target)) setArmed(false); }, true);

const root = new THREE.Group(); scene.add(root);     // sway happens on this group
const TARGET_X = -6, TARGET_Y = 8;                    // frame centre: ruler sits left of the part, headroom for the HUD
const sets = {};
let active = null, dirty = true, sway = reduce ? 0 : 1, swayTarget = sway;

// ---------------------------------------------------------------- scale bar (a real ruler in the model plane)
function label(text, h = 7) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), font = '700 54px "Hanken Grotesk", Arial, sans-serif';
  g.font = font; c.width = Math.ceil(g.measureText(text).width) + 12; c.height = 96;
  g.font = font; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#efe9e1'; g.fillText(text, 6, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(h * (c.width / 96), h, 1); s.center.set(0, 0.5); s.renderOrder = 10;
  return s;
}
function ruler(box) {
  // vertical ruler on the left for a tall part, horizontal ruler under a long part; either way 7 mm off the outline
  const g = new THREE.Group();
  const W = box.max.x - box.min.x, H = box.max.y - box.min.y, horiz = W > H;
  const L = horiz ? W : H, OFF = 7;
  const P = horiz ? (a, c) => [box.min.x + a, box.min.y - OFF - c, 0] : (a, c) => [box.min.x - OFF - c, box.min.y + a, 0];
  const pts = [...P(0, 0), ...P(L, 0)];
  for (let mm = 0; mm <= L + 0.01; mm += IN / 4) {
    const big = Math.abs(mm % IN) < 0.01 || Math.abs((mm % IN) - IN) < 0.01;
    const len = big ? 6 : (Math.abs(mm % (IN / 2)) < 0.01 ? 4 : 2.4);
    pts.push(...P(mm, 0), ...P(mm, len));
  }
  pts.push(...P(L, 0), ...P(L, 6));
  const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xff6b2c, depthTest: false, transparent: true }));
  m.renderOrder = 9; g.add(m);
  for (let k = 0; k * IN <= L + 0.01; k++) {
    const s = label(String(k)); const [x, y] = P(k * IN, horiz ? 13.5 : 7.5);
    if (horiz) s.center.set(0.5, 0.5); s.position.set(x, y, 0); g.add(s);
  }
  const top = label((L / IN).toFixed(2) + ' in', 6.5);
  if (horiz) { top.center.set(1, 0.5); top.position.set(box.max.x + 4, box.min.y - OFF - 21, 0); } else top.position.set(box.min.x - OFF - 3, box.max.y + 6, 0);
  g.add(top);
  return g;
}
function loopTag(box, meshes) {
  // the cord hole is at the top of the part: find the loop centre from the highest vertices, draw the cord up to the mirror, name it
  const g = new THREE.Group();
  const pos = meshes[0].geometry.attributes.position; let sx = 0, n = 0;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > box.max.y - 0.6) { sx += pos.getX(i); n++; }
  const hx = n ? sx / n : (box.min.x + box.max.x) / 2, hy = box.max.y - 8;
  const cord = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([hx, hy, 2.6, hx, box.max.y + 70, 2.6], 3)),
    new THREE.LineBasicMaterial({ color: 0xefe9e1, transparent: true, opacity: 0.45 }));
  g.add(cord);
  const t = label('Hanging loop', 5.4); t.position.set(hx + 9, box.max.y + 1.5, 0); g.add(t);
  const tick = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([hx + 2.5, box.max.y + 1.5, 0, hx + 8, box.max.y + 1.5, 0], 3)),
    new THREE.LineBasicMaterial({ color: 0xefe9e1, transparent: true, opacity: 0.6, depthTest: false }));
  g.add(tick);
  return g;
}

// ---------------------------------------------------------------- load
const loader = new STLLoader();
const loadBody = (b) => new Promise((res, rej) => loader.load(b.stl, (geo) => {
  const g = toCreasedNormals(geo, 0.62);
  const mat = new THREE.MeshPhysicalMaterial({ color: b.color, roughness: 0.36, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 0.7 });
  const mesh = new THREE.Mesh(g, mat); mesh.userData.body = b; mesh.castShadow = true;
  res(mesh);
}, undefined, (e) => rej(new Error('STL failed: ' + b.stl))));

async function loadSet(o) {
  const grp = new THREE.Group(); grp.visible = false; root.add(grp);
  const meshes = await Promise.all(o.bodies.map(loadBody));
  const box = new THREE.Box3();
  meshes.forEach((m, i) => { m.position.z = -2.5; grp.add(m); m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); });
  const rl = ruler(box); rl.position.z = -2.5; grp.add(rl);
  const lt = loopTag(box, meshes); lt.position.z = -2.5; grp.add(lt);
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
    li.innerHTML = `<input type="checkbox" id="${id}" checked><label for="${id}"><i style="background:${b.color}"></i><span><b>${b.name}</b><small>${i === 0 ? 'Bottom layer' : i === s.o.bodies.length - 1 ? 'Top layer' : 'Middle layer'}</small></span></label>`;
    li.querySelector('input').addEventListener('change', (e) => { s.meshes[i].visible = e.target.checked; dirty = true; });
    list.appendChild(li);
  });
  $('#wire').checked = !!s.wire; $('#explode').value = s.explode || 0; applyExplode(s);
  const [w, h, t] = s.size.toArray();
  $('#dims').textContent = `${w.toFixed(1)} x ${h.toFixed(1)} x ${t.toFixed(1)} mm`;
  $('#hud-name').textContent = s.o.name;
  $('#tag').textContent = s.o.tag || 'Sample draft';
  blob.scale.set(s.size.x * 1.25, s.size.y * 1.15, 1);
  blob.position.set((s.box.min.x + s.box.max.x) / 2, (s.box.min.y + s.box.max.y) / 2 - 7, -8.6);
  $('#scale-readout').innerHTML = `Ruler in inches. Part: <b>${(w / IN).toFixed(2)} x ${(h / IN).toFixed(2)} x ${(t / IN).toFixed(2)} in</b>.`;
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
$('#explode').addEventListener('input', () => {
  if (!active) return;
  // straight-on views hide depth: switch to 3/4 first so the slider never looks dead
  if (Math.abs(camera.position.x - TARGET_X) < 1 && Math.abs(camera.position.y - TARGET_Y) < 1) $('#v-angle').click();
  applyExplode(active);
});

function look(az, el, keepSway = false) {
  setView(az === 0 && el === 0 ? 'v-front' : az === 180 ? 'v-back' : 'v-angle');
  const R = 500, a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  controls.target.set(TARGET_X, TARGET_Y, 0);
  camera.position.set(TARGET_X + R * Math.sin(a) * Math.cos(e), TARGET_Y + R * Math.sin(e), R * Math.cos(a) * Math.cos(e));
  camera.zoom = 1; camera.updateProjectionMatrix();
  if (!keepSway) { swayTarget = 0; root.rotation.set(0, 0, 0); sway = 0; }
  controls.update(); dirty = true;
}
const viewBtns = ['v-front', 'v-angle', 'v-back'].map((id) => $('#' + id));
function setView(id) { viewBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.id === id))); }
$('#v-front').addEventListener('click', () => look(0, 0));
$('#v-angle').addEventListener('click', () => look(32, 18));
$('#v-back').addEventListener('click', () => look(180, 0));

// ---------------------------------------------------------------- framing
function fit() {
  const w = view.clientWidth, h = view.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false);
  const size = active ? active.size : new THREE.Vector3(96, 101.6, 5);
  const hud = $('.hud'), hb = hud ? hud.offsetHeight + 24 : 0;       // fixed header band the model never enters
  const horiz = size.x > size.y;                                      // long part: ruler under it, tall part: ruler on the left
  const cy = horiz ? -11 : 6;                                          // world y of the content centre (part is centred on 0, loop label on top, ruler below a long part)
  const needH = size.y + (horiz ? 44 : 30), needW = size.x + 30;      // room for the ruler, the loop label and the sway in 3/4
  const fb = 46;                                                       // bottom band for the hint pill
  const perPx = Math.max(needH / Math.max(60, h - hb - fb), needW / w); // world units per pixel
  const yc = hb + (h - hb - fb) / 2 + (cy - TARGET_Y) / perPx;         // pixel row where the camera axis lands
  camera.left = -perPx * w / 2; camera.right = perPx * w / 2; camera.top = perPx * yc; camera.bottom = -perPx * (h - yc);
  camera.updateProjectionMatrix(); dirty = true;
  if (active) renderer.render(scene, camera);                          // setSize clears the canvas: redraw now, not on the next frame
}
new ResizeObserver(fit).observe(view);

// ---------------------------------------------------------------- loop
controls.addEventListener('start', () => { swayTarget = 0; setView(null); });
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
  if (dirty) { renderer.render(scene, camera); dirty = false; if (!drawn) { drawn = true; say(''); } }
}
let drawn = false;
document.addEventListener('visibilitychange', () => { dirty = true; if (!document.hidden && active) renderer.render(scene, camera); });
new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { dirty = true; if (active) renderer.render(scene, camera); } }).observe(view);

(async function init() {
  say('Loading the STL files');
  try {
    for (const o of DATA) await loadSet(o);
    camera.position.set(TARGET_X, TARGET_Y, 500); controls.target.set(TARGET_X, TARGET_Y, 0); controls.update();
    setActive(DATA[0].slug);
    look(32, 18, true);   // open on the 3/4 view with the idle sway, so depth shows in the first second
    api.ready = true; document.documentElement.dataset.viewer = 'ready';
  } catch (e) {
    api.errors.push(String(e)); say('Could not load the models: ' + e.message);
    console.error(e);
  }
  requestAnimationFrame(frame);
})();
window.addEventListener('error', (e) => api.errors.push(String(e.message)));
// poster export: render then read in the same task, so the frame is still in the buffer
api.snap = (type = 'image/webp', q = 0.85) => { renderer.render(scene, camera); return canvas.toDataURL(type, q); };
