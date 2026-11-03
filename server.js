'use strict';

/*
 * CRICKET - real-time messaging server
 * ------------------------------------
 * Node.js + Express + Socket.IO.
 *
 * ALL application data (accounts, sessions, conversations, messages, profile
 * data, contacts, block lists) lives in this process' RAM, in Maps/Sets.
 * There is NO database. Restarting the server wipes everything, including the
 * uploaded media files (the public/uploads folder is emptied on start-up).
 */

const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { promisify } = require('util');
const { Server } = require('socket.io');
const multer = require('multer');

const scrypt = promisify(crypto.scrypt);

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
// Number of reverse proxies in front of the app (Render, Railway, Heroku, ngrok,
// Cloudflare tunnel, nginx ...). Use 0 if the app is exposed directly.
const TRUST_PROXY = process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) || 0 : 1;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_USERS = parseInt(process.env.MAX_USERS, 10) || 5000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');

const SESSION_COOKIE = 'cricket_sid';
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MB = 1024 * 1024;

const LIMITS = {
  text: 4000,
  displayName: 40,
  bio: 200,
  image: 10 * MB,
  video: 60 * MB,
  voice: 10 * MB,
  avatar: 5 * MB,
  voiceSeconds: 600,
};
const MAX_MESSAGES_PER_CHAT = 5000;
const MAX_CONTACTS = 500;
const MAX_BLOCKED = 500;
const MAX_SOCKETS_PER_USER = 10;
const MAX_INFLIGHT_UPLOADS = 8;
const OFFLINE_GRACE_MS = 4000;

const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'cricket', 'support', 'system', 'root', 'moderator', 'mod',
  'help', 'security', 'staff', 'official', 'null', 'undefined', 'api', 'me', 'everyone',
]);
const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@.]{2,}$/;

/* ------------------------------------------------------------------ */
/* In-memory stores                                                    */
/* ------------------------------------------------------------------ */

const users = new Map();          // userId -> user
const usernameIndex = new Map();  // lower-case username -> userId
const emailIndex = new Map();     // lower-case email -> userId
const sessions = new Map();       // sha256(token) -> { userId, expires }
const conversations = new Map();  // convId -> conversation
const userConvs = new Map();      // userId -> Set(convId)
const files = new Map();          // fileId -> { path, convId, messageId }
const userSockets = new Map();    // userId -> Set(socketId)
const watchers = new Map();       // targetUserId -> Set(viewerUserId) who receive presence
const offlineTimers = new Map();  // userId -> Timeout
const buckets = new Map();        // rate-limit buckets

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

const newId = () => crypto.randomBytes(9).toString('hex'); // 18 hex chars
const isId = (x) => typeof x === 'string' && /^[a-f0-9]{18}$/.test(x);
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const convIdFor = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);

function hit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return b.count <= max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
}, 60 * 1000).unref();

// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const BIDI_RE = /[‪-‮⁦-⁩‎‏؜]/g;
const INVISIBLE_RE = /[​⁠﻿]/g;

/** Single-line text (names, bios...). Returns cleaned string or null if invalid type. */
function cleanLine(value, max) {
  if (typeof value !== 'string') return null;
  const s = value
    .normalize('NFC')
    .replace(CONTROL_RE, '')
    .replace(BIDI_RE, '')
    .replace(INVISIBLE_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > max) return null;
  return s;
}

/** Multi-line message text. Returns cleaned string or null if invalid. */
function cleanMessage(value) {
  if (typeof value !== 'string') return null;
  const s = value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_RE, '')
    .replace(BIDI_RE, '')
    .replace(INVISIBLE_RE, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  if (s.length === 0 || s.length > LIMITS.text) return null;
  return s;
}

function validateUsername(name) {
  if (typeof name !== 'string' || !USERNAME_RE.test(name)) {
    return 'Use 3-20 letters, numbers or underscores, starting with a letter.';
  }
  if (RESERVED_USERNAMES.has(name.toLowerCase())) return 'This username is reserved.';
  return null;
}

function validatePassword(pw) {
  if (typeof pw !== 'string') return 'Password is required.';
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (pw.length > 128) return 'Password is too long (max 128 characters).';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Password must contain at least one letter and one number.';
  return null;
}

