# Shot catalogue

Twenty proven shots for launch videos, grouped by where they sit in the story. Pick shots in step 2 and name them in the shot-list's *Visual* column ("Hook — trailer bumper"). Then build from the numbers here instead of guessing.

All timings are frames at 30fps. "Hold" means a true still: nothing drifts, nothing blinks.

**How to choose**

- One shot per beat. A 20s video has room for about 5-6 shots plus 2-3 seams.
- **Each technique stars once per video.** If two beats want the same move, demote one or cut it.
- Shots tagged with a tone suit it best. Untagged shots work in any tone.
- Every number here was tuned on placeholder UI. Treat it as the starting draft and re-check it against the real footage.

**Universal rules (they apply to every card)**

- **The first draft is always too fast.** Start one notch slower than feels right. A hero action arc wants ~3s; interaction demos move at real human speed.
- **Hold after every landing.** Key info gets ≥30f of true stillness; the brand lockup ≥30f (1s).
- **Zoomed screenshots must be captured big.** Text goes soft when a 1x screenshot is pushed to 2-3x. Capture at 2x device scale (4x for the hero element). Scale large page layers with CSS `zoom`, not `transform: scale`, so Chromium rasterizes at the final size. If text is blurry, check the capture resolution first, never the camera or depth of field.
- **No handheld shake** on light UI. The camera is locked unless the shot says otherwise.
- **Light sweeps and glints: at most once, on the hero, clipped to its border-radius.** Never one per card.
- **Before/after and filter shots use real states**: the actual old version or the feature turned off, never a deliberately ugly mock-up.

---

## Hook (first 2-3s)

### Trailer bumper
*`chaotic`, `cinematic`*. Cold open: three of the most striking shots as a 9f-each speed cut, then a silent beat of pure black, then the title.
- **Timing:** ~140f. 3 × 9f cuts → 6f black → title.
- **Numbers:** All three cuts the same length, with clearly different framing (wide / card / close-up at 2.2x). Each cut pushes in slowly from 1→1.04 scale, linear. Without that push it reads as a slideshow.
- **Gotchas:** The black must be pure `#000` with nothing on it. It is a breath, not another title card. Hold the final title ≥40f.
- **Sound:** One hit per cut. Total silence on the black.

### Error-retype
*`deadpan`, `yc-parody`*. A typewriter types a bland phrase, hesitates, backspaces, then quickly types the real selling point.
- **Timing:** ~160f.
- **Numbers:** Frame-stepped characters (`text.slice(0, Math.floor((f - start) / step))`), never eased. Type at 2f/char, delete at 1.5f/char, retype at 1.5f/char with no pause. The speed difference *is* the joke. The cursor is solid while typing, blinks twice (4f half-period) while hesitating, then is removed.
- **Gotchas:** Use a monospace font or one fixed-width span per character, or the line reflows and jitters. Once per video. Hold ≥50f, with no leftover cursor.
- **Sound:** A key click on every character. Backspace pitched lower.

### Spotlight hero card
*`polished`, `cinematic`*. Lights out. A tungsten spotlight wanders the page, locks onto one card, the camera pushes in from the side, the card lifts and floats, a light trace runs around its edge twice, then it reseats.
- **Timing:** ~172f. Lock at f34 → touchdown f142 → 30f hold.
- **Numbers:** Page 0.8 zoom → 2.6 over 18f. Side angle (rotateY ~34°, rotateX ~8°) reads better than a top-down tilt. Darken outside the light to ~0.90-0.94 multiply: darker reads as "dimmed page", lighter loses the theatre. Lift 10f with overshoot `bezier(0.2,1.25,0.3,1)`, float 58f (4px sine bob), reseat 18f. The shadow grows with height.
- **Gotchas:** Pick the hero card by how it frames *after* the push. Use a card-shaped light on the hero, not a round pool. One hero only: multi-card openings fail.
- **Sound:** Light clunk on lights-out, whoosh on lift, sparkle on the trace, snap on reseat.

### Crane rise reveal
Open tight on one row of real data. The camera lifts and pulls back as rows flood in until the full dashboard fills the frame.
- **Timing:** ~165f. 24f close-up hold → 102f rise → 39f settle and hold.
- **Numbers:** Scale 3.0→1.0 on `bezier(0.2,0,0.25,1)`. Non-hero rows start at 38% opacity and come up 26f into the rise. An accent wash sweeps each row as the camera crosses it.
- **Gotchas:** Hold the close-up ≥20f so "this is a row of data" registers first. Rise faster than 80f and the row washes can't keep up. Slower than 130f and it drags. Needs a high-res capture (3x close-up). Motion blur on the fast first half only.

