#!/bin/sh
set -e

# Create persistent directories (Azure persists /home across restarts)
mkdir -p /home/data /home/uploads

# Symlink uploads into public dir so Next.js serves uploaded files
ln -sfn /home/uploads /app/public/uploads

# Run drizzle migrations to ensure schema is up to date
# (safe to run every startup — only applies new migrations)
if [ -d "/app/drizzle" ]; then
  echo "Running database migrations..."
  cd /app && node -e "
    const Database = require('better-sqlite3');
    const fs = require('fs');
    const path = require('path');
    const dbPath = process.env.DB_PATH || '/home/data/app.db';
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create drizzle migrations table if needed
    db.exec(\`CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER
    )\`);

    // Get applied migrations
    const applied = new Set(
      db.prepare('SELECT hash FROM __drizzle_migrations').all().map(r => r.hash)
    );

    // Read and apply pending migrations
    const migrationsDir = path.join('/app', 'drizzle');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const hash = file.replace('.sql', '');
      if (!applied.has(hash)) {
        console.log('Applying migration:', file);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        db.exec(sql);
        db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(hash, Date.now());
      }
    }

    db.close();
    console.log('Migrations complete.');
  "
fi

# Seed templates if the table is empty (safe to run every startup)
NEED_SEED=$(cd /app && node -e "
  const Database = require('better-sqlite3');
  const dbPath = process.env.DB_PATH || '/home/data/app.db';
  const db = new Database(dbPath);
  try {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM task_templates').get();
    console.log(row.cnt === 0 ? 'yes' : 'no');
  } catch (e) {
    console.log('yes');
  }
  db.close();
" 2>/dev/null || echo "yes")

if [ "$NEED_SEED" = "yes" ]; then
  echo "Seeding task templates and settings..."
  node /app/seeds/seed.js
  node /app/seeds/seed-contracting.js
  node /app/seeds/seed-settings.js
  echo "Database seeded successfully."
fi

# Start the Next.js app
echo "Starting application on port ${PORT:-3000}..."
exec node server.js
