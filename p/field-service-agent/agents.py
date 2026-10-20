"""Dispatcher, order-intake and report agents, built on server.py (the After-Hours Desk intake agent).
Model calls are real (server.call_model). Everything that can hurt a customer or a technician is plain code:
zone and skill checks, emergency routing, accept/decline parsing, the no-price rule, the order id.
Self-check: python3 agents.py"""
import datetime, json, os, re, time
import server

HERE = os.path.dirname(os.path.abspath(__file__))
def load(name): return json.load(open(os.path.join(HERE, name)))

def now(): return datetime.datetime.now(datetime.timezone.utc)
def stamp(t): return t.strftime("%Y-%m-%dT%H:%M:%S.") + f"{t.microsecond // 1000:03d}Z"

def parse_json(text):
    try:
        return json.loads(text[text.index("{"): text.rindex("}") + 1])
    except ValueError:
        return {}

def ask(system, user):
    """One real model call. Returns raw text, usage, start time and latency in ms."""
    t0 = now(); c0 = time.perf_counter()
    text, usage = server.call_model(system, [{"role": "user", "content": user}])
    return {"raw": text, "usage": {"in": usage.get("input_tokens"), "out": usage.get("output_tokens")},
            "t0": stamp(t0), "ms": round((time.perf_counter() - c0) * 1000)}

# ---------- deterministic rules ----------
def zone_of(address, zones):
    for z in zones:
        if re.search(r"\b" + re.escape(z) + r"\b", address or "", re.I):
            return z
    return None

def eligible(t, skill, zone, slot_id, emergency):
    """The roster check. The model ranks; this decides who may be texted."""
    return (zone in t["zones"] and skill in t["skills"] and slot_id not in t["off_slots"]
            and (t["on_call"] or not emergency))

def parse_reply(text, tm):
    """Rule first. YES/NO words decide. Mixed or free text returns 'unclear' for the model to read."""
    words = set(re.sub(r"[^a-z ]", "", text.lower().replace("'", "")).split())
    yes, no = words & set(tm["accept_words"]), words & set(tm["decline_words"])
    return "accept" if yes and not no else "decline" if no and not yes else "unclear"

def numbers_ok(text, facts):
    allowed = set(re.findall(r"\d+", json.dumps(facts)))
    return all(n in allowed for n in re.findall(r"\d+", text))

# ---------- agents ----------
def rank(job, roster, slots):
    """Dispatcher agent, call 1: pick the skill and rank technicians. Code validates the answer."""
    techs = [{k: t[k] for k in ("id", "name", "zones", "skills", "on_call")} | {"off_slots": t["off_slots"]} for t in roster["technicians"]]
    system = ("You are the dispatcher agent for a plumbing and HVAC shop. Match a job to technicians by zone and skill. "
              f"Skills you may name: {json.dumps(roster['skills'])}.\nTechnicians (JSON): {json.dumps(techs)}\n"
              "A technician cannot take a slot listed in off_slots. Emergencies go to on_call technicians only.\n"
              'Reply with ONLY JSON: {"skill": "<skill key>", "ranked": ["<technician id>", ...], "reason": "<one sentence>"}')
    user = json.dumps({"issue": job["issue"], "zone": job["zone"], "slot_id": job["slot_id"], "slot": job["slot"], "urgency": job["urgency"]})
    r = ask(system, user); obj = parse_json(r["raw"])
    skill = obj.get("skill") if obj.get("skill") in roster["skills"] else None
    emergency = job["urgency"] == "emergency"
    guards, ranked = [], []
    for tid in obj.get("ranked", []):
        t = next((x for x in roster["technicians"] if x["id"] == tid), None)
        if t and skill and eligible(t, skill, job["zone"], job["slot_id"], emergency) and t["id"] not in ranked:
            ranked.append(t["id"])
        else:
            guards.append(f"dropped {tid}: not on roster or fails zone, skill, slot or on-call check")
    for t in roster["technicians"]:  # code fills in anyone the model missed
        if skill and t["id"] not in ranked and eligible(t, skill, job["zone"], job["slot_id"], emergency):
            ranked.append(t["id"]); guards.append(f"added {t['id']}: passes the roster check, model did not list it")
    if emergency:
        ranked.sort(key=lambda i: not next(t for t in roster["technicians"] if t["id"] == i)["on_call"])
    return r | {"input": user, "result": {"skill": skill, "ranked": ranked, "reason": obj.get("reason", "")}, "guards": guards}

def draft(job, tech, tm, declined=None):
    """Dispatcher agent, call 2 and 4: the SMS body. Code adds the accept/decline tail and the no-price rule."""
    system = (f"You write one SMS to a field technician from the dispatcher. Style: {tm['dispatch_style']} "
              'Reply with ONLY JSON: {"body": "<the SMS text, without any reply instructions>"}')
    note = f" {declined} declined this job." if declined else ""
    user = json.dumps({"technician": tech["name"], "issue": job["issue"], "address": job["address"], "slot": job["slot"], "urgency": job["urgency"]}) + note
    r = ask(system, user); body = str(parse_json(r["raw"]).get("body", "")).strip(); guards = []
    if not body or server.PRICE_OUT.search(body) or len(body) > 220:
        body = f"{job['issue'].capitalize()} at {job['address']}, {job['slot']}."
        guards.append("model body empty, too long or quoted a price: replaced with the fixed fallback line")
    sms = f"{body} {tm['dispatch_tail']}"
    return r | {"input": user, "result": {"to": tech["id"], "sms": sms}, "guards": guards}