function parseCookies(header) {
  const out = Object.create(null);
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    try { out[k] = decodeURIComponent(v); } catch { /* ignore malformed */ }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Password hashing (scrypt, built into Node - no native modules)      */
/* ------------------------------------------------------------------ */

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, 64);
  return `scrypt:${salt.toString('base64')}:${key.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  const parts = String(stored).split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'base64');
  const expected = Buffer.from(parts[2], 'base64');
  const key = await scrypt(password.normalize('NFKC'), salt, expected.length);
  return crypto.timingSafeEqual(key, expected);
}

let dummyHashPromise = null;
function getDummyHash() {
  if (!dummyHashPromise) dummyHashPromise = hashPassword(crypto.randomBytes(12).toString('hex'));
  return dummyHashPromise;
}

/* ------------------------------------------------------------------ */
/* Sessions (random opaque token in an httpOnly cookie)                */
/* ------------------------------------------------------------------ */

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(sha256(token), { userId, expires: Date.now() + SESSION_TTL_MS });
  return token;
}

function lookupSession(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  const key = sha256(token);
  const s = sessions.get(key);
  if (!s) return null;
  if (s.expires < Date.now()) {
    sessions.delete(key);
    return null;
  }
  const user = users.get(s.userId);
  if (!user) return null;
  return { key, user };
}

function cookieOptions(req) {
  return { httpOnly: true, sameSite: 'lax', secure: !!req.secure, path: '/' };
}

function startSession(req, res, user) {
  const token = createSession(user.id);
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(req), maxAge: SESSION_TTL_MS });
}

function dropSessionsOf(userId, exceptKey) {
  for (const [key, s] of sessions) {
    if (s.userId === userId && key !== exceptKey) {
      sessions.delete(key);
      disconnectSessionSockets(key);
    }
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, s] of sessions) {
    if (s.expires < now) {
      sessions.delete(key);
      disconnectSessionSockets(key);
    }
  }
}, 10 * 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* Views (what clients are allowed to see)                             */
/* ------------------------------------------------------------------ */

const isOnlineSockets = (id) => (userSockets.get(id)?.size || 0) > 0;

function presenceHidden(target, viewerId) {
  if (!viewerId || viewerId === target.id) return false;
  if (target.blocked.has(viewerId)) return true;
  const viewer = users.get(viewerId);
  return !!(viewer && viewer.blocked.has(target.id));
}

function userView(u, viewerId) {
  const hide = presenceHidden(u, viewerId);
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    avatar: u.avatar ? `/avatar/${u.id}?v=${u.avatar.version}` : null,
    online: !hide && u.online,
    lastSeen: hide ? null : u.lastSeen,
  };
}

function selfView(u) {
  return { ...userView(u, u.id), email: u.email, createdAt: u.createdAt };
}

function serializeMessage(m) {
  const base = { id: m.id, seq: m.seq, from: m.from, to: m.to, ts: m.ts };
  if (m.deleted) return { ...base, type: 'deleted', deleted: true };
  return {
    ...base,
    type: m.type,
    text: m.text,
    file: m.file
      ? { url: `/media/${m.file.id}`, mime: m.file.mime, size: m.file.size, duration: m.file.duration }
      : null,
    status: m.seenAt ? 'seen' : m.deliveredAt ? 'delivered' : 'sent',
  };
}

/* ------------------------------------------------------------------ */
/* Conversations & messages                                            */
/* ------------------------------------------------------------------ */

const otherMember = (conv, uid) => (conv.members[0] === uid ? conv.members[1] : conv.members[0]);
const isVisible = (conv, m, uid) => m.seq > (conv.clearedAt[uid] || 0) && !m.deletedFor.has(uid);

function addWatcher(target, viewer) {
  let set = watchers.get(target);
  if (!set) watchers.set(target, (set = new Set()));
  set.add(viewer);
}

function ensureConv(a, b) {
  const id = convIdFor(a, b);
  let conv = conversations.get(id);
  if (!conv) {
    conv = {
      id,
      members: [a, b],
      messages: [],
      byId: new Map(),
      seq: 0,
      clearedAt: Object.create(null),
    };
    conversations.set(id, conv);
    for (const uid of conv.members) {
      let set = userConvs.get(uid);
      if (!set) userConvs.set(uid, (set = new Set()));
      set.add(id);
    }
    addWatcher(a, b);
    addWatcher(b, a);
  }
  return conv;
}

function getConv(a, b) {
  return conversations.get(convIdFor(a, b)) || null;
}

function convSummary(conv, uid) {
  const peerId = otherMember(conv, uid);
  const peer = users.get(peerId);
  if (!peer) return null;
  const cleared = conv.clearedAt[uid] || 0;
  let last = null;
  let unread = 0;
  let counting = true;
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    const m = conv.messages[i];
    if (m.seq <= cleared) break;
    if (m.deletedFor.has(uid)) continue;
    if (!last) last = m;
    if (counting && m.from === peerId) {
      if (m.seenAt) counting = false;
      else if (!m.deleted) unread += 1;
    }
    if (last && !counting) break;
  }
  if (!last) return null;
  return {
    peerId,
    peer: userView(peer, uid),
    last: serializeMessage(last),
    unread,
    updatedAt: last.ts,
  };
}

function removeFile(fileId) {
  const f = files.get(fileId);
  if (!f) return;
  files.delete(fileId);
  fs.promises.unlink(f.path).catch(() => {});
}

function purgeMessage(conv, m) {
  if (m.file) removeFile(m.file.id);
  conv.byId.delete(m.id);
  const i = conv.messages.indexOf(m);
  if (i >= 0) conv.messages.splice(i, 1);
}

function purgeConversation(conv) {
  for (const m of conv.messages) if (m.file) removeFile(m.file.id);
  conversations.delete(conv.id);
  for (const uid of conv.members) userConvs.get(uid)?.delete(conv.id);
}

function emitToUser(uid, event, payload) {
  io.to(`u:${uid}`).emit(event, payload);
}

function createMessage({ from, to, type, text, file, tempId }) {
  const conv = ensureConv(from, to);
  const now = Date.now();
  const m = {
    id: newId(),
    convId: conv.id,
    seq: ++conv.seq,
    from,
    to,
    type,
    text: text || '',
    file: file ? { id: file.id, mime: file.mime, size: file.size, duration: file.duration } : null,
    ts: now,
    deliveredAt: isOnlineSockets(to) ? now : null,
    seenAt: null,
    deleted: false,
    deletedFor: new Set(),
  };
  conv.messages.push(m);
  conv.byId.set(m.id, m);
  if (file) files.set(file.id, { path: file.path, convId: conv.id, messageId: m.id });

  while (conv.messages.length > MAX_MESSAGES_PER_CHAT) {
    const old = conv.messages[0];
    purgeMessage(conv, old);
  }

  const payload = serializeMessage(m);
  emitToUser(from, 'message:new', {
    peerId: to,
    message: tempId ? { ...payload, tempId } : payload,
    conv: convSummary(conv, from),
  });
  emitToUser(to, 'message:new', { peerId: from, message: payload, conv: convSummary(conv, to) });
  return m;
}

function canMessage(from, to) {
  if (to.blocked.has(from.id)) return "You can't send messages to this user.";
  if (from.blocked.has(to.id)) return 'Unblock this user to send messages.';
  return null;
}

function markSeen(uid, peerId) {
  const conv = getConv(uid, peerId);
  if (!conv) return;
  const now = Date.now();
  const ids = [];
  let changed = false;
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    const m = conv.messages[i];
    if (m.from !== peerId) continue;
    if (m.seenAt) break;
    m.seenAt = now;
    if (!m.deliveredAt) m.deliveredAt = now;
    changed = true;
    if (!m.deleted && isVisible(conv, m, uid)) ids.push(m.id);
  }
  if (!changed) return;
  if (ids.length) emitToUser(peerId, 'message:status', { peerId: uid, ids, status: 'seen' });
  emitToUser(uid, 'conv:read', { peerId, conv: convSummary(conv, uid) });
}

function deliverPending(uid) {
  const set = userConvs.get(uid);
  if (!set) return;
  const now = Date.now();
  for (const cid of set) {
    const conv = conversations.get(cid);
    if (!conv) continue;
    const peerId = otherMember(conv, uid);
    const ids = [];
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      const m = conv.messages[i];
      if (m.from === uid) continue;
      if (m.deliveredAt) break;
      m.deliveredAt = now;
      if (!m.deleted) ids.push(m.id);
    }
    if (ids.length) emitToUser(peerId, 'message:status', { peerId: uid, ids, status: 'delivered' });
  }
}

/* ------------------------------------------------------------------ */
/* Presence                                                            */
/* ------------------------------------------------------------------ */

function pushPresence(u) {
  const set = watchers.get(u.id);
  if (!set) return;
  for (const vid of set) {
    const v = userView(u, vid);
    emitToUser(vid, 'presence', { userId: u.id, online: v.online, lastSeen: v.lastSeen });
  }
}

function setOnline(u, online) {
  if (u.online === online) return;
  u.online = online;
  if (!online) u.lastSeen = Date.now();
  pushPresence(u);
}

function pushPresencePair(a, b) {
  const va = userView(a, b.id);
  const vb = userView(b, a.id);
  emitToUser(b.id, 'presence', { userId: a.id, online: va.online, lastSeen: va.lastSeen });
  emitToUser(a.id, 'presence', { userId: b.id, online: vb.online, lastSeen: vb.lastSeen });
}

function broadcastProfile(u) {
  emitToUser(u.id, 'profile:updated', { user: selfView(u) });
  const set = watchers.get(u.id);
  if (!set) return;
  for (const vid of set) emitToUser(vid, 'profile:updated', { user: userView(u, vid) });
}

/* ------------------------------------------------------------------ */
/* File handling (magic-byte validation, random names, auth-gated)     */
/* ------------------------------------------------------------------ */

function detectType(buf) {
  if (!buf || buf.length < 12) return null;
  const a = (s, e) => buf.toString('latin1', s, e);
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && a(1, 4) === 'PNG' && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return 'png';
  if (a(0, 6) === 'GIF87a' || a(0, 6) === 'GIF89a') return 'gif';
  if (a(0, 4) === 'RIFF' && a(8, 12) === 'WEBP') return 'webp';
  if (a(0, 4) === 'RIFF' && a(8, 12) === 'WAVE') return 'wav';
  if (a(4, 8) === 'ftyp') return a(8, 12) === 'qt  ' ? 'mov' : 'mp4';
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'webm';
  if (a(0, 4) === 'OggS') return 'ogg';
  if (a(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'mp3';
  return null;
}

const ALLOWED = {
  image: { jpeg: ['.jpg', 'image/jpeg'], png: ['.png', 'image/png'], gif: ['.gif', 'image/gif'], webp: ['.webp', 'image/webp'] },
  avatar: { jpeg: ['.jpg', 'image/jpeg'], png: ['.png', 'image/png'], gif: ['.gif', 'image/gif'], webp: ['.webp', 'image/webp'] },
  video: { mp4: ['.mp4', 'video/mp4'], mov: ['.mov', 'video/quicktime'], webm: ['.webm', 'video/webm'] },
  voice: {
    webm: ['.webm', 'audio/webm'], ogg: ['.ogg', 'audio/ogg'], mp4: ['.m4a', 'audio/mp4'],
    wav: ['.wav', 'audio/wav'], mp3: ['.mp3', 'audio/mpeg'],
  },
};

function resolveUpload(kind, buf) {
  const t = detectType(buf);
  const entry = t && ALLOWED[kind] && ALLOWED[kind][t];
  return entry ? { ext: entry[0], mime: entry[1] } : null;
}

async function saveFile(buffer, ext) {
  const id = crypto.randomBytes(16).toString('hex');
  const filePath = path.join(UPLOAD_DIR, id + ext);
  await fs.promises.writeFile(filePath, buffer, { flag: 'wx' });
  return { id, path: filePath };
}

const uploaders = {};
for (const kind of ['image', 'video', 'voice', 'avatar']) {
  uploaders[kind] = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: LIMITS[kind], files: 1, fields: 8, fieldSize: 1024, parts: 10 },
  }).single('file');
}

let inflightUploads = 0;
function uploadMiddleware(kind) {
  return (req, res, next) => {
    if (inflightUploads >= MAX_INFLIGHT_UPLOADS) {
      return res.status(503).json({ error: 'Server is busy. Please try again in a moment.' });
    }
    inflightUploads += 1;
    let released = false;
    const release = () => { if (!released) { released = true; inflightUploads -= 1; } };
    res.on('close', release);
    res.on('finish', release);
    uploaders[kind](req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: `File is too large (max ${Math.round(LIMITS[kind] / MB)} MB).` });
        }
        return res.status(400).json({ error: 'Upload failed.' });
      }
      next();
    });
  };
}

// wipe leftovers from a previous run: all data is temporary by design
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
for (const f of fs.readdirSync(UPLOAD_DIR)) {
  if (f === '.gitkeep') continue;
  try { fs.rmSync(path.join(UPLOAD_DIR, f), { recursive: true, force: true }); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Express app                                                         */
/* ------------------------------------------------------------------ */

const app = express();
const server = http.createServer(app);
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY);

function originAllowed(origin, req) {
  if (!origin) return true;
  let host;
  try { host = new URL(origin).host.toLowerCase(); } catch { return false; }
  const hostHeader = String(req.headers.host || '').toLowerCase();
  const fwd = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim().toLowerCase();
  if (host === hostHeader || (fwd && host === fwd)) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  next();
});

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !originAllowed(req.headers.origin, req)) {
    return res.status(403).json({ error: 'Cross-origin request blocked.' });
  }
  next();
});
app.use('/api', express.json({ limit: '10kb' }));

function requireAuth(req, res, next) {
  const s = lookupSession(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
  if (!s) return res.status(401).json({ error: 'Please log in.' });
  req.user = s.user;
  req.sessionKey = s.key;
  next();
}

/* ---- static files: explicit whitelist (uploads are never served statically) ---- */

const STATIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/style.css': 'style.css',
  '/app.js': 'app.js',
};
for (const [route, file] of Object.entries(STATIC_FILES)) {
  app.get(route, (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, file), { headers: { 'Cache-Control': 'no-cache' } });
  });
}
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/healthz', (req, res) => res.type('text').send('ok'));

/* ---- auth ---- */

function bootstrapFor(u) {
  const convs = [];
  const set = userConvs.get(u.id);
  if (set) {
    for (const cid of set) {
      const c = conversations.get(cid);
      if (!c) continue;
      const s = convSummary(c, u.id);
      if (s) convs.push(s);
    }
  }
  convs.sort((a, b) => b.updatedAt - a.updatedAt);
  return {
    me: selfView(u),
    conversations: convs,
    contacts: [...u.contacts].map((id) => users.get(id)).filter(Boolean).map((x) => userView(x, u.id)),
    blocked: [...u.blocked].map((id) => users.get(id)).filter(Boolean).map((x) => userView(x, u.id)),
    limits: LIMITS,
  };
}

app.post('/api/signup', async (req, res) => {
  try {
    if (!hit(`signup:${req.ip}`, 20, 60 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many sign-ups from this network. Try again later.' });
    }
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = body.password;

    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.', field: 'email' });
    }
    const uErr = validateUsername(username);
    if (uErr) return res.status(400).json({ error: uErr, field: 'username' });
    const pErr = validatePassword(password);
    if (pErr) return res.status(400).json({ error: pErr, field: 'password' });

    let displayName = username;
    if (body.displayName !== undefined && body.displayName !== '') {
      const dn = cleanLine(body.displayName, LIMITS.displayName);
      if (!dn) return res.status(400).json({ error: `Display name must be 1-${LIMITS.displayName} characters.`, field: 'displayName' });
      displayName = dn;
    }

    if (users.size >= MAX_USERS) return res.status(503).json({ error: 'The server is full right now.' });
    if (emailIndex.has(email)) return res.status(409).json({ error: 'An account with this email already exists.', field: 'email' });
    if (usernameIndex.has(username.toLowerCase())) return res.status(409).json({ error: 'This username is already taken.', field: 'username' });

    const passHash = await hashPassword(password);

    // re-check after the await to close the race window
    if (emailIndex.has(email)) return res.status(409).json({ error: 'An account with this email already exists.', field: 'email' });
    if (usernameIndex.has(username.toLowerCase())) return res.status(409).json({ error: 'This username is already taken.', field: 'username' });

    const now = Date.now();
    const user = {
      id: newId(),
      email,
      username,
      displayName,
      bio: '',
      avatar: null,
      passHash,
      createdAt: now,
      lastSeen: now,
      online: false,
      blocked: new Set(),
      contacts: new Set(),
    };
    users.set(user.id, user);
    usernameIndex.set(username.toLowerCase(), user.id);
    emailIndex.set(email, user.id);

    startSession(req, res, user);
    res.status(201).json(bootstrapFor(user));
  } catch (err) {
    console.error('signup error', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    if (!hit(`login:ip:${req.ip}`, 40, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
    }
    const body = req.body || {};
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase().slice(0, 254) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!identifier || !password || password.length > 128) {
      return res.status(400).json({ error: 'Enter your email or username and your password.' });
    }
    if (!hit(`login:id:${identifier}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many attempts for this account. Please wait a few minutes.' });
    }
    const id = identifier.includes('@') ? emailIndex.get(identifier) : usernameIndex.get(identifier.replace(/^@/, ''));
    const user = id ? users.get(id) : null;
    const ok = await verifyPassword(password, user ? user.passHash : await getDummyHash());
    if (!user || !ok) return res.status(401).json({ error: 'Incorrect email/username or password.' });

    startSession(req, res, user);
    res.json(bootstrapFor(user));
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/logout', (req, res) => {
  const s = lookupSession(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
  if (s) {
    sessions.delete(s.key);
    disconnectSessionSockets(s.key);
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions(req));
  res.json({ ok: true });
});

