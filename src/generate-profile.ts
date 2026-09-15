import { mkdir, readFile, writeFile } from "node:fs/promises";

type Config = {
  username: string;
  name: string;
  role: string;
  experience: string;
  location: string;
  focus: string;
  stack: Array<{
    id: string;
    label: string;
  }>;
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

type StackIconAsset = {
  id: string;
  label: string;
  svg: string;
};

const ACCENT = "#00FF88";
const SIMPLE_ICONS_REF = "5d5d4d1d28cbb00b21770bb69d8112da52211a95";
const DEVICON_REF = "7330accdbc47e2dc0c19789a48533c4a3c50fe58";

const stackIconSources: Record<
  string,
  | { kind: "simple"; slug: string }
  | { kind: "devicon"; path: string }
> = {
  react: { kind: "simple", slug: "react" },
  nextjs: { kind: "simple", slug: "nextdotjs" },
  typescript: { kind: "simple", slug: "typescript" },
  nodejs: { kind: "simple", slug: "nodedotjs" },
  nestjs: { kind: "simple", slug: "nestjs" },
  java: { kind: "simple", slug: "openjdk" },
  springboot: { kind: "simple", slug: "springboot" },
  python: { kind: "simple", slug: "python" },
  cplusplus: { kind: "simple", slug: "cplusplus" },
  postgresql: { kind: "simple", slug: "postgresql" },
  mongodb: { kind: "simple", slug: "mongodb" },
  aws: {
    kind: "devicon",
    path: "icons/amazonwebservices/amazonwebservices-original-wordmark.svg"
  },
  googlecloud: { kind: "simple", slug: "googlecloud" },
  playwright: {
    kind: "devicon",
    path: "icons/playwright/playwright-original.svg"
  },
  n8n: { kind: "simple", slug: "n8n" }
};

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

async function loadStackIcons(config: Config): Promise<StackIconAsset[]> {
  return Promise.all(
    config.stack.map(async ({ id, label }) => {
      const source = stackIconSources[id];
      if (!source) throw new Error(`Unknown stack icon: ${id}`);

      const url =
        source.kind === "simple"
          ? `https://raw.githubusercontent.com/simple-icons/simple-icons/${SIMPLE_ICONS_REF}/icons/${source.slug}.svg`
          : `https://raw.githubusercontent.com/devicons/devicon/${DEVICON_REF}/${source.path}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Could not load ${label} icon (${response.status})`);
      }

      return { id, label, svg: await response.text() };
    })
  );
}

function iconSymbol(icon: StackIconAsset) {
  const openingTag = icon.svg.match(/<svg\b[^>]*>/)?.[0];
  const closingTagIndex = icon.svg.lastIndexOf("</svg>");

  if (!openingTag || closingTagIndex < 0) {
    throw new Error(`Invalid SVG for ${icon.label}`);
  }

  const viewBox = openingTag.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24";
  let body = icon.svg.slice(
    icon.svg.indexOf(openingTag) + openingTag.length,
    closingTagIndex
  );

  body = body
    .replace(/<title>[\s\S]*?<\/title>/g, "")
    .replace(/fill="(?!none|currentColor)[^"]+"/g, 'fill="currentColor"')
    .replace(/stroke="(?!none|currentColor)[^"]+"/g, 'stroke="currentColor"');

  return `<symbol id="tech-${esc(icon.id)}" viewBox="${esc(viewBox)}">
    <g fill="currentColor">${body}</g>
  </symbol>`;
}

function splitIntoLines(value: string, maxLength: number, maxLines: number) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];

  for (const word of words) {
    const index = Math.max(0, lines.length - 1);
    const candidate = lines[index] ? `${lines[index]} ${word}` : word;

    if (candidate.length <= maxLength) {
      lines[index] = candidate;
    } else if (lines.length < maxLines) {
      lines.push(word);
    } else {
      lines[index] = candidate;
    }
  }

  return lines.slice(0, maxLines);
}

