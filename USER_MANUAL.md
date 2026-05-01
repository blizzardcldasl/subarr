# Subarr user manual

Subarr is a lightweight web app that watches YouTube **playlists** via RSS, shows new uploads in an *arr-style UI, and can run **post-processors** (webhooks or shell commands such as yt-dlp) when a new video appears.

**Security:** Subarr does **not** ship with login or API keys. Run it on a trusted LAN, behind a VPN, or behind a reverse proxy that adds authentication. Do not expose it directly to the public internet.

---

## Table of contents

1. [Installation](#installation)
2. [Web interface overview](#web-interface-overview)
3. [Playlists and RSS limits](#playlists-and-rss-limits)
4. [Settings](#settings)
5. [Post-processors](#post-processors)
6. [Log files](#log-files)
7. [Data and backup](#data-and-backup)
8. [Environment variables](#environment-variables)
9. [Troubleshooting](#troubleshooting)

---

## Installation

### Option A: Node.js (from source)

- **Node.js 18+**
- Clone the repo, then from the repository root:

```bash
npm install
npm run start-server   # Windows: npm run start-server-win
```

The first run builds the React client and starts the API + UI in production mode. Optional: create `server/.env` with `PORT=5000` (or any free port).

### Option B: Docker

See **[DOCKER.md](DOCKER.md)** for `docker compose`, image variables, volumes, and GitHub Container Registry images.

### Option C: Unraid

Import the template **[unraid/my-subarr.xml](unraid/my-subarr.xml)** (or your fork’s copy), set **appdata**, **downloads**, **Web UI port**, **PUID/PGID**, then apply. Defaults assume container port **3001** mapped to a host port (e.g. **7979**).

---

## Web interface overview

- **Playlists** — Add playlist IDs, set check intervals, optional regex filters, open the activity feed.
- **Settings** — Global options (e.g. exclude shorts), **YTSubs.app** integration, **post-processors** list and editor.

Open the URL shown in the terminal or your Docker/Unraid mapping (e.g. `http://YOUR_SERVER:7979`).

---

## Playlists and RSS limits

Subarr uses YouTube’s **RSS feeds**, not the full YouTube API or yt-dlp for discovery. That keeps the app light, but RSS has limits (see the upstream README): roughly the **latest 15** items in the feed, ordering quirks on large playlists, and delays on the order of **~15 minutes**. Subarr is aimed at “new uploads on subscriptions,” not full channel archives.

Supported playlist id prefixes include **PL**, **UU**, **LL**, **FL** (standard YouTube playlist / uploads list forms).

---

## Settings

- **Exclude shorts** — When enabled, items whose link looks like a Short may be skipped (including on non-UU playlist types where applicable).
- **YTSubs.app** — Optional: import/sync subscriptions from [YTSubs.app](https://ytsubs.app) if you use that workflow (see in-app fields).
- **Post processors** — Add, edit, delete, and order actions that run when a **new** video is detected for a playlist.

---

## Post-processors

Two types:

| Type | Purpose |
|------|--------|
| **Webhook** | HTTP request (e.g. Discord, Raindrop.io). Body/URL can include placeholders. |
| **Process** | Run an executable with arguments (e.g. **yt-dlp**). Paths must exist **inside** the container (or on a mounted volume). |

### Placeholders (process and webhook text)

| Placeholder | Meaning |
|-------------|--------|
| `[[playlist.title]]` | Playlist title in Subarr |
| `[[playlist.title_fs]]` | Same, sanitized for file paths |
| `[[video.title]]` | Video title |
| `[[video.title_fs]]` | Sanitized video title |
| `[[video.video_id]]` | YouTube video id |
| `[[video.published_at]]` | Publish time string from RSS |
| `[[video.published_date]]` | `YYYY-MM-DD` for filenames |
| `[[video.thumbnail]]` | Thumbnail URL |

Built-in templates (e.g. Discord, **yt-dlp** with per-playlist folders) are available in the post-processor dialog; adjust paths and formats to match your system.

**yt-dlp (Docker image from this fork):** The image includes **yt-dlp** and **ffmpeg**. Map a host folder to **`/downloads`** and use the template that writes under `/downloads/...`. See **DOCKER.md** for details.

---

## Log files

From **v1.3** (fork), if **`SUBARR_LOG_DIR`** is set to a directory path, Subarr mirrors normal server output:

- **`subarr.log`** — ongoing append-only log  
- **`subarr.previous.log`** — previous file after rotation  

**Rotation:** When `subarr.log` exceeds **`SUBARR_LOG_MAX_MB`** (default **10** MB), it is renamed to `subarr.previous.log` and a new `subarr.log` is started (single backup).

**Docker default:** `SUBARR_LOG_DIR=/config/logs` (same appdata volume as the database). View with:

```bash
docker exec -it CONTAINER_NAME tail -f /config/logs/subarr.log
```

If **`SUBARR_LOG_DIR`** is unset, empty, **`0`**, or **`false`**, only the process console receives logs (no log files).

---

## Data and backup

- **Database** — SQLite. Default in Docker: **`SUBARR_DB_PATH=/config/subarr.db`**. Copy that file (with Subarr stopped) for a cold backup.
- **Logs** — Optional under `SUBARR_LOG_DIR` as above.

---

## Environment variables

| Variable | Typical value | Notes |
|----------|----------------|-------|
| `PORT` | `3001` | HTTP listen port **inside** the container. |
| `NODE_ENV` | `production` | Required for the built-in static UI. |
| `SUBARR_DB_PATH` | `/config/subarr.db` | SQLite file; parent dir is created if needed. |
| `SUBARR_LOG_DIR` | `/config/logs` or unset | File logging; `0` / `false` disables. |
| `SUBARR_LOG_MAX_MB` | `10` | Rotation threshold in megabytes. |
| `PUID` / `PGID` | e.g. `99` / `100` | Used by the Docker **entrypoint** on this fork to match Unraid share ownership (see **DOCKER.md**). |

---

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| UI does not load | `NODE_ENV=production`, client build present, correct **host → container** port mapping. |
| Database errors | Writable `SUBARR_DB_PATH` directory; **PUID/PGID** and volume permissions on Unraid. |
| Post-processor fails | Executable path inside the container; arguments and quotes; check **`subarr.log`** and the in-app **activity** list. |
| yt-dlp errors | **ffmpeg** present (included in this fork’s image); **`/downloads`** mounted and writable. |
| No log files | Is **`SUBARR_LOG_DIR`** set? Is the directory writable after **chown**? |

For Docker-specific behavior (volumes, GHCR tags, Unraid template), use **DOCKER.md** and your template’s **Overview** text.

---

## Upstream and forks

Original project: **https://github.com/derekantrican/subarr**  

This manual describes behavior including **Docker**, **logging**, and **filename placeholders** added in maintained forks; always check your fork’s **README** and **DOCKER.md** for differences.
