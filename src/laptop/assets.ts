/**
 * Optional files the owner adds under `public/laptop/` (see `public/laptop/README.md`), listed in
 * `public/laptop/assets.json`. Paths are relative to `public/laptop/`. Without the file everything still works:
 * wallpapers are painted in code and sounds are synthesized.
 */
export interface LaptopAssets {
  /** `thumb` is an optional small copy for System Preferences > Desktop, so it doesn't load every full-size photo. */
  wallpapers: { name: string; file: string; thumb?: string }[];
  sounds: Record<string, string>;
}

let cache: Promise<LaptopAssets> | null = null;

export function assets(): Promise<LaptopAssets> {
  cache ??= fetch(import.meta.env.BASE_URL + 'laptop/assets.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((j: Partial<LaptopAssets>) => ({ wallpapers: Array.isArray(j.wallpapers) ? j.wallpapers : [], sounds: j.sounds ?? {} }));
  return cache;
}