function renderTechRain(stackIcons: StackIconAsset[]) {
  const columns = [430, 484, 538, 592, 646, 700, 754];
  const durations = [8.4, 10.1, 9.2, 11.2, 8.8, 10.6, 9.6];
  const dropsPerColumn = 5;
  let dropIndex = 0;

  return columns
    .map((x, columnIndex) => {
      const duration = durations[columnIndex];

      return Array.from({ length: dropsPerColumn }, (_, slotIndex) => {
        const icon = stackIcons[dropIndex % stackIcons.length];
        const size = 22 + ((columnIndex + slotIndex) % 3) * 2;
        const delay = -(
          (duration / dropsPerColumn) * slotIndex +
          columnIndex * 0.47
        );
        const previewY =
          24 + slotIndex * 82 + (columnIndex % 2 === 0 ? 0 : 38);
        dropIndex += 1;

        return `<g transform="translate(${x} 0)" aria-hidden="true">
          <g class="tech-drop" transform="translate(0 ${previewY})"
            style="animation-duration:${duration.toFixed(1)}s;animation-delay:${delay.toFixed(2)}s">
            <use href="#tech-${esc(icon.id)}" x="${-size / 2}" y="${-size / 2}"
              width="${size}" height="${size}"/>
          </g>
        </g>`;
      }).join("");
    })
    .join("");
}

