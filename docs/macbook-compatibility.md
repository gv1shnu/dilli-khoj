# MacBook compatibility report

Tested 5 September 2026 on Apple silicon with the `open-world` development build.
The machine used for automation was an M5 Max MacBook Pro with 48 GB RAM and macOS
26.6.2, so the Air profiles deliberately add conservative CPU throttling.

## Result

The build passes the automated matrix on every profile. **Read the FPS column carefully:
each profile emulates only the target's CSS viewport and device scale factor (2), plus a
CPU slowdown on the Air profiles — it runs on the host's M5 Max GPU, and the frame rate is
capped by the host display's refresh (≈60 Hz via `requestAnimationFrame`).** So "60 FPS"
here means "rendered without dropping below the host's vsync under emulated resolution and
CPU throttling", not "an actual MacBook Air GPU sustains 60 FPS". The Air's integrated GPU
and thermal envelope are not emulated and remain an on-device check (see Scope below).

| Profile                            | Engine      | CSS viewport | CPU slowdown |    Ready | FPS (host GPU) | Result |
| ---------------------------------- | ----------- | -----------: | -----------: | -------: | -------------: | ------ |
| Older 13-inch MacBook Air baseline | Chrome      |     1280×800 |           4× | 1,418 ms |             60 | Pass   |
| 13.6-inch MacBook Air              | Chrome      |     1470×956 |           4× | 1,418 ms |             60 | Pass   |
| 14-inch MacBook Pro                | Chrome      |     1512×982 |           1× |   845 ms |             60 | Pass   |
| 16-inch MacBook Pro                | Chrome      |    1728×1117 |           1× |   841 ms |             60 | Pass   |
| 13-inch MacBook Air                | WebKit 26.0 |     1280×800 |           1× |   980 ms |             60 | Pass   |
| 14-inch MacBook Pro                | WebKit 26.0 |     1512×982 |           1× |   959 ms |             60 | Pass   |

Every profile uses device scale factor 2, so the matrix does exercise real Retina drawing
buffers (2560×1600 through 3456×2234) — that part is genuine device behaviour. What it does
**not** prove is sustained frame rate on the Air's own GPU. Exact machine-readable results
are in [macbook-compatibility-results.json](macbook-compatibility-results.json).

## Checks performed

- WebGL scene startup, active frame rate and correct Retina drawing-buffer size.
- Header, mission panel and location overlay visibility without page overflow or
  viewport clipping.
- World-map layout, keyboard focus capture, Escape dismissal and focus restoration.
- Fullscreen API entry and explicit exit.
- System reduced-motion handling.
- Keyboard movement with default run and **Shift** walk inputs without page scrolling.
- Web Audio startup plus mute/unmute keyboard input. Audible mix quality is a manual
  listening check.
- Archive terminal layout and editor input on the smallest Chrome and WebKit profiles.
- A separate WebKit smoke pass exercised all 20 archives, local PGlite queries,
  progression, revisits, map travel and result limits.

The matrix exposed one Safari/WebKit-specific defect: pointer-clicking the map opener
did not make it the active element, so focus could not return there after Escape. The
opener now receives explicit focus before the map mounts, and the WebKit regression
passes.

## Scope and remaining physical check

Playwright WebKit is an automated Safari-engine proxy, not the installed Safari app.
The host GPU also cannot emulate the integrated GPU and thermal behavior of the oldest
student MacBook Air. This evidence supports compatibility with current Chrome and the
WebKit engine at common Air/Pro display sizes; final classroom sign-off still requires
one long fullscreen session on the oldest actual student model, installed Safari, and
the campus network. Audio ambience also needs a human listening pass through laptop
speakers.

Run the matrix beside the development server with:

```bash
pnpm test:browser:macbook
```

Run the full WebKit gameplay smoke with:

```bash
pnpm test:browser:webkit
```
