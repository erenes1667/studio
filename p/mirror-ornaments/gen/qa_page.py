"""Render the page over CDP (never launches or closes the browser), check the viewer, save screenshots.
Run: python3 qa_page.py   (serves studio-site on a free local port for the run)"""
import http.server, json, pathlib, socketserver, threading, sys
from playwright.sync_api import sync_playwright
site = pathlib.Path(__file__).resolve().parents[3]          # studio-site
shots = site / ".shots"; shots.mkdir(exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=str(site), **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{port}/p/mirror-ornaments/?still"   # ?still = no sway, so screenshots are steady
ok = True
with sync_playwright() as p:
    br = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    for name, (w, h) in {"1440": (1440, 900), "390": (390, 844)}.items():
        ctx = br.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
        pg = ctx.new_page(); errs = []
        pg.on("console", lambda m, e=errs: m.type == "error" and e.append(m.text))
        pg.on("pageerror", lambda x, e=errs: e.append(str(x)))
        pg.on("requestfailed", lambda r, e=errs: e.append("requestfailed " + r.url))
        pg.goto(url, wait_until="networkidle")
        pg.wait_for_timeout(1200)
        pg.wait_for_selector("html[data-viewer=ready]", timeout=30000)
        info = pg.evaluate("""() => ({api: window.__ornaments, scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
            robots: document.querySelector('meta[name=robots]')?.content, readout: document.getElementById('scale-readout').innerText,
            title: document.title, qmarks: 0})""")
        print(name, "ready", json.dumps(info["api"]), "overflow", info["scrollW"], "/", info["innerW"], "|", info["readout"])
        ok &= info["scrollW"] <= info["innerW"] and info["robots"] == "noindex"
        # both ornaments, every body toggles and the pixel count changes
        for slug in ("car", "state"):
            pg.click(f"[data-tab={slug}]"); pg.wait_for_timeout(250)
            boxes = pg.query_selector_all("#bodies input")
            base = pg.screenshot(clip={"x": 0, "y": 0, "width": 4, "height": 4}) and pg.locator("#gl").screenshot()
            for i, b in enumerate(boxes):
                b.evaluate("e => e.click()"); pg.wait_for_timeout(200)
                shot = pg.locator("#gl").screenshot()
                changed = shot != base
                b.evaluate("e => e.click()"); pg.wait_for_timeout(120)
                print(f"  {slug} body {i} toggle changes canvas: {changed}"); ok &= changed
            pg.check("#wire"); pg.wait_for_timeout(200); w1 = pg.locator("#gl").screenshot(); pg.uncheck("#wire"); pg.wait_for_timeout(200)
            print(f"  {slug} wireframe changes canvas: {w1 != base}"); ok &= (w1 != base)
        pg.click("[data-tab=car]"); pg.wait_for_timeout(300)
        pg.evaluate("window.scrollTo(0,0)")
        pg.wait_for_timeout(300)
        pg.screenshot(path=str(shots / f"mirror-ornaments-{name}.png"), full_page=(name == "390" and False))
        pg.screenshot(path=str(shots / f"mirror-ornaments-{name}-full.png"), full_page=True)
        # viewer close-up for the human eye
        pg.locator("#viewer").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
        pg.locator(".stage").screenshot(path=str(shots / f"mirror-ornaments-{name}-stage-car.png"))
        pg.click("[data-tab=state]"); pg.wait_for_timeout(300)
        pg.locator(".stage").screenshot(path=str(shots / f"mirror-ornaments-{name}-stage-state.png"))
        print("  console/page errors:", errs); ok &= not errs
        ctx.close()
srv.shutdown()
print("QA PAGE", "PASS" if ok else "FAIL"); sys.exit(0 if ok else 1)