app.get('/api/bootstrap', requireAuth, (req, res) => res.json(bootstrapFor(req.user)));

app.get('/api/username-available', (req, res) => {
  if (!hit(`uname:${req.ip}`, 90, 60 * 1000)) return res.status(429).json({ error: 'Slow down.' });
  const name = typeof req.query.u === 'string' ? req.query.u.trim() : '';
  const err = validateUsername(name);
  if (err) return res.json({ available: false, reason: err });
  const owner = usernameIndex.get(name.toLowerCase());
  if (!owner) return res.json({ available: true });
  const s = lookupSession(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
  if (s && s.user.id === owner) return res.json({ available: true, current: true });
  res.json({ available: false, reason: 'This username is already taken.' });
});

/* ---- profile ---- */

app.put('/api/profile', requireAuth, (req, res) => {
  const body = req.body || {};
  const u = req.user;
  if (body.displayName !== undefined) {
    const dn = cleanLine(body.displayName, LIMITS.displayName);
    if (!dn) return res.status(400).json({ error: `Display name must be 1-${LIMITS.displayName} characters.`, field: 'displayName' });
    u.displayName = dn;
  }
  if (body.bio !== undefined) {
    const bio = cleanLine(body.bio, LIMITS.bio);
    if (bio === null) return res.status(400).json({ error: `Bio can be at most ${LIMITS.bio} characters.`, field: 'bio' });
    u.bio = bio;
  }
  broadcastProfile(u);
  res.json({ me: selfView(u) });
});

app.put('/api/username', requireAuth, (req, res) => {
  if (!hit(`rename:${req.user.id}`, 10, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'You changed your username too many times. Try again later.' });
  }
  const name = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const err = validateUsername(name);
  if (err) return res.status(400).json({ error: err, field: 'username' });
  const owner = usernameIndex.get(name.toLowerCase());
  if (owner && owner !== req.user.id) return res.status(409).json({ error: 'This username is already taken.', field: 'username' });
  usernameIndex.delete(req.user.username.toLowerCase());
  usernameIndex.set(name.toLowerCase(), req.user.id);
  req.user.username = name;
  broadcastProfile(req.user);
  res.json({ me: selfView(req.user) });
});

