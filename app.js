/* ==========================================================================
   CRICKET - client application (vanilla JS)
   All user supplied text is inserted with textContent (never innerHTML).
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  const $ = (id) => document.getElementById(id);

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  const ICONS = {
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    clip: '<path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/>',
    send: '<path d="m22 2-11 11M22 2l-7 20-4-9-9-4 20-7z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    userminus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    retry: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  };

  function icon(name) {
    const s = el('span', 'ico');
    s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`; // static markup only
    return s;
  }

  function hydrateIcons(root) {
    root.querySelectorAll('[data-icon]').forEach((n) => {
      if (n.firstChild && n.firstChild.classList && n.firstChild.classList.contains('ico')) return;
      n.textContent = '';
      n.appendChild(icon(n.dataset.icon));
    });
  }

  const TICKS = {
    pending: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.2l2 1.2"/>',
    sent: '<path d="m3 8.5 3.2 3.2L13 4.8"/>',
    delivered: '<path d="m1.5 8.5 3.2 3.2L11 5M7 11.6l.6.1L15 4.8"/>',
    seen: '<path d="m1.5 8.5 3.2 3.2L11 5M7 11.6l.6.1L15 4.8"/>',
    failed: '<circle cx="8" cy="8" r="6"/><path d="M8 5v3.4M8 11h.01"/>',
  };
  function ticks(status) {
    const s = el('span', `ticks ${status}`);
    s.title = { pending: 'Sending...', sent: 'Sent', delivered: 'Delivered', seen: 'Seen', failed: 'Failed to send' }[status] || '';
    s.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${TICKS[status] || TICKS.sent}</svg>`; // static markup only
    return s;
  }

  const pad = (n) => String(n).padStart(2, '0');
  const fmtClock = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const DAY = 86400000;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function fmtDate(ts) {
    const d = new Date(ts);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  function fmtDayLabel(ts) {
    const diff = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7 && diff > 0) return WEEKDAYS[new Date(ts).getDay()];
    return fmtDate(ts);
  }
  function fmtListTime(ts) {
    const diff = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
    if (diff <= 0) return fmtClock(ts);
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return WEEKDAYS[new Date(ts).getDay()].slice(0, 3);
    const d = new Date(ts);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  function fmtLastSeen(ts) {
    if (!ts) return 'last seen recently';
    const diffMin = Math.floor((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'last seen just now';
    if (diffMin < 60) return `last seen ${diffMin} min ago`;
    const day = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
    if (day === 0) return `last seen today at ${fmtClock(ts)}`;
    if (day === 1) return `last seen yesterday at ${fmtClock(ts)}`;
    return `last seen ${fmtDate(ts)}`;
  }
  function fmtDuration(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    return `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
  }
  const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const isNarrow = () => window.matchMedia('(max-width: 820px)').matches;
  const isCoarse = () => window.matchMedia('(pointer: coarse)').matches;

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */

  const S = {
    me: null,
    limits: null,
    convs: new Map(),      // peerId -> summary
    contacts: new Map(),   // userId -> user
    blocked: new Map(),    // userId -> user
    users: new Map(),      // userId -> latest known user view
    msgs: new Map(),       // peerId -> { list: [], hasMore, loaded, loading }
    typing: new Map(),     // peerId -> timeout
    drafts: new Map(),     // peerId -> text
    active: null,          // active peerId
    tab: 'chats',
    socket: null,
    connectedOnce: false,
    nodes: new Map(),      // messageId -> element (active thread only)
    uploads: new Map(),    // tempId -> { xhr, url }
  };

  const hueOf = (id) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h % 8; };
  const initialOf = (u) => (Array.from((u.displayName || u.username || '?').trim())[0] || '?').toUpperCase();

  function remember(u) {
    if (!u || !u.id) return;
    const old = S.users.get(u.id);
    S.users.set(u.id, old ? { ...old, ...u } : u);
  }
  const userById = (id) => S.users.get(id) || (S.convs.get(id) && S.convs.get(id).peer) || null;

  function avatar(u, size, withDot) {
    const a = el('span', `avatar ${size || ''} c${hueOf(u.id)}`);
    if (u.avatar) {
      const img = el('img');
      img.alt = '';
      img.decoding = 'async';
      img.src = u.avatar;
      img.addEventListener('error', () => { img.remove(); a.textContent = initialOf(u); a.insertBefore(el('span'), null).remove(); });
      a.appendChild(img);
    } else {
      a.textContent = initialOf(u);
    }
    if (withDot) a.appendChild(el('span', `dot${u.online ? ' on' : ''}`));
    return a;
  }

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */

  async function api(method, url, body) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let res;
    try { res = await fetch(url, opts); } catch { throw Object.assign(new Error('Network error. Check your connection.'), { network: true }); }
    let data = null;
    try { data = await res.json(); } catch { /* not json */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      err.field = data && data.field;
      throw err;
    }
    return data;
  }

  /* ------------------------------------------------------------------ */
  /* Toasts, menus, modals                                               */
  /* ------------------------------------------------------------------ */

  function toast(text, kind) {
    const t = el('div', `toast ${kind || ''}`, text);
    $('toast-root').appendChild(t);
    setTimeout(() => t.remove(), kind === 'error' ? 5000 : 3200);
  }

  let closeMenu = () => {};
  function showMenu(x, y, items) {
    closeMenu();
    const m = el('div', 'menu');
    m.setAttribute('role', 'menu');
    for (const it of items) {
      const b = el('button', it.danger ? 'danger' : '');
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.appendChild(icon(it.icon));
      b.appendChild(el('span', '', it.label));
      b.addEventListener('click', () => { closeMenu(); it.action(); });
      m.appendChild(b);
    }
    $('overlay-root').appendChild(m);
    const r = m.getBoundingClientRect();
    m.style.left = `${Math.max(8, Math.min(x, window.innerWidth - r.width - 8))}px`;
    m.style.top = `${Math.max(8, Math.min(y, window.innerHeight - r.height - 8))}px`;
    const off = (e) => { if (!m.contains(e.target)) closeMenu(); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } };
    setTimeout(() => {
      document.addEventListener('pointerdown', off, true);
      document.addEventListener('keydown', key, true);
      window.addEventListener('resize', closeMenu);
    }, 0);
    closeMenu = () => {
      m.remove();
      document.removeEventListener('pointerdown', off, true);
      document.removeEventListener('keydown', key, true);
      window.removeEventListener('resize', closeMenu);
      closeMenu = () => {};
    };
    const first = m.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }

  function openModal(build) {
    const back = el('div', 'modal-backdrop');
    const box = el('div', 'modal');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    back.appendChild(box);
    const prevFocus = document.activeElement;
    const close = () => {
      back.remove();
      document.removeEventListener('keydown', onKey, true);
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    build(box, close);
    $('overlay-root').appendChild(back);
    const focusable = box.querySelector('button.primary, button.danger, button');
    if (focusable) focusable.focus({ preventScroll: true });
    return close;
  }

  function confirmDialog({ title, text, confirmText, danger, checkbox }) {
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      const closeFn = openModal((box, close) => {
        box.appendChild(el('h3', '', title));
        if (text) box.appendChild(el('p', '', text));
        let cb = null;
        if (checkbox) {
          const row = el('label', 'check-row');
          cb = el('input');
          cb.type = 'checkbox';
          row.appendChild(cb);
          row.appendChild(el('span', '', checkbox));
          box.appendChild(row);
        }
        const actions = el('div', 'modal-actions');
        const cancel = el('button', 'btn', 'Cancel');
        cancel.type = 'button';
        cancel.addEventListener('click', () => { close(); done({ ok: false }); });
        const ok = el('button', `btn ${danger ? 'danger' : 'primary'}`, confirmText || 'Confirm');
        ok.type = 'button';
        ok.addEventListener('click', () => { close(); done({ ok: true, checked: !!(cb && cb.checked) }); });
        actions.append(cancel, ok);
        box.appendChild(actions);
      });
      // closing via Esc / backdrop resolves as cancelled
      const obs = new MutationObserver(() => {
        if (!document.body.contains(document.querySelector('.modal-backdrop'))) { obs.disconnect(); done({ ok: false }); }
      });
      obs.observe($('overlay-root'), { childList: true });
      void closeFn;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot & auth                                                         */
  /* ------------------------------------------------------------------ */

  /* ---- themes (accent colour) & ripple feedback ---- */
  const THEMES = {
    blue: { name: 'Ocean', a: '#3a9bff', b: '#2563eb', g: '#3fa8ff', o: '#2f8bff', rgb: '58, 155, 255' },
    violet: { name: 'Violet', a: '#8b7bff', b: '#5b3df5', g: '#a08cff', o: '#7a6bff', rgb: '139, 123, 255' },
    emerald: { name: 'Emerald', a: '#34d399', b: '#059669', g: '#3ee0a8', o: '#1fbf8a', rgb: '52, 211, 153' },
    rose: { name: 'Rose', a: '#fb6f92', b: '#e11d63', g: '#ff7aa2', o: '#f2557f', rgb: '251, 111, 146' },
    amber: { name: 'Amber', a: '#fbbf24', b: '#ea7a0c', g: '#ffc94a', o: '#f2a516', rgb: '251, 191, 36' },
    cyan: { name: 'Cyan', a: '#22d3ee', b: '#0891b2', g: '#3ee0ff', o: '#14bfdc', rgb: '34, 211, 238' },
  };
  let themeKey = 'blue';
  function applyTheme(key) {
    const t = THEMES[key] || THEMES.blue;
    themeKey = THEMES[key] ? key : 'blue';
    const st = document.documentElement.style;
    st.setProperty('--accent', t.a);
    st.setProperty('--accent-2', t.b);
    st.setProperty('--accent-rgb', t.rgb);
    st.setProperty('--accent-grad', `linear-gradient(135deg, ${t.g} 0%, ${t.b} 100%)`);
    st.setProperty('--bubble-out', `linear-gradient(135deg, ${t.o} 0%, ${t.b} 100%)`);
  }
  try { applyTheme(localStorage.getItem('cricket.theme') || 'blue'); } catch { applyTheme('blue'); }
  function renderSwatches() {
    const box = $('theme-swatches');
    if (!box) return;
    box.textContent = '';
    for (const [key, t] of Object.entries(THEMES)) {
      const b = el('button', `swatch${key === themeKey ? ' active' : ''}`);
      b.type = 'button';
      b.title = t.name;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(key === themeKey));
      b.setAttribute('aria-label', t.name);
      b.style.background = `linear-gradient(135deg, ${t.g}, ${t.b})`;
      b.addEventListener('click', () => {
        applyTheme(key);
        try { localStorage.setItem('cricket.theme', key); } catch { /* storage unavailable */ }
        renderSwatches();
      });
      box.appendChild(b);
    }
  }
  document.addEventListener('pointerdown', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('.btn, .icon-btn, .send-btn, .mini-btn, .rail-btn, .item') : null;
    if (!t || t.disabled) return;
    const r = t.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.7;
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.left = `${e.clientX - r.left - size / 2}px`;
    dot.style.top = `${e.clientY - r.top - size / 2}px`;
    t.appendChild(dot);
    setTimeout(() => dot.remove(), 700);
  }, { passive: true });

  function hideSplash() {
    const s = $('splash');
    if (!s) return; // already removed (e.g. login after the first boot)
    s.classList.add('gone');
    setTimeout(() => s.remove(), 300);
  }

  function showAuth() {
    $('main-view').hidden = true;
    $('auth-view').hidden = false;
    hideSplash();
  }

  function applyBootstrap(data) {
    S.me = data.me;
    S.limits = data.limits;
    remember(data.me);
    S.convs.clear();
    for (const c of data.conversations) { S.convs.set(c.peerId, c); remember(c.peer); }
    S.contacts.clear();
    for (const u of data.contacts) { S.contacts.set(u.id, u); remember(u); }
    S.blocked.clear();
    for (const u of data.blocked) { S.blocked.set(u.id, u); remember(u); }
  }

  function startApp(data) {
    listAnimate = true;
    applyBootstrap(data);
    $('auth-view').hidden = true;
    $('main-view').hidden = false;
    hideSplash();
    hydrateIcons(document);
    renderAll();
    connectSocket();
  }

  async function boot() {
    hydrateIcons(document);
    try {
      const data = await api('GET', '/api/bootstrap');
      startApp(data);
    } catch (e) {
      showAuth();
    }
  }

  /* ---- auth forms ---- */

  function setAuthMode(mode) {
    const login = mode === 'login';
    $('login-form').hidden = !login;
    $('signup-form').hidden = login;
    $('auth-tab-login').classList.toggle('active', login);
    $('auth-tab-signup').classList.toggle('active', !login);
    $('auth-tab-login').setAttribute('aria-selected', String(login));
    $('auth-tab-signup').setAttribute('aria-selected', String(!login));
    $('login-error').textContent = '';
    $('signup-error').textContent = '';
  }
  $('auth-tab-login').addEventListener('click', () => setAuthMode('login'));
  $('auth-tab-signup').addEventListener('click', () => setAuthMode('signup'));

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('login-submit');
    $('login-error').textContent = '';
    btn.disabled = true;
    try {
      const data = await api('POST', '/api/login', { identifier: $('login-id').value, password: $('login-pass').value });
      $('login-pass').value = '';
      startApp(data);
    } catch (err) {
      $('login-error').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
  let unameSeq = 0;
  async function checkUsername(value, hintEl, current) {
    const seq = ++unameSeq;
    const v = value.trim();
    hintEl.className = 'hint-line';
    if (!v) { hintEl.textContent = '3-20 letters, numbers or underscores.'; return null; }
    if (current && v === current) { hintEl.textContent = 'This is your current username.'; hintEl.classList.add('ok'); return true; }
    if (!USERNAME_RE.test(v)) {
      hintEl.textContent = 'Use 3-20 letters, numbers or underscores, starting with a letter.';
      hintEl.classList.add('bad');
      return false;
    }
    hintEl.textContent = 'Checking...';
    try {
      const r = await api('GET', `/api/username-available?u=${encodeURIComponent(v)}`);
      if (seq !== unameSeq) return null;
      hintEl.className = `hint-line ${r.available ? 'ok' : 'bad'}`;
      hintEl.textContent = r.available ? `@${v} is available` : r.reason || 'Not available.';
      return r.available;
    } catch (err) {
      if (seq !== unameSeq) return null;
      hintEl.className = 'hint-line';
      hintEl.textContent = '';
      return null;
    }
  }
  const checkSignupUsername = debounce(() => checkUsername($('su-username').value, $('su-username-hint'), null), 300);
  $('su-username').addEventListener('input', () => {
    $('su-username-hint').className = 'hint-line';
    $('su-username-hint').textContent = $('su-username').value ? 'Checking...' : '3-20 letters, numbers or underscores.';
    checkSignupUsername();
  });

  $('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('signup-error');
    err.textContent = '';
    if ($('su-pass').value !== $('su-pass2').value) { err.textContent = 'Passwords do not match.'; return; }
    const btn = $('signup-submit');
    btn.disabled = true;
    try {
      const data = await api('POST', '/api/signup', {
        email: $('su-email').value,
        username: $('su-username').value,
        displayName: $('su-display').value,
        password: $('su-pass').value,
      });
      $('su-pass').value = '';
      $('su-pass2').value = '';
      startApp(data);
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  });

  /* ------------------------------------------------------------------ */
  /* Socket.IO                                                           */
  /* ------------------------------------------------------------------ */

  function setConn(state) {
    const dot = $('conn-dot');
    dot.classList.toggle('off', state !== 'on');
    $('conn-text').textContent = state === 'on' ? '' : state === 'connecting' ? 'Connecting...' : 'Offline';
  }

  function connectSocket() {
    if (S.socket) return;
    setConn('connecting');
    const socket = io({ reconnection: true, reconnectionDelay: 500, reconnectionDelayMax: 5000 });
    S.socket = socket;

    socket.on('connect', () => {
      setConn('on');
      if (S.connectedOnce) resync();
      S.connectedOnce = true;
      if (S.active) markSeenIfVisible();
    });
    socket.on('disconnect', () => setConn('connecting'));
    socket.on('connect_error', async (err) => {
      setConn('connecting');
      if (err && err.message === 'unauthorized') {
        try { await api('GET', '/api/bootstrap'); } catch (e) { if (e.status === 401) sessionEnded(); }
      }
    });
    socket.on('session:ended', sessionEnded);

    socket.on('message:new', onMessageNew);
    socket.on('message:status', onMessageStatus);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('conv:read', ({ peerId, conv }) => { setConvSummary(peerId, conv); renderChatList(); updateBadges(); });
    socket.on('conversation:deleted', onConversationDeleted);
    socket.on('presence', onPresence);
    socket.on('profile:updated', onProfileUpdated);
    socket.on('typing', onTyping);
    socket.on('contacts:update', ({ contacts }) => {
      S.contacts.clear();
      for (const u of contacts) { S.contacts.set(u.id, u); remember(u); }
      renderContacts();
      renderSearchResults();
    });
    socket.on('blocklist:update', ({ blocked }) => {
      S.blocked.clear();
      for (const u of blocked) { S.blocked.set(u.id, u); remember(u); }
      renderBlocked();
      updateComposerState();
      renderSearchResults();
    });
  }

  function sessionEnded() {
    if (S.socket) { S.socket.disconnect(); }
    toast('You have been signed out.', 'error');
    setTimeout(() => location.reload(), 900);
  }

  async function resync() {
    try {
      const data = await api('GET', '/api/bootstrap');
      applyBootstrap(data);
      renderAll();
      if (S.active) await loadMessages(S.active, true);
      markSeenIfVisible();
    } catch (e) {
      if (e.status === 401) sessionEnded();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Rendering: navigation & lists                                       */
  /* ------------------------------------------------------------------ */

  function renderAll() {
    renderRail();
    renderChatList();
    renderContacts();
    renderBlocked();
    renderProfileTab();
    updateBadges();
    if (S.active) renderChatHeader();
  }

  function renderRail() {
    const holder = $('rail-avatar');
    holder.textContent = '';
    holder.appendChild(avatar(S.me, 'sm', false));
  }

  function switchTab(tab) {
    S.tab = tab;
    document.querySelectorAll('.rail-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    for (const t of ['chats', 'contacts', 'profile', 'settings']) $(`tab-${t}`).hidden = t !== tab;
    clearSearch();
    if (tab === 'chats') { listAnimate = true; renderChatList(); }
    if (tab === 'profile') renderProfileTab();
    if (tab === 'settings') renderSettings();
  }
  document.querySelectorAll('.rail-btn').forEach((b) => b.addEventListener('click', () => {
    switchTab(b.dataset.tab);
    if (isNarrow()) closeChat();
  }));

  function previewText(m) {
    if (!m) return '';
    if (m.deleted || m.type === 'deleted') return 'Message deleted';
    if (m.type === 'image') return '\u{1F4F7} Photo';
    if (m.type === 'video') return '\u{1F3AC} Video';
    if (m.type === 'voice') return `\u{1F3A4} Voice message${m.file && m.file.duration ? ` (${fmtDuration(m.file.duration)})` : ''}`;
    return m.text.replace(/\s+/g, ' ');
  }

  let listAnimate = true;
  function renderChatList() {
    const list = $('chat-list');
    list.textContent = '';
    const convs = [...S.convs.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    $('chats-empty').hidden = convs.length > 0;
    let rowIdx = 0;
    for (const c of convs) {
      const peer = userById(c.peerId) || c.peer;
      const row = el('div', `item${S.active === c.peerId ? ' active' : ''}${listAnimate ? ' enter' : ''}`);
      row.style.setProperty('--i', String(Math.min(rowIdx++, 12)));
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.dataset.peer = c.peerId;
      row.appendChild(avatar(peer, '', true));
      const main = el('div', 'item-main');
      const top = el('div', 'item-top');
      top.appendChild(el('span', 'item-name', peer.displayName));
      const time = el('span', 'item-time');
      if (c.last.from === S.me.id && c.last.type !== 'deleted') time.appendChild(ticks(c.last.status || 'sent'));
      time.appendChild(document.createTextNode(fmtListTime(c.last.ts)));
      top.appendChild(time);
      const bottom = el('div', 'item-bottom');
      const prev = el('span', 'item-preview');
      if (S.typing.has(c.peerId)) {
        prev.appendChild(el('span', 'typing-text', 'typing'));
      } else {
        if (c.last.from === S.me.id && c.last.type !== 'deleted') prev.appendChild(el('span', 'you', 'You: '));
        prev.appendChild(document.createTextNode(previewText(c.last)));
      }
      bottom.appendChild(prev);
      if (c.unread > 0 && S.active !== c.peerId) bottom.appendChild(el('span', 'badge', c.unread > 99 ? '99+' : String(c.unread)));
      main.append(top, bottom);
      row.appendChild(main);
      row.addEventListener('click', () => openChat(c.peerId));
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChat(c.peerId); } });
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showMenu(e.clientX, e.clientY, [
          { icon: 'info', label: 'View profile', action: () => showProfileModal(c.peerId) },
          { icon: 'trash', label: 'Delete conversation', danger: true, action: () => deleteConversationFlow(c.peerId) },
        ]);
      });
      list.appendChild(row);
    }
    listAnimate = false;
  }

  function renderContacts() {
    const list = $('contact-list');
    list.textContent = '';
    const arr = [...S.contacts.values()].map((u) => userById(u.id) || u).sort((a, b) => a.displayName.localeCompare(b.displayName));
    $('contacts-empty').hidden = arr.length > 0;
    for (const u of arr) list.appendChild(userRow(u, { remove: true }));
  }

  function userRow(u, opts) {
    const row = el('div', 'item');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.appendChild(avatar(u, '', true));
    const main = el('div', 'item-main');
    main.appendChild(el('div', 'item-name', u.displayName));
    const sub = el('div', 'item-sub');
    sub.textContent = `@${u.username} · ${u.online ? 'online' : fmtLastSeen(u.lastSeen)}`;
    main.appendChild(sub);
    row.appendChild(main);
    if (opts && opts.contactToggle) {
      const inContacts = S.contacts.has(u.id);
      const b = el('button', 'mini-btn');
      b.type = 'button';
      b.title = inContacts ? 'Remove from contacts' : 'Add to contacts';
      b.setAttribute('aria-label', b.title);
      b.appendChild(icon(inContacts ? 'userminus' : 'userplus'));
      b.addEventListener('click', (e) => { e.stopPropagation(); toggleContact(u.id); });
      row.appendChild(b);
    }
    if (opts && opts.remove) {
      const b = el('button', 'mini-btn');
      b.type = 'button';
      b.title = 'Remove from contacts';
      b.setAttribute('aria-label', 'Remove from contacts');
      b.appendChild(icon('userminus'));
      b.addEventListener('click', (e) => { e.stopPropagation(); toggleContact(u.id); });
      row.appendChild(b);
    }
    row.addEventListener('click', () => { clearSearch(); openChat(u.id); });
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearSearch(); openChat(u.id); } });
    return row;
  }

  function updateBadges() {
    let total = 0;
    for (const c of S.convs.values()) if (S.active !== c.peerId) total += c.unread || 0;
    const b = $('rail-badge');
    b.hidden = total === 0;
    b.textContent = total > 99 ? '99+' : String(total);
    document.title = total > 0 ? `(${total}) CRICKET` : 'CRICKET';
  }

  function setConvSummary(peerId, conv) {
    if (conv) { S.convs.set(peerId, conv); remember(conv.peer); } else S.convs.delete(peerId);
  }

  /* ------------------------------------------------------------------ */
  /* Search                                                              */
  /* ------------------------------------------------------------------ */

  let searchResults = [];
  let searchSeq = 0;

  function clearSearch() {
    $('search-input').value = '';
    $('search-clear').hidden = true;
    $('search-results').hidden = true;
    searchResults = [];
    searchSeq++;
    for (const t of ['chats', 'contacts', 'profile', 'settings']) $(`tab-${t}`).hidden = t !== S.tab;
  }

  function renderSearchResults(message) {
    const box = $('search-results');
    if (box.hidden) return;
    box.textContent = '';
    if (message) { box.appendChild(el('div', 'empty', message)); return; }
    box.appendChild(el('div', 'section-title', 'Users'));
    const list = el('div', 'list');
    for (const u of searchResults) list.appendChild(userRow(userById(u.id) || u, { contactToggle: true }));
    box.appendChild(list);
  }

  const runSearch = debounce(async () => {
    const q = $('search-input').value.trim().replace(/^@/, '');
    const seq = ++searchSeq;
    if (!q) return;
    try {
      const { users } = await api('GET', `/api/users/search?q=${encodeURIComponent(q)}`);
      if (seq !== searchSeq) return;
      searchResults = users;
      for (const u of users) remember(u);
      renderSearchResults(users.length ? null : `No users found for "${q}"`);
    } catch (e) {
      if (seq !== searchSeq) return;
      renderSearchResults(e.message);
    }
  }, 250);

  $('search-input').addEventListener('input', () => {
    const q = $('search-input').value.trim();
    $('search-clear').hidden = !$('search-input').value;
    if (!q) { clearSearch(); return; }
    for (const t of ['chats', 'contacts', 'profile', 'settings']) $(`tab-${t}`).hidden = true;
    $('search-results').hidden = false;
    renderSearchResults('Searching...');
    runSearch();
  });
  $('search-clear').addEventListener('click', () => { clearSearch(); $('search-input').focus(); });
  $('search-input').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); clearSearch(); } });

  function toggleContact(userId) {
    const ev = S.contacts.has(userId) ? 'contact:remove' : 'contact:add';
    S.socket.emit(ev, { userId }, (res) => {
      if (!res || !res.ok) toast((res && res.error) || 'Could not update contacts.', 'error');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Chat: open / close / header                                         */
  /* ------------------------------------------------------------------ */

  function getThread(peerId) {
    let t = S.msgs.get(peerId);
    if (!t) { t = { list: [], hasMore: false, loaded: false, loading: false }; S.msgs.set(peerId, t); }
    return t;
  }

  function openChat(peerId) {
    if (!peerId || peerId === S.me.id) return;
    if (!userById(peerId)) return;
    if (S.active && S.active !== peerId) saveDraft();
    stopRecordingSilently();
    S.active = peerId;
    $('chat-empty').hidden = true;
    $('chat-screen').hidden = false;
    $('main-view').classList.add('chat-open');
    if (isNarrow() && !(history.state && history.state.chat)) history.pushState({ chat: true }, '');
    $('msg-input').value = S.drafts.get(peerId) || '';
    autosize();
    syncComposerButtons();
    renderChatHeader();
    updateComposerState();
    renderChatList();
    updateBadges();
    $('thread').textContent = '';
    S.nodes.clear();
    const cs = $('chat-screen');
    cs.classList.remove('swap');
    void cs.offsetWidth; // restart the CSS animation
    cs.classList.add('swap');
    const t = getThread(peerId);
    if (t.loaded) { renderThreadFull(true); } else { showThreadLoading(); }
    loadMessages(peerId, !t.loaded).then(() => { if (S.active === peerId) markSeenIfVisible(); });
    if (!isNarrow()) $('msg-input').focus({ preventScroll: true });
  }

  function closeChat(fromPop) {
    if (!S.active) { $('main-view').classList.remove('chat-open'); return; }
    saveDraft();
    stopRecordingSilently();
    sendTyping(false);
    S.active = null;
    S.nodes.clear();
    stopAudio();
    $('chat-screen').hidden = true;
    $('chat-empty').hidden = false;
    $('main-view').classList.remove('chat-open');
    if (!fromPop && history.state && history.state.chat) history.back();
    renderChatList();
    updateBadges();
  }
  window.addEventListener('popstate', () => { if (S.active && isNarrow()) closeChat(true); });
  $('chat-back').addEventListener('click', () => closeChat());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.active && !document.querySelector('.modal-backdrop, .menu, .lightbox')) closeChat();
  });
  window.addEventListener('resize', () => {
    if (S.active && !isNarrow()) $('main-view').classList.add('chat-open');
  });

  function saveDraft() {
    if (!S.active) return;
    const v = $('msg-input').value;
    if (v.trim()) S.drafts.set(S.active, v); else S.drafts.delete(S.active);
  }

  function statusLine(u) {
    if (S.typing.has(u.id)) return { text: 'typing', cls: 'typing' };
    if (u.online) return { text: 'online', cls: 'online' };
    return { text: fmtLastSeen(u.lastSeen), cls: '' };
  }

  function renderChatHeader() {
    const u = userById(S.active);
    if (!u) return;
    const holder = $('chat-avatar');
    holder.textContent = '';
    holder.appendChild(avatar(u, '', true));
    $('chat-name').textContent = u.displayName;
    const st = statusLine(u);
    const s = $('chat-status');
    s.textContent = st.text;
    s.className = `peer-status ${st.cls}`;
  }

  function updateComposerState() {
    if (!S.active) return;
    const blocked = S.blocked.has(S.active);
    $('blocked-bar').hidden = !blocked;
    $('composer').hidden = blocked;
    if (blocked) {
      const u = userById(S.active);
      $('blocked-text').textContent = `You blocked ${u ? u.displayName : 'this user'}.`;
      $('recorder').hidden = true;
    }
  }
  $('unblock-btn').addEventListener('click', () => { if (S.active) setBlocked(S.active, false); });

  $('chat-peer').addEventListener('click', () => { if (S.active) showProfileModal(S.active); });
  $('chat-more').addEventListener('click', (e) => {
    if (!S.active) return;
    const id = S.active;
    const r = e.currentTarget.getBoundingClientRect();
    const blocked = S.blocked.has(id);
    const inContacts = S.contacts.has(id);
    showMenu(r.right - 210, r.bottom + 4, [
      { icon: 'info', label: 'View profile', action: () => showProfileModal(id) },
      { icon: inContacts ? 'userminus' : 'userplus', label: inContacts ? 'Remove from contacts' : 'Add to contacts', action: () => toggleContact(id) },
      { icon: 'ban', label: blocked ? 'Unblock user' : 'Block user', danger: !blocked, action: () => (blocked ? setBlocked(id, false) : blockFlow(id)) },
      { icon: 'trash', label: 'Delete conversation', danger: true, action: () => deleteConversationFlow(id) },
    ]);
  });

  /* ------------------------------------------------------------------ */
  /* Messages: load, render                                              */
  /* ------------------------------------------------------------------ */

  function showThreadLoading() {
    const box = $('thread');
    box.textContent = '';
    const w = el('div', 'thread-loading');
    w.appendChild(el('div', 'spinner'));
    box.appendChild(w);
  }

  async function loadMessages(peerId, replace) {
    const t = getThread(peerId);
    if (t.loading) return;
    t.loading = true;
    try {
      const { messages, hasMore } = await api('GET', `/api/chats/${peerId}/messages?limit=50`);
      const pending = t.list.filter((m) => m.status === 'pending' || m.status === 'failed');
      t.list = replace ? messages.concat(pending) : t.list;
      t.hasMore = hasMore;
      t.loaded = true;
    } catch (e) {
      if (e.status === 401) { sessionEnded(); return; }
      if (S.active === peerId) toast(e.message, 'error');
    } finally {
      t.loading = false;
    }
    if (S.active === peerId) renderThreadFull(true);
  }

  async function loadOlder() {
    const peerId = S.active;
    const t = getThread(peerId);
    if (!t.hasMore || t.loading) return;
    const first = t.list.find((m) => m.seq);
    if (!first) return;
    t.loading = true;
    const box = $('thread');
    const prevH = box.scrollHeight;
    try {
      const { messages, hasMore } = await api('GET', `/api/chats/${peerId}/messages?limit=50&before=${first.seq}`);
      t.list = messages.concat(t.list);
      t.hasMore = hasMore;
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      t.loading = false;
    }
    if (S.active === peerId) {
      renderThreadFull(false);
      box.scrollTop = box.scrollHeight - prevH;
    }
  }

  const nearBottom = () => { const b = $('thread'); return b.scrollHeight - b.scrollTop - b.clientHeight < 90; };
  function scrollToBottom() { const b = $('thread'); b.scrollTop = b.scrollHeight; $('scroll-down').hidden = true; }

  $('thread').addEventListener('scroll', () => {
    const b = $('thread');
    $('scroll-down').hidden = nearBottom();
    if (b.scrollTop < 60) loadOlder();
  }, { passive: true });
  $('scroll-down').addEventListener('click', scrollToBottom);
  window.addEventListener('resize', () => { if (S.active && stick) scrollToBottom(); });
  let stick = true;
  $('thread').addEventListener('scroll', () => { stick = nearBottom(); }, { passive: true });

  function renderThreadFull(toBottom) {
    const box = $('thread');
    box.textContent = '';
    S.nodes.clear();
    const t = getThread(S.active);
    if (!t.list.length) {
      const u = userById(S.active);
      box.appendChild(el('div', 'thread-empty', `No messages yet. Say hi to ${u ? u.displayName : 'them'}!`));
      return;
    }
    let prev = null;
    for (const m of t.list) { appendMsgDom(m, prev); prev = m; }
    if (toBottom) { scrollToBottom(); stick = true; }
    reconcileAudio();
  }

  function appendMsgDom(m, prev) {
    const box = $('thread');
    const empty = box.querySelector('.thread-empty, .thread-loading');
    if (empty) empty.remove();
    if (!prev || startOfDay(prev.ts) !== startOfDay(m.ts)) box.appendChild(el('div', 'day-sep', fmtDayLabel(m.ts)));
    const grouped = !!prev && prev.from === m.from && startOfDay(prev.ts) === startOfDay(m.ts) && m.ts - prev.ts < 5 * 60000;
    const node = buildMessage(m, grouped);
    if (m.status === 'pending' || Date.now() - m.ts < 15000) node.classList.add('fresh');
    S.nodes.set(m.id, node);
    box.appendChild(node);
    return node;
  }

  function buildMessage(m, grouped) {
    const mine = m.from === S.me.id;
    const wrap = el('div', `msg ${mine ? 'mine' : 'theirs'}${grouped ? ' cont' : ''}`);
    wrap.dataset.id = m.id;
    const bubble = el('div', 'bubble');
    wrap.appendChild(bubble);
    const status = m.status || 'sent';
    if (status === 'failed') bubble.classList.add('failed');

    const meta = el('div', 'meta');
    const full = new Date(m.ts);
    const time = el('span', 'time', fmtClock(m.ts));
    time.title = `${fmtDate(m.ts)} ${fmtClock(m.ts)}`;

    if (m.deleted || m.type === 'deleted') {
      bubble.classList.add('deleted');
      bubble.appendChild(el('div', 'text', mine ? 'You deleted this message' : 'This message was deleted'));
      meta.appendChild(time);
    } else if (m.type === 'text') {
      const txt = el('div', 'text');
      linkify(txt, m.text);
      bubble.appendChild(txt);
    } else if (m.type === 'image') {
      bubble.classList.add('media');
      const wrapM = el('div', 'media-wrap');
      const img = el('img', 'media-img');
      img.alt = 'Photo';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = m.file.url;
      img.addEventListener('load', () => { if (stick) scrollToBottom(); });
      img.addEventListener('error', () => { wrapM.replaceChildren(el('div', 'text', 'Photo unavailable')); });
      img.addEventListener('click', () => openLightbox(img.currentSrc || m.file.url));
      wrapM.appendChild(img);
      if (m.status === 'pending') wrapM.appendChild(uploadOverlay(m));
      bubble.appendChild(wrapM);
    } else if (m.type === 'video') {
      bubble.classList.add('media', 'vid');
      const wrapM = el('div', 'media-wrap');
      const v = el('video', 'media-video');
      v.controls = m.status !== 'pending';
      v.preload = 'metadata';
      v.playsInline = true;
      v.src = m.file.url;
      v.addEventListener('loadedmetadata', () => { if (stick) scrollToBottom(); });
      v.addEventListener('error', () => { wrapM.replaceChildren(el('div', 'text', 'Video unavailable')); });
      wrapM.appendChild(v);
      if (m.status === 'pending') wrapM.appendChild(uploadOverlay(m));
      bubble.appendChild(wrapM);
    } else if (m.type === 'voice') {
      bubble.appendChild(buildVoice(m));
    }

    if (!(m.deleted || m.type === 'deleted')) meta.appendChild(time);
    if (mine && !(m.deleted || m.type === 'deleted')) meta.appendChild(ticks(status));
    if (m.status !== 'pending' || m.type === 'text') {
      const menuBtn = el('button', 'msg-menu');
      menuBtn.type = 'button';
      menuBtn.setAttribute('aria-label', 'Message options');
      menuBtn.appendChild(icon('down'));
      menuBtn.addEventListener('click', (e) => { e.stopPropagation(); const r = menuBtn.getBoundingClientRect(); openMessageMenu(m, r.left, r.bottom + 4); });
      if (!(m.deleted || m.type === 'deleted') || mine) meta.insertBefore(menuBtn, meta.firstChild);
    }
    bubble.appendChild(meta);
    void full;
    bubble.addEventListener('contextmenu', (e) => { e.preventDefault(); openMessageMenu(m, e.clientX, e.clientY); });
    return wrap;
  }

  function uploadOverlay(m) {
    const o = el('div', 'up-overlay');
    const cancel = el('button', 'up-cancel');
    cancel.type = 'button';
    cancel.setAttribute('aria-label', 'Cancel upload');
    cancel.appendChild(icon('x'));
    cancel.addEventListener('click', () => cancelUpload(m.id));
    o.appendChild(cancel);
    const bar = el('div', 'up-bar');
    const fill = el('i');
    fill.style.width = `${Math.round((m.progress || 0) * 100)}%`;
    bar.appendChild(fill);
    o.appendChild(bar);
    return o;
  }

  const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;
  function linkify(node, text) {
    let last = 0;
    for (const match of text.matchAll(URL_RE)) {
      let url = match[0];
      let trail = '';
      while (/[.,;:!?)\]}]$/.test(url)) { trail = url.slice(-1) + trail; url = url.slice(0, -1); }
      if (match.index > last) node.appendChild(document.createTextNode(text.slice(last, match.index)));
      let ok = false;
      try { const u = new URL(url); ok = u.protocol === 'http:' || u.protocol === 'https:'; } catch { ok = false; }
      if (ok) {
        const a = el('a', '', url);
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer nofollow';
        node.appendChild(a);
      } else {
        node.appendChild(document.createTextNode(url));
      }
      if (trail) node.appendChild(document.createTextNode(trail));
      last = match.index + match[0].length;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  function openLightbox(src) {
    const lb = el('div', 'lightbox');
    const img = el('img');
    img.alt = 'Photo';
    img.src = src;
    const x = el('button', 'icon-btn');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.appendChild(icon('x'));
    const close = () => { lb.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    lb.addEventListener('click', (e) => { if (e.target !== img) close(); });
    lb.append(img, x);
    $('overlay-root').appendChild(lb);
    x.focus();
  }

  /* ---- voice player ---- */

  let audioCtl = null; // { id, audio, btn, fill, time, dur }

  function stopAudio() {
    if (audioCtl) {
      audioCtl.audio.pause();
      audioCtl.audio.removeAttribute('src');
      audioCtl.audio.load();
      setPlayIcon(audioCtl.btn, false);
      audioCtl = null;
    }
  }
  function reconcileAudio() { if (audioCtl && !S.nodes.has(audioCtl.id)) stopAudio(); }
  function setPlayIcon(btn, playing) { btn.textContent = ''; btn.appendChild(icon(playing ? 'pause' : 'play')); }

  function buildVoice(m) {
    const box = el('div', 'voice');
    const btn = el('button', 'vplay');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Play voice message');
    setPlayIcon(btn, false);
    const bar = el('div', 'vbar');
    const fill = el('div', 'vfill');
    bar.appendChild(fill);
    const total = (m.file && m.file.duration) || 0;
    const time = el('span', 'vtime', fmtDuration(total));
    box.append(btn, bar, time);

    const fresh = () => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = m.file.url;
      return audio;
    };
    btn.addEventListener('click', () => {
      if (audioCtl && audioCtl.id === m.id) {
        if (audioCtl.audio.paused) audioCtl.audio.play().catch(() => toast('Could not play this voice message.', 'error'));
        else audioCtl.audio.pause();
        return;
      }
      stopAudio();
      const audio = fresh();
      const ctl = { id: m.id, audio, btn, fill, time, total };
      audioCtl = ctl;
      audio.addEventListener('play', () => setPlayIcon(btn, true));
      audio.addEventListener('pause', () => setPlayIcon(btn, false));
      audio.addEventListener('timeupdate', () => {
        const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : total;
        if (dur > 0) fill.style.width = `${Math.min(100, (audio.currentTime / dur) * 100)}%`;
        time.textContent = fmtDuration(audio.currentTime);
      });
      audio.addEventListener('ended', () => {
        fill.style.width = '0%';
        time.textContent = fmtDuration(total);
        setPlayIcon(btn, false);
        if (audioCtl === ctl) audioCtl = null;
      });
      audio.addEventListener('error', () => { toast('This voice message is unavailable.', 'error'); setPlayIcon(btn, false); if (audioCtl === ctl) audioCtl = null; });
      audio.play().catch(() => {});
    });
    bar.addEventListener('click', (e) => {
      if (!audioCtl || audioCtl.id !== m.id) return;
      const r = bar.getBoundingClientRect();
      const dur = isFinite(audioCtl.audio.duration) && audioCtl.audio.duration > 0 ? audioCtl.audio.duration : total;
      if (dur > 0) audioCtl.audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur;
    });
    return box;
  }

  /* ---- message menu & deletion ---- */

  function openMessageMenu(m, x, y) {
    const mine = m.from === S.me.id;
    const items = [];
    if (m.status === 'failed') {
      items.push({ icon: 'retry', label: 'Retry', action: () => retryMessage(m) });
      items.push({ icon: 'trash', label: 'Remove', danger: true, action: () => removeLocal(m.id) });
      return showMenu(x, y, items);
    }
    if (m.status === 'pending') return;
    if (m.type === 'text' && !m.deleted) {
      items.push({ icon: 'copy', label: 'Copy text', action: () => copyText(m.text) });
    }
    if (!m.deleted) {
      items.push({ icon: 'trash', label: 'Delete for me', action: () => deleteMessage(m, false) });
      if (mine) items.push({ icon: 'trash', label: 'Delete for everyone', danger: true, action: () => deleteMessage(m, true) });
    } else if (mine) {
      items.push({ icon: 'trash', label: 'Remove from my view', action: () => deleteMessage(m, false) });
    }
    if (items.length) showMenu(x, y, items);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied', 'ok'); } catch {
      const ta = el('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast('Copied', 'ok'); } catch { toast('Could not copy.', 'error'); }
      ta.remove();
    }
  }

  function deleteMessage(m, forEveryone) {
    S.socket.emit('message:delete', { peerId: S.active, messageId: m.id, forEveryone }, (res) => {
      if (!res || !res.ok) toast((res && res.error) || 'Could not delete the message.', 'error');
    });
  }

  function removeLocal(id) {
    const t = getThread(S.active);
    t.list = t.list.filter((m) => m.id !== id);
    renderThreadFull(false);
  }

  async function deleteConversationFlow(peerId) {
    const u = userById(peerId);
    const r = await confirmDialog({
      title: 'Delete conversation?',
      text: `All messages with ${u ? u.displayName : 'this user'} will be removed from your chat list. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
      checkbox: `Also delete for ${u ? u.displayName : 'them'}`,
    });
    if (!r.ok) return;
    S.socket.emit('conversation:delete', { peerId, forEveryone: r.checked }, (res) => {
      if (!res || !res.ok) toast((res && res.error) || 'Could not delete the conversation.', 'error');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Socket event handlers                                               */
  /* ------------------------------------------------------------------ */

  function replacePending(tempId, serverMsg, peerId) {
    const t = getThread(peerId);
    const i = t.list.findIndex((m) => m.id === tempId);
    if (i < 0) return false;
    const old = t.list[i];
    if (old.file && old.file.local) URL.revokeObjectURL(old.file.url);
    S.uploads.delete(tempId);
    t.list[i] = serverMsg;
    if (S.active === peerId) {
      const node = S.nodes.get(tempId);
      S.nodes.delete(tempId);
      if (node) {
        const prev = t.list[i - 1] || null;
        const grouped = !!prev && prev.from === serverMsg.from && startOfDay(prev.ts) === startOfDay(serverMsg.ts) && serverMsg.ts - prev.ts < 5 * 60000;
        const fresh = buildMessage(serverMsg, grouped);
        node.replaceWith(fresh);
        S.nodes.set(serverMsg.id, fresh);
      }
    }
    return true;
  }

  function onMessageNew({ peerId, message, conv }) {
    const mine = message.from === S.me.id;
    setConvSummary(peerId, conv);
    const t = getThread(peerId);

    if (mine && message.tempId && replacePending(message.tempId, message, peerId)) {
      /* optimistic message resolved */
    } else if (!t.list.some((m) => m.id === message.id)) {
      if (t.loaded || S.active === peerId) {
        const prev = t.list[t.list.length - 1] || null;
        t.list.push(message);
        if (S.active === peerId) {
          const wasNear = stick;
          appendMsgDom(message, prev);
          if (mine || wasNear) scrollToBottom(); else $('scroll-down').hidden = false;
        }
      }
    }

    const visible = S.active === peerId && document.visibilityState === 'visible' && document.hasFocus();
    if (!mine) {
      if (S.typing.has(peerId)) clearTyping(peerId);
      if (visible) {
        const c = S.convs.get(peerId);
        if (c) c.unread = 0;
        markSeenIfVisible();
      } else if (S.active !== peerId || document.visibilityState !== 'visible') {
        const u = userById(peerId);
        toast(`${u ? u.displayName : 'New message'}: ${previewText(message).slice(0, 70)}`);
      }
    }
    renderChatList();
    updateBadges();
    if (S.active === peerId) renderChatHeader();
  }

  function onMessageStatus({ peerId, ids, status }) {
    const t = getThread(peerId);
    const idset = new Set(ids);
    const rank = { sent: 0, delivered: 1, seen: 2 };
    for (const m of t.list) {
      if (!idset.has(m.id)) continue;
      if ((rank[m.status] ?? -1) >= rank[status]) continue;
      m.status = status;
      const node = S.nodes.get(m.id);
      if (node) {
        const old = node.querySelector('.ticks');
        if (old) old.replaceWith(ticks(status));
      }
    }
    const c = S.convs.get(peerId);
    if (c && idset.has(c.last.id)) { c.last.status = status; renderChatList(); }
  }

  function onMessageDeleted({ peerId, messageId, forEveryone, conv }) {
    setConvSummary(peerId, conv);
    const t = getThread(peerId);
    const i = t.list.findIndex((m) => m.id === messageId);
    if (i >= 0) {
      if (forEveryone) {
        const old = t.list[i];
        t.list[i] = { id: old.id, seq: old.seq, from: old.from, to: old.to, ts: old.ts, type: 'deleted', deleted: true };
        if (audioCtl && audioCtl.id === messageId) stopAudio();
        if (S.active === peerId) {
          const node = S.nodes.get(messageId);
          const prev = t.list[i - 1] || null;
          if (node) {
            const grouped = !!prev && prev.from === old.from && startOfDay(prev.ts) === startOfDay(old.ts) && old.ts - prev.ts < 5 * 60000;
            const fresh = buildMessage(t.list[i], grouped);
            node.replaceWith(fresh);
            S.nodes.set(messageId, fresh);
          }
        }
      } else {
        const old = t.list[i];
        if (old.file && old.file.local) URL.revokeObjectURL(old.file.url);
        t.list.splice(i, 1);
        if (audioCtl && audioCtl.id === messageId) stopAudio();
        if (S.active === peerId) { const keep = stick; renderThreadFull(false); if (keep) scrollToBottom(); }
      }
    }
    renderChatList();
    updateBadges();
  }

  function onConversationDeleted({ peerId }) {
    S.convs.delete(peerId);
    const t = getThread(peerId);
    for (const m of t.list) if (m.file && m.file.local) URL.revokeObjectURL(m.file.url);
    for (const [tid, up] of S.uploads) {
      if (t.list.some((m) => m.id === tid)) { try { up.xhr.abort(); } catch { /* ignore */ } S.uploads.delete(tid); }
    }
    S.msgs.delete(peerId);
    S.drafts.delete(peerId);
    clearTyping(peerId, true);
    if (S.active === peerId) {
      if (isNarrow()) closeChat();
      else {
        stopAudio();
        S.nodes.clear();
        renderThreadFull(false);
        renderChatHeader();
      }
    }
    renderChatList();
    updateBadges();
  }

  function onPresence({ userId, online, lastSeen }) {
    const u = S.users.get(userId);
    if (u) { u.online = online; u.lastSeen = lastSeen; }
    const c = S.convs.get(userId);
    if (c) { c.peer.online = online; c.peer.lastSeen = lastSeen; }
    for (const map of [S.contacts, S.blocked]) { const x = map.get(userId); if (x) { x.online = online; x.lastSeen = lastSeen; } }
    if (userId === S.me.id) return;
    renderChatList();
    if (S.tab === 'contacts') renderContacts();
    if (S.active === userId) renderChatHeader();
    if (!$('search-results').hidden) renderSearchResults();
  }

  function onProfileUpdated({ user }) {
    if (user.id === S.me.id) {
      S.me = { ...S.me, ...user };
      remember(S.me);
      renderRail();
      if (S.tab === 'profile') renderProfileTab(true);
      if (S.tab === 'settings') renderSettings();
      return;
    }
    remember(user);
    const c = S.convs.get(user.id);
    if (c) c.peer = { ...c.peer, ...user };
    for (const map of [S.contacts, S.blocked]) { const x = map.get(user.id); if (x) map.set(user.id, { ...x, ...user }); }
    renderChatList();
    renderContacts();
    renderBlocked();
    if (S.active === user.id) renderChatHeader();
  }

  /* ---- typing ---- */

  function clearTyping(peerId, silent) {
    const t = S.typing.get(peerId);
    if (t) clearTimeout(t);
    S.typing.delete(peerId);
    if (silent) return;
    renderChatList();
    if (S.active === peerId) renderChatHeader();
  }

  function onTyping({ peerId, typing }) {
    if (!typing) { clearTyping(peerId); return; }
    const old = S.typing.get(peerId);
    if (old) clearTimeout(old);
    S.typing.set(peerId, setTimeout(() => clearTyping(peerId), 5000));
    renderChatList();
    if (S.active === peerId) renderChatHeader();
  }

  let iAmTyping = false;
  let typingIdle = null;
  let lastTypingPing = 0;
  function sendTyping(on) {
    if (!S.socket || !S.active) return;
    if (on) {
      const now = Date.now();
      if (!iAmTyping || now - lastTypingPing > 3000) {
        S.socket.emit('typing', { peerId: S.active, typing: true });
        lastTypingPing = now;
      }
      iAmTyping = true;
      clearTimeout(typingIdle);
      typingIdle = setTimeout(() => sendTyping(false), 3000);
    } else {
      clearTimeout(typingIdle);
      if (iAmTyping) S.socket.emit('typing', { peerId: S.active, typing: false });
      iAmTyping = false;
    }
  }

  /* ---- seen ---- */

  function markSeenIfVisible() {
    if (!S.active || !S.socket || !S.socket.connected) return;
    if (document.visibilityState !== 'visible') return;
    const c = S.convs.get(S.active);
    const t = getThread(S.active);
    const hasUnseen = (c && c.unread > 0) || t.list.some((m) => m.from === S.active && m.status !== 'seen' && !m.deleted);
    if (hasUnseen) S.socket.emit('messages:seen', { peerId: S.active });
  }
  document.addEventListener('visibilitychange', markSeenIfVisible);
  window.addEventListener('focus', markSeenIfVisible);

  /* ------------------------------------------------------------------ */
  /* Composer: text                                                      */
  /* ------------------------------------------------------------------ */

  const input = $('msg-input');
  function autosize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  }
  function syncComposerButtons() {
    const has = input.value.trim().length > 0;
    $('send-btn').hidden = !has;
    $('mic-btn').hidden = has;
  }
  input.addEventListener('input', () => {
    autosize();
    syncComposerButtons();
    if (input.value.trim()) sendTyping(true); else sendTyping(false);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !isCoarse()) {
      e.preventDefault();
      $('composer').requestSubmit();
    }
  });
  input.addEventListener('blur', () => sendTyping(false));

  $('composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.replace(/\r\n?/g, '\n').trim();
    if (!text || !S.active) return;
    if (text.length > S.limits.text) { toast(`Messages can be at most ${S.limits.text} characters.`, 'error'); return; }
    sendText(S.active, text);
    input.value = '';
    S.drafts.delete(S.active);
    autosize();
    syncComposerButtons();
    sendTyping(false);
    input.focus({ preventScroll: true });
  });

  let tempCounter = 0;
  const newTempId = () => `t${Date.now().toString(36)}${(tempCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  function addPending(peerId, msg) {
    const t = getThread(peerId);
    const prev = t.list[t.list.length - 1] || null;
    t.list.push(msg);
    t.loaded = true;
    if (S.active === peerId) { appendMsgDom(msg, prev); scrollToBottom(); }
  }

  function sendText(peerId, text, existingTempId) {
    const tempId = existingTempId || newTempId();
    if (!existingTempId) {
      addPending(peerId, { id: tempId, tempId, from: S.me.id, to: peerId, ts: Date.now(), type: 'text', text, status: 'pending' });
    }
    S.socket.timeout(15000).emit('message:send', { peerId, text, tempId }, (err, res) => {
      if (err || !res) return failPending(peerId, tempId, 'Message could not be sent. Check your connection.');
      if (!res.ok) return failPending(peerId, tempId, res.error || 'Message could not be sent.');
      replacePending(tempId, res.message, peerId);
      renderChatList();
    });
    if (!S.socket.connected) failPending(peerId, tempId, 'You are offline. Message was not sent.');
  }

  function failPending(peerId, tempId, reason) {
    const t = getThread(peerId);
    const m = t.list.find((x) => x.id === tempId);
    if (!m || m.status !== 'pending') return;
    m.status = 'failed';
    m.error = reason;
    if (S.active === peerId) {
      const node = S.nodes.get(tempId);
      if (node) {
        const i = t.list.indexOf(m);
        const prev = t.list[i - 1] || null;
        const fresh = buildMessage(m, !!prev && prev.from === m.from && m.ts - prev.ts < 300000);
        node.replaceWith(fresh);
        S.nodes.set(tempId, fresh);
      }
    }
    toast(reason, 'error');
  }

  function retryMessage(m) {
    const peerId = S.active;
    if (m.type === 'text') {
      m.status = 'pending';
      const node = S.nodes.get(m.id);
      if (node) {
        const fresh = buildMessage(m, false);
        node.replaceWith(fresh);
        S.nodes.set(m.id, fresh);
      }
      sendText(peerId, m.text, m.id);
    } else if (m.blob) {
      removeLocal(m.id);
      uploadMedia(m.type, m.blob, peerId, m.file && m.file.duration);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Composer: images & video                                            */
  /* ------------------------------------------------------------------ */

  $('attach-btn').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    for (const f of files.slice(0, 10)) handleMediaFile(f);
  });

  function handleMediaFile(file) {
    if (!S.active) return;
    const isImg = /^image\/(jpeg|png|gif|webp)$/.test(file.type);
    const isVid = /^video\/(mp4|webm|quicktime)$/.test(file.type);
    if (!isImg && !isVid) { toast(`"${file.name}" is not a supported photo or video (JPG, PNG, GIF, WebP, MP4, WebM, MOV).`, 'error'); return; }
    const max = isImg ? S.limits.image : S.limits.video;
    if (file.size > max) { toast(`"${file.name}" is too large (${fmtSize(file.size)}). Limit is ${fmtSize(max)}.`, 'error'); return; }
    if (file.size === 0) { toast(`"${file.name}" is empty.`, 'error'); return; }
    uploadMedia(isImg ? 'image' : 'video', file, S.active);
  }

  // drag & drop and paste of images
  const chatEl = $('chat');
  chatEl.addEventListener('dragover', (e) => { if (S.active && e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  chatEl.addEventListener('drop', (e) => {
    if (!S.active || !e.dataTransfer || !e.dataTransfer.files.length || S.blocked.has(S.active)) return;
    e.preventDefault();
    for (const f of [...e.dataTransfer.files].slice(0, 10)) handleMediaFile(f);
  });
  input.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData ? e.clipboardData.files : [])];
    if (files.length && S.active && !S.blocked.has(S.active)) { e.preventDefault(); files.slice(0, 5).forEach(handleMediaFile); }
  });

  function uploadMedia(kind, blob, peerId, duration) {
    if (S.blocked.has(peerId)) { toast('Unblock this user to send messages.', 'error'); return; }
    const tempId = newTempId();
    const url = URL.createObjectURL(blob);
    const msg = {
      id: tempId, tempId, from: S.me.id, to: peerId, ts: Date.now(), type: kind, text: '', status: 'pending', progress: 0, blob,
      file: { url, local: true, mime: blob.type, size: blob.size, duration: duration || 0 },
    };
    addPending(peerId, msg);

    const fd = new FormData();
    fd.append('peerId', peerId);
    fd.append('tempId', tempId);
    if (kind === 'voice') fd.append('duration', String(duration || 0));
    const ext = kind === 'voice' ? 'webm' : (blob.name || 'file').split('.').pop();
    fd.append('file', blob, blob.name || `${kind}.${ext}`);

    const xhr = new XMLHttpRequest();
    S.uploads.set(tempId, { xhr });
    xhr.open('POST', `/api/upload/${kind}`);
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      msg.progress = e.loaded / e.total;
      const node = S.nodes.get(tempId);
      const fill = node && node.querySelector('.up-bar i');
      if (fill) fill.style.width = `${Math.round(msg.progress * 100)}%`;
    };
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status === 201 && data && data.message) {
        replacePending(tempId, data.message, peerId);
        S.uploads.delete(tempId);
        renderChatList();
      } else {
        S.uploads.delete(tempId);
        if (xhr.status === 401) return sessionEnded();
        failPending(peerId, tempId, (data && data.error) || `Upload failed (${xhr.status}).`);
      }
    };
    xhr.onerror = () => { S.uploads.delete(tempId); failPending(peerId, tempId, 'Upload failed. Check your connection.'); };
    xhr.onabort = () => { S.uploads.delete(tempId); };
    xhr.send(fd);
  }

  function cancelUpload(tempId) {
    const up = S.uploads.get(tempId);
    if (up) { try { up.xhr.abort(); } catch { /* ignore */ } }
    for (const [peerId, t] of S.msgs) {
      const i = t.list.findIndex((m) => m.id === tempId);
      if (i >= 0) {
        const m = t.list[i];
        if (m.file && m.file.local) URL.revokeObjectURL(m.file.url);
        t.list.splice(i, 1);
        if (S.active === peerId) renderThreadFull(false);
        break;
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Composer: voice messages                                            */
  /* ------------------------------------------------------------------ */

  let rec = null; // { recorder, stream, chunks, started, timer, cancelled, peerId, mime }

  function pickMime() {
    const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
    return cands.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  }

  $('mic-btn').addEventListener('click', async () => {
    if (!S.active || rec) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast('Voice messages need a modern browser and a secure (HTTPS) connection.', 'error');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      toast(err && err.name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Could not access the microphone.', 'error');
      return;
    }
    const mime = pickMime();
    let recorder;
    try { recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); } catch {
      stream.getTracks().forEach((t) => t.stop());
      toast('Voice recording is not supported in this browser.', 'error');
      return;
    }
    rec = { recorder, stream, chunks: [], started: Date.now(), cancelled: false, peerId: S.active, mime: recorder.mimeType || mime };
    recorder.addEventListener('dataavailable', (e) => { if (e.data && e.data.size) rec && rec.chunks.push(e.data); });
    recorder.start(250);
    $('composer').hidden = true;
    $('recorder').hidden = false;
    $('rec-time').textContent = '0:00';
    rec.timer = setInterval(() => {
      if (!rec) return;
      const s = (Date.now() - rec.started) / 1000;
      $('rec-time').textContent = fmtDuration(s);
      if (s >= S.limits.voiceSeconds) finishRecording(true);
    }, 250);
    sendTyping(false);
  });

  function finishRecording(send) {
    if (!rec) return;
    const r = rec;
    rec = null;
    clearInterval(r.timer);
    const seconds = (Date.now() - r.started) / 1000;
    r.recorder.addEventListener('stop', () => {
      r.stream.getTracks().forEach((t) => t.stop());
      if (!send) return;
      if (seconds < 0.6) { toast('Hold on a little longer to record a voice message.'); return; }
      const blob = new Blob(r.chunks, { type: r.mime || 'audio/webm' });
      if (!blob.size) { toast('Nothing was recorded.', 'error'); return; }
      if (blob.size > S.limits.voice) { toast('That recording is too large to send.', 'error'); return; }
      uploadMedia('voice', blob, r.peerId, seconds);
    }, { once: true });
    try { r.recorder.stop(); } catch { r.stream.getTracks().forEach((t) => t.stop()); }
    $('recorder').hidden = true;
    if (S.active && !S.blocked.has(S.active)) $('composer').hidden = false;
  }
  function stopRecordingSilently() { if (rec) finishRecording(false); }
  $('rec-cancel').addEventListener('click', () => finishRecording(false));
  $('rec-send').addEventListener('click', () => finishRecording(true));

  /* ------------------------------------------------------------------ */
  /* Block / unblock / profile modal                                     */
  /* ------------------------------------------------------------------ */

  async function blockFlow(userId) {
    const u = userById(userId);
    const r = await confirmDialog({
      title: `Block ${u ? u.displayName : 'this user'}?`,
      text: "They won't be able to message you or see when you are online. You can unblock them any time in Settings.",
      confirmText: 'Block',
      danger: true,
    });
    if (r.ok) setBlocked(userId, true);
  }

  function setBlocked(userId, block) {
    S.socket.emit(block ? 'user:block' : 'user:unblock', { userId }, (res) => {
      if (!res || !res.ok) return toast((res && res.error) || 'Something went wrong.', 'error');
      toast(block ? 'User blocked' : 'User unblocked', 'ok');
    });
  }

  function showProfileModal(userId) {
    const u = userById(userId);
    if (!u) return;
    openModal((box, close) => {
      const wrap = el('div', 'modal-profile');
      wrap.appendChild(avatar(u, 'xl', false));
      wrap.appendChild(el('h3', '', u.displayName));
      wrap.appendChild(el('div', 'uname', `@${u.username}`));
      const st = u.online ? { t: 'online', c: 'online' } : { t: fmtLastSeen(u.lastSeen), c: '' };
      wrap.appendChild(el('div', `pstatus ${st.c}`, st.t));
      if (u.bio) wrap.appendChild(el('div', 'bio', u.bio));
      box.appendChild(wrap);
      const actions = el('div', 'modal-actions col');
      const msg = el('button', 'btn primary', 'Send message');
      msg.type = 'button';
      msg.addEventListener('click', () => { close(); clearSearch(); openChat(userId); });
      const contact = el('button', 'btn', S.contacts.has(userId) ? 'Remove from contacts' : 'Add to contacts');
      contact.type = 'button';
      contact.addEventListener('click', () => { close(); toggleContact(userId); });
      const blocked = S.blocked.has(userId);
      const blk = el('button', `btn ${blocked ? '' : 'danger'}`, blocked ? 'Unblock' : 'Block user');
      blk.type = 'button';
      blk.addEventListener('click', () => { close(); if (blocked) setBlocked(userId, false); else blockFlow(userId); });
      actions.append(msg, contact, blk);
      box.appendChild(actions);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Profile tab                                                         */
  /* ------------------------------------------------------------------ */

  function renderProfileTab(keepInputs) {
    const holder = $('pf-avatar');
    holder.textContent = '';
    holder.appendChild(avatar(S.me, 'xl', false));
    $('pf-avatar-remove').hidden = !S.me.avatar;
    const st = $('pf-status');
    const on = S.socket && S.socket.connected;
    st.textContent = on ? 'Online' : 'Offline';
    st.classList.toggle('off', !on);
    $('pf-email').value = S.me.email || '';
    if (!keepInputs) {
      $('pf-name').value = S.me.displayName;
      $('pf-username').value = S.me.username;
      $('pf-bio').value = S.me.bio || '';
      $('pf-username-hint').textContent = '';
      $('pf-username-hint').className = 'hint-line';
      $('pf-error').textContent = '';
    }
    $('pf-bio-count').textContent = `${$('pf-bio').value.length} / 200`;
  }

  $('pf-bio').addEventListener('input', () => { $('pf-bio-count').textContent = `${$('pf-bio').value.length} / 200`; });
  const checkProfileUsername = debounce(() => checkUsername($('pf-username').value, $('pf-username-hint'), S.me.username), 300);
  $('pf-username').addEventListener('input', () => {
    if ($('pf-username').value.trim() === S.me.username) { checkUsername(S.me.username, $('pf-username-hint'), S.me.username); return; }
    $('pf-username-hint').className = 'hint-line';
    $('pf-username-hint').textContent = 'Checking...';
    checkProfileUsername();
  });

  $('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('pf-error');
    err.textContent = '';
    const btn = $('pf-save');
    btn.disabled = true;
    try {
      const newName = $('pf-username').value.trim();
      if (newName !== S.me.username) {
        const r = await api('PUT', '/api/username', { username: newName });
        S.me = { ...S.me, ...r.me };
      }
      const r2 = await api('PUT', '/api/profile', { displayName: $('pf-name').value, bio: $('pf-bio').value });
      S.me = { ...S.me, ...r2.me };
      remember(S.me);
      renderProfileTab();
      renderRail();
      toast('Profile saved', 'ok');
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('pf-avatar-btn').addEventListener('click', () => $('pf-avatar-input').click());
  $('pf-avatar-input').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(f.type)) { toast('Please choose a JPG, PNG, GIF or WebP image.', 'error'); return; }
    if (f.size > S.limits.avatar) { toast(`Photo is too large. Limit is ${fmtSize(S.limits.avatar)}.`, 'error'); return; }
    const fd = new FormData();
    fd.append('file', f);
    $('pf-avatar-btn').disabled = true;
    try {
      const res = await fetch('/api/avatar', { method: 'POST', body: fd, credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      S.me = { ...S.me, ...data.me };
      remember(S.me);
      renderProfileTab(true);
      renderRail();
      toast('Profile photo updated', 'ok');
    } catch (ex) {
      toast(ex.message, 'error');
    } finally {
      $('pf-avatar-btn').disabled = false;
    }
  });
  $('pf-avatar-remove').addEventListener('click', async () => {
    try {
      const data = await api('DELETE', '/api/avatar');
      S.me = { ...S.me, ...data.me };
      remember(S.me);
      renderProfileTab(true);
      renderRail();
    } catch (ex) { toast(ex.message, 'error'); }
  });

  /* ------------------------------------------------------------------ */
  /* Settings tab                                                        */
  /* ------------------------------------------------------------------ */

  function renderSettings() {
    const acc = $('st-account');
    acc.textContent = '';
    acc.appendChild(avatar(S.me, 'lg', false));
    const who = el('div', 'who');
    who.appendChild(el('b', '', S.me.displayName));
    who.appendChild(el('span', '', `@${S.me.username}`));
    acc.appendChild(who);
    renderSwatches();
    renderBlocked();
  }
  $('st-edit-profile').addEventListener('click', () => switchTab('profile'));

  function renderBlocked() {
    const list = $('blocked-list');
    list.textContent = '';
    if (!S.blocked.size) { list.appendChild(el('p', 'hint', 'You have not blocked anyone.')); return; }
    for (const u0 of S.blocked.values()) {
      const u = userById(u0.id) || u0;
      const row = el('div', 'item');
      row.appendChild(avatar(u, 'sm', false));
      const main = el('div', 'item-main');
      main.appendChild(el('div', 'item-name', u.displayName));
      main.appendChild(el('div', 'item-sub', `@${u.username}`));
      row.appendChild(main);
      const b = el('button', 'btn small', 'Unblock');
      b.type = 'button';
      b.addEventListener('click', () => setBlocked(u.id, false));
      row.appendChild(b);
      list.appendChild(row);
    }
  }

  $('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('pw-error');
    err.textContent = '';
    const cur = $('pw-current').value;
    const nw = $('pw-new').value;
    if (nw !== $('pw-new2').value) { err.textContent = 'New passwords do not match.'; return; }
    const btn = $('pw-submit');
    btn.disabled = true;
    try {
      await api('POST', '/api/password', { current: cur, next: nw });
      $('password-form').reset();
      toast('Password updated. Other devices were signed out.', 'ok');
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('logout-btn').addEventListener('click', async () => {
    try { await api('POST', '/api/logout'); } catch { /* ignore */ }
    if (S.socket) S.socket.disconnect();
    location.reload();
  });

  /* ------------------------------------------------------------------ */

  boot();
})();
