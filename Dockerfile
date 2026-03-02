# ── Stage 1: Install dependencies ────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build the Next.js app ──────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pass commit SHA for build versioning
ARG GITHUB_SHA=""
ENV GITHUB_SHA=${GITHUB_SHA}

# Build Next.js (standalone output)
RUN npm run build

# Bundle seed scripts into a single JS file for first-run seeding
# Uses esbuild (included with Next.js) — keeps better-sqlite3 external (native module)
RUN npx esbuild src/db/seed.ts src/db/seed-contracting.ts src/db/seed-settings.ts \
  --bundle --platform=node --format=cjs \
  --outdir=/app/seeds \
  --external:better-sqlite3

# ── Stage 3: Production image ───────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache python3 make g++
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Data directory for SQLite DB + uploads
# Azure App Service persists /home across restarts
ENV DB_PATH=/home/data/app.db
ENV UPLOADS_DIR=/home/uploads

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy drizzle migrations
COPY --from=builder /app/drizzle ./drizzle

# Copy compiled seed bundles + native module needed at runtime
COPY --from=builder /app/seeds ./seeds
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

# Copy startup script
COPY scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
