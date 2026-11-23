/** One thing on the laptop: a folder you can open, a file whose `text` opens in a document window, or an app that launches on the real computer. */
export type DesktopNode = DesktopFolder | DesktopFile | DesktopApp;

/**
 * An app in the Dock. An `https://` url opens in a new browser tab; any other scheme (`mailto:`, `slack://`) is handed
 * to the visitor's computer.
 */
export interface DesktopApp {
  type: 'app';
  id: string;
  name: string;
  /** Opened on click. Must be a scheme the app registers, or an https link. */
  url: string;
  /** Icon tile colour (0xRRGGBB). */
  color: number;
  /** One or two characters drawn on the tile. */
  glyph: string;
}

export interface DesktopFolder {
  type: 'folder';
  /** Unique among its siblings. */
  id: string;
  /** Shown under the icon. Keep each word to ~10 characters or it overflows the cell. */
  name: string;
  children: DesktopNode[];
}

export interface DesktopFile {
  type: 'file';
  id: string;
  name: string;
  /** Icon style. Defaults to a text page. `link` is an Internet Location (.webloc): opening it opens `url` in a new tab. */
  icon?: 'text' | 'image' | 'pdf' | 'link';
  /** Pages of text shown in the document window when it is opened. Captions for `image`; unused for `pdf` and `link`. */
  text: string[];
  /** For `pdf` and `image`: a file under `public/` (e.g. `laptop/docs/resume.pdf`), shown in a Preview window. */
  src?: string;
  /** For `link`: the web page it opens. */
  url?: string;
}

/**
 * The music widget plays these Spotify playlists through Spotify's embed, with no backend; the wheel's MENU > Playlists switches between them and
 * the first one is what it starts on. Without a Spotify login in this browser the embed only plays 30-second previews. Swap any of them for the
 * owner's own (Spotify: Share > Copy link).
 */
export const MUSIC = {
  playlists: [
    // `name` must fit the player's little screen (about 22 characters). `uri` is `spotify:playlist:<id>`, or the same with `album` / `track`.
    { name: '70s–80s Rock', uri: 'spotify:playlist:37i9dQZF1DWXRqgorJj26U' }, // Rock Classics
    { name: 'Old Bollywood', uri: 'spotify:playlist:1Cwm66B4rbVLuNqo3SjJX6' }, // Classic Old Hindi Songs
    { name: 'Classical Piano', uri: 'spotify:playlist:1dDns6RLv0HqVTFXA3XGdR' }, // Chopin - Best of (Deutsche Grammophon)
    { name: 'Classical Sitar', uri: 'spotify:playlist:5AGVXh96ufHTVDZ4qtibPO' }, // Best of Hindustani Instrumental
    { name: '2000s–2020s Pop', uri: 'spotify:playlist:0K8DNHMwJaZmERK4FeaAOJ' }, // POP Music Playlist - Best POP Hits of All Time
  ],
};

/** The account on the laptop: shown in the menu bar (fast user switching), Terminal's prompt and About This Mac. */
export const USER = {
  name: 'Ketan',
  /** Short name, for the home folder and the Terminal prompt. */
  short: 'ketan',
  computer: "Ketan's PowerBook",
};

