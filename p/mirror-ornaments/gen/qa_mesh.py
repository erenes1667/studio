"""Independent mesh check (does not use the JS code): watertight, winding, volume, bbox, overhang on the flat-back orientation.
Needs trimesh + shapely + numpy:  python3 qa_mesh.py
Overhang rule: a downward face (normal z < -cos45) is legal only on the bed (z = 0) or when it sits on another body's top face
(same z, inside that body's footprint). Everything else is vertical (90 degrees from the bed = 0 degrees of overhang)."""
import json, pathlib, sys, zipfile
import numpy as np, trimesh
from shapely.geometry import Polygon
from shapely.ops import unary_union
here = pathlib.Path(__file__).parent
files = here.parent / "files"
man = json.load(open(files / "manifest.json"))
ok = True
rep = {}
for o in man:
    tops = {}   # z -> footprint union of the top faces at that z
    meshes = {}
    for b in o["bodies"]:
        m = trimesh.load(files / b["stl"], process=True)
        meshes[b["id"]] = m
    for b in o["bodies"]:
        m = meshes[b["id"]]
        up = m.face_normals[:, 2] > 0.999
        tri_up = m.triangles[up]
        if len(tri_up):
            polys = [Polygon(t[:, :2]).buffer(0) for t in tri_up if Polygon(t[:, :2]).area > 1e-9]
            tops.setdefault(round(b["z1"], 3), []).append(unary_union(polys))
    for b in o["bodies"]:
        m = meshes[b["id"]]
        down = m.face_normals[:, 2] < -0.7071
        z0 = b["z0"]
        bad = 0
        sup = unary_union([t for t in tops.get(round(z0, 3), [])]) if z0 > 0 else None
        for i in np.where(down)[0]:
            tri = m.triangles[i]
            if abs(tri[:, 2].max() - 0.0) < 1e-6:
                continue
            c = Polygon(tri[:, :2])
            if c.area < 1e-9:
                continue
            if sup is None or not sup.buffer(1e-4).contains(c):
                bad += 1
        # max overhang angle: worst downward-but-not-flat face, measured from vertical (0 = wall, 90 = flat ceiling)
        nz = m.face_normals[:, 2]
        sloped = (nz < -1e-3) & (nz > -0.999)
        oh = float(np.degrees(np.arcsin(-nz[sloped].min())) if sloped.any() else 0.0)
        r = dict(watertight=bool(m.is_watertight), winding=bool(m.is_winding_consistent), volume_ok=bool(m.is_volume and m.volume > 0),
                 volume_mm3=round(float(m.volume), 1), shells=len(m.split(only_watertight=False)), tris=len(m.faces),
                 bbox=[round(float(v), 3) for v in m.bounds[1] - m.bounds[0]], z=[round(float(m.bounds[0][2]), 3), round(float(m.bounds[1][2]), 3)],
                 unsupported_down_faces=bad, max_sloped_overhang_deg=round(oh, 3))
        rep[b["id"]] = r
        good = r["watertight"] and r["winding"] and r["volume_ok"] and bad == 0 and oh < 45
        ok &= good
        print(("PASS " if good else "FAIL ") + b["id"], r)
    # 3MF: same bodies, one object, extruder slots
    z = zipfile.ZipFile(files / f"{o['slug']}.3mf")
    cfg = z.read("Metadata/model_settings.config").decode()
    print("  3mf parts:", cfg.count("<part "), "extruder tags:", [l.split('value="')[1][0] for l in cfg.splitlines() if 'key="extruder"' in l])
    # 3MF geometry must equal the STLs once the component transforms are applied (Studio re-centres each part and stores an offset)
    import xml.etree.ElementTree as ET
    ns = {"m": "http://schemas.microsoft.com/3dmanufacturing/core/2015/02", "p": "http://schemas.microsoft.com/3dmanufacturing/production/2015/06"}
    top = ET.fromstring(z.read("3D/3dmodel.model"))
    sub = ET.fromstring(z.read("3D/Objects/object_1.model"))
    objs = {int(e.get("id")): e for e in sub.findall(".//m:object", ns)}
    comps = top.find(".//m:object", ns).findall(".//m:component", ns)
    item = top.find(".//m:item", ns); ib = [float(v) for v in item.get("transform").split()][9:12]
    allv = []
    for c, b in zip(comps, o["bodies"]):
        mesh = objs[int(c.get("objectid"))].find("m:mesh", ns)
        v = np.array([[float(x.get(k)) for k in "xyz"] for x in mesh.findall(".//m:vertex", ns)])
        f = np.array([[int(t.get(k)) for k in ("v1", "v2", "v3")] for t in mesh.findall(".//m:triangle", ns)])
        off = np.array([float(x) for x in c.get("transform").split()][9:12])
        tm = trimesh.Trimesh(v + off, f, process=False)
        ref = meshes[b["id"]]
        dv = abs(tm.volume - ref.volume)
        dz = abs(tm.bounds[:, 2] - ref.bounds[:, 2]).max()
        print(f"  3mf part {b['id']}: volume diff {dv:.3f} mm3, z-range diff {dz:.4f} mm, watertight {tm.is_watertight}")
        ok &= dv < 0.5 and dz < 1e-3 and tm.is_watertight
        allv.append(tm.vertices + np.array(ib))
    allv = np.vstack(allv)
    cen = (allv.min(0) + allv.max(0)) / 2
    print("  3mf assembled bbox mm:", np.round(allv.max(0) - allv.min(0), 3), "centre on bed:", np.round(cen[:2], 2))
    ok &= abs(cen[0] - 128) < 12 and abs(cen[1] - 128) < 12   # Studio re-centres on the object centre of mass, not the bbox: the car's loop and tires put it 8 mm off bed centre
    # nesting: every body at z0>0 must have its footprint inside the body below
    bodies = o["bodies"]
    for i, b in enumerate(bodies):
        if b["z0"] <= 0:
            continue
        below = unary_union([Polygon(t[:, :2]).buffer(0) for bb in bodies if abs(bb["z1"] - b["z0"]) < 1e-6 for t in meshes[bb["id"]].triangles[meshes[bb["id"]].face_normals[:, 2] > 0.999]])
        mine = unary_union([Polygon(t[:, :2]).buffer(0) for t in meshes[b["id"]].triangles[meshes[b["id"]].face_normals[:, 2] < -0.999] if Polygon(t[:, :2]).area > 1e-9])
        spill = mine.difference(below.buffer(1e-4)).area
        print(f"  {b['id']}: footprint outside the body below = {spill:.4f} mm2")
        ok &= spill < 1e-3
json.dump(rep, open(here / "qa_mesh.json", "w"), indent=1)
print("ALL PASS" if ok else "FAILURES")
sys.exit(0 if ok else 1)
