import { mkdir, readFile, writeFile } from "node:fs/promises";

type Config = {
  username: string;
  name: string;
  role: string;
  experience: string;
  location: string;
  focus: string;
  stack: string[];
  featured: {
    repo: string;
    title: string;
    tagline: string;
    description: string;
  };
};

type GitHubRepo = {
  stargazers_count: number;
};

type Theme = {
  bg: string;
  panel: string;
  border: string;
  titlebar: string;
  fg: string;
  dim: string;
  green: string;
  blue: string;
  orange: string;
  shadow: string;
};

const themes: Record<"dark" | "light", Theme> = {
  dark: {
    bg: "#0d1117",
    panel: "#010409",
    border: "#30363d",
    titlebar: "#161b22",
    fg: "#c9d1d9",
    dim: "#8b949e",
    green: "#3fb950",
    blue: "#58a6ff",
    orange: "#f0883e",
    shadow: "#00000055"
  },
  light: {
    bg: "#ffffff",
    panel: "#f6f8fa",
    border: "#d0d7de",
    titlebar: "#eaeef2",
    fg: "#24292f",
    dim: "#57606a",
    green: "#1a7f37",
    blue: "#0969da",
    orange: "#bc4c00",
    shadow: "#1f23281f"
  }
};

// Generated from Rafael's GitHub profile portrait (September 2026).
const asciiPortrait = [
  "       ,:::::;;:::::,",
  "      .iiiiri;:.",
  "      :iii;i;,.",
  "      iii:;;.              .",
  `     ,ii: ;:.;irrrr;:,,.   .,`,
  "     ;r;..i5MHM3555522Xs;   :",
  "    .rr:::5SGGHh555522Xsr;. ,:",
  "    :rr;iAMHHHHM3333552Xri: .i.",
  "    ;rr;XHGHHMHHHMhMM32AXi; ,i,",
  "    ;riiAGHGH5AX5MH5Asirri:.:i,",
  "    ;X2iAGHGMhi:i5Gs;r2i.:i:,i:",
  "    i5GHhHHHHMXr2HHX;rXXiisi.;:",
  "    i2G3MGHHHM3MGGH5r;AA22A;.;:",
  "    :rH53GHHHHMhHHGhXiX52As:.i:",
  "    .iXShMGHHHMhH3H5isA32sr,,r,",
  "     ;rX2ASHHGh33sAX;;isAs; :i",
  "     .rrii5HGGir35Xsr;;:ri  ;:",
  "      ,rs;:rh3hHHHAXAssX:   i",
  "       .ir.,ir5SGMAiAXXi   ;,",
  "         ;i,.,:sXAr,:;:   :i",
  "         .i25,   .       :sX;",
  "       .;ri3Gh2i,      .;X5A",
  "     .;rsr;hh5GSMArirrsA53A.",
  "   ,irr;:::hGMA23hHGGHHMM2",
  ",;iri:..,::MHGH2hGHHHHMH3.",
  "i;:,,.,:,::GGMHGGGGHHHHM,",
  "...,,.,.,,ihhGHHHHHHGHH:",
  ".,:,,XMM2 :3GGHGhMHHHGr .",
  ".:;:iSGS3 Ah5MG5iMSMGA .",
  ",:;;iMHGXiGH2XssXXMSh",
  ",:;;::AGMA2SMXi;XXs2."
];

const esc = (value: string | number) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