/** The portfolio, as the desktop of the owner's laptop. Text files are editable by visitors (kept in their own browser only). */
export const DESKTOP: DesktopNode[] = [
  {
    type: 'folder',
    id: 'about',
    name: 'About Me',
    children: [
      { type: 'file', id: 'profile', name: 'me.png', icon: 'image', src: 'images/profile.png', text: ['Ketan Kunkalikar'] },
      { type: 'file', id: 'cover-letter', name: 'me.pdf', icon: 'pdf', text: [], src: 'laptop/docs/me.pdf' },
    ],
  },
  {
    type: 'folder',
    id: 'endeavours',
    name: 'What am I up to?',
    children: [
      {
        type: 'folder',
        id: 'neovim',
        name: 'Switching to Neovim',
        children: [
          {
            type: 'file',
            id: 'readme',
            name: 'README.txt',
            text: [
              'After noticing some genuine difficulty in focusing while reading code, I\'ve realised that there needs to be change.',
              'Like any sane developer, I do not blame my ADHD for this, but the slew of GUI-based code-editors that present way more text on the screen than I need to read.',
              'As such, I made the switch to Neovim. More precisely I\'m choosing a popular Neovim distro - Lazyvim, to rid myself the troubles of setting the entire init.lua myself from scratch.',
              'The setup resides on my Secace (my personal laptop), while my work laptop still uses VS code, but I intend on switching that soon as well.',
              'I have streamed myself setting up lazyvim on my laptop and working with it, check out the video in this folder. Stream Montage coming up soon!',
            ],
          },
          {
            type: 'file',
            id: 'dotfiles',
            name: 'dotfiles_are_amazing.txt',
            text: [
              'Yes they are.',
              'This isn\'t a Neovim-related concept but, but I got introduced to this practice while setting it up.',
              'This might sound to dumb to those who already know but it did blow my mind.',
              'Personally, I\'ve been very averse to read / edit/ create files in my ~/.config folder, given how as the name suggests, they dictate settings for the apps / packages i\'ve installed on my laptop. Ironically, I usually delegate tasks that involve working with this folder to my coding agent.',
              'I then understood that you can do such a thing as symlink files, i.e. create true copies of a file, editing which would edit the original files just the same. What you can then do is keep all of these symlinked \'dotfiles\' into a \'dotfiles\' folder, symlinking every file to the corresponding file in your .config folder.',
              'And VERSION CONTROL THEM.',
              'BOOM, I\'m sorry but my mind was blown, in no small part because see since I\'m switching to Neovim, all my editor config pretty much resides in that .config folder, meaning my dotfiles now carry essentially all the settings I need to set up the same editing environment in any other laptop, all that\'s left is just downloading Neovim.',
              'You see how portable that makes my setup as a result? On a new laptop, i just need to clone the dotfiles repo, and recreate the symlinks and .config folder, all the config content is right there. Once that\'s done, i just need to keep all the packages in a Brewfile which i can then install in one go. Voila! Setup transferred!',
              'I lowkey hate how simple and elegant this system is.',
              'check out my dotfiles repo lol: https://github.com/Ketan-K17/my_dotfiles',
            ],
          },
        ],
      },
    ],
  },
  {
    type: 'file',
    id: 'start-here',
    name: 'README.md',
    text: [
      '# Quick Tips',
      '## Getting started\n- Launch apps from the Dock, Finder (Applications), Spotlight (⌘ Space) or the Apple menu\n- Several apps and windows can be open at once\n- Drag a window by its title bar to move it, drag its edges to resize, and click the yellow button to minimise it to the Dock\n- Double-click an icon (or select it and press Enter) to open it; drag icons around the desktop and they stay where you drop them\n- System Preferences changes the look: light or dark, Aqua or Glass, accent colour, wallpaper and sounds',
      '## Finder\n- Browse About Me and Current Endeavours; Applications lists everything in the Dock\n- Icon, list and column views (⌘1, ⌘2, ⌘3), a sidebar, search, and back / forward history\n- ⌘I shows Get Info for a file: its kind, size and where it lives\n- Move files to the Trash with ⌘⌫ and empty it with ⇧⌘⌫; nothing is lost for good, it all comes back when the page reloads',
      '## TextEdit\n- `.txt` files open for editing: type away and press ⌘S to save\n- `.md` files like this one open rendered; switch to **Markdown** at the top to see and edit the source\n- Format > Show Ruler (⌘R) toggles the ruler in plain-text files\n- Closing a window with unsaved changes asks first\n- Your edits are kept in *your* browser only, so feel free to scribble',
      '## Preview\n- Opens pictures and PDFs, including my resume\n- Internet Locations open the page in a new browser tab',
      '## Mail\n- The envelope in the Dock opens a New Message addressed to me\n- Write a subject and a note and press Send, and it lands in my inbox\n- Half-written drafts are kept in this browser until you send them',
      '## Music\n- The lavender click-wheel player on the desktop plays Spotify playlists\n- The centre button plays and pauses; MENU opens the list (Now Playing, Playlists, Spotify Player, Open in Spotify)\n- Slide a finger around the ring to scrub, or to move through the menu\n- Log in to Spotify in this browser for full songs; otherwise you get 30-second previews\n- Drag the player by its body to put it somewhere else',
      '## Terminal\n- A small pretend shell: `ls`, `cd`, `pwd`, `cat`, `open`, `echo`, `date`, `cal`, `whoami`, `history`, `fortune`, `clear` and more\n- `cat README.txt` prints a file and `open <name>` opens it in its window\n- Type `help` for the full list',
      '## Calculator\n- Click the keys or type on the keyboard',
      '## System Preferences\n- Appearance: light, dark or follow the system; Aqua or Glass style; accent colour\n- Desktop: wallpapers\n- Sound: volume and which interface sounds play',
      '## Shortcuts\n- F9 / F10 / F11: Exposé shows all windows, this app\'s windows, or the bare desktop\n- F12: Dashboard with a clock, a calendar and a sticky note\n- ⌘M minimises, ⌘W closes, ⌘Q quits an app, ⌘H hides it, ⌘` cycles through its windows\n- Ctrl works in place of ⌘, because the browser keeps some ⌘ keys\n- Help > Keyboard Shortcuts lists the rest',
      '## Done exploring?\n- Apple > Shut Down closes the Mac and puts the paper back',
    ],
  },
  { type: 'file', id: 'resume', name: 'resume.pdf', icon: 'pdf', text: [], src: 'laptop/docs/resume.pdf' },
  { type: 'app', id: 'github', name: 'GitHub', url: 'https://github.com/Ketan-K17', color: 0x24292f, glyph: 'GH' },
  { type: 'app', id: 'linkedin', name: 'LinkedIn', url: 'https://www.linkedin.com/in/ketan-kunkalikar-9393b6225/', color: 0x0a66c2, glyph: 'in' },
];

/** A project folder: a README and an Internet Location to its repository. */
function project(id: string, name: string, year: string, about: string, repo: string): DesktopFolder {
  return {
    type: 'folder',
    id,
    name,
    children: [
      { type: 'file', id: 'readme', name: 'README.txt', text: [name, year, about, `Code: ${repo}`] },
      { type: 'file', id: 'repo', name: 'Repository', icon: 'link', text: [], url: repo },
    ],
  };
}
