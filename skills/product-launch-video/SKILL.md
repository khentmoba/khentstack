---
name: product-launch-video
description: >
  Build polished product launch videos in Remotion from brief → storyboard → render → multi-agent
  review → iterate. Designed for 15-25s social clips for product launches, feature demos, and
  before/after transformations. Works from a local project, a live website URL, or a screen
  recording. Triggers on: product video, launch video, demo video, remotion video, make a video for
  launch, make a video for this site/URL, "let's brag about this", "show off what I built".
---

# Product Launch Video Workflow

A repeatable workflow for producing 15-25s product launch videos using Remotion. Built for feature launches, app demos, and before/after transformations destined for X, LinkedIn, YouTube Shorts, and landing pages.

## When to use

- Product launch needs a short, social-ready video
- New feature demo for X/LinkedIn
- Before/after product transformation clip
- Landing page hero video
- "Let's brag about this" / "show off what I built" — a launch video for the project in the current directory
- "Make a video for example.com" — a launch video built from a live website

## Prerequisites

- Node.js 18+
- A Remotion project. If there isn't one, scaffold it with the `remotion-create` skill (`npx create-video@latest --yes --blank --no-tailwind <dir>`). Keep it in its own folder, not inside the product's repo.
- **At least one source** for the product (more is better — see step 1):
  - the project's code, local
  - a live website URL
  - a 30-60s screen recording of the product in use
- The launch copy (headline, tagline, key features) — or permission to derive it from the source

No separate ffmpeg install is needed; Remotion bundles it (`npx remotion ffmpeg`).

## Workflow

### 0. Pick a tone preset

Choose one of the seven presets below before writing anything. Each changes scripting energy, pacing, typography personality, and transition style. Presets are defaults, not limits — freeform direction ("fake Series A launch from 2016", "museum exhibit") refines them.

| Preset | Energy | Pacing / transitions |
|---|---|---|
| `default` | Punchy, playful, clean | 4-5 scenes; soft transitions |
| `polished` | Serious, elegant, restrained | 3-4 scenes, long holds; soft fades |
| `yc-parody` | Deadpan startup launch, played straight | 4-5 scenes, one claim each; hard cuts |
| `chaotic` | FAST, LOUD, ALL CAPS | 6-8 scenes, some under 2s; flash/zoom cuts |
| `deadpan` | Calm, dry, nothing is a joke | 3-4 scenes, big empty space; slow fades |
| `cinematic` | Trailer-scale, epic claims | 4-5 scenes, big type; dramatic wipes |
| `app-store` | Clean feature cards | 4-6 scenes; smooth slides |

Read `references/tones.md` for the full definitions — energy, voice, typography, hook style, highlight style, outro style, transitions, when-to-use, and example copy for each.

### 1. Gather inputs (parallel)

**Ask the user which platforms they're publishing to now**, not at render time — the aspect ratio shapes every layout decision from the storyboard on. See the platform table in step 7.

Then pull these in parallel before writing anything. Use every source you have; each one covers gaps in the others.