### Text as mask
*`cinematic`, `polished`*. A huge, heavy headline cut out of a plain stage, with the live product drifting inside the letters. After a small "inhale", the letters rush toward camera and the product takes over the screen.
- **Timing:** ~165f. 18f in → 78f drift → 8f inhale → 24f rush → hold ≥30f.
- **Numbers:** ~470px, weight 900, tight tracking, ~72% of frame width. Drift ~3.8px/f along the busiest axis of the screenshot. Inhale 1→0.965. Rush to ~46x on `t^1.8` in log space.
- **Gotchas:** Drive the mask transform and the content transform separately, or the product inflates with the letters. Light UIs must be darkened first or the letters don't read as windows. No outline on variable fonts: it exposes overlapping glyph contours.

---

## Feature beats

### Cursor flyover
Wide view of the whole page, then the camera hops through four feature areas. A cursor arrives first, clicks, the UI responds, then the camera pulls back so all four states share one frame.
- **Timing:** ~240f. 22f wide → 4 stops × 44f (20f flight + 24f dwell) → 24f pull-back → 18f hold.
- **Numbers:** Close-up scale chosen so the text to read is ≥40px on screen (~1.3x). The cursor leaves 2f early and lands 6f early. Click ripple 18f, scale 0.3→1.5, evenly spaced. Visit neighbouring areas in order; diagonal jumps are disorienting.
- **Gotchas:** Re-measure target points on the real screenshot. Camera and cursor timing must change in pairs, or the click lands mid-move. Motion blur amount ≤0.12 on light UI, or it reads as out of focus.
- **Sound:** Four evenly spaced clicks.

### Type and filter
On the real UI: type a search, the grid narrows to one card, a click opens the detail view.
- **Timing:** ~70f of action.
- **Numbers:** 3f/char typing. ~11f pause before filtering, or it reads as automated. Non-matching cards leave in reading order, 0.4f apart, each 5f fade plus 8px sink. The match slides 10f into its *real* first-row slot on `bezier(0.35,0,0.2,1)` with a slight lift. Click: two concentric accent ripples 3f apart, then a 16f push to 2.2x.
- **Gotchas:** The match must land in a true layout slot, not hover mid-screen. Patch over the screenshot's baked-in placeholder before overlaying typed text.
- **Sound:** Keyboard clip trimmed to exactly the typing length. Loudest click in the video on the confirm. Whoosh as the grid clears.

### Before/after slider
The money shot for any "improves X" product. Before and after stacked; a divider whips across fast, then sweeps slowly, revealing the after state as it passes.
- **Timing:** 120-150f.
- **Numbers:** Whip 12f vs sweep 48f (~5:1; below 3:1 the contrast is lost). After layer `clip-path: inset()` tracks the divider x exactly. Handle stretches horizontally with velocity (peak 1.18x) and settles to 1.
- **Gotchas:** Same layout, same framing on both sides, or it reads as two pages. End the sweep at ~40%, not 0%, so the after state stays on screen. Keep BEFORE/AFTER labels inside the content area.
- **Sound:** Whoosh on the whip, light tick on the rebound, near silence on the sweep.

### Reticle lock-on
A "look here" without arrows or red circles. Four L-shaped corner brackets fly in from off-screen, overshoot, and snap onto a target.
- **Timing:** 60-90f.
- **Numbers:** Fly in from ≥1000px. Overshoot to 0.94x, then settle at 1. On the snap frame: white flash on the target 0.55→0.28, with the label popping in the *same* frame.
- **Gotchas:** ≤2 per video, on different targets. More looks like a military template.
- **Sound:** One mechanical click on the snap, not a game-UI blip.

### Scanline annotate
*Good for AI products.* A scanline sweeps down an existing page. As it passes each block, corner brackets snap onto it and a machine label types out, while a counter ticks 00/06 → 06/06.
- **Timing:** ~150f.
- **Numbers:** Scanline 74f, **linear** (easing makes it look dragged by hand). Each block triggers when the line crosses its bottom edge, at least 4f after the previous one. Brackets start 76px out and spring in (damping 15). Label starts 5f after the snap, ~2.2 chars/frame, monospace.
- **Gotchas:** Bounding boxes are hand-measured, so re-measure on the real page with 12-16px margin. Count the counter live from fired targets, never hard-code it. Use a deep, saturated machine colour on light pages.

### Freeze-frame annotate
In a moving sequence, stop on the one thing that matters, circle it, then unfreeze.
- **Timing:** ~158f, with the freeze ≥45f.
- **Numbers:** Signal the pause (3f shutter flash + corner brackets + a "PAUSED" timecode) so it doesn't look like a stall. Marker circle draws in 10f with slight wobble. Unfreeze faster than real time (smootherstep over 22f) to win back the time.
- **Gotchas:** ≤2 per video. Never in the same shot as a jump-cut punch-in: one time manipulator per shot. Time SFX to the output frame, not the source frame.

