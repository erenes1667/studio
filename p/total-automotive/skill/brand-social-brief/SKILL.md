---
name: brand-social-brief
description: Turn a one-line social post brief plus a brand guide file into one design spec (JSON) that a designer or Canva can build from. Use when asked for a social post, carousel, Reel cover, Facebook, LinkedIn or TikTok graphic for a brand that has a guide file.
---

# brand-social-brief

Input: a one-line brief and a path to a brand guide file.
Output: one JSON design spec. Nothing else. No prose before or after.

## Steps

1. Read the brand guide file in full. Use only colors, fonts, tone rules and asset names found there.
2. Read the brief. Find the platform and format. If the brief names no platform, stop and return {"error": "platform missing"}.
3. Pick the size from the size table below. Never invent a size.
4. Write the copy inside the length caps. Follow the tone rules and the banned list in the guide.
5. Pick the layout, assign color roles from the guide, name one asset from the guide's asset list.
6. Return the JSON.

## Size table

| platform_format | size_px | template_type |
|---|---|---|
| instagram_post | 1080x1350 | feed |
| instagram_carousel | 1080x1080 | feed |
| reel_cover | 1080x1920 | vertical |
| facebook_post | 1200x630 | landscape |
| linkedin_post | 1200x627 | landscape |
| tiktok_cover | 1080x1920 | vertical |

## Length caps

- headline: 8 words or fewer, 48 characters or fewer.
- body: 3 numbered points for a list brief, each 12 words or fewer. Otherwise 25 words or fewer.
- cta: 4 words or fewer.
- Landscape: headline 6 words or fewer.

## Layout rules

- Margins: 64 px on every side.
- Vertical templates: keep text out of the top 220 px and the bottom 300 px. Working default, tune per platform.
- One focal element. One accent use. Text on a flat color block, never on a busy photo.
- Carousel: spec the cover slide only and set "slides" to the planned slide count.

## Output shape

```json
{
  "brief": "<the brief, copied word for word>",
  "brand_guide": "<file name>",
  "platform_format": "<key from the size table>",
  "size_px": "<WxH>",
  "template_type": "feed | vertical | landscape",
  "headline": "",
  "body": [""],
  "cta": "",
  "layout": {
    "structure": "<one sentence>",
    "regions": [{"name": "", "x": 0, "y": 0, "w": 0, "h": 0, "content": ""}]
  },
  "color_roles": {"background": "<hex from guide>", "headline": "<hex>", "body": "<hex>", "accent": "<hex>", "cta_fill": "<hex>", "cta_text": "<hex>"},
  "fonts": {"headline": "<from guide>", "body": "<from guide>"},
  "asset": {"file": "<name from guide asset list>", "use": ""},
  "alt_text": "",
  "checks": ["<each rule from the guide you applied>"],
  "open_questions": ["<anything the guide did not answer>"]
}
```

## Hard rules

- Never state a result, a payout, a time limit or a "no win no fee" promise unless the guide gives the exact wording.
- Never use a logo, a color or a font the guide does not list.
- If the guide is silent on something, put it in open_questions. Do not guess.
- Regions must fit inside the canvas and respect margins.
