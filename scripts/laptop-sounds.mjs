// Copies a few of macOS's own system sounds into public/laptop/sounds/ (as .m4a, which every browser plays;
// Chrome can't play .aiff) and lists them in public/laptop/assets.json. macOS only: it needs `afconvert`.
// Run with `npm run laptop:sounds`. Sounds with no file here stay synthesized; see public/laptop/README.md.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SYS = '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds';
const PICKS = {
  alert: '/System/Library/Sounds/Sosumi.aiff',
  click: '/System/Library/Sounds/Tink.aiff',
  'menu-click': '/System/Library/Sounds/Pop.aiff',
  trash: `${SYS}/finder/empty trash.aif`,
  volume: '/System/Library/LoginPlugins/BezelServices.loginPlugin/Contents/Resources/volume.aiff',
};

const out = 'public/laptop/sounds';
mkdirSync(out, { recursive: true });
const manifestPath = 'public/laptop/assets.json';
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { wallpapers: [], sounds: {} };
manifest.sounds ??= {};

for (const [name, src] of Object.entries(PICKS)) {
  if (!existsSync(src)) {
    console.log(`skip  ${name}: ${src} not found on this Mac`);
    continue;
  }
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', src, `${out}/${name}.m4a`]);
  manifest.sounds[name] = `sounds/${name}.m4a`;
  console.log(`ok    ${name} <- ${src}`);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nWrote ${manifestPath}. Reload the game and open System Preferences > Sound to hear them.`);
