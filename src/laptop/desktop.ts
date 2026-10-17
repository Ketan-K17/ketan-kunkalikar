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
      {
        type: 'file',
        id: 'readme',
        name: 'README.txt',
        text: [
          'Ketan Kunkalikar',
          'AI Engineer and Agent Developer.',
          'SWE @ Turtlemint. Ex Agent Developer @ Spaider-Space.',
          'Open-source contributor fascinated with AI, Large Language Models, and Agentic Systems.',
          'Have a look around: projects are in Projects, what I am learning now is in Current Endeavours, and Mail (in the Dock) reaches me directly.',
        ],
      },
      { type: 'file', id: 'education', name: 'education.txt', text: ['Education', 'BTech in Computer Science and Engineering, National Institute of Technology, Goa.'] },
      {
        type: 'file',
        id: 'research',
        name: 'research.txt',
        text: ['Research', 'Large Language Models, model finetuning on consumer devices, and agentic systems, with applications in Natural Language Processing and automation.'],
      },
      {
        type: 'file',
        id: 'work',
        name: 'work.txt',
        text: ['Occupations', '- SWE @ Turtlemint', '- SWE Intern @ Turtlemint', '- Ex Agent Developer @ Spaider-Space', '- Ex Research Intern @ Distilled DDD'],
      },
      { type: 'file', id: 'profile', name: 'me.png', icon: 'image', src: 'images/profile.png', text: ['Ketan Kunkalikar'] },
    ],
  },
  {
    type: 'folder',
    id: 'projects',
    name: 'Projects',
    children: [
      project(
        'claude-dr',
        'Claude Deep Research',
        '2025',
        "MCP to incorporate a Deep Research feature on Claude Desktop. A LangGraph workflow that does deep research on a given query, wired into Claude's desktop app through an MCP server.",
        'https://github.com/Ketan-K17/claude_with_dr',
      ),
      project(
        'sagan',
        'SAGAN',
        '2024-2025',
        "A multi-modal AI agent workflow that automates grant proposal writing from a corpus of research papers and legal documents. Implemented and deployed as a service; acquired by Luxembourg's Space Agency in March 2025 for USD 50K.",
        'https://github.com/Ketan-K17/sagan_backend',
      ),
      project(
        'web-nav',
        'Web Navigator',
        '2025',
        'A multi-modal AI agent workflow that automates web navigation: a LangGraph agent with agentic decision making, paired with computer vision and computer control. Built as my final-year project.',
        'https://github.com/Ketan-K17/web_automation_agent_backend',
      ),
      project(
        'adaptive-rag',
        'Adaptive RAG',
        '2024',
        'An AI application that performs Adaptive RAG over a corpus of documents and uses what it retrieves to answer questions. Deployed on Hugging Face Spaces.',
        'https://github.com/Ketan-K17/adaptive_rag_application_poc',
      ),
    ],
  },
  {
    type: 'folder',
    id: 'endeavours',
    name: 'Current Endeavours',
    children: [
      {
        type: 'folder',
        id: 'llm',
        name: 'LLM from Scratch',
        children: [
          {
            type: 'file',
            id: 'notes',
            name: 'README.txt',
            text: [
              'Learning LLM architecture: building a GPT-like LLM from scratch',
              "Status: in progress. Following Sebastian Raschka's 'Build a Large Language Model (From Scratch)'.",
              'Phase 1, architecture: done. Core transformer components (attention, embeddings, layer norm) and a basic training loop.',
              'Phase 2, training pipeline: now. Optimisation techniques and scaling strategies.',
              'Phase 3, fine-tuning and evaluation: next.',
            ],
          },
          { type: 'file', id: 'cover', name: 'book.png', icon: 'image', src: 'images/llm_from_scratch.png', text: ['Build a Large Language Model (From Scratch)'] },
          { type: 'file', id: 'arch', name: 'architecture.png', icon: 'image', src: 'images/llm_architecture.png', text: ['The architecture being built.'] },
          { type: 'file', id: 'github', name: 'Progress on GitHub', icon: 'link', text: [], url: 'https://github.com/Ketan-K17/building_llms_from_scratch' },
        ],
      },
      {
        type: 'folder',
        id: 'python',
        name: 'Effective Python',
        children: [
          {
            type: 'file',
            id: 'notes',
            name: 'README.txt',
            text: [
              'Learning to write impeccable, production-ready Python',
              "Status: in progress. Following Brett Slatkin's 'Effective Python'.",
              'Focus: code organisation, performance, testing strategies and error handling.',
            ],
          },
          { type: 'file', id: 'cover', name: 'book.png', icon: 'image', src: 'images/effective_python.png', text: ['Effective Python, by Brett Slatkin'] },
        ],
      },
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
