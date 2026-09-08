# Toy Gallery

Your whole collection in one place — see everything at a glance, keep the details that matter, and track your sessions and progress over time.

It runs on your own machine, so your collection stays yours. Nothing is shared, nothing is tracked, nothing leaves your device.

## Highlights

- **Your collection at a glance.** Every toy gets its own picture that matches its real shape and size, so you recognize each one instantly — drawn in a built-in editor, no photos needed.
- **Keep the details that matter.** Brand, model, size, color, and any notes or fields you want to add.
- **Track your sessions.** Jot down what you reached for and when, then watch your activity and progress build up over time.
- **Your session photos and videos, right there.** Shots taken during a session appear on it automatically, straight from your own photo library — nothing gets uploaded or copied.
- **Works on any screen.** Looks right whether you're on your laptop or your phone.
- **Light and dark.** Pick whichever's easier on the eyes.
- **Always yours to take.** Export your entire collection any time, and bring it back just as easily.

## A look inside

Browse your whole collection as roomy cards or a compact list, and look back over your sessions — all in light or dark, whichever suits the moment.

<table>
  <tr>
    <td width="50%"><img src="docs/shot-gallery.png" alt="Gallery — list view in dark mode beside cards in light mode" /></td>
    <td width="50%"><img src="docs/shot-sessions.png" alt="Sessions view in light and dark mode" /></td>
  </tr>
</table>

## Run it on your own machine

You need [Docker](https://docs.docker.com/get-docker/) installed. The app ships as a single image — `ghcr.io/off-by-one-pixel/toy-gallery:latest` — that bundles the backend, the frontend, and an embedded database. No separate database service to run, no extra setup.

Pick one of the two ways below.

### With `docker run`

```bash
docker run -d \
  --name toy-gallery \
  -p 8000:8000 \
  -v ./data:/data \
  -e INITIAL_USERNAME=admin \
  -e INITIAL_PASSWORD=change-me \
  ghcr.io/off-by-one-pixel/toy-gallery:latest
```

Open <http://localhost:8000>, sign in with the username and password you set above, and change the password.

### With Docker Compose

Save this as `docker-compose.yml` next to a folder named `data/`:

```yaml
services:
  toy-gallery:
    image: ghcr.io/off-by-one-pixel/toy-gallery:latest
    ports:
      - "8000:8000"
    volumes:
      - ./data:/data
    environment:
      INITIAL_USERNAME: admin
      INITIAL_PASSWORD: change-me
      # TRUSTED_ORIGINS: https://your.domain     # once you front this with HTTPS
    restart: unless-stopped
```

Then `docker compose up -d` in that folder.

### Where your data lives

Everything the app needs to keep — the database, an auto-generated secret key, migration archives — lives in the `data/` folder you mounted as `/data`. Back up that folder and you have backed up your whole instance. Move that folder to a different machine and the app picks up where it left off.

## Photos and videos for your sessions

If you take photos or videos during a session, the app can show them right on that session — matched automatically by when they were taken, viewable in a built-in full-screen viewer. This is entirely optional: the app works fully without it.

Your media never leaves your photo library. The app doesn't upload, copy, or store any of it — it only looks up what was taken around a session's time and displays it from the library directly, using short-lived viewing links. [Immich](https://immich.app/) is the supported library today; support for other media providers may come later.

To turn it on, set `IMMICH_URL` and `IMMICH_API_KEY` from the table below. Video playback quality follows your Immich transcoding settings.

You can also like individual photos and videos right from a session. Liked media is collected into an Immich album of your choice: create the album in Immich, then set `IMMICH_LIKED_ALBUM_ID` to its id (the UUID in the album's URL). The album is the source of truth — unliking removes the item from it, and anything you add to the album elsewhere shows up as liked here. Without the variable, the heart buttons simply don't appear.

## Configuration

All optional. Set only what you need.

| Variable           | Default            | What it does                                                                                                                |
|--------------------|--------------------|-----------------------------------------------------------------------------------------------------------------------------|
| `INITIAL_USERNAME` | unset              | Together with `INITIAL_PASSWORD`, creates the admin account on first run.                                                   |
| `INITIAL_PASSWORD` | unset              | Initial password for the admin account. Change it after first login.                                                        |
| `INITIAL_EMAIL`    | empty              | Optional email for the admin.                                                                                               |
| `TRUSTED_ORIGINS`  | empty              | Comma-separated list of public URLs the app is reached from once it's behind HTTPS.                                         |
| `DATA_DIR`         | `/data`            | Where SQLite, the secret key, and migration archives live inside the container. Change only if you mount somewhere else.    |
| `SECRET_KEY`       | auto-generated     | Set this to manage the Django secret key yourself.                                                                          |
| `PORT`             | `8000`             | Port the app listens on inside the container.                                                                               |
| `WORKERS`          | `3`                | Number of web workers. Bump it on bigger machines.                                                                          |
| `SSL_CERT_PATH`    | `$DATA_DIR/certs/cert.pem` | TLS certificate path inside the container. If this and `SSL_KEY_PATH` both exist, the app serves HTTPS directly.    |
| `SSL_KEY_PATH`     | `$DATA_DIR/certs/key.pem`  | Private key matching the certificate above.                                                                         |
| `IMMICH_URL`       | unset              | Base URL of your Immich server. Set together with `IMMICH_API_KEY` to show session photos and videos.               |
| `IMMICH_API_KEY`   | unset              | Immich API key used to find session media and create expiring share links. Needs only the `asset.read`, `sharedLink.read`, `sharedLink.create`, and `sharedLink.delete` permissions. |
| `IMMICH_PUBLIC_URL`| `IMMICH_URL`       | Immich URL as reachable from your browser, if it differs from the server-side one.                                  |
| `IMMICH_LIKED_ALBUM_ID` | unset         | Id of an existing Immich album that collects liked session media. Liking needs the API key to also have the `album.read` and `albumAsset.create`/`albumAsset.delete` permissions. |
| `SESSION_MEDIA_WINDOW_MINUTES` | `60`   | How far around a session's start time (both ways) to look for media.                                                |
| `SESSION_MEDIA_LINK_MINUTES` | `30`     | How long the short-lived Immich share links stay valid.                                                             |
