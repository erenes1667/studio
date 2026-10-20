"""Bake index.html from page.html + files/manifest.json + files/slicer.json + gen/qa_mesh.json, so the page can never disagree with the slicer.
Run last:  python3 build_page.py"""
import json, pathlib, os, html
here = pathlib.Path(__file__).parent
files = here.parent / "files"
man = json.load(open(files / "manifest.json"))
sl = json.load(open(files / "slicer.json"))
qa = json.load(open(here / "qa_mesh.json"))
tpl = (here / "page.html").read_text()
SHORT = {"car": ("Retro car", "3 colors"), "state": ("Texas outline with heart", "2 colors")}
kb = lambda p: f"{os.path.getsize(p) / 1024:.0f} KB"
tri = lambda n: f"{int(n):,}"
mm = lambda s: s.replace(" ", " ")

data = []
for o in man:
    data.append({"slug": o["slug"], "name": SHORT[o["slug"]][0], "bodies": [
        {"id": b["id"], "name": b["name"], "color": b["color"], "z0": b["z0"], "z1": b["z1"], "stl": f"files/{b['stl']}"} for b in o["bodies"]]})

dl = []
for o in man:
    s = sl[o["slug"]]
    rows = "".join(
        f'<li><a href="files/{b["stl"]}" download><i style="background:{b["color"]}"></i><b>{html.escape(b["name"])}<small>{b["stl"]} · z {b["z0"]:.1f} to {b["z1"]:.1f} mm · {tri(b["tris"])} triangles</small></b><em>STL · {kb(files / b["stl"])}</em></a></li>'
        for b in o["bodies"])
    dl.append(f'''    <article class="card"><h3>{SHORT[o["slug"]][0]}<small>{o["colors"]} colors · {o["bbox_mm"][0]:.1f} x {o["bbox_mm"][1]:.1f} x {o["bbox_mm"][2]:.1f} mm</small></h3>
      <ul class="fl">{rows}
      <li><a href="files/{o["slug"]}.3mf" download><i style="background:linear-gradient(135deg,{o["bodies"][0]["color"]} 0 33%,{o["bodies"][min(1,len(o["bodies"])-1)]["color"]} 33% 66%,{o["bodies"][-1]["color"]} 66%)"></i><b>{o["slug"]}.3mf<small>All {len(o["bodies"])} bodies, colors, PETG profile, sliced plate</small></b><em>3MF · {kb(files / (o["slug"] + ".3mf"))}</em></a></li></ul>
    </article>''')

cards = []
for o in man:
    s = sl[o["slug"]]; slug = o["slug"]
    z = lambda layer: (layer - 1) * s["layer_mm"]
    ch = s["colour_change_layers"]
    where = " and ".join(f"layer {l} (z {z(l):.1f} mm)" for l in ch)
    mins = round(s["time_total_s"] / 60)
    grams = ", ".join(f'{g:.1f} g {b["name"].split(",")[0].split(" and ")[0].lower()}' for g, b in zip(s["per_spool_g"], o["bodies"]))
    def lum(h): r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5)); return 0.2126 * r + 0.7152 * g + 0.0722 * b
    seg = "".join(f'<span style="width:{(hi - lo + 1) / s["layers"] * 100:.2f}%;background:{o["bodies"][f - 1]["color"] if o["bodies"][f - 1]["color"] != "#26262b" else "#3a3a42"};color:{"#1a120c;text-shadow:none" if lum(o["bodies"][f - 1]["color"]) > 170 else "#fff"}">Layers {lo} to {hi}</span>' for lo, hi, f in s["layer_colour_ranges"])
    nsl = "slot" if len(o["bodies"]) == 1 else "slots"
    cards.append(f'''      <article class="card pcard"><h3>{SHORT[slug][0]}<small>{o["colors"]} colors, {len(o["bodies"])} bodies</small></h3>
        <dl class="nums">
          <div><dt>AMS color changes</dt><dd>{s["colour_changes"]}<small>at {where}</small></dd></div>
          <div><dt>Purge and prime tower</dt><dd>{s["waste_g"]:.2f} g<small>PETG lost to purge per print</small></dd></div>
          <div><dt>BambuStudio estimate</dt><dd>{mins} min<small>{s["time_total"]} for {s["layers"]} layers, color changes included</small></dd></div>
          <div><dt>PETG used</dt><dd>{s["total_g"]:.1f} g<small>{grams}, purge included</small></dd></div>
        </dl>
        <div class="stack" aria-label="Which color prints on which layers">{seg}</div>
        <p class="fine">{o["colors"]} spools in the AMS. No AMS: pause at the layers above, swap the spool, resume.</p>
      </article>''')

rows = []
for o in man:
    for b in o["bodies"]:
        q = qa[b["id"]]
        rows.append(f'<tr><td><i style="background:{b["color"]}"></i>{b["stl"]}</td><td data-l="Triangles">{tri(q["tris"])}</td><td data-l="Volume">{q["volume_mm3"] / 1000:.2f} cm³</td><td data-l="Closed surface" class="ok">{"Pass" if q["watertight"] and q["winding"] and q["volume_ok"] else "FAIL"}</td><td data-l="Overhang over 45 deg" class="ok">{"None" if q["unsupported_down_faces"] == 0 and q["max_sloped_overhang_deg"] < 45 else "FAIL"}</td></tr>')

pla, petg = sl["profile_softening_c"]["pla"], sl["profile_softening_c"]["petg"]
rep = {
    "@@DATA@@": json.dumps(data, separators=(",", ":")),
    "@@DOWNLOADS@@": "\n".join(dl), "@@PRINT_CARDS@@": "\n".join(cards), "@@CHECK_ROWS@@": "\n".join(rows),
    "@@SLICER_NAME@@": sl["car"]["slicer"], "@@PRINTER@@": sl["car"]["printer"],
    "@@PLA_C@@": str(pla), "@@PETG_C@@": str(petg), "@@PLA_W@@": f"{pla / petg * 100:.0f}", "@@PETG_W@@": "100",
    "@@SUP_CAR@@": str(sl["car"]["support_toolpaths_with_auto_support_on"]), "@@SUP_STATE@@": str(sl["state"]["support_toolpaths_with_auto_support_on"]),
}
out = tpl
for k, v in rep.items():
    out = out.replace(k, v)
assert "@@" not in out, "unfilled token"
(here.parent / "index.html").write_text(out)
print("index.html", len(out), "bytes")
