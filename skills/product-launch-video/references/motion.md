# Motion timing

Exact values for easing, springs and durations, written for Remotion. Use them when a move "feels off" instead of nudging numbers by eye.

## Which curve for which move

| Move | Family | Remotion |
|---|---|---|
| Enter, appear, settle | ease-out | `Easing.bezier(0.33, 1, 0.68, 1)` (cubic, safe default) |
| Hero or "premium" arrival | ease-out expo | `Easing.bezier(0.16, 1, 0.3, 1)` |
| Snappy, decisive arrival | ease-out quint | `Easing.bezier(0.22, 1, 0.36, 1)` |
| Exit, vanish | ease-in | `Easing.bezier(0.32, 0, 0.67, 0)` (cubic), `(0.7, 0, 0.84, 0)` (expo, fast vanish) |
| Reposition while on screen | ease-in-out | `Easing.bezier(0.65, 0, 0.35, 1)` (cubic), `(0.76, 0, 0.24, 1)` (punchy) |
| Playful or branded landing | back / overshoot | `Easing.bezier(0.34, 1.56, 0.64, 1)` or `Easing.back(1.4)` |
| Anticipation before launch | ease-in back | `Easing.bezier(0.36, 0, 0.66, -0.56)` |
| Product UI (Material standard) | standard | `Easing.bezier(0.2, 0, 0, 1)` |
| Mechanical: scanlines, progress, spinners | linear | no easing. Easing makes machines look hand-dragged. |

A y value above 1 or below 0 is what creates overshoot or anticipation. The further it goes, the bigger the bounce.

```tsx
const x = interpolate(frame, [start, start + 15], [-120, 0], {
  easing: Easing.bezier(0.16, 1, 0.3, 1),
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

## Springs

`spring({frame, fps, config: {stiffness, damping, mass}})` uses the same physics units as Framer Motion. Higher stiffness is faster, higher damping bounces less, higher mass feels heavier. Remotion's default (`stiffness 100, damping 10`) is quite bouncy for UI.

| Feel | config | Use |
|---|---|---|
| Snappy, no visible bounce | `{stiffness: 300, damping: 30}` | UI cards, panels, most entrances |
| Bouncy | `{stiffness: 400, damping: 17}` | `default` / `chaotic` tone, stickers, chips |
| Gentle, heavy | `{stiffness: 120, damping: 20}` | large hero elements, `polished` tone |
| Critically damped | `{stiffness: 500, damping: 50}` | precise moves that must land without overshoot |
| No overshoot, any speed | `{damping: 200}` | text, which should never wobble |

Pass `durationInFrames` to fit a spring into a fixed slot, and `delay` to stagger.

## Durations (at 30fps)

| Element | Frames | Curve |
|---|---|---|
| Button press feedback | 3 down / 6 up | ease-out, back on release |
| Toggle, chip, small state change | 5-6 | ease-out cubic |
| Dropdown, tooltip | 5-8 | ease-out cubic |
| Modal / panel enter | 9-12 | ease-out expo or gentle spring |
| Modal / panel exit | 6-8 | ease-in quart |
| Card / list item reveal | 12-15 each | ease-out expo |
| Hero headline, full-screen element | 15-24 | ease-out expo |
| Camera push or pan | 24-60 | ease-in-out quad |
| Number count-up | 18-36 | ease-out expo |

Video runs slower than UI. These are UI-speed baselines, so for anything the viewer must *notice*, start at the top of the range. First drafts are almost always too fast.

**Distance scaling.** Longer travel gets more time, but on a square root so long moves don't drag:
`frames ≈ baseFrames × √(distance / baseDistance)`. If 200px takes 9f, then 800px takes ~18f.

**Stagger math.** `total = (count − 1) × offset + perItem`. Keep group reveals under ~24f total. With many items, shrink the offset, or stagger by distance from a focal point so the feel stays constant whatever the count.

**Secondary action follows the main action.** A highlight, glow or label lands 2-4f *after* its element settles, never on the same frame. Moves on the same frame compete for attention.

---

*Curve, spring and duration values adapted from [iart-ai/motion-design-skills](https://github.com/iart-ai/motion-design-skills) `skills/animation-principles/references/easing-curves.md` (MIT), converted to Remotion APIs and 30fps frames.*
