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

type GitHubUser = {
  public_repos: number;
  followers: number;
};

type GitHubRepo = {
  stargazers_count: number;
  fork: boolean;
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

const ascii = [
  "██████╗   ██████╗ ",
  "██╔══██╗ ██╔═══██╗",
  "██████╔╝ ██║   ██║",
  "██╔══██╗ ██║   ██║",
  "██║  ██║ ╚██████╔╝",
  "╚═╝  ╚═╝  ╚═════╝ "
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

async function loadStats(config: Config) {
  const user = await github<GitHubUser>(`/users/${config.username}`);
  const repos: GitHubRepo[] = [];

  for (let page = 1; ; page += 1) {
    const batch = await github<GitHubRepo[]>(
      `/users/${config.username}/repos?type=owner&per_page=100&page=${page}`
    );
    repos.push(...batch);
    if (batch.length < 100) break;
  }

  const featured = await github<GitHubRepo>(
    `/repos/${config.username}/${config.featured.repo}`
  );

  return {
    repos: user.public_repos,
    followers: user.followers,
    stars: repos
      .filter((repo) => !repo.fork)
      .reduce((sum, repo) => sum + repo.stargazers_count, 0),
    featuredStars: featured.stargazers_count
  };
}

function render(
  config: Config,
  stats: { repos: number; followers: number; stars: number; featuredStars: number },
  theme: Theme
) {
  const line = (
    x: number,
    y: number,
    label: string,
    value: string,
    valueColor = theme.fg
  ) => `
    <text x="${x}" y="${y}" class="line">
      <tspan fill="${theme.blue}">${esc(label)}</tspan>
      <tspan fill="${theme.dim}">: </tspan>
      <tspan fill="${valueColor}">${esc(value)}</tspan>
    </text>`;

  const stackLines = config.stack
    .map((item, index) => line(565, 300 + index * 28, index === 0 ? "stack" : "     ", item))
    .join("");

  const asciiLines = ascii
    .map(
      (item, index) =>
        `<text x="92" y="${215 + index * 36}" class="ascii" fill="${theme.green}">${esc(item)}</text>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="720" viewBox="0 0 1200 720" fill="none"
  xmlns="http://www.w3.org/2000/svg" role="img"
  aria-label="${esc(config.name)} — terminal GitHub profile">
  <style>
    .line { font: 18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    .small { font: 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    .ascii { font: 25px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-weight: 700; }
    .project { font: 21px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-weight: 700; }
  </style>

  <rect width="1200" height="720" rx="18" fill="${theme.bg}"/>
  <rect x="31" y="31" width="1138" height="658" rx="14" fill="${theme.shadow}"/>
  <rect x="27" y="27" width="1138" height="658" rx="14" fill="${theme.panel}" stroke="${theme.border}"/>
  <path d="M27 41C27 33.268 33.268 27 41 27H1151C1158.73 27 1165 33.268 1165 41V79H27V41Z" fill="${theme.titlebar}"/>
  <line x1="27" y1="79.5" x2="1165" y2="79.5" stroke="${theme.border}"/>

  <circle cx="58" cy="53" r="7" fill="#ff5f57"/>
  <circle cx="82" cy="53" r="7" fill="#febc2e"/>
  <circle cx="106" cy="53" r="7" fill="#28c840"/>
  <text x="146" y="59" class="small" fill="${theme.dim}">${esc(config.username)}@github: ~/profile</text>

  <text x="76" y="127" class="line" fill="${theme.green}">$ fastfetch</text>

  ${asciiLines}
  <text x="92" y="458" class="line" fill="${theme.fg}">${esc(config.username)}@github</text>
  <text x="92" y="486" class="small" fill="${theme.dim}">build / automate / ship</text>

  <text x="565" y="144" class="project" fill="${theme.green}">${esc(config.name)}</text>
  <line x1="565" y1="158" x2="1085" y2="158" stroke="${theme.border}"/>

  ${line(565, 194, "role", config.role)}
  ${line(565, 222, "uptime", config.experience)}
  ${line(565, 250, "location", config.location)}
  ${line(565, 278, "focus", config.focus)}
  ${stackLines}

  <text x="76" y="548" class="line" fill="${theme.green}">$ github --stats</text>
  <text x="76" y="579" class="small" fill="${theme.dim}">
    repos <tspan fill="${theme.fg}">${stats.repos}</tspan>
    <tspan>  |  followers </tspan><tspan fill="${theme.fg}">${stats.followers}</tspan>
    <tspan>  |  stars received </tspan><tspan fill="${theme.fg}">${stats.stars}</tspan>
  </text>

  <rect x="545" y="430" width="563" height="178" rx="10" fill="${theme.titlebar}" stroke="${theme.border}"/>
  <text x="570" y="465" class="small" fill="${theme.green}">$ open ~/projects/${esc(config.featured.repo)}</text>
  <text x="570" y="500" class="project" fill="${theme.orange}">${esc(config.featured.title)}</text>
  <text x="1035" y="500" text-anchor="end" class="small" fill="${theme.dim}">★ ${stats.featuredStars}</text>
  <text x="570" y="531" class="line" fill="${theme.fg}">${esc(config.featured.tagline)}</text>
  <text x="570" y="560" class="small" fill="${theme.dim}">Open-source Blender add-on for non-destructive</text>
  <text x="570" y="584" class="small" fill="${theme.dim}">model splitting, connectors and 3D-print-ready parts.</text>

  <text x="76" y="645" class="line" fill="${theme.green}">${esc(config.username)}@github:~$</text>
  <rect x="287" y="628" width="11" height="20" rx="1" fill="${theme.fg}"/>
</svg>`;
}

async function main() {
  const config = JSON.parse(
    await readFile(new URL("../profile.config.json", import.meta.url), "utf8")
  ) as Config;

  let stats = { repos: 0, followers: 0, stars: 0, featuredStars: 0 };

  try {
    stats = await loadStats(config);
  } catch (error) {
    console.warn("Could not refresh GitHub stats; generating layout with zeros.", error);
  }

  await mkdir(new URL("../assets/", import.meta.url), { recursive: true });

  await Promise.all([
    writeFile(
      new URL("../assets/terminal-dark.svg", import.meta.url),
      render(config, stats, themes.dark)
    ),
    writeFile(
      new URL("../assets/terminal-light.svg", import.meta.url),
      render(config, stats, themes.light)
    )
  ]);
}

await main();