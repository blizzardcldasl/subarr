# Running Subarr in Docker

Subarr has no built-in authentication. Do not expose the container directly to the internet; use a reverse proxy with auth, a VPN, or Unraid-only LAN access.

## Fork and Git remotes

1. On GitHub, fork [derekantrican/subarr](https://github.com/derekantrican/subarr) to your account.
2. Point `origin` at your fork and keep `upstream` for the original repo:

```bash
git remote set-url origin https://github.com/<your-username>/subarr.git
git remote add upstream https://github.com/derekantrican/subarr.git   # skip if already present
git fetch upstream
```

To pull upstream changes: `git fetch upstream && git merge upstream/master` (or `main`, if upstream renames).

3. Push your branch (including Docker-related commits) to your fork: `git push -u origin master`.

## Configuration

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port inside the container (default `3001`). |
| `NODE_ENV` | Set to `production` in the image. |
| `SUBARR_DB_PATH` | Optional. Absolute path to the SQLite file (e.g. `/config/subarr.db`). Parent directory is created if needed. If unset, the database is `server/subarr.db` next to the app (not ideal for persistence unless you mount that path carefully). |
| `SUBARR_LOG_DIR` | Optional. If set (e.g. `/config/logs`), mirrors `console.log` / `warn` / `error` to `subarr.log` in that folder. Set to `0` or `false` to disable file logging. |
| `SUBARR_LOG_MAX_MB` | When `subarr.log` exceeds this size (default `10`), it is rotated to `subarr.previous.log`. |

## Build and run (local)

```bash
docker compose build
docker compose up -d
```

Open `http://localhost:7979` (host port from [docker-compose.yml](docker-compose.yml); container listens on `3001`).

Check the API: `curl -s http://localhost:7979/api/meta`

Stop: `docker compose down`

## Data persistence

[docker-compose.yml](docker-compose.yml) uses Unraid-style bind mounts by default: `/mnt/user/appdata/subarr` → `/config`, `/mnt/user/Youtube` → `/downloads`, host port **7979** → `3001`. On a dev machine without those paths, edit the file to use local directories.

For a named volume instead of bind mounts:

```yaml
volumes:
  - subarr-config:/config
  - subarr-downloads:/downloads
```

The image starts with a short root [docker-entrypoint.sh](docker-entrypoint.sh) step that `mkdir`s the directory for `SUBARR_DB_PATH` and `chown`s it to user `node` (uid 1000, from the official Node image) so named volumes and bind mounts work without manual permissions.

Ensure the host directory exists for bind mounts. If something still blocks writes, `chown` the host folder to `1000:1000` or override the user in Compose (many Unraid appdata dirs use `nobody` / `users`, often `99:100`):

```yaml
user: "99:100"
```

## Unraid

1. Create a folder for config, e.g. `/mnt/user/appdata/subarr`.
2. **Docker Compose** (Unraid 6.12+): add a stack, paste a variant of [docker-compose.yml](docker-compose.yml), set the bind mount to your appdata path, set the host port under **Settings** for the stack (e.g. map `7979:3001`).
3. **Custom Docker** (web UI):  
   - **Repository**: your image from GHCR (after CI publishes), e.g. `ghcr.io/<your-username>/subarr:master`, or build locally and reference `subarr:local`.  
   - **Port**: map a host port to container `3001`.  
   - **Path**: add a path `/mnt/user/appdata/subarr` → container `/config`.  
   - **Path** (downloads): add `/mnt/user/media/YouTube` (or any share/folder you want) → container `/downloads` so yt-dlp can write videos there.  
   - **Variable**: `SUBARR_DB_PATH` = `/config/subarr.db`.  
   - **Variable**: `PORT` = `3001` (optional if you keep the default).

4. Start the container and open `http://<unraid-ip>:<host-port>`.

## yt-dlp downloads (best quality → Unraid folder)

The image includes **yt-dlp** and **ffmpeg**. Downloads go under **`/downloads`** inside the container—map that to a folder on your Unraid array (see [docker-compose.yml](docker-compose.yml) volume `subarr-downloads`, or replace it with a bind mount).

1. **Compose / Unraid stack** — use a bind mount so files land on a real share, for example:

   ```yaml
   volumes:
     - /mnt/user/appdata/subarr:/config
     - /mnt/user/media/YouTube:/downloads
   ```

   Create the YouTube (or whatever) folder on the server first, or let Docker create it when the container starts.

2. **Subarr UI** — **Settings → Post Processors → Add**, pick template **“yt-dlp (per-playlist folder, title_date)”** (or create manually):
   - **Type:** Process  
   - **Target:** `/usr/local/bin/yt-dlp`  
   - **Args** (default): merge **best video + best audio** into **MKV** via ffmpeg. Output path uses Subarr variables (good for Emby/Plex libraries):

   | Variable | Meaning |
   |----------|---------|
   | `[[playlist.title]]` | Playlist / subscription title (as stored in Subarr) |
   | `[[playlist.title_fs]]` | Same, sanitized for filenames |
   | `[[video.title]]` | Video title |
   | `[[video.title_fs]]` | Video title sanitized for filenames |
   | `[[video.published_date]]` | `YYYY-MM-DD` from the RSS publish date |
   | `[[video.published_at]]` | Full timestamp string from RSS |

   Default layout: one **subfolder per playlist** (subscription name), then `title_date.ext` — e.g. `/downloads/My Channel/My Video_2025-04-30.mkv`.

   Format selector: `bestvideo*+bestaudio/best` (falls back to a single “best” file if muxing is not possible). For **MP4** instead of MKV, change `--merge-output-format mkv` to `mp4`. For a **flat** layout (no subfolders), use `-o "/downloads/[[playlist.title_fs]]_[[video.title_fs]]_[[video.published_date]].%(ext)s"`.

3. **Permissions** — the entrypoint `chown`s `/downloads` for user `node` (uid 1000). If the host folder is owned by `nobody`/`99`, either `chown` that folder to `1000:1000` on Unraid or add `user: "99:100"` to the compose service and align ownership.

Webhook post-processors do not need yt-dlp. If you prefer to run **yt-dlp on the Unraid host** instead of in the container, keep only a **Process** target that points to a script inside a **mounted** path (not covered here—the in-image path above is the supported setup).

## Unraid Community Applications template

Import [unraid/my-subarr.xml](unraid/my-subarr.xml) as a user template (or paste into **Docker → Add Container → Click here to import**). Default paths: appdata `/mnt/user/appdata/subarr`, downloads `/mnt/user/Youtube`, single Web UI mapping **7979** → container **3001**. The template uses Unraid’s `Config` elements for every setting (including PUID/PGID as `Type="Variable"`); the `WebUI` link uses `[PORT:7979]` to match the default **host** port, not the container port.

## Prebuilt images (GitHub Container Registry)

If [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) is enabled on your fork, images are published to `ghcr.io/<owner>/subarr`. Pull on Unraid instead of building on the NAS.

On first use, set the package visibility to public or grant your account access to the private package.
