"""2D layer shapes for the two draft ornaments. Output: shapes.json (mm, y up, one polygon set per body).
Run: python3 shapes.py   (needs shapely). Then: node make.mjs   (needs three@0.160.0).

The car is 101.6 mm (4 in) long and the state is 101.6 mm (4 in) tall including the cord loop. Both are 5.0 mm thick at the thickest point.
Layers are stacked, each upper layer sits fully inside the layer below it, so every overhang is zero
and the back is one flat face on the bed.
"""
import json, math, pathlib
from shapely.geometry import Polygon, Point, box
from shapely.ops import unary_union
from shapely import affinity

H = 101.6          # 4 in
HOLE_R = 1.5       # 3 mm cord hole
PAD_R = 8.0
here = pathlib.Path(__file__).parent


def superellipse(cx, cy, rx, ry, n=2.0, k=180):
    pts = []
    for i in range(k):
        t = 2 * math.pi * i / k
        c, s = math.cos(t), math.sin(t)
        pts.append((cx + rx * math.copysign(abs(c) ** (2 / n), c), cy + ry * math.copysign(abs(s) ** (2 / n), s)))
    return Polygon(pts)


def disc(cx, cy, r, k=96):
    return Point(cx, cy).buffer(r, quad_segs=k // 4)


def rrect(x0, y0, x1, y1, r):
    return box(x0 + r, y0 + r, x1 - r, y1 - r).buffer(r, quad_segs=16)


def sym(g):
    return unary_union([g, affinity.scale(g, xfact=-1, yfact=1, origin=(0, 0))])


def clean(g, tol=0.002):
    return g.simplify(tol, preserve_topology=True).buffer(0)


def polys(g):
    g = clean(g)
    out = []
    for p in (g.geoms if hasattr(g, "geoms") else [g]):
        if p.is_empty or p.area < 0.5:
            continue
        out.append({"outer": [[round(x, 3), round(y, 3)] for x, y in list(p.exterior.coords)[:-1]],
                    "holes": [[[round(x, 3), round(y, 3)] for x, y in list(h.coords)[:-1]] for h in p.interiors]})
    return out


# ---------------------------------------------------------------- 1. retro car, side profile, 3 colours
# The car is 101.6 mm (4 in) long, nose to the left. Bodies stacked: A charcoal 0 to 2.0 (outline + tires),
# B red 2.0 to 3.6 (body, wheel rims), C cream 3.6 to 5.0 (windows, lamps, bumpers, chrome strip, hub caps).
# The loop pad sits over the centre of mass of the three layers, so the ornament hangs level on the mirror.
TIRE_R, RIM_R, HUB_R, ARCH_R = 11.5, 6.8, 3.2, 13.0
WX = 28.0                                        # tire centres at x = -WX and +WX, both tires touch y = 0
cab = superellipse(2, 37, 28, 27, 2.4).intersection(box(-60, 36, 60, 120))   # roofline, top at y = 64
slab = rrect(-50, 14, 50, 40, 5)                 # hood and trunk line
fenders = unary_union([superellipse(x, 36, 16, 9, 2.5) for x in (-WX, WX)])
body = unary_union([slab, cab, fenders]).buffer(1.5, quad_segs=12).buffer(-1.5, quad_segs=12)
body = body.difference(unary_union([disc(x, TIRE_R, ARCH_R) for x in (-WX, WX)]))          # wheel arches
tires = unary_union([disc(x, TIRE_R, TIRE_R) for x in (-WX, WX)])
rims = unary_union([disc(x, TIRE_R, RIM_R) for x in (-WX, WX)])
hubs = unary_union([disc(x, TIRE_R, HUB_R) for x in (-WX, WX)])
glass = cab.buffer(-3.6, quad_segs=12).intersection(box(-60, 43, 60, 120))
cream = [glass.intersection(box(-60, 0, 0.2, 120)),              # windshield and front door glass
         glass.intersection(box(3.8, 0, 60, 120)),               # rear door glass and back window
         disc(-44.2, 30.0, 3.6),                                 # headlamp
         rrect(44.6, 27.0, 48.0, 34.0, 1.0),                     # tail lamp
         rrect(-47.4, 17.6, -41.0, 20.4, 1.2),                   # front bumper
         rrect(41.0, 17.6, 47.4, 20.4, 1.2),                     # rear bumper
         rrect(-38.0, 36.4, 38.0, 37.9, 0.6).difference(cab.buffer(-1.0)),   # chrome strip on hood and trunk
         hubs]
base = unary_union([body, tires])
k = (H - 2 * 1.8) / (base.bounds[2] - base.bounds[0])           # the 1.8 mm outline brings the length to exactly 4 in
cx, y0 = (base.bounds[0] + base.bounds[2]) / 2 * k, base.bounds[1] * k - 1.8
fix = lambda g: affinity.translate(affinity.scale(g, k, k, origin=(0, 0)), -cx, -y0)   # scale, centre on x, rest on y = 0
body, tires, rims = fix(body), fix(tires), fix(rims)
outline = unary_union([body, tires]).buffer(1.8, quad_segs=16)
Cparts = unary_union([fix(g) for g in cream])
m = outline.area * 2.0 + unary_union([body, rims]).area * 1.6 + Cparts.area * 1.4           # mass per layer, same density
pad_x = (outline.centroid.x * outline.area * 2.0 + unary_union([body, rims]).centroid.x * unary_union([body, rims]).area * 1.6
         + Cparts.centroid.x * Cparts.area * 1.4) / m
roof_top = body.bounds[3]
pad_c = (round(pad_x, 2), roof_top + PAD_R - 1.0)
neck = rrect(pad_c[0] - 5.5, roof_top - 5, pad_c[0] + 5.5, pad_c[1], 1.0)
hole = disc(*pad_c, HOLE_R, 48)
grommet = disc(*pad_c, 5.0, 64).difference(hole)

A = unary_union([outline, disc(*pad_c, PAD_R), neck]).difference(hole)
B = unary_union([body, rims, disc(*pad_c, 6.6)]).difference(hole)
C = unary_union([Cparts, grommet])
assert abs((A.bounds[2] - A.bounds[0]) - H) < 0.05, "car is not 4 in long"

# nesting guard: every upper layer must sit inside the one below, with margin
assert B.difference(A).area < 1e-6, "B leaves A"
assert C.difference(B).area < 1e-6, "C leaves B"
for i, g in enumerate(list(Cparts.geoms if hasattr(Cparts, "geoms") else [Cparts])):
    assert g.buffer(0.8).difference(B).area < 1e-6, f"cream part {i} within 0.8 mm of a red edge at {g.centroid.coords[0]}"
car = {
    "slug": "car", "name": "Retro car, side profile", "colors": 3,
    "bodies": [
        {"id": "car-1-charcoal", "name": "Outline and tires", "color": "#26262b", "z0": 0.0, "z1": 2.0, "polys": polys(A)},
        {"id": "car-2-red", "name": "Body and rims", "color": "#c9402a", "z0": 2.0, "z1": 3.6, "polys": polys(B)},
        {"id": "car-3-cream", "name": "Glass, lamps, bumpers", "color": "#efe4cb", "z0": 3.6, "z1": 5.0, "polys": polys(C)},
    ],
}

# ---------------------------------------------------------------- 2. state outline + heart, 2 colours
ring = json.load(open(here / "texas-albers-px.json"))["ring"]
P = Polygon([(x, -y) for x, y in ring])          # flip y, Albers pixels


def albers(lon, lat, scale=1300, tr=(487.5, 305)):
    d = math.radians
    p0, p1 = d(29.5), d(45.5)
    n = (math.sin(p0) + math.sin(p1)) / 2
    C0 = math.cos(p0) ** 2 + 2 * n * math.sin(p0)
    r0 = math.sqrt(C0 - 2 * n * math.sin(p0)) / n

    def raw(l, f):
        rho = math.sqrt(C0 - 2 * n * math.sin(f)) / n
        return rho * math.sin(n * l), r0 - rho * math.cos(n * l)
    cx, cy = raw(d(-0.6), d(38.7))
    x, y = raw(d(lon + 96), d(lat))
    return tr[0] + scale * (x - cx), -(tr[1] - scale * (y - cy))


austin = albers(-97.74, 30.27)
minx, miny, maxx, maxy = P.bounds
STATE_H = H - 11.0                               # leaves 11 mm above the state for the loop pad
s = STATE_H / (maxy - miny)
P = affinity.scale(P, xfact=s, yfact=s, origin=(0, 0))
austin = (austin[0] * s, austin[1] * s)
minx, miny, maxx, maxy = P.bounds
mv = (-(minx + maxx) / 2, -miny)
P = affinity.translate(P, *mv)
austin = (austin[0] + mv[0], austin[1] + mv[1])
P = P.simplify(0.55)
P = P.buffer(1.1, quad_segs=8).buffer(-2.2, quad_segs=8).buffer(1.1, quad_segs=8)   # round tips, drop jaggies
P = P.buffer(1.1, quad_segs=8).buffer(-1.1, quad_segs=8)                            # fill slivers
P = P.simplify(0.05)
dy = -P.bounds[1]                                 # back to y = 0, then stretch the 0.2 mm lost to smoothing so the state is exactly STATE_H tall
P = affinity.translate(P, 0, dy); austin = (austin[0], austin[1] + dy)
f = STATE_H / P.bounds[3]
P = affinity.scale(P, f, f, origin=(0, 0)); austin = (austin[0] * f, austin[1] * f)
# panhandle top: loop centre sits on the highest edge
top_pts = [p for p in P.exterior.coords if p[1] > P.bounds[3] - 3.0]
px = (min(p[0] for p in top_pts) + max(p[0] for p in top_pts)) / 2
pad_c2 = (px, H - PAD_R)
hole2 = disc(*pad_c2, HOLE_R, 48)
pad2 = disc(*pad_c2, PAD_R)

heart_pts = []
for i in range(240):
    t = 2 * math.pi * i / 240
    heart_pts.append((16 * math.sin(t) ** 3, 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)))
