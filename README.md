# Deploy and Host Materialious on Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/materialious?referralCode=sLjDXb&utm_medium=integration&utm_source=button&utm_campaign=materialious)

[Materialious](https://github.com/Materialious/Materialious) is a modern Material Design client for YouTube, built on Invidious. You get a clean, fast YouTube without ads or tracking. It has accounts that sync subscriptions, history and settings across devices, SponsorBlock segment skipping, DeArrow titles and thumbnails, Return YouTube Dislike counts, chapters, playlists and watch parties. This template runs Materialious with its own private Invidious backend, so you don't depend on a public instance.

## About Hosting Materialious

The stack is four services: Materialious, Invidious, Invidious Companion and Postgres.

- **Materialious** (`wardpearce/materialious-full`, pinned) is the app you open. It includes the built-in account system and a CORS proxy, so Invidious needs no extra proxy configuration. Accounts, subscriptions and history are stored in SQLite on a volume. Subscriptions and history are end-to-end encrypted with a key derived from your password.
- **Invidious** (`quay.io/invidious/invidious`, pinned) fetches video data from YouTube. It has its own public domain because your browser streams video from it.
- **Companion** fetches the video streams and proof-of-origin tokens for Invidious. It runs on the private network only.
- **Postgres** stores Invidious data. Invidious sign-ups are turned off, since you use Materialious accounts.

**Sign-ups close after you register.** On first boot, sign-ups are open only until the `ADMIN_USERNAME` account (default `admin`) exists. A small wrapper ([source](https://github.com/two-workspaces/materialious)) then restarts Materialious with sign-ups closed. That account also gets the admin panel. The app and its video proxy need a login, so strangers can't use your instance.

**Small footprint.** Measured idle: Materialious ~130 MB, Postgres ~90 MB, Invidious ~35 MB, plus Companion. It runs on the Free plan.

## Common Use Cases

- A personal YouTube front end with no ads, tracking, or Google account
- A shared YouTube client for your family, with separate synced subscriptions and history
- Watching from any browser on desktop, phone or TV against one private backend
- Watch parties with friends, synced playback in the browser
- Replacing a public Invidious instance that is overloaded or blocked

## Dependencies for Materialious Hosting

- Invidious and Invidious Companion (included)
- Postgres 16 (included, private network only)

### Deployment Dependencies

- [Materialious on GitHub](https://github.com/Materialious/Materialious)
- [Invidious documentation](https://docs.invidious.io/)
- [Template source on GitHub](https://github.com/two-workspaces/materialious)

### Implementation Details

**First sign-in.** When the deploy is green, open the Materialious domain right away and create the account with the name in `ADMIN_USERNAME`. Within a few seconds sign-ups close. To add family or friends, set `PUBLIC_REGISTRATION_ALLOWED` to `true` on the Materialious service, let them sign up, then set it back to `false`. Remove the variable entirely to return to the automatic first-user gate. Quick Connect lets a signed-in device log in another device with a short code.

**Videos won't play?** YouTube sometimes blocks datacenter IPs, including Railway's. Most videos play, but some show *"This helps protect our community"* or Invidious waits for a PO token. The fix is to add `YOUTUBE_SESSION_COOKIES` to the **Companion** service with cookies from a logged-in **burner** Google account. Use a private window, then log out before closing it, as described in the [yt-dlp cookie guide](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies). A residential proxy in `PROXY` on Companion works too. Background: [Invidious YouTube errors explained](https://docs.invidious.io/youtube-errors-explained/).

**Customizing.** Default settings for new users (theme color, region, player options) go in `PUBLIC_DEFAULT_SETTINGS` as JSON. Export your own from Settings → Export/Import. SponsorBlock, DeArrow and dislike counts use their public APIs. Override them with `PUBLIC_DEFAULT_SPONSERBLOCK_INSTANCE`, `PUBLIC_DEFAULT_DEARROW_INSTANCE` and `PUBLIC_DEFAULT_RETURNYTDISLIKES_INSTANCE`, or set one empty to turn it off. History older than 365 days is deleted; change it with `HISTORY_CULLING` (`-1` keeps it forever).

**Custom domain.** Add the domain to the Materialious service and set `ORIGIN` to `https://your.domain`.

**Upgrading.** Bump the `FROM` tag in the Dockerfile of your fork. Bump Invidious and Companion together by changing their image tags to the newest dated tags on [quay.io](https://quay.io/repository/invidious/invidious?tab=tags). If metadata starts failing with "YouTube API returned status code 400", a fresh Invidious image is usually the fix.

**Back up.** Materialious accounts live in `/materialious-data` on the Materialious volume. Use Railway's volume backups.

## Why Deploy Materialious on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Materialious on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
