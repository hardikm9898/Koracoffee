# Koura Coffee — Scroll Story Video Brief (AI video generation)

This brief is for making the video behind the home page "From bean to cup"
scroll animation. As the visitor scrolls, the website plays this video frame by
frame, so **scrolling = playing the video**. The quality of the website depends
entirely on following this brief.

Copy the prompts **exactly** (they are in English on purpose — AI video tools
understand English best). Only change what is marked `[like this]`.

---

## 0. How the final video must work (read first)

The story has **5 scenes**. Each scene is one AI clip of 5–8 seconds. The scenes
are chained: **the last frame of scene N is the first frame of scene N+1**, so
when they are joined it looks like one continuous shot with no cut.

| Scene | What happens | Starts on | Ends on |
|---|---|---|---|
| 1 · Origin | Raw green coffee beans fall in slow motion and settle into a pile | K0 — empty stage | K1 — pile of green beans |
| 2 · Roast | The same pile roasts: green → golden → brown, wisps of smoke, oils shine | K1 | K2 — pile of glossy dark roasted beans |
| 3 · Grind | The roasted beans burst apart into fine coffee grounds that swirl and settle | K2 | K3 — mound of fine ground coffee |
| 4 · Brew | The grounds swirl up into a vortex that becomes a stream of espresso filling a cup | K3 | K4 — cup of espresso with crema |
| 5 · Your cup | Steam rises, crema swirls slowly, camera slowly pushes in a little | K4 | K5 — final hero shot of the cup |

The website shows one short caption per scene (left side on desktop, bottom on
mobile). That is why the **subject must stay in the centre and the left/right
thirds must stay empty dark background**.

### The method (do it in this order)

1. **Make the 6 keyframe images first** (K0 … K5) with an image AI
   (Midjourney, Google Imagen / Gemini, ChatGPT image, Flux, Ideogram…).
   Section 3 has the prompts.
2. Check all 6 images side by side: same background, same light, same camera
   angle, same surface, subject in the same spot. Regenerate any that don't match.
3. **Make each scene as a video using "Start frame + End frame"**
   (also called "first & last frame", "keyframes", "frames to video").
   Tools that support this include Kling, Luma Dream Machine, Runway and Veo
   (in Google Flow) — check the current UI of the tool you use.
   Upload Kn as the start frame and Kn+1 as the end frame, and paste the scene
   prompt from section 4.
4. Check each clip with the checklist in section 6. Regenerate until it passes.
5. Hand over the clips (section 7). The website build script joins them and
   converts them into frames.

If your tool has **no** start+end frame feature: use image-to-video with the
start frame only, then take a screenshot of the clip's last frame and use it as
the start frame of the next scene (and skip K2–K5). This works, but expect more
regenerations.

---

## 1. Technical requirements (every clip)

| Setting | Value |
|---|---|
| Aspect ratio | **16:9** (required). A second 9:16 set for mobile is optional — see 1.1 |
| Resolution | **1920×1080 minimum**. 4K if the tool allows. If the tool only gives 720p, upscale to 1080p/4K (e.g. Topaz Video AI) before handing over |
| Length | 5–8 seconds per scene (all scenes roughly the same length) |
| Frame rate | 24 or 30 fps (whatever the tool gives) |
| Shot | **One continuous shot. No cuts, no scene changes, no fades to black** |
| Camera | Locked-off tripod, or a very slow push-in. **No pans, orbits, handheld shake, zoom jumps** |
| Audio | Not used. Turn off audio generation if possible (saves credits) |
| Text / logos | **None.** No words, labels, packaging text, watermarks, logos |
| People | **None.** No hands, no baristas, no faces |
| Output | MP4 (H.264) or MOV. Download the highest quality available, never a screen recording |

### 1.1 Mobile (optional, best quality)

On phones the story picture fills the top ~62% of the screen (about 3:4) and
the text sits below it. The website crops the centre of the 16:9 video to 3:4,
which keeps the whole subject as long as it stays in the middle ~40% of the
width (see the style bible). A separate 9:16 or 3:4 set is optional; if you
make one, keep the subject centred and leave empty background around it.

---

## 2. Style bible (applies to everything — keep it identical)

- **Background:** seamless deep espresso-brown, almost black (approx. `#1A110C`
  fading to `#2A1C16`). No visible walls, corners, horizon, kitchen, café, props.
