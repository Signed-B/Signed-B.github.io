const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const ESSAYS_DIR = path.join(ROOT, "essays");
const WRITING_DIR = path.join(ROOT, "writing");
const ABOUT_DIR = path.join(ROOT, "about");

const CHANGELOG_MARKER = "------CHANGELOG -----";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineFormat(text) {
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return escaped;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inCode = false;
  let listType = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inlineFormat(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        html.push("</code></pre>");
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        const lang = trimmed.slice(3).trim();
        const className = lang ? ` class="language-${escapeHtml(lang)}"` : "";
        html.push(`<pre><code${className}>`);
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      html.push(escapeHtml(trimmed));
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      const level = trimmed.match(/^#{1,6}/)[0].length;
      const content = trimmed.replace(/^#{1,6}\s+/, "");
      html.push(`<h${level}>${inlineFormat(content)}</h${level}>`);
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      flushList();
      html.push("<hr>");
      continue;
    }

    if (/^(\*|-)\s+/.test(trimmed)) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList();
      }
      if (!listType) {
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inlineFormat(trimmed.replace(/^(\*|-)\s+/, ""))}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      if (listType && listType !== "ol") {
        flushList();
      }
      if (!listType) {
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inlineFormat(trimmed.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return html.join("\n");
}

function slugToTitle(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseChangelog(block) {
  const lines = block.split(/\r?\n/).map((line) => line.trim());
  let date = "";
  let message = "";
  let inMessage = false;

  for (const line of lines) {
    if (!line) {
      if (inMessage) {
        message += "\n";
      }
      continue;
    }
    if (line.toLowerCase().startsWith("date:")) {
      date = line.slice(5).trim();
      inMessage = false;
      continue;
    }
    if (line.toLowerCase().startsWith("message:")) {
      message = line.slice(8).trim();
      inMessage = true;
      continue;
    }
    if (inMessage) {
      message += `${message ? "\n" : ""}${line}`;
    }
  }

  return { date, message };
}

function parseEssayFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const markerIndex = raw.lastIndexOf(CHANGELOG_MARKER);
  let body = raw;
  let changelog = { date: "", message: "" };

  if (markerIndex !== -1) {
    body = raw.slice(0, markerIndex).trimEnd();
    const changelogBlock = raw.slice(markerIndex + CHANGELOG_MARKER.length).trim();
    if (changelogBlock) {
      changelog = parseChangelog(changelogBlock);
    }
  }

  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : null;
  return { body, changelog, title };
}

function renderShell({ title, content, extraHead = "", extraBodyEnd = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    ${extraHead}
  </head>
  <body class="page">
    <div class="page-shell">
      <header class="site-header">
        <h1 class="site-title"><a href="/">Beckett Hyde</a></h1>
        <nav class="site-nav">
          <a href="/about/">About</a>
          <a href="/writing/">Writing</a>
          <a href="/files/cv.pdf">CV</a>
        </nav>
      </header>
      <main class="page-content">
        ${content}
      </main>
    </div>
    ${extraBodyEnd}
  </body>
</html>`;
}

function renderWritingIndex(essays) {
  const items = essays.length
    ? essays
        .map((essay) => {
          const latest = essay.versions[essay.versions.length - 1];
          const date = latest.changelog.date ? ` · ${escapeHtml(latest.changelog.date)}` : "";
          const summary = essay.summary ? `<p>${escapeHtml(essay.summary)}</p>` : "";
          return `<li>
    <h2><a href="/writing/${essay.slug}/">${escapeHtml(essay.title)}</a></h2>
    <div class="essay-meta">v${latest.versionLabel}${date}</div>
    ${summary}
  </li>`;
        })
        .join("\n")
    : `<li class="essay-empty">No essays yet. Add markdown files to /essays.</li>`;

  return renderShell({
    title: "Writing",
    content: `<section class="writing-index">
  <h2>Writing</h2>
  <ul class="essay-list">
    ${items}
  </ul>
</section>`,
  });
}

function renderEssayPage(essay) {
  const latest = essay.versions[essay.versions.length - 1];
  const sortedVersions = [...essay.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const changelogItems = sortedVersions
    .map((version, index) => {
      const date = version.changelog.date ? `<span class="changelog-date">${escapeHtml(version.changelog.date)}</span>` : "";
      const message = version.changelog.message
        ? `<div class="changelog-message">${escapeHtml(version.changelog.message)}</div>`
        : "";
      const spacer = index < sortedVersions.length - 1 ? `<div class="changelog-spacer" aria-hidden="true"></div>` : "";
      return `<li class="changelog-item">
  <div class="changelog-head">
    <a href="/writing/${essay.slug}/change/?f=${version.versionNumber}" class="changelog-version">v${escapeHtml(version.versionLabel)}:</a>
    ${date}
  </div>
  ${message}
  ${spacer}
</li>`;
    })
    .join("\n");

  const contentHtml = markdownToHtml(latest.body);

  return renderShell({
    title: essay.title,
    content: `<article class="essay-content">
  ${contentHtml}
</article>
<section class="changelog">
  <h2>Changelog</h2>
  <ul class="changelog-list">
    ${changelogItems}
  </ul>
</section>`,
  });
}

function renderChangePage(essay) {
  const versionsPayload = essay.versions.map((version) => ({
    versionNumber: version.versionNumber,
    versionLabel: version.versionLabel,
    date: version.changelog.date,
    message: version.changelog.message,
    body: version.body,
  }));

  const payloadJson = JSON.stringify({ title: essay.title, slug: essay.slug, versions: versionsPayload })
    .replace(/</g, "\\u003c");

  const script = `<script>
const data = JSON.parse(document.getElementById("essay-data").textContent);
const params = new URLSearchParams(window.location.search);
const versions = data.versions.slice().sort((a, b) => a.versionNumber - b.versionNumber);

function getVersionByNumber(number) {
  return versions.find((version) => version.versionNumber === number);
}

function defaultFromVersion() {
  return versions.length ? versions[versions.length - 1].versionNumber : 1;
}

function defaultSinceVersion(fromVersion) {
  const index = versions.findIndex((version) => version.versionNumber === fromVersion);
  if (index > 0) {
    return versions[index - 1].versionNumber;
  }
  return fromVersion;
}

function computeDiffLines(oldText, newText) {
  const oldLines = oldText.split("\\n");
  const newLines = newText.split("\\n");
  const dp = Array.from({ length: oldLines.length + 1 }, () => Array(newLines.length + 1).fill(0));

  for (let i = 1; i <= oldLines.length; i += 1) {
    for (let j = 1; j <= newLines.length; j += 1) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diff = [];
  let i = oldLines.length;
  let j = newLines.length;

  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      diff.push({ type: "same", text: oldLines[i - 1] });
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      diff.push({ type: "del", text: oldLines[i - 1] });
      i -= 1;
    } else {
      diff.push({ type: "add", text: newLines[j - 1] });
      j -= 1;
    }
  }

  while (i > 0) {
    diff.push({ type: "del", text: oldLines[i - 1] });
    i -= 1;
  }

  while (j > 0) {
    diff.push({ type: "add", text: newLines[j - 1] });
    j -= 1;
  }

  return diff.reverse();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDiff(fromVersion, sinceVersion) {
  const fromData = getVersionByNumber(fromVersion);
  const sinceData = getVersionByNumber(sinceVersion);
  const header = document.getElementById("diff-header");
  const output = document.getElementById("diff-output");

  if (!fromData || !sinceData) {
    header.textContent = "Select versions to compare.";
    output.textContent = "";
    return;
  }

  header.textContent = \`Comparing v\${fromData.versionLabel} to v\${sinceData.versionLabel}\`;
  const diff = computeDiffLines(sinceData.body, fromData.body);
  output.innerHTML = diff
    .map((entry) => {
      const sign = entry.type === "add" ? "+" : entry.type === "del" ? "-" : " ";
      return \`<div class="diff-line diff-\${entry.type}">\${sign} \${escapeHtml(entry.text)}</div>\`;
    })
    .join("");
}

function populateSelect(select, currentValue) {
  select.innerHTML = versions
    .map((version) => \`<option value="\${version.versionNumber}">v\${version.versionLabel}</option>\`)
    .join("");
  select.value = currentValue;
}

function updateParams(fromValue, sinceValue) {
  const nextParams = new URLSearchParams();
  nextParams.set("f", fromValue);
  if (sinceValue !== null) {
    nextParams.set("s", sinceValue);
  }
  window.history.replaceState({}, "", \`\${window.location.pathname}?\${nextParams}\`);
}

function init() {
  const fromParam = Number(params.get("f")) || defaultFromVersion();
  const sinceParam = Number(params.get("s")) || defaultSinceVersion(fromParam);

  const fromSelect = document.getElementById("fromVersion");
  const sinceSelect = document.getElementById("sinceVersion");

  populateSelect(fromSelect, fromParam);
  populateSelect(sinceSelect, sinceParam);

  fromSelect.addEventListener("change", () => {
    const fromValue = Number(fromSelect.value);
    const sinceValue = Number(sinceSelect.value);
    updateParams(fromValue, sinceValue);
    renderDiff(fromValue, sinceValue);
  });

  sinceSelect.addEventListener("change", () => {
    const fromValue = Number(fromSelect.value);
    const sinceValue = Number(sinceSelect.value);
    updateParams(fromValue, sinceValue);
    renderDiff(fromValue, sinceValue);
  });

  updateParams(fromParam, sinceParam);
  renderDiff(fromParam, sinceParam);
}

init();
</script>`;

  const content = `<section class="change-header">
  <div>
    <h2>Changes</h2>
    <p>Compare revisions of ${escapeHtml(essay.title)}.</p>
  </div>
  <div class="change-controls">
    <label>
      From
      <select id="fromVersion"></select>
    </label>
    <label>
      Since
      <select id="sinceVersion"></select>
    </label>
  </div>
</section>
<section class="diff-view">
  <h3 id="diff-header"></h3>
  <div id="diff-output" class="diff-output"></div>
</section>`;

  return renderShell({
    title: `${essay.title} Changes`,
    content,
    extraBodyEnd: `<script type="application/json" id="essay-data">${payloadJson}</script>${script}`,
  });
}

function extractSummary(markdown) {
  const lines = markdown.split(/\r?\n/);
  let inTitle = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (!inTitle && /^#\s+/.test(trimmed)) {
      inTitle = true;
      continue;
    }
    return trimmed.replace(/^#+\s+/, "");
  }
  return "";
}

function build() {
  ensureDir(WRITING_DIR);
  ensureDir(ABOUT_DIR);

  let essayFiles = [];
  if (fs.existsSync(ESSAYS_DIR)) {
    essayFiles = fs.readdirSync(ESSAYS_DIR).filter((file) => file.endsWith(".md"));
  }

  const essayMap = new Map();

  for (const file of essayFiles) {
    const match = file.match(/^(.+?)\.(\d+)\.md$/);
    const simpleMatch = file.match(/^(.+)\.md$/);
    let slug;
    let versionLabel;
    let versionNumber;

    if (match) {
      slug = match[1];
      versionLabel = match[2];
      versionNumber = Number(match[2]);
    } else if (simpleMatch) {
      slug = simpleMatch[1];
      versionLabel = "1";
      versionNumber = 1;
    } else {
      continue;
    }

    const filePath = path.join(ESSAYS_DIR, file);
    const { body, changelog, title } = parseEssayFile(filePath);

    if (!essayMap.has(slug)) {
      essayMap.set(slug, {
        slug,
        title: title || slugToTitle(slug),
        versions: [],
        summary: "",
      });
    }

    const essay = essayMap.get(slug);
    if (title) {
      essay.title = title;
    }

    essay.versions.push({
      versionLabel,
      versionNumber,
      body,
      changelog,
    });
  }

  const essays = Array.from(essayMap.values()).map((essay) => {
    essay.versions.sort((a, b) => a.versionNumber - b.versionNumber);
    const latest = essay.versions[essay.versions.length - 1];
    essay.summary = extractSummary(latest.body);
    return essay;
  });

  essays.sort((a, b) => {
    const aLatest = a.versions[a.versions.length - 1].versionNumber;
    const bLatest = b.versions[b.versions.length - 1].versionNumber;
    return bLatest - aLatest;
  });

  fs.writeFileSync(path.join(WRITING_DIR, "index.html"), renderWritingIndex(essays));

  for (const essay of essays) {
    const essayDir = path.join(WRITING_DIR, essay.slug);
    const changeDir = path.join(essayDir, "change");
    ensureDir(essayDir);
    ensureDir(changeDir);
    fs.writeFileSync(path.join(essayDir, "index.html"), renderEssayPage(essay));
    fs.writeFileSync(path.join(changeDir, "index.html"), renderChangePage(essay));
  }

  const aboutPath = path.join(ABOUT_DIR, "index.html");
  if (!fs.existsSync(aboutPath)) {
    const aboutContent = renderShell({
      title: "About",
      content: `<section class="about">
  <h2>About</h2>
  <p>Add a bio here. This page is generated by render.js.</p>
</section>`,
    });
    fs.writeFileSync(aboutPath, aboutContent);
  }
}

build();
