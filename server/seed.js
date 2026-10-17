// One-time setup: creates the database (if missing) and tables, imports the original gallery
// images (only if the table is empty) and creates/updates the admin user.
// Usage: npm run seed
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// The images that were hard-coded in assets/js/gallery.js. `home` = shown on the home page.
const IMG = 'assets/images/';
const ORIGINAL = [
  { src: 'sig-french.webp', w: 396, h: 296, title: 'French Elegance', tags: 'french,bridal', alt: 'Classic French manicure with crisp white tips' },
  { src: 'sig-chrome.webp', w: 402, h: 296, title: 'Pearl Chrome', tags: 'chrome', alt: 'Pearly pink chrome nails with a glazed finish' },
  { src: 'sig-floral.webp', w: 402, h: 296, title: 'Cherry Blossom', tags: 'floral', alt: 'Sheer pink nails with hand-painted white blossoms' },
  { src: 'sig-glam.webp', w: 398, h: 296, title: 'Gilded Bride', tags: 'bridal,glitter', alt: 'Milky nude bridal nails with delicate gold leaf' },
  { src: 'hero.webp', w: 1218, h: 712, title: 'Golden Bloom', tags: 'floral,bridal', alt: 'Almond nude nails with gold lines and white flowers' },
  { src: 'g-french.webp', w: 254, h: 204, title: 'Soft French', tags: 'french,minimal', alt: 'Soft French manicure on almond nails', home: 1 },
  { src: 'g-pink-glitter.webp', w: 256, h: 204, title: 'Rosé Shimmer', tags: 'glitter', alt: 'Rose pink glitter nails with a shimmer finish', home: 1 },
  { src: 'g-blue-gold.webp', w: 256, h: 204, title: 'Powder Blue & Gold', tags: 'glitter,floral', alt: 'Powder blue nails with gold foil stars', home: 1 },
  { src: 'g-burgundy.webp', w: 256, h: 204, title: 'Merlot Luxe', tags: 'minimal', alt: 'Deep burgundy glossy nails with gold accent', home: 1 },
  { src: 'g-ombre.webp', w: 254, h: 204, title: 'Aura Ombré', tags: 'chrome,minimal', alt: 'Pastel aura ombré nails in pink, lilac and mint', home: 1 },
  { src: 'g-red-heart.webp', w: 256, h: 204, title: 'Love Letter', tags: 'minimal', alt: 'Red and nude nails with hand-drawn heart details', home: 1 },
  { src: 'g-minimal-leaf.webp', w: 256, h: 204, title: 'Botanical Line', tags: 'minimal,floral', alt: 'Nude nails with minimal black leaf line art', home: 1 },
  { src: 'g-pink-chrome.webp', w: 256, h: 204, title: 'Glazed Pearl', tags: 'chrome', alt: 'Glazed pearl chrome nails in soft pink', home: 1 },
  { src: 'cta-hand.webp', w: 972, h: 282, title: 'Dandelion Nude', tags: 'floral,french', alt: 'Nude coffin nails with white dandelion art' },
];

async function ensureDatabase(url) {
  const target = new URL(url);
  const dbName = decodeURIComponent(target.pathname.slice(1));
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rowCount) {
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`✔ created database "${dbName}"`);
  }
  await client.end();
  return dbName;
}

async function main() {
  const { DATABASE_URL, ADMIN_USER, ADMIN_PASS } = process.env;
  if (!DATABASE_URL) throw new Error('Set DATABASE_URL in .env first (copy .env.example).');

  const dbName = await ensureDatabase(DATABASE_URL);
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  await db.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  console.log(`✔ tables ready in "${dbName}"`);

  const { rows: [{ n }] } = await db.query('SELECT COUNT(*)::int AS n FROM gallery_images');
  if (n === 0) {
    for (const [i, d] of ORIGINAL.entries()) {
      await db.query(
        'INSERT INTO gallery_images (src, title, alt_text, tags, width, height, sort_order, show_on_home) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [IMG + d.src, d.title, d.alt, d.tags, d.w, d.h, i + 1, !!d.home]
      );
    }
    console.log(`✔ imported ${ORIGINAL.length} original gallery images`);
  } else {
    console.log(`• gallery already has ${n} images — skipped import`);
  }

  if (ADMIN_USER && ADMIN_PASS) {
    const hash = await bcrypt.hash(ADMIN_PASS, 12);
    await db.query(
      'INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash',
      [ADMIN_USER, hash]
    );
    console.log(`✔ admin user "${ADMIN_USER}" ready`);
  } else {
    console.log('• ADMIN_USER / ADMIN_PASS not set — no admin user created');
  }

  await db.end();
}

main().catch((err) => {
  console.error('✖', err.message);
  process.exit(1);
});