- **The project code** (if local) — README, main page, styles (exact colors and fonts), routes, key components. The best material is the product **in use**: find its 2-3 beats, entry → key action → result. Code beats the rendered page for copy accuracy.
- **The live website** (if there's a URL) — see *Website input* below.
- **Screen recording** (if provided) — design inspiration and a source of truth for UI copy that only appears mid-flow.
- **The brief** — launch post, landing page, one-pager. Extract: headline, taglines, key features, tone.
- **Brand tokens** — fonts, colors, icons, logos. If there's a design system, surface its values; otherwise take them from the code or the site's CSS.
- **Voice calibration** (optional) — if the video has narration or you're ghostwriting captions in a specific voice, pull recent posts/clips to match cadence and word choice.

Never invent labels, names, or features that don't exist in the real product — whatever the source.

**Website input.** Load the URL in a real browser (the harness's browser/preview tools, or headless Playwright) — many sites render client-side, and a plain fetch returns an empty shell. Then:

1. Dismiss cookie banners and popups.
2. Scroll section by section, pausing at each, so scroll-triggered content actually renders.
3. Capture at the video's aspect ratio (a 1080×1920 viewport for 9:16, not a desktop screenshot cropped later). Save captures to `public/site/` in the Remotion project.
4. Harvest: headline, tagline, section headings, feature names, CTAs, `<title>`, meta description, and Open Graph / social-preview tags; exact colors and font families from the computed CSS; the logo, product screenshots, hero images, and demo videos.

Rebuild the layout in React from the harvested tokens and assets — don't paste the site's markup in with `dangerouslySetInnerHTML`; it fights Remotion's frame-driven rendering. Use the public, logged-out site unless the user asks otherwise. If the site isn't the user's own, confirm they have the right to use its brand and assets before you start.

**Do not read:** build output (`dist/`, `.next/`, `build/`), lock files, test files, `.git/`, env and secret files (`.env`, `.env.*`), key and credential material (`.pem`, `.key`, `id_rsa`, service-account JSON, anything under `secrets/` or `credentials/`).

**Scrub before you publish.** Everything gathered here can end up in a public video. Never carry secrets, API keys, tokens, internal hostnames or URLs, real customer or user names, email addresses, or other personal data into the plan, the video, or the share copy. This includes data visible in screenshots and recordings. If the real UI shows such data, swap in plausible fictional stand-ins and say so in the plan.

### 2. Storyboard before any code

Write a shot-list table. Resist the urge to start coding.

| Beat | Time | Shot | Visual | Text overlay | Seam out |
|------|------|------|--------|-------------|----------|

**Choose shots from `references/shots.md`**: 20 proven launch shots (hook, feature beats, seams, outro) with frame timings, numbers and known failure modes. Name the card in the *Shot* column and the seam technique in *Seam out*. Each technique stars once per video. Seams take frames from the neighbouring shots, so budget them now, not during the build.

**Rules that save you from re-rendering:**

- **Lead with the viewer's problem** (hook), not the product name.
- **Product must appear within 3 seconds** (a16z Speedrun research on launch videos). `deadpan` and `polished` may hold a quiet opener longer — if you break this rule, do it on purpose and note it in the plan.
- **Before/after is the money shot** — design the whole video around it.
- **All text must be readable at 720p** (phone feed). Minimum 18px equivalent.
- **Burn all captions in.** 85%+ of social views are muted. No VO unless explicitly requested.

**Shape the story.** A starting shape, not a template:

```
Hook (2-3s) → Reveal (2-4s) → 2-3 sharp highlights (5-12s) → Punchline/outro (2-4s)
```

Write the storyboard to `launch-plan.md` in the Remotion project root so it survives the session and can be reused on the next iteration pass. Record the tone, the target platforms, and any fictional stand-ins there too.

### 3. Build in Remotion

Follow the `remotion-best-practices` skill for API details. Workflow-specific guidance:

- Keep the composition thin — extract scenes, theme, fonts, and mock data into their own files as complexity grows
- Register one `<Composition>` per aspect ratio (reachable from `src/Root.tsx`)
- Use `staticFile()` for assets in `public/`
- Take easing, spring and duration values from `references/motion.md` rather than tuning by eye
- Capture any screenshot that will be zoomed at 2x device scale (4x for the hero element). A 1x capture pushed to 2-3x goes soft, and no camera setting fixes that.
- Render at 30fps, h264, `--crf=18` — see step 7 for sizes

**Every frame must be a pure function of time.** Drive all motion from `useCurrentFrame()` with `interpolate()` / `spring()`. No CSS animations or transitions, no `Math.random()` (use Remotion's `random(seed)`), no `Date.now()`. Make sure fonts and images are loaded before a frame renders, or you get layout thrash and clipped text.

**Fonts** — load them with `@remotion/fonts` (local files) or `@remotion/google-fonts`; both block rendering until the font is ready:

```tsx
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

loadFont({family: 'Name', url: staticFile('fonts/file.woff2')});
```

**Transitions** — handle them at the orchestrator level with `<TransitionSeries>` from `@remotion/transitions`, not per scene. Per-scene exit fades fight the orchestrator and cause double-fading.

**Never crossfade two busy layouts.** A plain crossfade between two dense layouts makes a muddy double exposure. Stagger it — old content out, then new content in — or dip through the background.

### 4. Render-audit loop

Render one frame per scene first, **plus frames from mid-transition** — the transition frames are where layout breaks hide (commands under *Render commands*). Fix layout and clipping before a full render. Check:

- Text not clipped (line-height >= 1.2 for serif fonts with descenders)
- Panels not stacking unexpectedly (`AbsoluteFill` defaults to `flex-direction: column`)
- Content not truncated in bubbles, cards, or chat UI
- Transition frames are not a muddy double exposure
- Every line stays settled on screen long enough to read (see *Creative laws*)

### 5. Multi-agent review (the step that catches everything)

After 2-3 self-iterations, render ~20 frames (peak moments + transition frames) to `out/review/` and spawn **4 review agents in parallel**. Give each the frame paths and `launch-plan.md`; each reads the PNGs and returns a prioritized fix list.

1. **Design/layout critic** — off-kilter elements, misalignment, proportions, cropping
2. **Text/readability critic** — legibility at 720p, contrast, truncation, typos
3. **Narrative/pacing critic** — story arc, attention peaks/drops, earned duration, CTA strength
4. **Brand consistency critic** — fonts, colors, UI chrome matching the real product and its harvested tokens

Compile all 4 critic outputs + your own notes into a single revision plan before the next render pass. This step finds things you stop seeing after 50 renders.

### 6. Iterate on feedback

Watch the full render at real speed — stills don't show pacing — and iterate. Common feedback patterns and their fixes:

- **"This text is cut off"** → line-height or overflow issue
- **"This feels clunky"** → animation timing too fast/slow; check counter digit-flicker rate
- **"You invented this label"** → replace with real copy from the code, site, or recording
- **"Hold longer here"** → extend scene duration, keep animation timing the same
- **"A little long overall"** → cut redundant scenes (the narrative critic usually identifies which)
- **"The text is blurry when zoomed"** → recapture the screenshot at 2-4x, and scale the layer with CSS `zoom` instead of `transform: scale`. Not a camera or depth-of-field problem.
- **"The sound is late"** → shift each SFX earlier by its sample's own peak offset plus the AAC priming offset (`references/audio.md`, *Sync offsets*)

**Sound comes last, once picture is locked.** Any change to shot length or order shifts every SFX after it. Follow `references/audio.md`:

- Only licensed audio (CC0, CC-BY, Mixkit License, or your own). Log every file in `CREDITS.md` *when you download it*. Never use bundled audio whose source you can't trace, including brag's and shotcraft's.
- One music bed at ~0.34, behind a `bgm` prop so a music-free copy renders from the same timeline.
- SFX in one declared table, every `from` written relative to its shot (`SHOTS.hero.from + 56`), with no hit that lacks an on-screen action.
- Judge levels from the rendered file. Studio preview clamps volume to 1.

### 7. Ship for the right platform

If the video is going to multiple aspect ratios, render a separate composition for each — a 16:9 clip cropped to 9:16 in post usually looks bad.

| Platform | Aspect | Size |
|----------|--------|------|
| X / Twitter (feed) | 16:9 | 1920×1080 |
| X / Twitter (vertical) | 9:16 | 1080×1920 |
| LinkedIn (feed, landscape) | 16:9 | 1920×1080 |
| LinkedIn (feed, square) | 1:1 | 1080×1080 |
| YouTube (standard) | 16:9 | 1920×1080 |
| YouTube Shorts | 9:16 | 1080×1920 |
| Instagram Feed | 4:5 | 1080×1350 |
| Instagram Reels | 9:16 | 1080×1920 |
| TikTok | 9:16 | 1080×1920 |

Every platform here accepts 30 seconds, so duration limits never bind for this workflow.

**Poster frame.** Pick the strongest *settled* frame — text fully in, not mid-transition — and export it as `out/poster.jpg`. Then bake it in as frame 0 so every platform's idle thumbnail shows it: wrap the root of the composition in `<Freeze frame={POSTER_FRAME} active={frame === 0}>`. This **replaces** frame 0 rather than adding a frame, so the duration and audio sync stay identical.

**Deliverable pack** (all in `out/`):

- MP4 in each requested aspect ratio, plus a `-nobgm` copy of each if the video has music
- GIF for embeds and Slack shares
- `poster.jpg`
- `share-copy.txt` — 1-3 postable sentences per platform, specific, matching the tone, plus a thread/feature-list version for X and LinkedIn replies. Include any CC-BY attribution lines. No "excited to share."
- `CREDITS.md` — the audio ledger, covering every audio file the composition references

**Verify the files, not the render log.** Before handing over, probe every MP4 with the ffprobe bundled in Remotion, and check it matches the platform table: right size, `h264`, `30/1`, and `bt709` in all three colour fields. `bt470bg` or `unknown` means the `--color-space=bt709` flag was missed, and colours will shift on phones. If there's audio, also check loudness: aim for −14 to −16 LUFS integrated and a true peak below −1 dBTP. Commands are under *Render commands*.

## Creative laws

These apply to every launch video regardless of tone or platform.

- **Short.** 15-25 seconds; 18-22 is the sweet spot. 30 seconds is the ceiling.
- **Clear to a stranger.** After one viewing, someone who's never heard of it knows what it does, who it's for, and how to get it. Lead with that, not with how it's built.
- **Readable.** Pace comes from motion and cuts, never from pulling text away early. Any line the viewer must read stays fully visible and settled long enough to read it — roughly 0.3s per word, counted from when the whole line is on screen. A short label needs about 0.8s settled. Fast-in, then hold — never fast-in, then gone.
- **Show the thing.** At least one scene displays actual UI, copy, or a key visual from the product. No abstract filler.
- **Specific.** It must feel made for this exact project. Use its own copy and claims. No generic SaaS language ("streamline your workflow" is banned).
- **The hook is everything.** The first 2 seconds decide whether anyone keeps watching. Plan the hook before anything else.
- **Make it alive.** Things that appear one by one, simulated clicks, swipes, and typing beat static slides.
- **Funny earns its place.** Humor comes from the product's own absurdity, not from trying to be funny.
- **Every frame postable.** Any frozen frame should be worth sharing.

## Hard-won lessons

- **Never invent product UI labels.** Mirror the real copy exactly. This is the single biggest source of launch video cringe.
- **Find the one moment only your product can deliver — give it the most screen time.** Every launch video has a differentiating beat. The rest of the video should set it up. Don't spread the runtime evenly across features.
- **Before/after stagger beats simultaneous.** Land the "before" first for 0.7-1s, then crash in the "after" with a spring overshoot and a color flash. Much more dramatic than both appearing together.
- **Counter animations**: match per-frame digit rate to whatever feels natural. A bigger target number shouldn't fit in the same animation window — stretch it.
- **Endcard: one headline + CTA.** Don't stack 3 lines of copy. Use the landing page's actual tagline — not something you invented to sound punchier.
- **Ground your "problem state" in something viewers recognize without explanation.** If they need a sentence to understand what's wrong, the hook is too abstract.

## Render commands

**Always pass an explicit, unusual `--port`** (pick one per project, e.g. `--port=3917`). Without it, Remotion's port search starts at :3000. In testing, a Studio from another project already running there took over a render and produced the wrong output. Use a different port for `studio` than for `still`/`render` so a running preview never collides with a render.

**Final renders use `--image-format=png --color-space=bt709`.** The default JPEG frames add artifacts on gradients and flat brand colour. Without the BT.709 flag the file is tagged `bt470bg` and colours shift on phones.

```bash
# Preview in browser (hot-reload studio)
npx remotion studio --port=3916

# Single frame (fastest way to audit)
npx remotion still <comp-id> out/frame.png --frame=60 --port=3917

# Poster
npx remotion still <comp-id> out/poster.jpg --frame=<POSTER_FRAME> --image-format=jpeg --port=3917

# Full video
npx remotion render <comp-id> out/video.mp4 --codec=h264 --crf=18 --image-format=png --color-space=bt709 --port=3917

# Music-free copy (props-nobgm.json contains {"bgm": false}; on Windows a file beats inline JSON)
npx remotion render <comp-id> out/video-nobgm.mp4 --props=props-nobgm.json --codec=h264 --crf=18 --image-format=png --color-space=bt709 --port=3917

# GIF (15fps, half size)
npx remotion render <comp-id> out/video.gif --codec=gif --every-nth-frame=2 --scale=0.5 --port=3917

# Verify: size, codec, fps and colour tags (expect h264, 30/1, bt709 ×3)
npx remotion ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,color_space,color_primaries,color_transfer -of compact out/video.mp4

# Verify: loudness and true peak (the bundled ffmpeg has loudnorm, not volumedetect or hstack)
npx remotion ffmpeg -hide_banner -i out/video.mp4 -af loudnorm=print_format=summary -f null - 2>&1 | grep -E "Input (Integrated|True Peak)"
```

---

*Tone presets, creative laws, and website input adapted from [latent-spaces/brag](https://github.com/latent-spaces/brag) (MIT). Remotion workflow, review loop, and platform matrix from [EveryInc/product-launch-video](https://github.com/EveryInc/product-launch-video). Shot catalogue and mixing rules adapted from [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) (Apache-2.0); motion timing values from [iart-ai/motion-design-skills](https://github.com/iart-ai/motion-design-skills) (MIT); audio licence ledger after HyperFrames' `/media-use` rule. This skill is a local fork and is deliberately not tracked in `~/.agents/.skill-lock.json` — running `npx skills add`/`update` for it would overwrite these edits.*
