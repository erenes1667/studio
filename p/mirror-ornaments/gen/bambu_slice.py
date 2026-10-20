"""Slice both ornaments headless with the real BambuStudio CLI, then keep the Studio-exported 3MF as the download.
Writes files/car.3mf, files/state.3mf (Studio-native, PETG profile, sliced plate inside) and files/slicer.json (numbers shown on the page).

Setup used here: BambuStudio 02.08.04.57 AppImage extracted (--appimage-extract) to BAMBU_ROOT. Missing shared libs (webkit2gtk-4.1 and friends)
were unpacked from Ubuntu .deb files into BAMBU_LIBS, nothing installed system-wide. xvfb-run supplies a display.
Run:  node make.mjs && BAMBU_ROOT=... BAMBU_LIBS=... python3 bambu_slice.py
Profiles: machine "Bambu Lab P2S 0.4 nozzle", process "0.20mm Standard @BBL P2S" (+ 4 walls, 20 % infill, supports off),
filament "Bambu PETG Basic @BBL P2S 0.4 nozzle" (nozzle 250 C, first layer 245 C, textured PEI plate 70 C). Flush volumes are Studio defaults.
"""
import json, os, pathlib, re, shutil, subprocess, tempfile, zipfile

ROOT = pathlib.Path(os.environ["BAMBU_ROOT"])
LIBS = os.environ.get("BAMBU_LIBS", "")
HERE = pathlib.Path(__file__).parent
FILES = HERE.parent / "files"
PROF = ROOT / "resources/profiles/BBL"
COLORS = {"car": ["#26262b", "#c9402a", "#efe4cb"], "state": ["#27476b", "#d1432f"]}


def flat(kind, name):
    d = json.load(open(PROF / kind / f"{name}.json"))
    base = flat(kind, d["inherits"]) if d.get("inherits") else {}
    base.update({k: v for k, v in d.items() if k != "inherits"})
    return base


def run(slug, support=False):
    tmp = pathlib.Path(tempfile.mkdtemp(prefix=f"bs-{slug}-"))
    json.dump(flat("machine", "Bambu Lab P2S 0.4 nozzle"), open(tmp / "m.json", "w"))
    p = flat("process", "0.20mm Standard @BBL P2S")
    p.update({"wall_loops": "4", "sparse_infill_density": "20%", "layer_height": "0.2", "initial_layer_print_height": "0.2",
              "enable_support": "1" if support else "0"})
    if support:
        p.update({"support_type": "normal(auto)", "support_threshold_angle": "30"})
    json.dump(p, open(tmp / "p.json", "w"))
    fils = []
    for i, c in enumerate(COLORS[slug]):
        f = flat("filament", "Bambu PETG Basic @BBL P2S 0.4 nozzle")
        f["default_filament_colour"] = [c]; f["filament_colour"] = [c]
        json.dump(f, open(tmp / f"f{i}.json", "w")); fils.append(str(tmp / f"f{i}.json"))
    env = dict(os.environ, LD_LIBRARY_PATH=f"{ROOT}/bin:{LIBS}")
    raw = tmp / f"{slug}-raw.3mf"
    shutil.copy(FILES / f"{slug}.3mf", raw)          # keep the generator's raw 3MF; Studio writes the exported one next to it
    subprocess.run(["xvfb-run", "-a", str(ROOT / "bin/bambu-studio"), "--curr-bed-type", "Textured PEI Plate", "--slice", "0",
                    "--load-settings", f"{tmp}/m.json;{tmp}/p.json", "--load-filaments", ";".join(fils),
                    "--outputdir", str(tmp), "--export-3mf", f"{slug}-sliced.3mf", str(raw)], cwd=tmp, env=env, check=True, capture_output=True, timeout=600)
    return tmp


def stats(tmp, slug):
    res = json.load(open(tmp / "result.json"))["sliced_plates"][0]
    z = zipfile.ZipFile(tmp / f"{slug}-sliced.3mf")
    si = z.read("Metadata/slice_info.config").decode()
    gc = z.read("Metadata/plate_1.gcode").decode()
    head = re.search(r"model printing time: (.+?); total estimated time: (.+)", gc)
    layers = int(re.search(r"total layer number: (\d+)", gc).group(1))
    ranges = sorted([(int(lo), int(hi), int(f)) for f, lo, hi in re.findall(r'filament_list="(\d+)" layer_ranges="(\d+) (\d+)"', si)])
    changes = len(re.findall(r"^M620 S[0-9]+A", gc, re.M))
    feats = set(re.findall(r"^; FEATURE: (.+)$", gc, re.M))
    fil = [(f["id"], f["main_used_g"], f["total_used_g"]) for f in res["filaments"]]
    return {
        "slicer": "BambuStudio 02.08.04.57 (CLI)", "printer": "Bambu Lab P2S 0.4 mm nozzle", "plate": "Textured PEI",
        "filament": "Bambu PETG Basic @BBL P2S (nozzle 250 C, first layer 245 C, plate 70 C)",
        "layer_mm": 0.2, "walls": 4, "infill_pct": 20, "layers": layers,
        "time_model_only": head.group(1).strip(), "time_total": head.group(2).strip(), "time_total_s": round(res["total_predication"]),
        "colour_changes": changes,
        "colour_change_layers": [lo + 1 for lo, hi, f in ranges if lo > 0],      # 1-based first layer of each new colour
        "layer_colour_ranges": [[lo + 1, hi + 1, f + 1] for lo, hi, f in ranges],
        "model_g": round(sum(f[1] for f in fil), 2), "total_g": round(sum(f[2] for f in fil), 2),
        "waste_g": round(sum(f[2] - f[1] for f in fil), 2),
        "per_spool_g": [round(f[2], 2) for f in fil],
        "feature_types": sorted(feats),
    }


out = {}
for slug in ("car", "state"):
    t = run(slug)
    out[slug] = stats(t, slug)
    ts = run(slug, support=True)
    gc = zipfile.ZipFile(ts / f"{slug}-sliced.3mf").read("Metadata/plate_1.gcode").decode()
    out[slug]["support_toolpaths_with_auto_support_on"] = len(re.findall(r"^; FEATURE: Support", gc, re.M))
    out[slug]["same_weight_with_auto_support_on"] = abs(stats(ts, slug)["total_g"] - out[slug]["total_g"]) < 0.01
    shutil.copy(t / f"{slug}-sliced.3mf", FILES / f"{slug}.3mf")
    shutil.rmtree(t); shutil.rmtree(ts)
soft = lambda n: int(flat("filament", n)["temperature_vitrification"][0])
out["profile_softening_c"] = {"pla": soft("Generic PLA @BBL P2S"), "petg": soft("Bambu PETG Basic @BBL P2S 0.4 nozzle"),
                              "source": "temperature_vitrification in the BambuStudio filament profiles Generic PLA @BBL P2S and Bambu PETG Basic @BBL P2S 0.4 nozzle"}
json.dump(out, open(FILES / "slicer.json", "w"), indent=1)
print(json.dumps(out, indent=1))
