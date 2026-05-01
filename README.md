# Subarr (fork)

This repository is a **maintained fork** of **[derekantrican/subarr](https://github.com/derekantrican/subarr)** — a lightweight, *arr-style web UI for following YouTube playlists via **RSS**, then running **webhooks** or **shell processes** (for example **yt-dlp**) when new uploads appear.

**Upstream:** [github.com/derekantrican/subarr](https://github.com/derekantrican/subarr)  
**This fork:** [github.com/blizzardcldasl/subarr](https://github.com/blizzardcldasl/subarr)

If you want the original author’s background, comparison table, and RSS limitations in full detail, read the **upstream README** (this fork’s file is shortened and deployment-focused).

![Subarr UI screenshot](https://github.com/user-attachments/assets/dd9b42d8-08e9-4d9a-a175-acf7219d059a)

---

## Security

Subarr has **no built-in authentication**. Do not expose it directly to the internet. Use LAN-only access, a VPN, or a reverse proxy with auth.

---

## Documentation in this fork

| Doc | Purpose |
|-----|--------|
| **[USER_MANUAL.md](USER_MANUAL.md)** | Day-to-day use: playlists, post-processors, logs, troubleshooting |
| **[DOCKER.md](DOCKER.md)** | Docker Compose, env vars, volumes, GHCR, Unraid notes |
| **[unraid/my-subarr.xml](unraid/my-subarr.xml)** | Unraid user template (paths, ports, PUID/PGID) |

---

## Quick start (recommended): Docker

Prebuilt images (when CI is enabled on your fork): **`ghcr.io/blizzardcldasl/subarr`** (see tags on the **Packages** tab).

From a clone of **this** repo:

```bash
docker compose up --build -d
```

Defaults in `docker-compose.yml` assume Unraid-style paths (`/mnt/user/appdata/subarr`, `/mnt/user/Youtube`). Adjust for your host.

---

## Quick start: Node (development / non-Docker)

Requires **Node.js 18+**.

```bash
git clone https://github.com/blizzardcldasl/subarr.git
cd subarr
npm install
npm run start-server   # Windows: npm run start-server-win
```

Optional: `server/.env` with `PORT=3001` (or any free port).

---

## What this fork adds (diff vs upstream)

High-level changes not present in the upstream repo as shipped:

- **Docker** — multi-stage image (`Dockerfile`), `.dockerignore`, `docker-compose.yml`
- **GitHub Actions** — publish to **GHCR** (`.github/workflows/docker-publish.yml`)
- **Unraid** — `unraid/my-subarr.xml` template + `unraid/subarr-icon.svg`
- **Persistent SQLite path** — `SUBARR_DB_PATH` (see `server/db.js`)
- **File logging** — `SUBARR_LOG_DIR` / `SUBARR_LOG_MAX_MB` + `server/logger.js`
- **Container runtime** — `docker-entrypoint.sh` with **PUID/PGID** via `setpriv`, `/downloads` for yt-dlp output
- **Image includes** — **yt-dlp** + **ffmpeg** for process post-processors
- **Post-processor UX** — clearer labels, yt-dlp defaults helper, template auto-apply
- **Filename placeholders** — `[[playlist.title_fs]]`, `[[video.title_fs]]`, `[[video.published_date]]`, etc. (`server/postProcessors.js`)
- **Initial / manual backfill** — run post-processors on recent items after add; **Run now** on playlist page + `POST /api/playlists/:id/backfill`
- **Richer process logs** — pid, duration, stdout/stderr tails (`server/utils.js`)

To see a **git diff** against upstream after adding `upstream`:

```bash
git remote add upstream https://github.com/derekantrican/subarr.git  # if not already added
git fetch upstream
git diff upstream/master...HEAD
```

GitHub compare (adjust branch names if yours differ):  
[Compare upstream master…this fork](https://github.com/blizzardcldasl/subarr/compare/derekantrican:master...master)

---

## RSS model (short)

Subarr discovers updates via YouTube **RSS** feeds — lightweight, but feeds are effectively limited to roughly the **latest ~15** entries and can lag. This fork can **backfill** recent items for downloads/webhooks; it does not turn Subarr into a full historical indexer. See upstream README for the full limitation list.

---

## Contributing / syncing upstream

1. Fetch and merge (or rebase) from `upstream` when you want upstream fixes.
2. Open PRs on **this fork** for Docker, Unraid, or ops changes; consider opening useful generic fixes upstream to **derekantrican/subarr** as well.

---

## License

Same as upstream unless otherwise noted (see repository **License** file if present).