function render(
  config: Config,
  featuredStars: number,
  stackIcons: StackIconAsset[]
) {
  const symbols = stackIcons.map(iconSymbol).join("\n");
  const techRain = renderTechRain(stackIcons);
  const profileDetail = `${config.experience.toUpperCase()} // ${config.focus}`;
  const descriptionLines = splitIntoLines(
    config.featured.description.toUpperCase(),
    47,
    2
  );
  const roleCursorX = Math.min(390, 48 + config.role.length * 9.1);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"
  role="img" aria-labelledby="title description">
  <title id="title">${esc(config.name)} — Senior Full-Stack Software Engineer</title>
  <desc id="description">Animated hacker-style profile. Technology logos fall like Matrix rain beside a short profile and the ${esc(config.featured.title)} open-source project.</desc>

  <defs>
    <style>
      @keyframes techRain {
        0%   { transform: translateY(-42px); opacity: 0; color: #ffffff; }
        7%   { opacity: 1; color: #ffffff; filter: drop-shadow(0 0 5px ${ACCENT}); }
        16%  { opacity: 0.92; color: ${ACCENT}; filter: drop-shadow(0 0 3px ${ACCENT}); }
        68%  { opacity: 0.42; color: ${ACCENT}; filter: none; }
        92%  { opacity: 0.16; color: ${ACCENT}; }
        100% { transform: translateY(442px); opacity: 0; color: ${ACCENT}; }
      }
      @keyframes scan {
        0%   { transform: translateY(-400px); opacity: 0.16; }
        50%  { opacity: 0.28; }
        100% { transform: translateY(800px); opacity: 0.16; }
      }
      @keyframes glitchMain {
        0%,85%,100% { transform: translateX(0); opacity: 1; }
        87% { transform: translateX(-4px); opacity: 0.86; fill: #ff0040; }
        89% { transform: translateX(4px); opacity: 0.72; fill: #00ffff; }
        91% { transform: translateX(-2px); opacity: 0.95; }
        93% { transform: translateX(0); opacity: 1; }
      }
      @keyframes glitchGhost {
        0%,84%,100% { opacity: 0; }
        85% { opacity: 0.52; transform: translateX(5px); fill: #ff0040; }
        88% { opacity: 0.34; transform: translateX(-5px); fill: #00ffff; }
        91% { opacity: 0; }
      }
      @keyframes cursorBlink {
        0%,49% { opacity: 1; }
        50%,100% { opacity: 0; }
      }
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes borderPulse {
        0%,100% { opacity: 0.30; }
        50% { opacity: 0.72; }
      }

      .tech-drop {
        color: ${ACCENT};
        opacity: 0.46;
        animation-name: techRain;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      .scanline { animation: scan 2.8s linear 0.2s infinite; }
      .glitch-main { animation: glitchMain 5s ease-in-out 0.3s infinite; }
      .glitch-ghost { animation: glitchGhost 5s ease-in-out 0.8s infinite; }
      .cursor { animation: cursorBlink 0.9s step-end infinite; }
      .card { animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
      .divider { animation: borderPulse 2.4s ease-in-out infinite; }
      .label {
        font: 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        letter-spacing: 0.22em;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      }

      @media (prefers-reduced-motion: reduce) {
        .tech-drop, .scanline, .glitch-main, .glitch-ghost, .cursor, .card, .divider {
          animation: none !important;
        }
        .tech-drop { opacity: 0.46; }
        .glitch-ghost { opacity: 0; }
      }
    </style>

    <clipPath id="left-panel"><rect width="408" height="400"/></clipPath>
    <clipPath id="right-panel"><rect x="408" width="392" height="400"/></clipPath>
    <linearGradient id="scan-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${ACCENT}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </linearGradient>
    ${symbols}
  </defs>

  <g class="card">
    <rect width="800" height="400" fill="#030303"/>
    <rect x="408" width="392" height="400" fill="#010703" opacity="0.28"/>
    <line x1="408" y1="0" x2="408" y2="400" stroke="${ACCENT}"
      stroke-width="0.5" class="divider" opacity="0.35"/>

    <g clip-path="url(#right-panel)" aria-label="Technology stack: ${esc(stackIcons.map(({ label }) => label).join(", "))}">
      ${techRain}
      <rect x="408" y="-8" width="392" height="8" fill="url(#scan-gradient)" class="scanline"/>
      <path d="M772 14H792V34 M772 386H792V366" stroke="${ACCENT}"
        stroke-width="1.5" fill="none" opacity="0.5"/>
    </g>

    <g clip-path="url(#left-panel)">
      <path d="M20 44V20H44 M20 356V380H44" stroke="${ACCENT}"
        stroke-width="1.5" fill="none" opacity="0.6"/>

      <text x="48" y="58" class="label" fill="${ACCENT}" opacity="0.55">IDENT_USER</text>
      <text x="48" y="108" class="mono glitch-ghost" font-size="32" font-weight="700"
        fill="${ACCENT}" letter-spacing="-1">@${esc(config.username)}</text>
      <text x="48" y="108" class="mono glitch-main" font-size="32" font-weight="700"
        fill="${ACCENT}" letter-spacing="-1">@${esc(config.username)}</text>
      <text x="48" y="108" class="mono" font-size="32" font-weight="700"
        fill="${ACCENT}" letter-spacing="-1">@${esc(config.username)}</text>
      <text x="48" y="160" class="label" fill="${ACCENT}" opacity="0.55">PROFILE</text>
      <text x="48" y="186" class="mono" font-size="15" font-weight="600"
        fill="#f4f4f5" letter-spacing="0.02em">${esc(config.role.toUpperCase())}</text>
      <rect x="${roleCursorX}" y="171" width="2" height="16" fill="${ACCENT}" class="cursor"/>
      <text x="48" y="211" class="mono" font-size="11.5" fill="#f4f4f5"
        opacity="0.56" letter-spacing="0.03em">${esc(profileDetail)}</text>

      <text x="48" y="264" class="label" fill="${ACCENT}" opacity="0.55">OPEN_SOURCE</text>
      <text x="48" y="292" class="mono" font-size="17" font-weight="700"
        fill="${ACCENT}" letter-spacing="0.02em">${esc(config.featured.title.toUpperCase())}</text>
      <text x="384" y="292" class="mono" font-size="12" text-anchor="end"
        fill="#f4f4f5" opacity="0.7">★ ${featuredStars}</text>
      <text x="48" y="316" class="mono" font-size="12" fill="#f4f4f5"
        letter-spacing="0.05em">${esc(config.featured.tagline.toUpperCase())}</text>
      ${descriptionLines
        .map(
          (line, index) =>
            `<text x="48" y="${339 + index * 15}" class="mono" font-size="10.5" fill="#f4f4f5" opacity="0.48">${esc(line)}</text>`
        )
        .join("\n      ")}

      <rect x="48" y="370" width="100" height="1.5" fill="${ACCENT}" opacity="0.5"/>
      <rect x="158" y="370" width="30" height="1.5" fill="${ACCENT}" opacity="0.2"/>
      <text x="48" y="390" class="mono" font-size="9" fill="#ffffff"
        opacity="0.18" letter-spacing="0.1em">github.com/${esc(config.username)}</text>
    </g>
  </g>
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
    console.warn(
      "Could not refresh the featured project stars; generating with zero.",
      error
    );
  }

  const stackIcons = await loadStackIcons(config);

  await mkdir(new URL("../assets/", import.meta.url), { recursive: true });
  await writeFile(
    new URL("../assets/hacker-profile.svg", import.meta.url),
    render(config, featuredStars, stackIcons)
  );
}

await main();
