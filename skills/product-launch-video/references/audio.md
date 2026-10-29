# Audio: licensing and mixing

Most social views are muted, so captions carry the story and audio is a bonus. But a launch video gets posted publicly and often commercially. One unlicensed track can get it muted or taken down, so licensing comes first.

## Licensing

**Allowed sources**

| Source | Licence | Obligation |
|---|---|---|
| Anything marked CC0 / public domain | CC0 | None. Still log it. |
| [incompetech](https://incompetech.com/) (Kevin MacLeod) and other CC-BY | CC-BY 4.0 | Credit in the post or description, using the exact attribution text. |
| [Mixkit](https://mixkit.co/) | Mixkit License | Free commercial use, no credit needed. Log the exact item URL. |
| Your own recordings, or audio generated in code | yours | None. |

**Not allowed:** anything without a licence you can open and read, "royalty free" with no terms page, music ripped from other videos, platform-library tracks reused off-platform, and bundled audio whose provenance is unknown. That includes the music and SFX that ship with brag and with video-shotcraft. shotcraft's own attribution file admits several of its SFX can't be traced back to a source.

**Record provenance at download time.** Bulk downloads strip metadata, and a file you can't trace later can't be cleared later. For every file that goes into `public/audio/`, add a row to `CREDITS.md` in the Remotion project root before using it:

```markdown
| File | Source URL | Licence | Attribution text | Added |
|---|---|---|---|---|
| public/audio/bgm-pulse.mp3 | https://mixkit.co/free-stock-music/... | Mixkit License | — | 2026-10-22 |
| public/audio/whoosh.mp3 | https://freesound.org/s/... | CC0 | — | 2026-10-22 |
```

Before render, every audio file the composition references must appear in `CREDITS.md`. Copy it to `out/CREDITS.md` with the deliverables, and put any CC-BY attribution lines into `share-copy.txt`.

**Choosing music.** Pick a steady, drum-driven electronic bed (tech-house territory) over anything melodic. A busy melody fights the SFX. Eyes closed, it should sound like a product keynote trailer, not a mobile game. Audition every candidate *against the cut*. A track heard alone tells you nothing.

## Mixing

**Lock picture before sound.** Any change to a shot's length or order shifts every SFX after it. Do sound last, and re-check every SFX frame after any timing change.

**Music bed**
- One track under the whole video. Volume envelope: `interpolate(frame, [0, 30, total - 50, total], [0, 0.34, 0.34, 0])` (1s fade in, ~1.7s fade out).
- 0.34 leaves headroom for SFX. Match the music's energy curve to the storyboard: low open, build through the middle, peak at the outro.
- Wrap the music `<Audio>` in a boolean prop (`bgm`, default `true`) and render a second, music-free copy. Platforms that replace or strip audio get a clean version. On Windows, pass props as a file, not inline JSON. The shell strips the quotes:
  ```bash
  # props-nobgm.json contains: {"bgm": false}  (write it with the file tool, not shell echo)
  npx remotion render <comp-id> out/video-nobgm.mp4 --props=props-nobgm.json ...
  ```

**SFX as a declared table, anchored to shots**

```tsx
// sfx.ts: one entry per on-screen action, each with a comment saying which action
export const SFX = [
  {from: SHOTS.hero.from + 56, src: 'audio/whoosh.mp3', volume: 0.5}, // hero card lifts
  {from: SHOTS.filter.from + 46, src: 'audio/click.mp3', volume: 0.6}, // confirm click: loudest
];
// render: SFX.map((s) => <Sequence key={s.from} from={s.from}><Audio src={staticFile(s.src)} volume={s.volume} /></Sequence>)
```

- Write every `from` as `SHOTS.<shot>.from + offset`, never as a bare absolute frame. Then retiming one shot only moves its own SFX.
- No SFX without an on-screen action.
- Use volume to show weight: SFX range 0.2-0.6, and the confirm click is the loudest at 0.6.

**`volume` is a multiplier, not a target.** A sample recorded at −24 dB peak is still −24 dB at `volume={1}`, buried under a bed at 0.34. Swap it for a better-recorded file first. Otherwise normalize it (`npx remotion ffmpeg -i in.mp3 -af loudnorm=I=-16:TP=-1.5 out.mp3`), or use `volume` > 1. Remotion amplifies above 1 in the render, but **Studio preview clamps to 1**, so judge levels from the rendered file, never the preview.

Measure a file's peak with the ffmpeg bundled in Remotion (it has `loudnorm`, not `volumedetect`):

```bash
npx remotion ffmpeg -hide_banner -i <file> -af loudnorm=print_format=summary -f null - 2>&1 | grep -E "Input (Integrated|True Peak)"
```

The final MP4 should land around −14 to −16 LUFS integrated, with true peak below −1 dBTP. A true peak near 0 dBTP means clipping: pull the gain back.

**Avoiding machine-gun repeats** (5 pops for 5 cards):
1. Alternate between two similar samples.
2. Step the volume down along the run (0.40 → 0.37 → 0.34 → 0.31 → 0.28 → 0.25).
3. Shrink the spacing as the motion speeds up. Once hits blur together (under ~3f apart), stop scoring each one and use a single swoosh instead.

**Reusable phrases**
- **Big landing:** riser at the start of the build → impact ~35f later on the hero landing (the loudest moment in the video) → sparkle ~25f after.
- **Scene change:** one soft transition swoosh.
- **Title card in:** one consistent quick swoosh used every time.
- **Speed cuts:** one hit per cut, total silence on any black beat.

**Sync offsets.** Sound that's 2-3 frames late reads as out of sync. Two sources add up:
1. **Sample attack.** Many files peak well after their start (a slow attack or a breath before the hit), 2-24f in measured cases. Shift `from` earlier by the sample's own peak offset.
2. **Encoder priming.** AAC adds silent priming samples at the head (~1-1.3f at 30fps, depending on the encoder), which can delay the whole audio track in the output ([remotion-dev/remotion#7099](https://github.com/remotion-dev/remotion/issues/7099)). Measure it once per pipeline (Remotion version + codec + sample rate + container) by rendering a test with one sharp click at a known frame and checking where it lands. Re-measure if any of the four changes.

`Sequence.from = target peak frame − sample peak offset − output track offset`

---

*Mixing rules adapted from [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) `references/sound-design.md` (Apache-2.0, commit 43bd349), translated and condensed. The licence policy and `CREDITS.md` ledger follow HyperFrames' `/media-use` rule.*