def classify(text):
    """Dispatcher agent, call 3: read a free-text technician reply. It can decline or ask again, never assign."""
    system = ('You read a technician\'s text reply to a job offer. Reply with ONLY JSON: {"decision": "decline"|"unclear", "reason": "<short>"}. '
              'Use "decline" if the technician cannot or will not take the job. Use "unclear" for anything else.')
    r = ask(system, text); d = parse_json(r["raw"]).get("decision")
    return r | {"input": text, "result": {"decision": d if d == "decline" else "unclear"}, "guards": []}

def intake_row(job, tech, services, existing):
    """Order intake agent: one model call fills the service type and a work-order note. Code builds the row."""
    system = (f"You fill a work order from a booked job. Services: {json.dumps(services)}. "
              'Reply with ONLY JSON: {"service": "<one of the services>", "note": "<one plain sentence for the technician, no prices>"}')
    user = json.dumps({k: job[k] for k in ("issue", "address", "urgency", "slot")})
    r = ask(system, user); obj = parse_json(r["raw"]); guards = []
    service = obj.get("service") if obj.get("service") in services else "Other (office review)"
    note = str(obj.get("note", "")).strip()
    if service == "Other (office review)": guards.append("service not in the shop list: flagged for office review")
    if server.PRICE_OUT.search(note): note = ""; guards.append("note quoted a price: removed")
    row = {"id": f"ORD-{1001 + len(existing)}", "sim": job["sim"], "customer": job["name"], "phone": job["phone"], "address": job["address"],
           "zone": job["zone"], "service": service, "urgency": job["urgency"], "window": job["slot"], "tech": tech["name"],
           "status": "Booked, tech accepted", "note": note, "sample": False}
    return r | {"input": user, "result": {"row": row}, "guards": guards}

def report(orders, tm, office_opens):
    """Report agent: code counts, model writes the words, code rejects any number it was not given."""
    facts = {"office_opens": office_opens, "open_orders": len(orders), "new_since_close": sum(not o["sample"] for o in orders),
             "emergency": sum(o["urgency"] == "emergency" for o in orders), "urgent": sum(o["urgency"] == "urgent" for o in orders),
             "unassigned": sum(not o["tech"] for o in orders),
             "jobs": [{"id": o["id"], "customer": o["customer"], "zone": o["zone"], "service": o["service"], "window": o["window"], "tech": o["tech"], "status": o["status"]} for o in orders]}
    system = (f"You write the {tm['report_title']} for a shop's office staff, ready when the office opens at {office_opens}. "
              "Use only the facts given. No prices. "
              'Reply with ONLY JSON: {"headline": "<one sentence>", "lines": ["<one line per job>"], "needs_attention": ["<item>"]} '
              "needs_attention is an empty list when nothing needs a person.")
    user = json.dumps(facts); r = ask(system, user); obj = parse_json(r["raw"]); guards = []
    out = {"headline": str(obj.get("headline", "")), "lines": [str(x) for x in obj.get("lines", [])], "needs_attention": [str(x) for x in obj.get("needs_attention", [])]}
    text = " ".join([out["headline"]] + out["lines"] + out["needs_attention"])
    if not out["headline"] or server.PRICE_OUT.search(text) or not numbers_ok(text, facts):
        guards.append("model text had a price or a number outside the facts: replaced with the counted summary")
        out = {"headline": f"{facts['new_since_close']} new job booked, {facts['unassigned']} unassigned.",
               "lines": [f"{j['id']}: {j['customer']}, {j['service']}, {j['window']}, {j['tech'] or 'no technician'}" for j in orders], "needs_attention": []}
    return r | {"input": user, "result": out | {"facts": {k: v for k, v in facts.items() if k != "jobs"}}, "guards": guards}

if __name__ == "__main__":
    roster, tm = load("roster.json"), load("templates.json")
    T = {t["id"]: t for t in roster["technicians"]}
    assert zone_of("1420 Elm St, Tempe", ["Mesa", "Tempe"]) == "Tempe" and zone_of("1420 Elm St", ["Tempe"]) is None
    assert eligible(T["t-hale"], "leak", "Tempe", "tue-am", False)
    assert not eligible(T["t-okafor"], "ac", "Tempe", "tue-am", False), "off slot"
    assert not eligible(T["t-reyes"], "ac", "Tempe", "wed-pm", False), "wrong zone"
    assert not eligible(T["t-hale"], "leak", "Tempe", "tue-am", True), "emergency needs on_call"
    assert eligible(T["t-park"], "leak", "Tempe", "tue-am", True)
    for text, want in [("YES", "accept"), ("y", "accept"), ("No", "decline"), ("can't do it", "decline"), ("yes but no", "unclear"),
                       ("Still on another job, won't be free until 3pm", "unclear")]:
        assert parse_reply(text, tm) == want, (text, parse_reply(text, tm))
    assert numbers_ok("ORD-1003 booked", {"id": "ORD-1003"}) and not numbers_ok("9 jobs", {"n": 3})
    print("agents.py self-check ok")
