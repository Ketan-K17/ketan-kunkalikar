# Ketan Kunkalikar's portfolio: guide for Claude

The portfolio site, in two layers:

1. **The cover**: the original portfolio (React + Tailwind + shadcn/ui pages in `src/pages`). It looks exactly as it always did, except for a paper **pull-tab** hanging from the top edge.
2. **The Mac**: pulling the tab (or clicking it) rips the page down the middle, the two halves fall away, and an Aqua-era **Mac OS X desktop** boots underneath. That desktop is the new portfolio: folders for About Me, Projects and Current Endeavours, the resume in Preview, GitHub/LinkedIn in the Dock, and Mail to send a message.

The Mac (`src/laptop`) was ported from the owner's life-visualiser game (github.com/Ketan-K17/life-visualiser), where it is the screen of a laptop in their room. It is framework-free TypeScript and DOM. Changes worth having in both places should be made in both repos.

## Commands

```sh
npm install
npm run dev        # http://localhost:8080
npm run build      # static build into dist/ (MUST pass before you say you're done)
npx tsc --noEmit -p tsconfig.app.json   # typecheck (vite build does not typecheck)
npm run laptop:sounds   # macOS only: copy a few system sounds into public/laptop/sounds
```

There are no unit tests. Verification is the typecheck, `npm run build`, and checking the site in a browser.

## Layout

```
src/
  App.tsx                  routes, all wrapped in <TearOff>
  pages/                   the old portfolio (Index, LLMProject, PythonProject, NotFound)
  components/
    TearOff.tsx            the cover: pull-tab, the rip, the falling halves, opening the Mac
    tear-off.css           its styles (plain CSS, not Tailwind)
    ContactModal.tsx       old site's Web3Forms contact form
    ui/                    shadcn/ui
  laptop/                  the Mac (see "The Mac" below); lazy-loaded as its own chunk
public/
  images/                  old site's images (also shown on the Mac via `src: 'images/...'`)
  laptop/                  wallpapers, resume.pdf, optional sounds, assets.json (see public/laptop/README.md)
scripts/laptop-sounds.mjs
```

## The tear-off cover (`src/components/TearOff.tsx`)

- `<TearOff>` wraps every route. Phases: `cover` (old site + tab) → `tearing` → `gone` (old site `display: none`, page scroll locked by `html.tear-locked`). Shut Down on the Mac calls the `onClose` passed to `macScreen().open()`, which puts the cover back and restores the scroll position.
- The halves are **static clones** of the page at the moment of tearing (`cloneNode`), clipped with `clip-path` polygons along a random jagged line that starts under the tab. The rim layer behind each clone (`.tear-rim`, cream) is clipped a few px wider so the torn edge shows white paper fibre. The real React tree is never moved or re-rendered.
- Sticky elements (the nav) are measured before cloning and pinned in the clones with `position: relative; top`, because a clone outside the scroller would otherwise show them at the top of the document.
- The rip runs in irregular spurts (`ripPlan()`: a snap at the perforation, a catch, then a few bursts) with the page shuddering and paper flecks flying off the edge. Then each half tips over its outer bottom corner under gravity, lets go at `RELEASE_RAD` and tumbles away, swinging in 3D; it is all one rAF loop, no CSS transitions. Sounds (snap, crackling rip per spurt, flutter-whoosh of the fall) are synthesized in `tear-sound.ts`, kept out of the Mac's chunk; it honours the Mac's mute setting and is primed on the tab's pointerdown/keydown.
- The Mac opens with no start-up screens or chime: its wallpaper shows through the rip and the desktop assembles once both halves have let go (`macScreen().open(onClose, ready)`). Restart inside the Mac still plays the full boot.
- Pulling the tab past `COMMIT_PX` or a plain click/tap/Enter commits; there is no un-tearing. The Mac module is prefetched ~1 s after load (`loadMac()`), so the rip never waits on the network. `prefers-reduced-motion` gets a fade instead of the rip and fall.
- z-order: Mac `.mac-root` 1000, falling halves 5000, the tab 5100. The old site's own Radix portals (toasts, Contact dialog) are only usable while the cover is up.
- On phones (≤640px) the tab hangs right of centre so it doesn't cover the name in the nav.
- Testing the rip under automation: the rip and fall are driven by `requestAnimationFrame` and the halves remove themselves after it. To inspect a frozen frame, stub `requestAnimationFrame` (or `Element.prototype.remove` for `.tear-piece`) before clicking the tab.

## The Mac (`src/laptop`)

Portfolio content lives in **`src/laptop/desktop.ts`**: `DESKTOP` (folders, files, Dock apps), `USER`, `MUSIC` (the Spotify playlists). Most content changes are edits there only.