### Jump-cut punch-in
Three hard jumps closer on the same target, no tweening.
- **Timing:** ~135f.
- **Numbers:** 1.0 → 1.6 → 2.6, each step held ≥35f, all anchored on the same target centre. 2f brightness dip to 0.92 on each jump, or it reads as dropped frames. Final step held ≥45f.
- **Sound:** A tick on every jump.

### Stack and count
*Inbox, feed, "something new every day" products.* List cards fly up from the bottom and stack. Each landing presses the stack down and rolls a counter one digit.
- **Timing:** ~70f for 5 cards.
- **Numbers:** One card every 12f, 22f flight on `bezier(0.45,0.05,0.25,1.12)`, rising from 600px. Tilts alternate ±2°. The stack presses 6px and recovers over 8f on each landing. The counter rolls one digit per landing in 8f, which must be shorter than the 12f spacing. Use `tabular-nums`.
- **Gotchas:** Front-on camera only; list information doesn't survive a tilted view. A highlight follows 2-4f *after* each landing, never on the same frame.
- **Sound:** One click when the count lands. If each card gets a pop, use the anti-machine-gun rules in `audio.md`.

### Pill slot cycle
*The best answer to "list five features".* A fixed sentence with one pill-shaped slot that rolls through feature phrases like a slot machine, then settles into the final sentence.
- **Timing:** 12f in + 21f per phrase + 14f settle + ≥45f hold. Six phrases ≈ 200f.
- **Numbers:** 5-7 phrases (more and viewers start counting). The swap happens in the first 8f of each beat. In from +120px, out to −130px, with vertical blur ≤14px proportional to real velocity and a slight rotateX roll. Final settle on `Easing.back(1.4)`.
- **Gotchas:** Phrases within 2x of each other's length, or the slot width lurches. The final sentence must match the stem's size and weight exactly.

---

## Seams (one technique per seam, never stacked)

Mark the seam technique in the shot list. A transition's frames come out of the neighbouring shots' budgets.

### Flash cut
A 5f white flash on each side of a hard cut, hiding it. Only to hide a cut, never as decoration.

### Whip pan
Hold ≥20f → cover 70% of the distance in 30% of the time (peak ≥300px/f so the blur fully hides the scene change) → long ease-out tail (~48f) into the target. Integrate one continuous velocity curve rather than chaining eases, or the speed kicks twice. Use directional blur from instantaneous speed, capped at 64px. Both scenes on the same horizontal line. Best when the destination has something to read. Avoid `<CameraMotionBlur>` on light UI: in 8-bit it tints yellow and leaves stepped echoes.

### Hidden cut
Hide the cut inside 1-3 frames of an occlusion, collision or light peak. **Occlusion:** a soft, out-of-focus foreground shape crosses the frame in 14f, cutting while its solid core covers the full width. Give it a cause → effect: press Render, the wipe passes, the result appears. **Light leak:** warm radial glows sweep diagonally, rising on `t²` for 28f with the cut at the peak, then easing out over 43f. Wash the page out at the peak (brightness +85%, contrast −50%). Once per video.

### Circle-match iris
When the outgoing scene has a circle (avatar, icon, round button) and the next has a round subject (donut chart, progress ring). Pulse the anchor twice, morph the solid disc into the ring (r 36→300 over 28f, expo-out), and open the iris from its exact centre (≤10px off, or it's obvious). The anchor must be a true circle: patch over rounded squares. Pair the meaning too: an avatar opens into personal stats, an app icon into app metrics.

---

## Outro

### UI strip-away
*Shipping, publishing, "done" products.* Click Publish, and the whole UI evaporates layer by layer, edges first, until only the button remains. It slides to centre, grows 1.5x, then hands off to the wordmark.
- **Timing:** ~144f.
- **Numbers:** 6 layers, 4f apart, 14f each on ease-in, each drifting 50-140px outward in its own direction. Button 18f to centre. Wordmark arrives ~10f after the button fades, never more than 20f of empty black. Hold ≥30f.
- **Gotchas:** Layers must be whole UI regions (sidebar, toolbar), not pixel slices. The button stays on top throughout. Only a final action (Publish, Ship, Done) earns this; "Save" doesn't.

### Logo lockup
From full-frame energy to the standard icon + wordmark + tagline.
- **Timing:** ~132f.
- **Numbers:** A big shape shrinks 5.4x → 1 with a 6% overshoot brake, swapping to the real logo at the brake. The icon shifts left to make room. Wordmark letters slide in on a stagger of `(0.7 − 0.46) / letterCount` of the shot, each 10% long. The tagline fades in as one line, not letter by letter.
- **Gotchas:** The logo itself never spins with the effect. Re-measure the wordmark width whenever the font or size changes, or the lockup drifts off centre. Lockup held ≥30f.

---

*Adapted from [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) `references/shots/` and `references/aesthetic-rules.md` (Apache-2.0, commit 43bd349), translated and condensed. Their full 124-card catalogue, with reference implementations, lives in that repo under `references/shots/` and `demos/`.*
