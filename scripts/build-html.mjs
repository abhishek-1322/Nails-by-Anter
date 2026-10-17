// Tiny static-site builder: wraps each src/pages/*.html in the shared layout
// and partials, then writes the result to the project root.
//
// Page files start with a JSON front-matter comment:
//   <!--- { "title": "...", "description": "...", "nav": "home" } --->
//
// Usage: node scripts/build-html.mjs [--watch]

import { readFileSync, writeFileSync, readdirSync, watch } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');
const SITE_URL = 'https://nails-by-anter.onrender.com'; // TODO: replace with the production domain

const read = (p) => readFileSync(join(SRC, p), 'utf8');
const FRONT_MATTER = /^<!---([\s\S]*?)--->\s*/;

function render(template, data) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => data[key] ?? '');
}

function buildPage(file) {
  const raw = read(join('pages', file));
  const match = raw.match(FRONT_MATTER);
  if (!match) throw new Error(`${file}: missing front-matter`);
  const meta = JSON.parse(match[1]);
  const content = raw.slice(match[0].length);
  const path = file === 'index.html' ? '' : file.replace(/\.html$/, '');

  const markActive = (html) =>
    meta.nav
      ? html.replaceAll(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" aria-current="page"`)
      : html;

  const scripts = (meta.scripts || [])
    .map((s) => `<script src="assets/js/${s}" defer></script>`)
    .join('\n  ');

  const html = render(read('partials/layout.html'), {
    title: meta.title,
    description: meta.description,
    canonical: `${SITE_URL}/${path}`,
    ogImage: `${SITE_URL}/assets/images/og-image.jpg`,
    robots: meta.noindex ? '<meta name="robots" content="noindex, follow">' : '',
    head: meta.head || '',
    bodyClass: meta.bodyClass || '',
    icons: read('partials/icons.svg'),
    header: markActive(read('partials/header.html')),
    footer: markActive(read('partials/footer.html')),
    stickyCta: meta.noStickyCta ? '' : read('partials/sticky-cta.html'),
    content,
    scripts,
  });

  writeFileSync(join(root, file), html);
  return file;
}

function buildAll() {
  const pages = readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.html'));
  const built = pages.map(buildPage);
  console.log(`[html] built ${built.length} pages: ${built.join(', ')}`);
}

buildAll();

if (process.argv.includes('--watch')) {
  let timer;
  watch(SRC, { recursive: true }, (_, name) => {
    if (!name || !/\.(html|svg)$/.test(name)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { buildAll(); } catch (e) { console.error(`[html] ${basename(name)}: ${e.message}`); }
    }, 60);
  });
  console.log('[html] watching src/ …');
}