- Text files (`text: [...]`, one paragraph per entry) open in TextEdit. Visitors can edit and ⌘S them; that is kept in *their* localStorage only.
- `icon: 'image'` with `src: 'images/x.png'` shows the real picture in Preview (without `src`, a drawn placeholder). `icon: 'pdf'` with `src` shows the PDF. `icon: 'link'` with `url` is an Internet Location: opening it opens the page in a new tab. `project()` in `desktop.ts` makes a project folder (README + Repository link).
- **Mail** (`apps/Mail.ts`, a built-in app in the Dock) is a New Message window addressed to the owner. It sends with Web3Forms (a plain `fetch`) using the same `VITE_WEB3FORMS_ACCESS_KEY` env var as the old `ContactModal` (set in Vercel; locally in a git-ignored `.env`). Without them, sending shows an error in the window.
- Keep the old site and the Mac telling the same story: when projects, jobs or links change in `src/pages/Index.tsx`, update `desktop.ts` too.

The look is **Aqua-era Mac OS X with a glass finish**, modelled on ryOS (os.ryo.lu) but written from scratch: no ryOS code or assets are copied, because ryOS is AGPL-3.0. Keep it that way.

- `desktop.ts`: the data (`DESKTOP`: nested `folder` / `file` / `app` nodes). Folders and files show on the desktop (under Macintosh HD) and in Finder; apps show in the Dock and Finder > Applications.
- `desktop.ts` also has `USER` (name, short name, computer name: menu bar, Terminal prompt, login window). `fs.ts` is the "file system": lookups (`pathOf`, `nodeAt`, `trailTo`), `SYSTEM_APPS` (the laptop's own apps, `url: 'builtin:<id>'`, opened as windows by `MacScreen.openApp`), the Trash (in memory, so nothing in `DESKTOP` is lost for good), and what is saved in localStorage: TextEdit edits (`laptop-docs`), Recent Items, dragged desktop icon spots, the Dashboard sticky note.
- More pieces: `Boot.ts` (start-up progress panel, shut-down screen, login window after Log Out), `MenuExtras.ts` (user / AirPort / battery menus, using the real battery and network state), `Expose.ts` (F9 / F10 / F11), `Dashboard.ts` (F12: clock, calendar, sticky note), `ScreenSaver.ts` (Flurry; after `prefs.saverAfter` idle minutes), `HelpTags.ts` (yellow tooltips for any `data-tip`), `Panels.ts` (Get Info, System Profiler), `apps/` (TextEdit with save sheet, Calculator, Terminal with a small pretend shell).
- **Style:** System Preferences > Appearance > Style is `glass` (default, the look above) or `aqua` (Jaguar/Tiger: pinstripes, opaque menu bar, brushed metal on `metal: true` windows, real traffic-light colours, Dock triangles; always light). Aqua rules live at the end of `mac.css` under `.mac-root[data-style="aqua"]`.
- Menus: `MenuItem.shortcut` (`⇧⌘N`, `F9`) is live: `MenuBar.trigger()` runs it, with Ctrl accepted for ⌘ because the browser keeps some ⌘ keys. `submenu` for side menus; `MenuBar.popup(x, y, items)` for right-click / Dock menus. Arrow keys work in open menus.
- Windows: `proxy: true` shows the icon before the title, `metal: true`, `onToolbarToggle` (the pill), `onCloseRequest` (ask before closing), `wm.sheet(win, el)`, `wm.setDirty`, `wm.hideApp/showApp/quit(app)`. Shift-click minimise is the slow genie; minimised windows show a live thumbnail in the Dock.
- `MacScreen.ts` (boot / sleep / restart / shut down, desktop with rubber-band selection, menus, alerts, volume popover), `MenuBar.ts` (menus that blink when chosen, clock, status icons), `Dock.ts` (transform-based magnification, bounce), `Windows.ts` (title bars with gel traffic lights, drag, resize, genie minimise, zoom, open-from-icon animation; elements with `data-drag` drag the window), `Finder.ts` (toolbar, search, sidebar, icon/list views, history), `Spotlight.ts`, `PrefsView.ts` (System Preferences: Appearance / Desktop / Sound), `icons.ts` (inline SVG, Aqua style), `mac.css` (all styling, scoped under `.mac-root`).
- **Theme:** `prefs.ts` (light/dark/system, accent, wallpaper, volume; localStorage) and `appearance.ts` (paints the built-in wallpapers on a canvas and samples the accent colour and menu-bar text colour from the wallpaper). Every tint in `mac.css` derives from `--accent` (via `color-mix`), and dark mode is `.mac-root[data-scheme="dark"]`. Use the `--gel`, `--btn`, `--win-bg`, `--text`... tokens rather than raw colours.
- **Sounds:** `sound.ts`: `play('window-open')`, `loop('window-move')`. Each event plays the owner's file if `public/laptop/assets.json` lists one, otherwise a WebAudio stand-in (loops are file-only). The event list and the import script are in `public/laptop/README.md` (`npm run laptop:sounds`). Wallpaper photos also go in that manifest. These, plus the official GitHub and LinkedIn logos and Apple's classic Mail stamp in `public/laptop/logos` (the Dock icons; never redraw them), are the only media files in the repo; everything else is still drawn in code. macOS file systems are case-insensitive, so never add a file whose name differs only in case from an existing one (`Prefs.ts` would overwrite `prefs.ts`; that's why the window is `PrefsView.ts`).
- **Music widget** (`MusicPlayer.ts`, built once by `MacScreen` and always on the desktop behind windows, starting top left; drag its body to move it, and the spot is kept in localStorage; the playlists are `MUSIC.playlists` in `desktop.ts`, the first is the default): a vintage lavender click-wheel player in front of Spotify's embed, no backend. Wheel: MENU opens a list (Now Playing / Playlists / Spotify Player / Open in Spotify; Playlists is a second page that switches the embed with `loadUri`, and MENU backs out of it), ⏮ seeks to 0, ⏭ seeks to the track's end (the API can't skip), ▶❙❙ and the centre play/pause (centre selects in the menu), dragging around the ring scrubs (or moves the menu cursor). It uses Spotify's iFrame API (`play`/`pause`/`seek`/events only: no track list, and `playingURI` is the playlist, not the song, so the screen shows the playlist's oEmbed title and cover, spun like a record while playing). The embed hides behind the widget's face at full size (so Spotify treats it as visible) and slides out below it if play gets no response, or from the menu. Spotify loads when the Mac first opens (`wake()`); Shut Down / Restart pause it. Full songs need the browser logged in to Spotify; otherwise 30-second previews.
- Behaviour: click selects, double-click / double-tap or Enter opens; text files open in TextEdit, `image`/`pdf` files with a `src` in Preview, `link` files (Internet Locations) open their `url` in a new tab. An `app` with an `https://` url opens in a new tab; any other scheme goes to `window.location.href` (must happen inside the click). Esc closes alerts/popovers/menus only: there is no lid, the Mac *is* the page. Apple > Sleep blacks the screen until the next click or key; Restart reboots; Shut Down closes it and the tear-off cover comes back. Below 600px wide windows open zoomed and the dock does not magnify.
- To add something: a file/folder/app goes in `DESKTOP` (apps may use `color` + `glyph`, or add art to `APP_ART` in `icons.ts`); a new menu item goes in `MacScreen.menus()`; a new window type calls `wm.open({...})` (`unified: true` for toolbar windows, `fixed: true` for panels, `origin` to grow out of an icon); new sounds get a `SoundName`, a synth stand-in in `SYNTH`, a label in `PrefsView` and a row in the README; a built-in app gets an entry in `SYSTEM_APPS`, an icon in `ICON` (wired in `APP_ART`) and a case in `openApp`. Help > Keyboard Shortcuts lists every shortcut (`SHORTCUTS` in `MacScreen.ts`); keep it in sync. Launchpad is deliberately not built: it is from 2011, not the Aqua era.
- Testing: Animations (genie, open/close) and `setTimeout`s stall while the tab is hidden, so under automated testing freeze them with `el.getAnimations()` + `currentTime` and take screenshots to let time pass.
- Gotcha: the laptop is plain TypeScript + DOM, not React. Keep it that way (no React components inside `src/laptop`), so it stays portable back to the life-visualiser game it came from. Tailwind's preflight is global, but `mac.css` sets everything it needs under `.mac-root`; check new laptop UI visually for inherited Tailwind resets (`img { display: block }`, zeroed button padding).

## Deployment

- Live site: https://ketank17.vercel.app/ (Vercel, auto-deploys `main`). Source: https://github.com/Ketan-K17/ketan-kunkalikar.
- Pushing to `main` deploys to production immediately: run the typecheck and `npm run build` first, and push only when the owner asks.
- `VITE_WEB3FORMS_ACCESS_KEY` must exist in the Vercel project for Mail (and the old Contact form) to send.

## Working with the owner

- Keep changes scoped to what was asked. The old portfolio pages stay as they are unless the owner asks; the Mac is where new work goes.
- Match the existing style: React/Tailwind in `src/pages` and `src/components`, framework-free TS + `mac.css` in `src/laptop`, small comments only where they explain *why*.
