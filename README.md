# CRICKET - real-time messenger

Telegram-inspired private messaging in blue/dark. Node.js + Express + Socket.IO on the server, plain HTML/CSS/JavaScript in the browser.

**All data lives in server RAM** (JavaScript `Map`/`Set`/objects): accounts, sessions, chats, messages, profiles, contacts, block lists. There is no database, no Firebase, no admin panel. Uploaded files are kept in `public/uploads/` only while the server runs, and that folder is emptied on every start. **Restarting the server erases everything.**

## Project layout

```
cricket/
├── server.js            Express + Socket.IO server, all in-memory stores
├── package.json
├── README.md
└── public/
    ├── index.html       single-page UI
    ├── style.css        blue/dark responsive theme
    ├── app.js           client logic (vanilla JS)
    └── uploads/         temporary media (never served statically)
```

## Install and run

Requires **Node.js 18 or newer** (check with `node -v`).

```bash
cd cricket
npm install
npm start
```

Open http://localhost:3000, sign up, then open a second browser (or a private window) and sign up as another user to chat.

Other devices on your Wi-Fi/LAN can use the `Network:` address printed at start-up, for example `http://192.168.1.20:3000`.

### Optional environment variables

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Interface to bind |
| `TRUST_PROXY` | `1` | Number of reverse proxies in front of the app. Use `0` if exposed directly to the internet with no proxy |
| `ALLOWED_ORIGINS` | empty | Extra comma-separated origins allowed to call the API/WebSocket |
| `MAX_USERS` | `5000` | Cap on accounts held in RAM |

Example: `PORT=8080 npm start`

## Making it reachable over the internet

You have to run the server somewhere that is reachable. Pick one:

**A. Quick public HTTPS link (testing, no server needed)** - run CRICKET, then in a second terminal use a tunnel:

```bash
# Cloudflare (install cloudflared first)
cloudflared tunnel --url http://localhost:3000
# or ngrok
ngrok http 3000
```

Share the `https://...` address it prints.

**B. VPS / cloud VM (Ubuntu example)**

```bash
# install Node 20+ (see nodesource.com), copy the project up, then:
cd cricket && npm install --omit=dev
sudo ufw allow 3000/tcp          # or put a proxy in front (below)
npm start                         # use pm2 / systemd to keep it running
```

**C. HTTPS with your own domain (recommended)** - Caddy gets certificates automatically and proxies WebSockets:

```bash
caddy reverse-proxy --from chat.example.com --to localhost:3000
```

The default `TRUST_PROXY=1` is correct for this setup.

**Important**
- **Use HTTPS** when real people use it. Browsers only allow microphone access (voice messages) on HTTPS or `localhost`, and session cookies are marked `Secure` automatically over HTTPS.
- **Run exactly one instance.** State is in that process' RAM, so do not scale horizontally or use serverless platforms. Any host that runs one long-lived Node process works (VPS, Render, Railway, Fly.io single machine, etc.).
- Keep the process alive: `npm install -g pm2 && pm2 start server.js --name cricket`. Restarting it wipes all data.

## Features

- **Accounts**: signup with email + username + password; log in with email *or* username; unique usernames (case-insensitive); scrypt password hashing; httpOnly cookie sessions.
- **Profiles**: profile photo (auto-validated), display name, bio, username change with live availability check, online / last-seen status.
- **Chat**: search users by username, private 1:1 chats, instant delivery, typing indicator, sent / delivered / seen ticks, timestamps and day separators, delete message (for me / for everyone), delete conversation (for me / for everyone), photos, videos, voice messages (record in browser), auto-reconnect with resync.
- **Privacy**: block / unblock, change password (signs out other devices), logout, contacts list, chats are only visible to their two participants.
- **UI**: sidebar (Chats, Contacts, Profile, Settings), search bar on top, chat list with avatars and last message, responsive desktop and mobile layout.
- **Animations & themes**: animated aurora background and glass headers, spring pop-in for new messages, staggered chat list, press ripples, glowing buttons, animated typing dots and online rings, sliding tab indicators. Settings > Appearance offers 6 accent colour themes (saved on the device). All motion switches off automatically for users who enable "reduce motion" in their OS.

## Security notes

- Passwords: scrypt with a random salt per user, constant-time comparison, dummy hash on unknown users (no timing leak). Passwords and session tokens are never sent to other users and the session cookie is `httpOnly` (not readable by JavaScript).
- All input is validated and cleaned on the server (length limits, control / bidi characters removed). User text is only ever inserted with `textContent`, so it cannot run as HTML. A strict Content-Security-Policy is sent.
- Uploads: size limits (photo 10 MB, video 60 MB, voice 10 MB, avatar 5 MB), file type decided by magic bytes (not file name or declared type), random file names, and files are only served through authenticated routes to participants of that chat.
- Rate limits on login, signup, search, uploads, messaging and profile changes; cross-origin write requests and WebSocket connections are rejected.

## Limits

Everything is temporary by design: a server restart or crash loses all accounts and messages, and users have to sign up again. One server process only. Maximum 5,000 messages kept per chat (oldest are dropped).
