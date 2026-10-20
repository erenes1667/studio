#!/usr/bin/env python3
"""After-Hours Desk demo backend. Stdlib only.
Run: python3 server.py   then open http://127.0.0.1:8787/
POST /turn calls the personal Anthropic key (parsed from ~/.claude/.env, never printed)."""
import json, os, re, sys, urllib.request, urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "web")
MODEL = os.environ.get("AHD_MODEL", "claude-haiku-5-5")
MAX_CALLS = 300  # ponytail: per-process spend cap, restart to reset
calls = 0

def load_env():
    out = {}
    try:
        for line in open(os.path.expanduser("~/.claude/.env")):
            m = re.match(r"\s*(?:export\s+)?(ANTHROPIC_API_KEY_PERSONAL|ANTHROPIC_WORKSPACE_ID_PERSONAL)\s*=\s*(.*)\s*$", line)
            if m:
                out[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    except OSError:
        pass
    return out

def default_profile():
    return json.load(open(os.path.join(HERE, "business.json")))

GAS = re.compile(r"smell\w*\s+(?:of\s+|like\s+)?gas|gas\s+(?:smell|leak|odou?r)|smells? like gas", re.I)
EMERGENCY = re.compile(GAS.pattern + r"|\bflood(?:ed|ing|s)?\b|\bno heat\b|\bheat (?:is )?(?:out|not working)\b|\bburst\b|sewage|carbon monoxide|\bco alarm|\bsparks?\b|on fire", re.I)
PRICE_ASK = re.compile(r"\b(cost|price|pricing|how much|quote|estimate|charge|fee|rate|cheap|expensive)\b", re.I)
PRICE_OUT = re.compile(r"\$\s?\d|\b\d[\d,.]*\s?(?:dollars|bucks|usd)\b", re.I)
PRICE_FALLBACK = json.load(open(os.path.join(HERE, "templates.json")))["no_price_line"]  # editable in templates.json

def system_prompt(p, opening):
    slots = "\n".join(f'- {s["id"]}: {s["label"]}' for s in p["slots"])
    services = "\n".join(f"- {s}" for s in p["services"])
    return f"""You are the after-hours text assistant for {p['shop']}, a home-service shop. You talk to a homeowner by SMS after their call went unanswered. You are an automated assistant; say so if asked.

Business profile (SAMPLE data from the shop):
Service area: {p['service_area']}
Office hours: {p['hours']}
Services:
{services}
Emergency rule: {p['emergency_rule']}
Emergency line: {p['emergency_line']}
Bookable slots (offer ONLY these):
{slots}

You already sent this opening text: "{opening}"
The caller's callback number is known from caller ID. Never ask for it.

Goal: collect name, service address, issue, and a slot, then confirm the booking.
Rules:
- SMS style: plain words, max 2 short sentences, no emoji, no markdown. One question at a time.
- NEVER state or estimate any price, fee, rate or dollar amount, even if asked. Say the tech gives a written quote on site, then steer back to a slot.
- Offer only slots from the list. Map "tomorrow morning" to tue-am, "tomorrow afternoon" to tue-pm, and so on. If nothing fits, offer the closest listed slot.
- If the request is outside the listed services or area, say so politely and do not book.
- Urgency: "emergency" for gas smell, flooding, burst pipe, no heat, sewage backup, sparks or fire. "urgent" for an active leak or no hot water or no AC. Otherwise "routine".
- On an emergency, give the emergency rule and the emergency line in your reply. Gas smell: tell them to leave the building and call 911 first.
- Offer ONE slot at a time, the closest match to what they asked for. Once the caller gave a time preference, or did not object to the slot you named, treat it as chosen: set slot_id and do not ask them to re-confirm.
- When name, address, issue and slot are all known, confirm the booking in one sentence naming the slot. Set "booked" to true ONLY in a reply that confirms the booking, and never ask a question in that same reply.

Reply with ONLY a JSON object, no prose, no code fence:
{{"reply": "<the SMS text>", "fields": {{"name": null|str, "address": null|str, "issue": null|str, "urgency": null|"routine"|"urgent"|"emergency", "slot_id": null|str}}, "booked": true|false}}
"fields" is the full state so far: keep known values, fill new ones from the conversation. issue is a short phrase."""

def call_model(system, messages):
    global calls
    env = load_env()
    key, ws = env.get("ANTHROPIC_API_KEY_PERSONAL"), env.get("ANTHROPIC_WORKSPACE_ID_PERSONAL")
    if not key:
        raise RuntimeError("personal key missing")
    if calls >= MAX_CALLS:
        raise RuntimeError("call cap reached, restart server")
    calls += 1
    headers = {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    if ws:
        headers["anthropic-workspace-id"] = ws
    body = json.dumps({"model": MODEL, "max_tokens": 500, "thinking": {"type": "disabled"}, "system": system, "messages": messages}).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    return "".join(b.get("text", "") for b in data["content"] if b["type"] == "text"), data.get("usage", {})

def run_turn(payload):
    p = payload.get("profile") or default_profile()
    opening = payload.get("opening", "")
    hist = [m for m in payload.get("history", []) if m.get("role") in ("user", "assistant") and m.get("content")]
    if not hist or hist[-1]["role"] != "user":
        raise ValueError("history must end with a user message")
    prev = payload.get("fields") or {}
    text, usage = call_model(system_prompt(p, opening), hist)
    raw = text
    try:
        obj = json.loads(text[text.index("{"): text.rindex("}") + 1])
    except ValueError:
        obj = {"reply": text.strip(), "fields": {}}
    reply = str(obj.get("reply", "")).strip()
    f = obj.get("fields") or {}
    users = " ".join(m["content"] for m in hist if m["role"] == "user")
    last = hist[-1]["content"]
    slot_ids = {s["id"]: s["label"] for s in p["slots"]}
    out = {}
    for k in ("name", "address", "issue", "urgency", "slot_id"):
        v = f.get(k) if f.get(k) not in ("", "null", "None") else None
        out[k] = v if v is not None else prev.get(k)
    if out["slot_id"] not in slot_ids:
        out["slot_id"] = None
    if out["urgency"] not in ("routine", "urgent", "emergency"):
        out["urgency"] = None
    # deterministic guards: emergency detection and price rule never depend on the model
    if EMERGENCY.search(users):
        out["urgency"] = "emergency"
        if GAS.search(users) and "911" not in reply:
            reply = "If you smell gas, leave the building now and call 911 from outside. " + reply
        if p["emergency_line"] not in reply:
            reply = (reply + f" Emergency line: {p['emergency_line']}.").strip()
    if PRICE_OUT.search(reply):
        reply = PRICE_FALLBACK + (" " + " ".join(re.findall(r"[^.?!]*\?", reply)[-1:]) if "?" in reply else "")
    elif PRICE_ASK.search(last) and not reply:
        reply = PRICE_FALLBACK
    booked = bool(out["name"] and out["address"] and out["issue"] and out["slot_id"] and obj.get("booked") is True)  # model must confirm in its reply, fields alone are not enough
    return {"reply": reply, "raw": raw, "fields": out, "booked": booked,
            "slot_label": slot_ids.get(out["slot_id"]), "model": MODEL,
            "usage": {"in": usage.get("input_tokens"), "out": usage.get("output_tokens")}}

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=WEB, **k)
    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("access-control-allow-origin", "*")
        self.send_header("content-length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)
    def do_OPTIONS(self):
        self.send_response(204)
        for h, v in (("access-control-allow-origin", "*"), ("access-control-allow-headers", "content-type"), ("access-control-allow-methods", "GET,POST")):
            self.send_header(h, v)
        self.end_headers()
    def do_GET(self):
        if self.path == "/health":
            return self._json(200, {"ok": True, "model": MODEL})
        if self.path == "/business.json":
            return self._json(200, default_profile())
        super().do_GET()
    def do_POST(self):
        if self.path != "/turn":
            return self._json(404, {"error": "not found"})
        try:
            n = int(self.headers.get("content-length", 0))
            self._json(200, run_turn(json.loads(self.rfile.read(n))))
        except (ValueError, KeyError) as e:
            self._json(400, {"error": str(e)})
        except Exception as e:  # network, auth, cap
            self._json(502, {"error": type(e).__name__})
    def log_message(self, fmt, *a):
        sys.stderr.write("[ahd] " + (fmt % a) + "\n")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8787"))
    print(f"After-Hours Desk on http://127.0.0.1:{port}/  model={MODEL}")
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