- **Surface:** a dark matte slate / basalt stone slab, only visible as a soft
  pool of light under the subject. Same surface in every frame.
- **Light:** one warm key light from the **top-left** (golden, ~3200K), soft
  copper rim light from behind-right. Everything outside the light pool falls
  off into darkness. Light direction never changes between scenes.
- **Colour palette:** warm browns, amber, copper (`#B27C4E`), cream highlights.
  No blue, green, purple or neon tints (except the natural green of raw beans in scene 1).
- **Camera:** eye level slightly above the surface (about 15° looking down),
  85–100 mm macro lens look, shallow depth of field, cinematic.
- **Composition:** subject **exactly centred**, occupying the **middle ~35–40%
  of the frame width** and the middle ~55% of the height. Left third, right
  third, top 15% and bottom 15% = empty dark background.
- **Quality words:** photorealistic, high-end commercial product cinematography,
  ultra detailed, crisp macro texture, gentle film grain, premium, luxurious.
- **Mood:** calm, slow, premium, sensory. Slow motion everywhere.

### Shared negative prompt (paste into every "negative prompt" box)

```
text, letters, words, logo, watermark, label, brand name, packaging, hands, fingers, person, people, face, barista, kitchen, cafe interior, table clutter, props, plants, window, bright background, white background, blue tint, green tint on roasted beans, neon, cartoon, illustration, 3d render look, plastic look, oversaturated, low resolution, blurry subject, motion blur smear, flicker, jitter, camera shake, camera pan, orbit, zoom jump, cut, scene change, fade to black, split screen, duplicate cup, extra cups, deformed cup, warped handle, floating objects that disappear, morphing background
```

---

## 3. Keyframe image prompts (K0 – K5)

Make all six in **16:9, highest resolution**. For K1–K5, if your image tool
supports a reference / "style reference" / "image prompt", give it K0 (or the
previous keyframe) so background, light and surface stay identical.

### K0 — Empty stage (start of scene 1)

```
Photorealistic high-end product photography, 16:9. An empty dark matte slate stone surface in a pitch-dark studio, seamless deep espresso-brown almost black background. A single warm golden key light from the top-left creates a soft oval pool of light in the exact centre of the surface, with a subtle copper rim glow behind. Nothing on the surface. The centre of the frame is lit, the left third, right third, top and bottom fall off into darkness. Camera slightly above the surface looking down 15 degrees, 100mm macro lens, shallow depth of field, cinematic, gentle film grain, premium luxurious mood. No text, no props, no people.
```

### K1 — Pile of raw green coffee beans

```
Photorealistic high-end product photography, 16:9. A small neat pile of raw unroasted green coffee beans, pale olive-green with matte texture and visible centre creases, resting in the exact centre of a dark matte slate stone surface. Seamless deep espresso-brown almost black background. Single warm golden key light from the top-left, soft copper rim light from behind-right, the pile sits in a soft pool of light and everything around falls off into darkness. The pile occupies the middle third of the frame width; left third, right third, top and bottom are empty dark background. Camera slightly above the surface looking down 15 degrees, 100mm macro lens, shallow depth of field, ultra detailed bean texture, cinematic, gentle film grain. No text, no props, no people.
```

### K2 — Same pile, now roasted

```
Photorealistic high-end product photography, 16:9. The same small neat pile of coffee beans in the exact same position and shape, now freshly roasted: rich glossy dark chocolate-brown beans with a light sheen of natural oils, a few thin wisps of smoke rising from the pile. Dark matte slate stone surface, seamless deep espresso-brown almost black background. Single warm golden key light from the top-left, soft copper rim light from behind-right catching the smoke. Pile occupies the middle third of the frame; left third, right third, top and bottom are empty dark background. Camera slightly above the surface looking down 15 degrees, 100mm macro lens, shallow depth of field, ultra detailed, cinematic, gentle film grain. No text, no props, no people.
```

### K3 — Mound of ground coffee

```
Photorealistic high-end product photography, 16:9. A small soft conical mound of finely ground dark-brown coffee in the exact centre of a dark matte slate stone surface, same position and size as a small pile of beans, a few fine coffee particles still drifting down in the air above it. Seamless deep espresso-brown almost black background. Single warm golden key light from the top-left, soft copper rim light from behind-right. Mound occupies the middle third of the frame; left third, right third, top and bottom are empty dark background. Camera slightly above the surface looking down 15 degrees, 100mm macro lens, shallow depth of field, ultra detailed powder texture, cinematic, gentle film grain. No text, no props, no people.
```