heart = Polygon(heart_pts)
hs = 17.0 / (heart.bounds[2] - heart.bounds[0])
heart = affinity.scale(heart, hs, hs, origin=(0, 0))
hc = heart.centroid
heart = affinity.translate(heart, austin[0] - hc.x, austin[1] - hc.y)
heart = heart.buffer(-0.7, quad_segs=8).buffer(0.7, quad_segs=8)              # round the tip
# line: inner contour of the state, 1.6 mm wide, stays clear of the loop pad
line = P.buffer(-2.6, quad_segs=8).difference(P.buffer(-4.2, quad_segs=8)).difference(pad2.buffer(2.4))
line = unary_union([g for g in (line.geoms if hasattr(line, "geoms") else [line]) if g.area > 3.0])
grom2 = disc(*pad_c2, 5.0, 64).difference(hole2)

A2 = unary_union([P, pad2]).difference(hole2)
Rd = unary_union([heart, line, grom2])
assert Rd.difference(A2).area < 1e-6, "red leaves navy"
assert heart.distance(P.exterior) > 5.0, "heart too close to the edge"
assert heart.distance(line) > 1.2, "heart touches line"
state = {
    "slug": "state", "name": "Texas outline with heart marker (sample)", "colors": 2,
    "bodies": [
        {"id": "state-1-navy", "name": "State base and loop", "color": "#27476b", "z0": 0.0, "z1": 3.0, "polys": polys(A2)},
        {"id": "state-2-red", "name": "Heart, contour line, loop ring", "color": "#d1432f", "z0": 3.0, "z1": 5.0, "polys": polys(Rd)},
    ],
}

out = {"height_mm": H, "ornaments": [car, state]}
json.dump(out, open(here / "shapes.json", "w"))
for o in out["ornaments"]:
    for b in o["bodies"]:
        print(o["slug"], b["id"], len(b["polys"]), "polys", sum(len(p["outer"]) for p in b["polys"]), "pts")
print("car height", max(y for p in car["bodies"][0]["polys"] for _, y in p["outer"]), "state bounds", A2.bounds)
