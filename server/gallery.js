// Shared gallery helpers
const TAGS = ['french', 'chrome', 'bridal', 'floral', 'minimal', 'glitter'];

// Accepts an array or comma string; keeps only known tags.
function cleanTags(input) {
  const list = Array.isArray(input) ? input : String(input || '').split(',');
  return [...new Set(list.map((t) => String(t).trim().toLowerCase()).filter((t) => TAGS.includes(t)))];
}

function toPublic(row) {
  return {
    id: row.id,
    src: row.src,
    title: row.title,
    alt: row.alt_text,
    tags: row.tags ? row.tags.split(',') : [],
    w: row.width,
    h: row.height,
  };
}

function toAdmin(row) {
  return { ...toPublic(row), active: !!row.is_active, home: !!row.show_on_home, order: row.sort_order };
}

module.exports = { TAGS, cleanTags, toPublic, toAdmin };
