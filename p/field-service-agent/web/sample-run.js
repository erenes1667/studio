window.SAMPLE_RUN = {
 "model": "claude-haiku-5-5",
 "shop": "Cold Creek Plumbing & Heating",
 "recorded": "2026-10-20",
 "started_at": "2026-10-20T00:00:37.435Z",
 "finished_at": "2026-10-20T00:00:57.589Z",
 "model_calls": 9,
 "steps": [
  {
   "n": 1,
   "agent": "inbound",
   "title": "Missed call, text-back sent",
   "sim": "Mon 6:12 PM",
   "mode": "rule",
   "model": null,
   "scripted_input": false,
   "t0": "2026-10-20T00:00:37.435Z",
   "ms": 0,
   "usage": null,
   "input": "Inbound call from (602) 555-0173, no answer, after hours",
   "raw": "",
   "result": {
    "opening": "Hi, this is the after-hours assistant for Cold Creek. Sorry we missed your call."
   },
   "guards": [],
   "events": [
    {
     "ch": "cust",
     "dir": "sys",
     "text": "Missed call 6:12 PM"
    },
    {
     "ch": "cust",
     "dir": "a",
     "text": "Hi, this is the after-hours assistant for Cold Creek. Sorry we missed your call."
    }
   ]
  },
  {
   "n": 2,
   "agent": "intake",
   "title": "Intake agent, turn 1",
   "sim": "Mon 6:14 PM",
   "mode": "model",
   "model": "claude-haiku-5-5",
   "scripted_input": true,
   "t0": "2026-10-20T00:00:37.435Z",
   "ms": 1568,
   "usage": {
    "in": 1217,
    "out": 146
   },
   "input": "my water heater is leaking, 1420 Elm St in Tempe, can someone come tomorrow morning",
   "raw": "{\"reply\": \"Sorry about the leak. Since it's an active leak, we'll treat this as urgent. I can book tomorrow (Tue) 8:00 to 10:00 AM for you. What name should I put the booking under?\", \"fields\": {\"name\": null, \"address\": \"1420 Elm St, Tempe\", \"issue\": \"water heater leaking\", \"urgency\": \"urgent\", \"slot_id\": \"tue-am\"}, \"booked\": false}",
   "result": {
    "reply": "Sorry about the leak. Since it's an active leak, we'll treat this as urgent. I can book tomorrow (Tue) 8:00 to 10:00 AM for you. What name should I put the booking under?",
    "fields": {
     "name": null,
     "address": "1420 Elm St, Tempe",
     "issue": "water heater leaking",
     "urgency": "urgent",
     "slot_id": "tue-am"
    },
    "booked": false
   },
   "guards": [],
   "events": [
    {
     "ch": "cust",
     "dir": "u",
     "text": "my water heater is leaking, 1420 Elm St in Tempe, can someone come tomorrow morning"
    },
    {
     "ch": "cust",
     "dir": "a",
     "text": "Sorry about the leak. Since it's an active leak, we'll treat this as urgent. I can book tomorrow (Tue) 8:00 to 10:00 AM for you. What name should I put the booking under?"
    },
    {
     "ch": "job",
     "fields": {
      "name": null,
      "address": "1420 Elm St, Tempe",
      "issue": "water heater leaking",
      "urgency": "urgent",
      "slot_id": "tue-am",
      "slot": "Tomorrow (Tue) 8:00 to 10:00 AM",
      "status": "Collecting details"
     }
    }
   ]
  },
  {
   "n": 3,
   "agent": "intake",
   "title": "Intake agent, turn 2",
   "sim": "Mon 6:15 PM",
   "mode": "model",
   "model": "claude-haiku-5-5",
   "scripted_input": true,
   "t0": "2026-10-20T00:00:39.004Z",
   "ms": 1257,
   "usage": {
    "in": 1374,
    "out": 143
   },
   "input": "how much will it cost?",
   "raw": "{\"reply\": \"I can't give prices by text. The tech gives a written quote on site before any work starts. Tomorrow (Tue) 8:00 to 10:00 AM still works for you. What name should I put the booking under?\", \"fields\": {\"name\": null, \"address\": \"1420 Elm St, Tempe\", \"issue\": \"water heater leaking\", \"urgency\": \"urgent\", \"slot_id\": \"tue-am\"}, \"booked\": false}",
   "result": {
    "reply": "I can't give prices by text. The tech gives a written quote on site before any work starts. Tomorrow (Tue) 8:00 to 10:00 AM still works for you. What name should I put the booking under?",
    "fields": {
     "name": null,
     "address": "1420 Elm St, Tempe",
     "issue": "water heater leaking",
     "urgency": "urgent",
     "slot_id": "tue-am"
    },
    "booked": false
   },
   "guards": [],
   "events": [
    {
     "ch": "cust",
     "dir": "u",
     "text": "how much will it cost?"
    },
    {
     "ch": "cust",
     "dir": "a",
     "text": "I can't give prices by text. The tech gives a written quote on site before any work starts. Tomorrow (Tue) 8:00 to 10:00 AM still works for you. What name should I put the booking under?"
    },
    {
     "ch": "job",
     "fields": {
      "name": null,
      "address": "1420 Elm St, Tempe",
      "issue": "water heater leaking",
      "urgency": "urgent",
      "slot_id": "tue-am",
      "slot": "Tomorrow (Tue) 8:00 to 10:00 AM",
      "status": "Collecting details"
     }
    }
   ]
  },
  {
   "n": 4,
   "agent": "intake",
   "title": "Intake agent, turn 3",
   "sim": "Mon 6:16 PM",
   "mode": "model",
   "model": "claude-haiku-5-5",
   "scripted_input": true,
   "t0": "2026-10-20T00:00:40.260Z",
   "ms": 1504,
   "usage": {
    "in": 1529,
    "out": 174
   },
   "input": "Dana Whitfield",
   "raw": "{\"reply\": \"Thanks, Dana. You're booked for tomorrow (Tue) 8:00 to 10:00 AM at 1420 Elm St, Tempe, for your leaking water heater. If the leak gets worse before then, call our emergency line at (480) 555-0199.\", \"fields\": {\"name\": \"Dana Whitfield\", \"address\": \"1420 Elm St, Tempe\", \"issue\": \"water heater leaking\", \"urgency\": \"urgent\", \"slot_id\": \"tue-am\"}, \"booked\": true}",
   "result": {
    "reply": "Thanks, Dana. You're booked for tomorrow (Tue) 8:00 to 10:00 AM at 1420 Elm St, Tempe, for your leaking water heater. If the leak gets worse before then, call our emergency line at (480) 555-0199.",
    "fields": {
     "name": "Dana Whitfield",
     "address": "1420 Elm St, Tempe",
     "issue": "water heater leaking",
     "urgency": "urgent",
     "slot_id": "tue-am"
    },
    "booked": true
   },
   "guards": [],
   "events": [
    {
     "ch": "cust",
     "dir": "u",
     "text": "Dana Whitfield"
    },
    {
     "ch": "cust",
     "dir": "a",
     "text": "Thanks, Dana. You're booked for tomorrow (Tue) 8:00 to 10:00 AM at 1420 Elm St, Tempe, for your leaking water heater. If the leak gets worse before then, call our emergency line at (480) 555-0199."
    },
    {
     "ch": "job",
     "fields": {
      "name": "Dana Whitfield",
      "address": "1420 Elm St, Tempe",
      "issue": "water heater leaking",
      "urgency": "urgent",
      "slot_id": "tue-am",
      "slot": "Tomorrow (Tue) 8:00 to 10:00 AM",
      "status": "Booked"
     }
    }
   ]
  },
  {
   "n": 5,
   "agent": "dispatcher",
   "title": "Match job to technicians by zone and skill",
   "sim": "Mon 6:17 PM",
   "mode": "model",
   "model": "claude-haiku-5-5",
   "scripted_input": false,
   "t0": "2026-10-20T00:00:41.765Z",
   "ms": 1293,
   "usage": {
    "in": 781,
    "out": 141
   },
   "input": "{\"issue\": \"water heater leaking\", \"zone\": \"Tempe\", \"slot_id\": \"tue-am\", \"slot\": \"Tomorrow (Tue) 8:00 to 10:00 AM\", \"urgency\": \"urgent\"}",
   "raw": "{\"skill\": \"water-heater\", \"ranked\": [\"t-nair\", \"t-hale\", \"t-park\"], \"reason\": \"Water heater leak in Tempe on urgent Tue-am slot: Priya Nair covers Tempe with water-heater skill and has no off-slot conflict, Marcus Hale also qualifies but is available here, and Jun Park is on call and covers Tempe with water-heater skill as a backup.\"}",
   "result": {
    "skill": "water-heater",
    "ranked": [
     "t-nair",
     "t-hale",
     "t-park"
    ],
    "reason": "Water heater leak in Tempe on urgent Tue-am slot: Priya Nair covers Tempe with water-heater skill and has no off-slot conflict, Marcus Hale also qualifies but is available here, and Jun Park is on call and covers Tempe with water-heater skill as a backup."
   },
   "guards": [],
   "events": [
    {
     "ch": "job",
     "fields": {
      "zone": "Tempe",
      "skill": "Water heater repair and replacement",
      "status": "Dispatching"
     }
    }
   ]
  },
  {
   "n": 6,
   "agent": "dispatcher",
   "title": "Draft SMS to Priya Nair",
   "sim": "Mon 6:17 PM",
   "mode": "model",
   "model": "claude-haiku-5-5",
   "scripted_input": false,
   "t0": "2026-10-20T00:00:43.059Z",
   "ms": 3067,
   "usage": {
    "in": 183,
    "out": 81
   },
   "input": "{\"technician\": \"Priya Nair\", \"issue\": \"water heater leaking\", \"address\": \"1420 Elm St, Tempe\", \"slot\": \"Tomorrow (Tue) 8:00 to 10:00 AM\", \"urgency\": \"urgent\"}",
   "raw": "{\"body\": \"Hi Priya, urgent job: water heater leaking at 1420 Elm St, Tempe. Scheduled for tomorrow (Tue) 8:00 to 10:00 AM. Please confirm you can make it.\"}",
   "result": {
    "to": "t-nair",
    "sms": "Hi Priya, urgent job: water heater leaking at 1420 Elm St, Tempe. Scheduled for tomorrow (Tue) 8:00 to 10:00 AM. Please confirm you can make it. Reply YES to accept or NO to decline."
   },
   "guards": [],
   "events": [
    {
     "ch": "tech",
     "dir": "sys",
     "text": "Texting Priya Nair (602) 555-0122"
    },
    {
     "ch": "tech",
     "dir": "a",
     "text": "Hi Priya, urgent job: water heater leaking at 1420 Elm St, Tempe. Scheduled for tomorrow (Tue) 8:00 to 10:00 AM. Please confirm you can make it. Reply YES to accept or NO to decline."
    }
   ]
  },
  {
   "n": 7,
   "agent": "dispatcher",
   "title": "Parse reply from Priya Nair",
   "sim": "Mon 6:21 PM",
   "mode": "rule",
   "model": null,
   "scripted_input": true,
   "t0": "2026-10-20T00:00:46.126Z",
   "ms": 0,
   "usage": null,
   "input": "Still on another job, won't be free until 3pm",
   "raw": "Still on another job, won't be free until 3pm",
   "result": {
    "decision": "unclear",
    "by": "rule: accept and decline words from templates.json"
   },
   "guards": [],
   "events": [
    {
     "ch": "tech",
     "dir": "u",
     "text": "Still on another job, won't be free until 3pm"
    }
   ]
  },
  {
   "n": 8,
   "agent": "dispatcher",
   "title": "Read free-text reply (model, cannot assign)",
   "sim": "Mon 6:21 PM",
   "mode": "model",
   "model": "claude-haiku-5-5",
   "scripted_input": false,
   "t0": "2026-10-20T00:00:46.126Z",
   "ms": 4129,
   "usage": {
    "in": 108,
    "out": 46
   },
   "input": "Still on another job, won't be free until 3pm",
   "raw": "{\"decision\": \"decline\", \"reason\": \"Technician is still on another job and won't be free until 3pm, so they cannot take this job now.\"}",
   "result": {
    "decision": "decline"
   },
   "guards": [],
   "events": [
    {
     "ch": "tech",
     "dir": "sys",
     "text": "Priya Nair declined. Next technician."
    }
   ]
  },
  {
   "n": 9,
   "agent": "dispatcher",
   "title": "Draft SMS to Marcus Hale",
   "sim": "Mon 6:21 PM",
   "mode": "model",
   "model": "claude-haiku-5-5",
   "scripted_input": false,
   "t0": "2026-10-20T00:00:50.255Z",
   "ms": 4396,
   "usage": {
    "in": 195,
    "out": 79
   },
   "input": "{\"technician\": \"Marcus Hale\", \"issue\": \"water heater leaking\", \"address\": \"1420 Elm St, Tempe\", \"slot\": \"Tomorrow (Tue) 8:00 to 10:00 AM\", \"urgency\": \"urgent\"} Priya Nair declined this job.",
   "raw": "{\"body\": \"Marcus, urgent job: water heater leaking at 1420 Elm St, Tempe. Scheduled Tomorrow (Tue) 8:00 to 10:00 AM. Please confirm you can take it.\"}",
   "result": {
    "to": "t-hale",
    "sms": "Marcus, urgent job: water heater leaking at 1420 Elm St, Tempe. Scheduled Tomorrow (Tue) 8:00 to 10:00 AM. Please confirm you can take it. Reply YES to accept or NO to decline."
   },
   "guards": [],
   "events": [
    {
     "ch": "tech",
     "dir": "sys",
     "text": "Texting Marcus Hale (602) 555-0111"
    },
    {
     "ch": "tech",
     "dir": "a",
     "text": "Marcus, urgent job: water heater leaking at 1420 Elm St, Tempe. Scheduled Tomorrow (Tue) 8:00 to 10:00 AM. Please confirm you can take it. Reply YES to accept or NO to decline."
    }
   ]
  },
  {
   "n": 10,
   "agent": "dispatcher",
   "title": "Parse reply from Marcus Hale",
   "sim": "Mon 6:24 PM",
   "mode": "rule",
   "model": null,
   "scripted_input": true,
   "t0": "2026-10-20T00:00:54.651Z",
   "ms": 0,
   "usage": null,
   "input": "YES",
   "raw": "YES",
   "result": {
    "decision": "accept",
    "by": "rule: accept and decline words from templates.json"
   },
   "guards": [],
   "events": [
    {
     "ch": "tech",
     "dir": "u",
     "text": "YES"
    }
   ]
  },
  {
   "n": 11,
   "agent": "dispatcher",
   "title": "Confirm to customer",
   "sim": "Mon 6:24 PM",
   "mode": "rule",
   "model": null,
   "scripted_input": false,
   "t0": "2026-10-20T00:00:54.652Z",
   "ms": 0,
   "usage": null,
   "input": "t-hale",
   "raw": "",
   "result": {
    "to": "customer",
    "sms": "Good news Dana: Marcus from Cold Creek has your job. Window: Tomorrow (Tue) 8:00 to 10:00 AM."
   },
   "guards": [],
   "events": [
    {
     "ch": "cust",
     "dir": "a",
     "text": "Good news Dana: Marcus from Cold Creek has your job. Window: Tomorrow (Tue) 8:00 to 10:00 AM."
    },
    {
     "ch": "job",
     "fields": {
      "tech": "Marcus Hale",
      "status": "Technician assigned"
     }
    }
   ]
  },
  {
   "n": 12,
   "agent": "orders",
   "title": "Order intake: append row to orders table",
   "sim": "Mon 6:24 PM",
   "mode": "model",
   "model": "claude-haiku-5-5",
   "scripted_input": false,
   "t0": "2026-10-20T00:00:54.652Z",
   "ms": 946,
   "usage": {
    "in": 215,
    "out": 83
   },
   "input": "{\"issue\": \"water heater leaking\", \"address\": \"1420 Elm St, Tempe\", \"urgency\": \"urgent\", \"slot\": \"Tomorrow (Tue) 8:00 to 10:00 AM\"}",
   "raw": "{\"service\": \"Water heater repair and replacement\", \"note\": \"Customer reports a leaking water heater at 1420 Elm St, Tempe; urgent, scheduled for tomorrow (Tue) 8:00 to 10:00 AM.\"}",
   "result": {
    "row": {
     "id": "ORD-1003",
     "sim": "Mon 6:24 PM",
     "customer": "Dana Whitfield",
     "phone": "(602) 555-0173",
     "address": "1420 Elm St, Tempe",
     "zone": "Tempe",
     "service": "Water heater repair and replacement",
     "urgency": "urgent",
     "window": "Tomorrow (Tue) 8:00 to 10:00 AM",
     "tech": "Marcus Hale",
     "status": "Booked, tech accepted",
     "note": "Customer reports a leaking water heater at 1420 Elm St, Tempe; urgent, scheduled for tomorrow (Tue) 8:00 to 10:00 AM.",
     "sample": false
    }
   },
   "guards": [],
   "events": [
    {
     "ch": "orders",
     "row": {
      "id": "ORD-1003",
      "sim": "Mon 6:24 PM",
      "customer": "Dana Whitfield",
      "phone": "(602) 555-0173",
      "address": "1420 Elm St, Tempe",
      "zone": "Tempe",
      "service": "Water heater repair and replacement",
      "urgency": "urgent",
      "window": "Tomorrow (Tue) 8:00 to 10:00 AM",
      "tech": "Marcus Hale",
      "status": "Booked, tech accepted",
      "note": "Customer reports a leaking water heater at 1420 Elm St, Tempe; urgent, scheduled for tomorrow (Tue) 8:00 to 10:00 AM.",
      "sample": false
     }
    },
    {
     "ch": "job",
     "fields": {
      "status": "Order ORD-1003 logged"
     }
    }
   ]
  },
  {
   "n": 13,
   "agent": "report",
   "title": "Morning report",
   "sim": "Tue 7:30 AM",
   "mode": "model",
   "model": "claude-haiku-5-5",
   "scripted_input": false,
   "t0": "2026-10-20T00:00:55.598Z",
   "ms": 1991,
   "usage": {
    "in": 516,
    "out": 334
   },
   "input": "{\"office_opens\": \"7:30 AM\", \"open_orders\": 3, \"new_since_close\": 1, \"emergency\": 0, \"urgent\": 1, \"unassigned\": 0, \"jobs\": [{\"id\": \"ORD-1001\", \"customer\": \"Lena Brandt\", \"zone\": \"Glendale\", \"service\": \"AC repair and tune-ups\", \"window\": \"Wed 1:00 to 3:00 PM\", \"tech\": \"Tomas Reyes\", \"status\": \"Booked, tech accepted\"}, {\"id\": \"ORD-1002\", \"customer\": \"Omar Vasquez\", \"zone\": \"Phoenix\", \"service\": \"Faucet, toilet and fixture installs\", \"window\": \"Tomorrow (Tue) 10:30 AM to 12:30 PM\", \"tech\": \"Priya Nair\", \"status\": \"Booked, tech accepted\"}, {\"id\": \"ORD-1003\", \"customer\": \"Dana Whitfield\", \"zone\": \"Tempe\", \"service\": \"Water heater repair and replacement\", \"window\": \"Tomorrow (Tue) 8:00 to 10:00 AM\", \"tech\": \"Marcus Hale\", \"status\": \"Booked, tech accepted\"}]}",
   "raw": "{\"headline\": \"Good morning: 3 open orders today, with 1 new since close and 1 flagged urgent, all three already assigned to techs who have accepted.\", \"lines\": [\"ORD-1001 | Lena Brandt | Glendale | AC repair and tune-ups | Wed 1:00 to 3:00 PM | Tomas Reyes | Booked, tech accepted\", \"ORD-1002 | Omar Vasquez | Phoenix | Faucet, toilet and fixture installs | Tomorrow (Tue) 10:30 AM to 12:30 PM | Priya Nair | Booked, tech accepted\", \"ORD-1003 | Dana Whitfield | Tempe | Water heater repair and replacement | Tomorrow (Tue) 8:00 to 10:00 AM | Marcus Hale | Booked, tech accepted\"], \"needs_attention\": [\"1 urgent order on the board; confirm its handling with the team when the office opens at 7:30 AM\"]}",
   "result": {
    "headline": "Good morning: 3 open orders today, with 1 new since close and 1 flagged urgent, all three already assigned to techs who have accepted.",
    "lines": [
     "ORD-1001 | Lena Brandt | Glendale | AC repair and tune-ups | Wed 1:00 to 3:00 PM | Tomas Reyes | Booked, tech accepted",
     "ORD-1002 | Omar Vasquez | Phoenix | Faucet, toilet and fixture installs | Tomorrow (Tue) 10:30 AM to 12:30 PM | Priya Nair | Booked, tech accepted",
     "ORD-1003 | Dana Whitfield | Tempe | Water heater repair and replacement | Tomorrow (Tue) 8:00 to 10:00 AM | Marcus Hale | Booked, tech accepted"
    ],
    "needs_attention": [
     "1 urgent order on the board; confirm its handling with the team when the office opens at 7:30 AM"
    ],
    "facts": {
     "office_opens": "7:30 AM",
     "open_orders": 3,
     "new_since_close": 1,
     "emergency": 0,
     "urgent": 1,
     "unassigned": 0
    }
   },
   "guards": [],
   "events": [
    {
     "ch": "report",
     "report": {
      "headline": "Good morning: 3 open orders today, with 1 new since close and 1 flagged urgent, all three already assigned to techs who have accepted.",
      "lines": [
       "ORD-1001 | Lena Brandt | Glendale | AC repair and tune-ups | Wed 1:00 to 3:00 PM | Tomas Reyes | Booked, tech accepted",
       "ORD-1002 | Omar Vasquez | Phoenix | Faucet, toilet and fixture installs | Tomorrow (Tue) 10:30 AM to 12:30 PM | Priya Nair | Booked, tech accepted",
       "ORD-1003 | Dana Whitfield | Tempe | Water heater repair and replacement | Tomorrow (Tue) 8:00 to 10:00 AM | Marcus Hale | Booked, tech accepted"
      ],
      "needs_attention": [
       "1 urgent order on the board; confirm its handling with the team when the office opens at 7:30 AM"
      ],
      "facts": {
       "office_opens": "7:30 AM",
       "open_orders": 3,
       "new_since_close": 1,
       "emergency": 0,
       "urgent": 1,
       "unassigned": 0
      }
     }
    }
   ]
  }
 ],
 "orders_seed": [
  {
   "id": "ORD-1001",
   "sim": "Mon 2:40 PM",
   "customer": "Lena Brandt",
   "phone": "(602) 555-0188",
   "address": "SAMPLE ROW",
   "zone": "Glendale",
   "service": "AC repair and tune-ups",
   "urgency": "routine",
   "window": "Wed 1:00 to 3:00 PM",
   "tech": "Tomas Reyes",
   "status": "Booked, tech accepted",
   "note": "",
   "sample": true
  },
  {
   "id": "ORD-1002",
   "sim": "Mon 4:05 PM",
   "customer": "Omar Vasquez",
   "phone": "(623) 555-0166",
   "address": "SAMPLE ROW",
   "zone": "Phoenix",
   "service": "Faucet, toilet and fixture installs",
   "urgency": "routine",
   "window": "Tomorrow (Tue) 10:30 AM to 12:30 PM",
   "tech": "Priya Nair",
   "status": "Booked, tech accepted",
   "note": "",
   "sample": true
  }
 ],
 "roster": {
  "_note": "SAMPLE roster. Fictional technicians, fictional 555-01xx numbers. Replace with the shop's real roster.",
  "technicians": [
   {
    "id": "t-hale",
    "name": "Marcus Hale",
    "phone": "(602) 555-0111",
    "zones": [
     "Tempe",
     "Mesa",
     "Phoenix"
    ],
    "skills": [
     "water-heater",
     "leak",
     "drain"
    ],
    "off_slots": [
     "wed-am"
    ],
    "on_call": false
   },
   {
    "id": "t-nair",
    "name": "Priya Nair",
    "phone": "(602) 555-0122",
    "zones": [
     "Tempe",
     "Scottsdale",
     "Phoenix"
    ],
    "skills": [
     "water-heater",
     "leak",
     "fixtures"
    ],
    "off_slots": [],
    "on_call": false
   },
   {
    "id": "t-reyes",
    "name": "Tomas Reyes",
    "phone": "(623) 555-0133",
    "zones": [
     "Glendale",
     "Phoenix"
    ],
    "skills": [
     "ac",
     "furnace"
    ],
    "off_slots": [
     "tue-pm"
    ],
    "on_call": false
   },
   {
    "id": "t-okafor",
    "name": "Dee Okafor",
    "phone": "(480) 555-0144",
    "zones": [
     "Mesa",
     "Tempe"
    ],
    "skills": [
     "ac",
     "furnace",
     "drain"
    ],
    "off_slots": [
     "tue-am",
     "tue-mid"
    ],
    "on_call": false
   },
   {
    "id": "t-park",
    "name": "Jun Park",
    "phone": "(480) 555-0155",
    "zones": [
     "Scottsdale",
     "Glendale",
     "Phoenix",
     "Tempe",
     "Mesa"
    ],
    "skills": [
     "leak",
     "drain",
     "water-heater",
     "fixtures"
    ],
    "off_slots": [],
    "on_call": true
   }
  ],
  "skills": {
   "water-heater": "Water heater repair and replacement",
   "leak": "Leak detection and repair",
   "drain": "Drain cleaning",
   "ac": "AC repair and tune-ups",
   "furnace": "Furnace and heat pump repair",
   "fixtures": "Faucet, toilet and fixture installs"
  }
 },
 "templates": {
  "_note": "SAMPLE templates. Edit the text, keep the {placeholders}. Read by agents.py on every run.",
  "customer_opening": "Hi, this is the after-hours assistant for Cold Creek. Sorry we missed your call.",
  "dispatch_tail": "Reply YES to accept or NO to decline.",
  "dispatch_style": "Plain words, one or two sentences, no emoji. Say the job, the address and the time window. Do not mention money.",
  "customer_confirm": "Good news {customer}: {tech_first} from Cold Creek has your job. Window: {slot}.",
  "accept_words": [
   "yes",
   "y",
   "accept",
   "ok",
   "okay",
   "yep",
   "yup"
  ],
  "decline_words": [
   "no",
   "n",
   "decline",
   "pass",
   "cannot",
   "cant"
  ],
  "no_price_line": "I cannot give prices by text. The tech gives you a written quote on site before any work starts.",
  "report_title": "Morning report"
 },
 "hours": "Mon to Fri 7:30 AM to 5:00 PM. Weekends closed except emergencies.",
 "office_opens": "7:30 AM"
};