app.post('/api/avatar', requireAuth, (req, res, next) => {
  if (!hit(`avatar:${req.user.id}`, 15, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many photo changes. Try again later.' });
  }
  next();
}, uploadMiddleware('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received.' });
    const t = resolveUpload('avatar', req.file.buffer);
    if (!t) return res.status(415).json({ error: 'Please choose a JPG, PNG, GIF or WebP image.' });
    const saved = await saveFile(req.file.buffer, t.ext);
    const u = req.user;
    if (u.avatar) fs.promises.unlink(u.avatar.path).catch(() => {});
    u.avatar = { id: saved.id, path: saved.path, mime: t.mime, version: Date.now() };
    broadcastProfile(u);
    res.json({ me: selfView(u) });
  } catch (err) {
    console.error('avatar error', err);
    res.status(500).json({ error: 'Could not save the photo.' });
  }
});

app.delete('/api/avatar', requireAuth, (req, res) => {
  const u = req.user;
  if (u.avatar) {
    fs.promises.unlink(u.avatar.path).catch(() => {});
    u.avatar = null;
    broadcastProfile(u);
  }
  res.json({ me: selfView(u) });
});

app.post('/api/password', requireAuth, async (req, res) => {
  try {
    if (!hit(`pw:${req.user.id}`, 8, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
    }
    const { current, next } = req.body || {};
    if (typeof current !== 'string' || current.length > 128 || !(await verifyPassword(current, req.user.passHash))) {
      return res.status(400).json({ error: 'Your current password is incorrect.', field: 'current' });
    }
    const err = validatePassword(next);
    if (err) return res.status(400).json({ error: err, field: 'next' });
    req.user.passHash = await hashPassword(next);
    dropSessionsOf(req.user.id, req.sessionKey); // log out everywhere else
    res.json({ ok: true });
  } catch (err) {
    console.error('password error', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

/* ---- users / search ---- */

app.get('/api/users/search', requireAuth, (req, res) => {
  if (!hit(`search:${req.user.id}`, 60, 60 * 1000)) return res.status(429).json({ error: 'Slow down.' });
  const q = (typeof req.query.q === 'string' ? req.query.q : '').trim().replace(/^@/, '').toLowerCase().slice(0, 30);
  if (!q) return res.json({ users: [] });
  const starts = [];
  const contains = [];
  for (const [lower, id] of usernameIndex) {
    if (id === req.user.id) continue;
    const idx = lower.indexOf(q);
    if (idx === -1) continue;
    const u = users.get(id);
    if (!u || u.blocked.has(req.user.id)) continue;
    (idx === 0 ? starts : contains).push(u);
  }
  const byName = (a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase());
  starts.sort(byName);
  contains.sort(byName);
  res.json({ users: starts.concat(contains).slice(0, 20).map((u) => userView(u, req.user.id)) });
});

app.get('/api/users/:id', requireAuth, (req, res) => {
  const u = isId(req.params.id) ? users.get(req.params.id) : null;
  if (!u || (u.blocked.has(req.user.id) && !getConv(u.id, req.user.id))) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ user: userView(u, req.user.id) });
});

/* ---- chat history ---- */

app.get('/api/chats/:peerId/messages', requireAuth, (req, res) => {
  const uid = req.user.id;
  const peer = isId(req.params.peerId) ? users.get(req.params.peerId) : null;
  if (!peer || peer.id === uid) return res.status(404).json({ error: 'User not found.' });
  addWatcher(peer.id, uid); // opening a chat lets me see their presence updates
  const conv = getConv(uid, peer.id);
  if (!conv) return res.json({ messages: [], hasMore: false });
  const before = parseInt(req.query.before, 10) || Infinity;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const cleared = conv.clearedAt[uid] || 0;
  const out = [];
  let hasMore = false;
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    const m = conv.messages[i];
    if (m.seq >= before) continue;
    if (m.seq <= cleared) break;
    if (m.deletedFor.has(uid)) continue;
    if (out.length >= limit) { hasMore = true; break; }
    out.push(serializeMessage(m));
  }
  out.reverse();
  res.json({ messages: out, hasMore });
});

/* ---- media upload (images, videos, voice) ---- */

app.post('/api/upload/:kind', requireAuth, (req, res, next) => {
  const kind = req.params.kind;
  if (!['image', 'video', 'voice'].includes(kind)) return res.status(404).json({ error: 'Not found.' });
  if (!hit(`upload:${req.user.id}`, 20, 60 * 1000)) {
    return res.status(429).json({ error: 'You are uploading too fast. Please wait a moment.' });
  }
  uploadMiddleware(kind)(req, res, next);
}, async (req, res) => {
  try {
    const kind = req.params.kind;
    const me = req.user;
    const peer = isId(req.body?.peerId) ? users.get(req.body.peerId) : null;
    if (!peer || peer.id === me.id) return res.status(400).json({ error: 'Choose a valid recipient.' });
    if (!req.file) return res.status(400).json({ error: 'No file received.' });
    const denied = canMessage(me, peer);
    if (denied) return res.status(403).json({ error: denied });
    const t = resolveUpload(kind, req.file.buffer);
    if (!t) {
      const hint = { image: 'a JPG, PNG, GIF or WebP image', video: 'an MP4, WebM or MOV video', voice: 'a valid audio recording' }[kind];
      return res.status(415).json({ error: `Unsupported or corrupted file. Please send ${hint}.` });
    }
    let duration = null;
    if (kind === 'voice') {
      duration = Number(req.body.duration);
      if (!Number.isFinite(duration) || duration < 0) duration = 0;
      duration = Math.min(Math.round(duration * 10) / 10, LIMITS.voiceSeconds);
    }
    const tempId = typeof req.body.tempId === 'string' && /^[\w-]{1,64}$/.test(req.body.tempId) ? req.body.tempId : null;
    const saved = await saveFile(req.file.buffer, t.ext);
    const m = createMessage({
      from: me.id,
      to: peer.id,
      type: kind,
      text: '',
      file: { id: saved.id, path: saved.path, mime: t.mime, size: req.file.size, duration },
      tempId,
    });
    res.status(201).json({ message: serializeMessage(m) });
  } catch (err) {
    console.error('upload error', err);
    res.status(500).json({ error: 'Could not send the file.' });
  }
});

/* ---- authenticated media / avatar delivery ---- */

app.get('/media/:id', requireAuth, (req, res) => {
  const f = /^[a-f0-9]{32}$/.test(req.params.id) ? files.get(req.params.id) : null;
  const conv = f && conversations.get(f.convId);
  const m = conv && conv.byId.get(f.messageId);
  if (!m || m.deleted || !conv.members.includes(req.user.id) || !isVisible(conv, m, req.user.id)) {
    return res.status(404).end();
  }
  res.sendFile(f.path, {
    headers: {
      'Content-Type': m.file.mime,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

app.get('/avatar/:userId', requireAuth, (req, res) => {
  const u = isId(req.params.userId) ? users.get(req.params.userId) : null;
  if (!u || !u.avatar) return res.status(404).end();
  res.sendFile(u.avatar.path, {
    headers: {
      'Content-Type': u.avatar.mime,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

/* ---- fallbacks ---- */

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((req, res) => res.status(404).type('text').send('Not found'));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.parse.failed' || err.type === 'entity.too.large')) {
    return res.status(400).json({ error: 'Invalid request.' });
  }
  console.error('unhandled error', err);
  res.status(500).json({ error: 'Something went wrong.' });
});

/* ------------------------------------------------------------------ */
/* Socket.IO                                                           */
/* ------------------------------------------------------------------ */

const io = new Server(server, {
  maxHttpBufferSize: 1e5,
  pingInterval: 20000,
  pingTimeout: 25000,
  allowRequest: (req, cb) => cb(null, originAllowed(req.headers.origin, req)),
});

function disconnectSessionSockets(sessionKey) {
  for (const s of io.of('/').sockets.values()) {
    if (s.data.sessionKey === sessionKey) {
      s.emit('session:ended');
      s.disconnect(true);
    }
  }
}

io.use((socket, next) => {
  const s = lookupSession(parseCookies(socket.request.headers.cookie)[SESSION_COOKIE]);
  if (!s) return next(new Error('unauthorized'));
  if ((userSockets.get(s.user.id)?.size || 0) >= MAX_SOCKETS_PER_USER) return next(new Error('too many connections'));
  socket.data.userId = s.user.id;
  socket.data.sessionKey = s.key;
  next();
});

function ack(cb, payload) {
  if (typeof cb === 'function') cb(payload);
}

function emitContacts(u) {
  emitToUser(u.id, 'contacts:update', {
    contacts: [...u.contacts].map((id) => users.get(id)).filter(Boolean).map((x) => userView(x, u.id)),
  });
}
function emitBlocked(u) {
  emitToUser(u.id, 'blocklist:update', {
    blocked: [...u.blocked].map((id) => users.get(id)).filter(Boolean).map((x) => userView(x, u.id)),
  });
}

io.on('connection', (socket) => {
  const uid = socket.data.userId;
  const me = users.get(uid);
  if (!me) return socket.disconnect(true);

  socket.join(`u:${uid}`);
  let set = userSockets.get(uid);
  if (!set) userSockets.set(uid, (set = new Set()));
  set.add(socket.id);
  clearTimeout(offlineTimers.get(uid));
  offlineTimers.delete(uid);
  setOnline(me, true);
  deliverPending(uid);

  const rl = (name, max, ms) => hit(`s:${socket.id}:${name}`, max, ms);
  const peerOf = (id) => (isId(id) && id !== uid ? users.get(id) : null);

  socket.on('message:send', (p, cb) => {
    if (!rl('send', 30, 10000)) return ack(cb, { ok: false, error: 'You are sending messages too fast.' });
    p = p && typeof p === 'object' ? p : {};
    const peer = peerOf(p.peerId);
    if (!peer) return ack(cb, { ok: false, error: 'User not found.' });
    const denied = canMessage(me, peer);
    if (denied) return ack(cb, { ok: false, error: denied });
    const text = cleanMessage(p.text);
    if (text === null) return ack(cb, { ok: false, error: `Message must be 1-${LIMITS.text} characters.` });
    const tempId = typeof p.tempId === 'string' && /^[\w-]{1,64}$/.test(p.tempId) ? p.tempId : null;
    const m = createMessage({ from: uid, to: peer.id, type: 'text', text, tempId });
    ack(cb, { ok: true, message: serializeMessage(m) });
  });

  socket.on('typing', (p) => {
    if (!rl('typing', 40, 10000)) return;
    const peer = peerOf(p && p.peerId);
    if (!peer || canMessage(me, peer) || canMessage(peer, me)) return;
    emitToUser(peer.id, 'typing', { peerId: uid, typing: !!p.typing });
  });

  socket.on('messages:seen', (p) => {
    if (!rl('seen', 60, 10000)) return;
    const peer = peerOf(p && p.peerId);
    if (peer) markSeen(uid, peer.id);
  });

  socket.on('message:delete', (p, cb) => {
    if (!rl('del', 40, 10000)) return ack(cb, { ok: false, error: 'Slow down.' });
    p = p && typeof p === 'object' ? p : {};
    const peer = peerOf(p.peerId);
    const conv = peer && getConv(uid, peer.id);
    const m = conv && isId(p.messageId) ? conv.byId.get(p.messageId) : null;
    if (!m || !isVisible(conv, m, uid)) return ack(cb, { ok: false, error: 'Message not found.' });

    if (p.forEveryone === true) {
      if (m.from !== uid) return ack(cb, { ok: false, error: 'You can only delete your own messages for everyone.' });
      if (m.file) { removeFile(m.file.id); m.file = null; }
      m.deleted = true;
      m.text = '';
      for (const id of conv.members) {
        emitToUser(id, 'message:deleted', {
          peerId: otherMember(conv, id),
          messageId: m.id,
          forEveryone: true,
          conv: convSummary(conv, id),
        });
      }
    } else {
      m.deletedFor.add(uid);
      const summary = convSummary(conv, uid);
      if (m.deletedFor.size >= 2) purgeMessage(conv, m);
      emitToUser(uid, 'message:deleted', { peerId: peer.id, messageId: m.id, forEveryone: false, conv: summary });
    }
    ack(cb, { ok: true });
  });

  socket.on('conversation:delete', (p, cb) => {
    if (!rl('delconv', 20, 10000)) return ack(cb, { ok: false, error: 'Slow down.' });
    p = p && typeof p === 'object' ? p : {};
    const peer = peerOf(p.peerId);
    if (!peer) return ack(cb, { ok: false, error: 'User not found.' });
    const conv = getConv(uid, peer.id);
    if (!conv) return ack(cb, { ok: true });
    if (p.forEveryone === true) {
      purgeConversation(conv);
      emitToUser(uid, 'conversation:deleted', { peerId: peer.id });
      emitToUser(peer.id, 'conversation:deleted', { peerId: uid });
    } else {
      conv.clearedAt[uid] = conv.seq;
      emitToUser(uid, 'conversation:deleted', { peerId: peer.id });
      if (conv.members.every((id) => (conv.clearedAt[id] || 0) >= conv.seq)) purgeConversation(conv);
    }
    ack(cb, { ok: true });
  });

  socket.on('user:block', (p, cb) => {
    if (!rl('block', 20, 10000)) return ack(cb, { ok: false, error: 'Slow down.' });
    const peer = peerOf(p && p.userId);
    if (!peer) return ack(cb, { ok: false, error: 'User not found.' });
    if (me.blocked.size >= MAX_BLOCKED && !me.blocked.has(peer.id)) return ack(cb, { ok: false, error: 'Block list is full.' });
    me.blocked.add(peer.id);
    emitBlocked(me);
    pushPresencePair(me, peer);
    emitToUser(uid, 'typing', { peerId: peer.id, typing: false });
    ack(cb, { ok: true });
  });

  socket.on('user:unblock', (p, cb) => {
    if (!rl('unblock', 20, 10000)) return ack(cb, { ok: false, error: 'Slow down.' });
    const peer = peerOf(p && p.userId);
    if (!peer) return ack(cb, { ok: false, error: 'User not found.' });
    me.blocked.delete(peer.id);
    emitBlocked(me);
    pushPresencePair(me, peer);
    ack(cb, { ok: true });
  });

  socket.on('contact:add', (p, cb) => {
    if (!rl('contact', 30, 10000)) return ack(cb, { ok: false, error: 'Slow down.' });
    const peer = peerOf(p && p.userId);
    if (!peer || peer.blocked.has(uid)) return ack(cb, { ok: false, error: 'User not found.' });
    if (me.contacts.size >= MAX_CONTACTS && !me.contacts.has(peer.id)) return ack(cb, { ok: false, error: 'Contact list is full.' });
    me.contacts.add(peer.id);
    addWatcher(peer.id, uid);
    emitContacts(me);
    ack(cb, { ok: true });
  });

  socket.on('contact:remove', (p, cb) => {
    if (!rl('contact', 30, 10000)) return ack(cb, { ok: false, error: 'Slow down.' });
    const peer = peerOf(p && p.userId);
    if (!peer) return ack(cb, { ok: false, error: 'User not found.' });
    me.contacts.delete(peer.id);
    emitContacts(me);
    ack(cb, { ok: true });
  });

  socket.on('disconnect', () => {
    const s = userSockets.get(uid);
    if (s) {
      s.delete(socket.id);
      if (s.size === 0) {
        userSockets.delete(uid);
        // grace period so page refreshes / quick reconnects don't flicker offline
        clearTimeout(offlineTimers.get(uid));
        offlineTimers.set(uid, setTimeout(() => {
          offlineTimers.delete(uid);
          if (!isOnlineSockets(uid)) setOnline(me, false);
        }, OFFLINE_GRACE_MS));
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */

process.on('unhandledRejection', (err) => console.error('unhandledRejection', err));
process.on('uncaughtException', (err) => console.error('uncaughtException', err));

server.listen(PORT, HOST, () => {
  console.log('\n  CRICKET is running  (all data is kept in RAM only)\n');
  console.log(`  Local:    http://localhost:${PORT}`);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) console.log(`  Network:  http://${a.address}:${PORT}`);
    }
  }
  console.log('');
});

module.exports = { server, app, io };
