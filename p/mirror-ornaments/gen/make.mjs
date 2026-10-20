// shapes.json -> files/*.stl (one per body) and files/*.3mf (one per ornament, bodies as parts of ONE object).
// Same toolchain as isim-engine and filament-portre: THREE.Shape, ExtrudeGeometry (no bevel), STLExporter, hand-written 3MF.
// Run: python3 shapes.py && npm i && node make.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const data = JSON.parse(fs.readFileSync(new URL('./shapes.json', import.meta.url)));
const out = new URL('../files/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });

function bodyGeometry(b) {
  const parts = b.polys.map((p) => {
    const sh = new THREE.Shape(p.outer.map(([x, y]) => new THREE.Vector2(x, y)));
    sh.holes = p.holes.map((h) => new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    const g = new THREE.ExtrudeGeometry(sh, { depth: b.z1 - b.z0, bevelEnabled: false, curveSegments: 1, steps: 1 });
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    return g;
  });
  // each polygon is its own closed shell; concatenate, then weld the duplicate corner vertices ExtrudeGeometry emits
  const pos = [];
  for (const g of parts) pos.push(...g.getAttribute('position').array);
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g = mergeVertices(g, 1e-4);
  g.translate(0, 0, b.z0);
  return g;
}

const stl = new STLExporter();
for (const o of data.ornaments) {
  const geos = o.bodies.map(bodyGeometry);
  const box = new THREE.Box3();
  geos.forEach((g) => { g.computeBoundingBox(); box.union(g.boundingBox); });
  const cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2;
  geos.forEach((g) => g.translate(-cx, -cy, 0));          // XY centred on the part, back face on z = 0
  const meta = { slug: o.slug, name: o.name, colors: o.colors, bodies: [] };
  o.bodies.forEach((b, i) => {
    const mesh = new THREE.Mesh(geos[i]);
    const dv = stl.parse(mesh, { binary: true });
    const file = `${b.id}.stl`;
    fs.writeFileSync(out + file, Buffer.from(dv.buffer, dv.byteOffset, dv.byteLength));
    meta.bodies.push({ id: b.id, name: b.name, color: b.color, z0: b.z0, z1: b.z1, stl: file, tris: geos[i].index.count / 3 });
  });
  fs.writeFileSync(out + `${o.slug}.3mf`, make3MF(o, geos));
  box.min.x -= cx; box.max.x -= cx; box.min.y -= cy; box.max.y -= cy;
  meta.bbox_mm = [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z].map((v) => +v.toFixed(3));
  data.ornaments.find((x) => x.slug === o.slug).meta = meta;
}
fs.writeFileSync(out + 'manifest.json', JSON.stringify(data.ornaments.map((o) => o.meta), null, 1));
console.log(data.ornaments.map((o) => `${o.slug} ${o.meta.bbox_mm.join(' x ')} mm, ${o.meta.bodies.map((b) => b.tris).join('/')} tris`).join('\n'));

// ---------------------------------------------------------------- 3MF (core spec; Bambu Studio part metadata in model_settings.config)
function make3MF(o, geos) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const n = geos.length, asm = n + 1;
  let m = '<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n';
  m += `<metadata name="Title">${esc(o.name)} (draft)</metadata>\n<metadata name="Designer">Enes Eren Studio</metadata>\n<metadata name="Application">mirror-ornaments gen (three.js 0.160)</metadata>\n<resources>\n`;
  geos.forEach((g, i) => {
    const p = g.getAttribute('position'), ix = g.index;
    const v = [], t = [];
    for (let k = 0; k < p.count; k++) v.push(`<vertex x="${p.getX(k).toFixed(4)}" y="${p.getY(k).toFixed(4)}" z="${p.getZ(k).toFixed(4)}"/>`);
    for (let k = 0; k < ix.count; k += 3) t.push(`<triangle v1="${ix.getX(k)}" v2="${ix.getX(k + 1)}" v3="${ix.getX(k + 2)}"/>`);
    m += `<object id="${i + 1}" name="${esc(o.bodies[i].name)}" type="model"><mesh><vertices>${v.join('')}</vertices><triangles>${t.join('')}</triangles></mesh></object>\n`;
  });
  m += `<object id="${asm}" name="${esc(o.name)}" type="model"><components>${geos.map((_, i) => `<component objectid="${i + 1}"/>`).join('')}</components></object>\n`;
  m += `</resources>\n<build><item objectid="${asm}" transform="1 0 0 0 1 0 0 0 1 128 128 0"/></build>\n</model>\n`;
  let cfg = `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n <object id="${asm}">\n  <metadata key="name" value="${esc(o.name)}"/>\n  <metadata key="extruder" value="1"/>\n`;
  const slot = new Map();
  o.bodies.forEach((b, i) => {
    if (!slot.has(b.color)) slot.set(b.color, slot.size + 1);
    cfg += `  <part id="${i + 1}" subtype="normal_part">\n   <metadata key="name" value="${esc(b.name)}"/>\n   <metadata key="extruder" value="${slot.get(b.color)}"/>\n  </part>\n`;
  });
  cfg += ' </object>\n</config>\n';
  const enc = (s) => Buffer.from(s);
  return zip([
    ['[Content_Types].xml', enc('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="application/xml"/></Types>')],
    ['_rels/.rels', enc('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')],
    ['3D/3dmodel.model', enc(m)],
    ['Metadata/model_settings.config', enc(cfg)],
  ]);
}

function zip(files) {
  const chunks = [], cen = []; let off = 0;
  for (const [name, buf] of files) {
    const nm = Buffer.from(name), def = zlib.deflateRawSync(buf), crc = zlib.crc32(buf);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt32LE(0x21000000 >>> 0, 10); h.writeUInt32LE(crc >>> 0, 14); h.writeUInt32LE(def.length, 18); h.writeUInt32LE(buf.length, 22); h.writeUInt16LE(nm.length, 26);
    chunks.push(h, nm, def);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(0x21000000 >>> 0, 12); c.writeUInt32LE(crc >>> 0, 16); c.writeUInt32LE(def.length, 20); c.writeUInt32LE(buf.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42);
    cen.push(c, nm); off += 30 + nm.length + def.length;
  }
  const cd = Buffer.concat(cen), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...chunks, cd, e]);
}
