-- Nails by Anter — gallery tables (PostgreSQL). Safe to run repeatedly.
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id           SERIAL PRIMARY KEY,
  src          VARCHAR(255) NOT NULL,              -- path relative to site root, e.g. assets/images/gallery/abc.webp
  title        VARCHAR(120) NOT NULL DEFAULT '',
  alt_text     VARCHAR(255) NOT NULL DEFAULT '',
  tags         VARCHAR(255) NOT NULL DEFAULT '',   -- comma list: french,chrome,bridal,floral,minimal,glitter
  width        INTEGER      NOT NULL DEFAULT 0,
  height       INTEGER      NOT NULL DEFAULT 0,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  show_on_home BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_order ON gallery_images (is_active, sort_order);
