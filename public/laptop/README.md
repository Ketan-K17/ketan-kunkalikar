# Laptop sounds and wallpapers

Optional files for the laptop screen (`src/laptop/`). Everything works without them. Missing sounds are
synthesized, and the built-in wallpapers are painted in code. Anything you add here is listed in `assets.json`.
Paths are relative to this folder.

```json
{
  "wallpapers": [{ "name": "Leopard", "file": "wallpapers/leopard.jpg" }],
  "sounds": { "boot": "sounds/boot.m4a", "alert": "sounds/alert.m4a" }
}
```

- **Formats:** `.m4a` (AAC), `.mp3` or `.wav`. Not `.aiff`, because Chrome can't play it. Convert on a Mac with
  `afconvert -f m4af -d aac in.aiff out.m4a`.
- **Quick start:** `npm run laptop:sounds` copies five of macOS's own sounds here: alert (Sosumi), click (Tink),
  menu-click (Pop), trash and volume. It then updates `assets.json`.
- **Wallpapers:** JPG/PNG/WebP, ideally 16:10 and about 1920 px wide. They show up in System Preferences > Desktop,
  and the accent colour is sampled from the picture. Add an optional `"thumb"` (about 320×200) so the Desktop pane
  stays light. The photos in `wallpapers/` are 2880×1800 crops from Unsplash (free to use under the Unsplash License).
- **Check:** System Preferences > Sound lists every event and says whether it's playing "Your file" or "Built-in".

Anything in `public/` is deployed with the site. Only add files you're allowed to publish (Apple's own sounds and
wallpapers are Apple's), or git-ignore this folder's media to keep them local.

| key | when it plays |
|---|---|
| `boot` | startup, when the laptop opens after Shut Down (and on first open) |
| `window-open` / `window-close` | a window opens / closes |
| `window-collapse` / `window-expand` | minimise into the Dock / restore from it |
| `window-zoom-max` / `window-zoom-min` | the green zoom button |
| `window-move` | **loop** while dragging a window (file only, no built-in) |
| `window-move-stop` | the window is let go |
| `window-resize` | **loop** while resizing (file only) |
| `menu-open` / `menu-close` | a menu-bar menu opens / closes |
| `menu-hover` | the pointer moves over a menu item (played quietly) |
| `menu-click` | a menu item is chosen |
| `button-down` / `button-up` | Aqua buttons, traffic lights, Dock icons |
| `click` | tabs, swatches, checkboxes |
| `alert` | alerts (Shut Down…), Software Update |
| `volume` | after changing the volume |
| `trash` | Finder > Empty Trash |
| `expose` | Exposé (F9 / F10 / F11) slides windows around |
| `dashboard` | Dashboard (F12) opens / closes |
| `mail-sent` | Mail: a message was sent |