async function github<T>(path: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${path}`);
  }

  return response.json() as Promise<T>;
}

async function loadFeaturedStars(config: Config) {
  const featured = await github<GitHubRepo>(
    `/repos/${config.username}/${config.featured.repo}`
  );
  return featured.stargazers_count;
}

function render(config: Config, featuredStars: number, theme: Theme) {
  const line = (y: number, label: string, value: string) => `
    <text y="${y}" class="info">
      <tspan x="565" fill="${theme.blue}">${esc(label)}</tspan>
      <tspan x="655" fill="${theme.dim}">${label ? ":" : ""}</tspan>
      <tspan x="675" fill="${theme.fg}">${esc(value)}</tspan>
    </text>`;

  const stackLines = config.stack
    .map((item, index) => line(390 + index * 38, index === 0 ? "stack" : "", item))
    .join("");

  const portraitLines = asciiPortrait
    .map(
      (item, index) =>
        `<text x="76" y="${174 + index * 14}" class="portrait" fill="${theme.green}">${esc(item)}</text>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="780" viewBox="0 0 1200 780" fill="none"
  xmlns="http://www.w3.org/2000/svg" role="img"
  aria-label="${esc(config.name)} — terminal GitHub profile with ASCII portrait">
  <style>
    .line { font: 18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    .info { font: 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    .small { font: 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    .portrait { font: 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-weight: 700; white-space: pre; }
    .project { font: 21px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-weight: 700; }
  </style>

  <rect width="1200" height="780" rx="18" fill="${theme.bg}"/>
  <rect x="31" y="31" width="1138" height="718" rx="14" fill="${theme.shadow}"/>
  <rect x="27" y="27" width="1138" height="718" rx="14" fill="${theme.panel}" stroke="${theme.border}"/>
  <path d="M27 41C27 33.268 33.268 27 41 27H1151C1158.73 27 1165 33.268 1165 41V79H27V41Z" fill="${theme.titlebar}"/>
  <line x1="27" y1="79.5" x2="1165" y2="79.5" stroke="${theme.border}"/>

  <circle cx="58" cy="53" r="7" fill="#ff5f57"/>
  <circle cx="82" cy="53" r="7" fill="#febc2e"/>
  <circle cx="106" cy="53" r="7" fill="#28c840"/>
  <text x="146" y="59" class="small" fill="${theme.dim}">${esc(config.username)}@github: ~/profile</text>

  <text x="76" y="127" class="line" fill="${theme.green}">$ fastfetch</text>

  ${portraitLines}
  <text x="92" y="632" class="line" fill="${theme.fg}">${esc(config.username)}@github</text>
  <text x="92" y="662" class="small" fill="${theme.dim}">build / automate / ship</text>

  <text x="565" y="144" class="project" fill="${theme.green}">${esc(config.name)}</text>
  <line x1="565" y1="160" x2="1085" y2="160" stroke="${theme.border}"/>

  ${line(208, "role", config.role)}
  ${line(250, "uptime", config.experience)}
  ${line(292, "location", config.location)}
  ${line(334, "focus", config.focus)}
  ${stackLines}

  <rect x="535" y="545" width="573" height="155" rx="10" fill="${theme.titlebar}" stroke="${theme.border}"/>
  <text x="560" y="580" class="small" fill="${theme.green}">$ open ~/projects/${esc(config.featured.repo)}</text>
  <text x="560" y="615" class="project" fill="${theme.orange}">${esc(config.featured.title)}</text>
  <text x="1080" y="615" text-anchor="end" class="small" fill="${theme.dim}">★ ${featuredStars}</text>
  <text x="560" y="646" class="line" fill="${theme.fg}">${esc(config.featured.tagline)}</text>
  <text x="560" y="675" class="small" fill="${theme.dim}">Open-source Blender add-on for model splitting,</text>
  <text x="560" y="691" class="small" fill="${theme.dim}">custom connectors and 3D-print-ready parts.</text>

  <text x="76" y="714" class="line" fill="${theme.green}">${esc(config.username)}@github:~$</text>
  <rect x="287" y="697" width="11" height="20" rx="1" fill="${theme.fg}"/>
</svg>`;
}

async function main() {
  const config = JSON.parse(
    await readFile(new URL("../profile.config.json", import.meta.url), "utf8")
  ) as Config;

  let featuredStars = 0;
  try {
    featuredStars = await loadFeaturedStars(config);
  } catch (error) {
    console.warn("Could not refresh the featured project stars; generating with zero.", error);
  }

  await mkdir(new URL("../assets/", import.meta.url), { recursive: true });

  await Promise.all([
    writeFile(
      new URL("../assets/terminal-dark.svg", import.meta.url),
      render(config, featuredStars, themes.dark)
    ),
    writeFile(
      new URL("../assets/terminal-light.svg", import.meta.url),
      render(config, featuredStars, themes.light)
    )
  ]);
}

await main();