### K4 — Cup of espresso

```
Photorealistic high-end product photography, 16:9. A small elegant matte cream-white ceramic espresso cup on a matching saucer, standing in the exact centre of a dark matte slate stone surface, filled with fresh espresso topped with thick tiger-striped golden-hazelnut crema, the last thin stream of espresso dripping into it from above. Seamless deep espresso-brown almost black background. Single warm golden key light from the top-left, soft copper rim light from behind-right. The cup occupies the middle third of the frame; left third, right third, top and bottom are empty dark background. Camera slightly above the surface looking down 15 degrees, 100mm macro lens, shallow depth of field, ultra detailed, cinematic, gentle film grain. Plain cup with no logo, no text, no props, no people.
```

### K5 — Final hero shot

```
Photorealistic high-end product photography, 16:9. The same matte cream-white ceramic espresso cup and saucer with rich golden crema, in the exact centre of a dark matte slate stone surface, slightly closer to the camera than before, delicate curls of white steam rising and glowing in the warm light. Seamless deep espresso-brown almost black background. Single warm golden key light from the top-left, soft copper rim light from behind-right making the steam glow. The cup occupies the middle 40% of the frame; left third, right third, top and bottom are empty dark background. Camera slightly above the surface looking down 15 degrees, 100mm macro lens, shallow depth of field, ultra detailed, cinematic, gentle film grain, premium luxurious mood. Plain cup with no logo, no text, no props, no people.
```

### Keyframe check (before making any video)

Put K0–K5 side by side and confirm:

- [ ] Background colour and darkness identical in all six
- [ ] Light comes from the top-left in all six
- [ ] Same camera height and angle (surface looks the same)
- [ ] Subject is in the same centre spot and about the same size (K5 may be ~10% bigger)
- [ ] Left/right thirds are empty in all six
- [ ] No text, logos, hands, extra objects
- [ ] K4/K5 cup is the same cup (shape, colour, handle side)

---

## 4. Scene video prompts

Use **Start frame = Kn, End frame = Kn+1**, 16:9, 5–8 s, highest quality, and
paste the shared negative prompt from section 2.

### Scene 1 · Origin (K0 → K1)

```
Locked-off static camera, one continuous shot, no cuts. In a pitch-dark studio with a seamless deep espresso-brown background, raw green unroasted coffee beans fall from above the frame in elegant slow motion, tumbling and spinning, catching the warm golden light from the top-left. They land softly in the centre of the dark slate surface, bouncing slightly, and gradually build a small neat pile. The last beans settle and everything becomes still. Photorealistic macro product cinematography, shallow depth of field, ultra detailed, calm and premium, slow motion. The background, lighting and camera never change. No text, no people.
```

### Scene 2 · Roast (K1 → K2)

```
Locked-off static camera, one continuous shot, no cuts. The small pile of raw green coffee beans in the centre of the dark slate surface slowly roasts in place like a smooth time-lapse: the beans gradually change colour from pale green to yellow, to golden cinnamon, to rich glossy dark chocolate-brown, swelling very slightly as they roast. A warm amber glow pulses gently from beneath the pile, thin wisps of smoke curl upward and glow in the golden top-left light, and a soft sheen of oil appears on the beans at the end. The pile keeps its exact position and shape. Photorealistic macro product cinematography, shallow depth of field, ultra detailed, calm and premium. Background, lighting and camera never change. No flames, no text, no people.
```

### Scene 3 · Grind (K2 → K3)

```
Locked-off static camera, one continuous shot, no cuts. The pile of glossy dark roasted coffee beans in the centre of the dark slate surface lifts slightly into the air and bursts apart in extreme slow motion, each bean cracking and shattering into fine coffee grounds. The grounds swirl in a graceful spiral cloud of dark-brown particles that sparkle in the warm golden top-left light, then gently rain down and settle into a soft conical mound of fine ground coffee in the exact same spot. Photorealistic macro product cinematography, shallow depth of field, ultra detailed particles, calm and premium, slow motion. Background, lighting and camera never change. No grinder, no machine, no text, no people.
```

### Scene 4 · Brew (K3 → K4)

