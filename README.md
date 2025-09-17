Tile 2.0 — Tiled Screen Controller

Overview

- A lightweight, client-only app to arrange on-screen tiles using layouts (blueprints), with panels, fixed
  frames, and constraint gates.
- Supports Steam Controller and standard gamepads via the browser Gamepad API, plus keyboard fallback.

Quick Start

- Open `web/index.html` in a modern desktop browser (Chrome/Edge/Firefox).
- Optional: press `F` to toggle fullscreen.

Controls

- Keyboard:

  - Arrow keys: Move focus between tiles
  - Enter: Toggle maximize focused tile
  - Shift + Arrows: Resize focused tile (within gates)
  - [ / ]: Switch layouts
  - R: Reset layout to blueprint default
  - S: Save current layout to localStorage; L: Load saved
  - F: Toggle fullscreen

- Gamepad (XInput mapping; Steam Controller via Steam Input → XInput):
  - D-Pad or Left Stick (tilt): Move focus
  - A: Toggle maximize
  - LB/RB: Switch layouts
  - LT/RT + Left Stick: Resize (hold trigger, then tilt)
  - Start: Save; Back: Load

Concepts

- Tiles: Rectangular panels arranged on a CSS Grid.
- Layouts: Named blueprints defining rows, columns, tiles, and fixed frames.
- Panels: Content placeholders (labels/colors by default; swap for iframes/images).
- Fixed Frames: Reserved grid cells that tiles cannot occupy.
- Gates: Constraints on movement/resizing (min/max spans, zones, collision rules).

Files

- `web/index.html` — App shell and HUD overlay
- `web/styles.css` — Grid, tile, and HUD styles
- `web/app.js` — Blueprint rendering, navigation, gates, gamepad handling

Notes

- All logic runs locally without build steps or installs.
- Steam Controller must be configured in Steam to expose XInput to the OS/browser.
- Blueprints are embedded for file:// usage; you can later hook to files or a service.

macOS OS‑Level Tiling (Electron + Swift)

- Overview: An Electron overlay provides the HUD and controller input. A tiny Swift CLI (`windowctl`)
  moves/resizes the frontmost macOS window via the Accessibility API.
- Build native tool:
  - `cd native/macos`
  - `mkdir -p build && swiftc windowctl.swift -o build/windowctl`
  - On first run it will prompt for Accessibility permission (System Settings → Privacy & Security →
    Accessibility). Enable the built binary.
- Run the overlay:
  - `cd electron`
  - `npm install`
  - `npm start`
- Use:
  - Choose a layout (2x2, 2x3, 3x3, 2x4). Move/resize the selection with D‑Pad/Left Stick and triggers (or
    keyboard). Press A/Enter to apply the selection rect to the frontmost window.
  - The overlay briefly hides while applying so the previously frontmost app regains focus; then it reappears.
- Notes:
  - Coordinates use the primary display’s work area. Multi‑display and per‑display targeting can be added
    next.
  - If apply fails, check Accessibility permissions for the built `windowctl` binary.