```
Locked-off static camera, one continuous shot, no cuts. The mound of fine ground coffee in the centre of the dark slate surface begins to swirl upward into a slow elegant vortex of dark particles that condenses into liquid, becoming a smooth glossy stream of rich espresso. In the same spot a matte cream-white ceramic espresso cup on a saucer forms beneath it, and the espresso stream pours into the cup in slow motion, filling it and building a thick golden tiger-striped crema. The stream thins to a few final drips. Photorealistic macro product cinematography, shallow depth of field, ultra detailed liquid, calm and premium, slow motion. Background, lighting and camera never change. No espresso machine, no hands, no text, no logo, no people.
```

### Scene 5 · Your cup (K4 → K5)

```
One continuous shot, no cuts. A very slow, smooth camera push-in toward the matte cream-white espresso cup with golden crema in the centre of the dark slate surface. Delicate curls of white steam rise from the cup and glow in the warm golden top-left light, the crema swirls very gently. Calm, warm, inviting final hero moment. Photorealistic macro product cinematography, shallow depth of field, ultra detailed, premium and luxurious, slow motion. Background and lighting never change. Plain cup with no logo, no text, no people.
```

### If a scene keeps failing — simpler fallback prompts

AI tools sometimes struggle with transformations. If after 4–5 tries a scene
still looks wrong, use these simpler versions (the website can blend scenes,
so a perfect match is not mandatory):

- **Roast (simple):** `The pile of coffee beans slowly darkens from green to glossy dark brown as warm light pulses and smoke wisps rise. Static camera, no cuts.`
- **Grind (simple):** `Roasted coffee beans crumble in slow motion into a mound of fine ground coffee, dark particles drifting down. Static camera, no cuts.`
- **Brew (simple):** Make K3 → K4 as two parts: (a) grounds swirl and dissolve into darkness; (b) start from black, an espresso stream pours into the cup. Hand both over; the build script joins them.

---

## 5. Scenarios — what to do if…

| Problem | Fix |
|---|---|
| The tool adds a cut or changes angle midway | Add `one continuous shot, locked-off static camera` at the **start** of the prompt; shorten to 5 s |
| Background turns grey/brown/brighter | Add `pitch-dark seamless background, low-key lighting` and regenerate; make sure the keyframes themselves are dark |
| Subject drifts off-centre or changes size | Use the start+end frame feature (not text-only); regenerate keyframes so the subject is the same size |
| Text or a logo appears on the cup | Add `plain unbranded cup` to the prompt; if it stays, regenerate K4/K5 without it |
| Hands or a machine appear | Add `no hands, no machine, objects move by themselves` |
| Extra cups / duplicated beans | Regenerate; lower "creativity"/"motion" setting if the tool has one |
| Flicker or "boiling" texture | Regenerate in a higher quality mode; upscale with Topaz (Proteus / Rhea) with de-flicker |
| Motion too fast | Add `extreme slow motion, 0.25x speed`; or ask for 8–10 s and it will feel slower on scroll |
| Clip is 720p only | Upscale to at least 1080p before handover |
| Two scenes don't line up exactly | Fine — tell me and I'll add a short cross-fade when building the frames |
| Tool gives 9:16 or 1:1 by default | Change aspect ratio to 16:9 before generating; never crop afterwards |

---

## 6. Quality checklist (every clip, before accepting it)

- [ ] One continuous shot — no cut, fade, flash or jump
- [ ] Camera locked (scene 5: only a slow push-in)
- [ ] First frame matches the start keyframe; last frame matches the end keyframe
- [ ] Background stays dark and identical throughout
- [ ] Subject centred; left/right thirds empty the whole time
- [ ] No text, logo, watermark, hands, people, machines
- [ ] No flicker, warping, melting, extra objects appearing/disappearing
- [ ] At least 1920×1080, downloaded in original quality
- [ ] Watch it at 0.25× speed once — every frame will be seen while scrolling

---

## 7. Hand-over

Put the files here (create the folder if it does not exist):

```
front-end/frontend/sequence-src/
  scene-1.mp4
  scene-2.mp4
  scene-3.mp4
  scene-4.mp4
  scene-5.mp4
  mobile/            ← optional 9:16 versions, same names
    scene-1.mp4 …
```

Then from `front-end/frontend` run:

```
npm run sequence
```

This joins the scenes and turns them into optimised WebP frames in
`public/sequence/` (with a `manifest.json`). The home page detects the frames
automatically — until they exist it shows the story with still photos.
The script needs ffmpeg (see the script's header for the one-time setup).
