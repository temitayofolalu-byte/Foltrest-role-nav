// js/common.js — shared across every page

const API = (window.FOLTREST_API_URL || localStorage.getItem('foltrest_api_url') || '/api').replace(/\/$/, '');
const state = {
  token: localStorage.getItem('foltrest_token') || null,
  user: JSON.parse(localStorage.getItem('foltrest_user') || 'null')
};

function authHeaders(){ return state.token ? { 'Authorization': 'Bearer ' + state.token } : {}; }
function money(n){ return '₦' + Number(n).toLocaleString(); }

function logout(){
  localStorage.removeItem('foltrest_token');
  localStorage.removeItem('foltrest_user');
  window.location.href = 'index.html';
}

function requireLogin(role){
  if (!state.user){ window.location.href = 'auth.html'; return false; }
  if (role && state.user.role !== role){ alert(`This action requires a ${role} account.`); return false; }
  return true;
}

// Small inline icon set for nav tabs — no external icon font dependency.
const NAV_ICONS = {
  browse: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.5-4.5"/><path d="M8 10.5l2-2 2 2"/></svg>',
  roommates: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8.5" r="3"/><circle cx="16.5" cy="8.5" r="3"/><path d="M2.5 20c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6"/><path d="M11 20c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-6h6v6"/></svg>',
  messages: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18v11H8l-5 4V5Z"/></svg>',
  reviews: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.7 6.2.6-4.7 4.2 1.4 6.1L12 16.7 6.5 19.6l1.4-6.1-4.7-4.2 6.2-.6L12 3Z"/></svg>',
  admin: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/><path d="M9 12l2 2 4-4"/></svg>',
};

// Small colored "sticker" icons — used as accents next to page/section headers
// across the site (page-header, section-label). Larger + filled, unlike the
// thin outline NAV_ICONS above.
const STICKER = {
  verified: '<svg viewBox="0 0 40 40" width="22" height="22"><rect x="5" y="10" width="30" height="20" rx="4" fill="#fff" stroke="#1f7a46" stroke-width="1.6"/><circle cx="13" cy="20" r="4" fill="#f1691f"/><circle cx="31" cy="31" r="8" fill="#1f7a46"/><path d="M27.5 31l2.3 2.3L34.5 28" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  escrow: '<svg viewBox="0 0 40 40" width="22" height="22"><rect x="9" y="17" width="22" height="16" rx="3" fill="#f1691f"/><path d="M13 17v-4a7 7 0 0 1 14 0v4" stroke="#12210f" stroke-width="2.2" fill="none"/><circle cx="20" cy="24" r="3" fill="#fff"/></svg>',
  chat: '<svg viewBox="0 0 40 40" width="22" height="22"><path d="M6 12h24a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H17l-6 5v-5H6a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3Z" fill="#1f7a46"/><path d="M13 19l4.5-4 4.5 4v6h-3v-3h-2.5v3H13z" fill="#fff"/></svg>',
  star: '<svg viewBox="0 0 40 40" width="22" height="22"><polygon points="20,4 24,15 36,15 26,22 30,34 20,26 10,34 14,22 4,15 16,15" fill="#f1691f"/><circle cx="20" cy="19" r="4" fill="#fff"/><path d="M18 19l1.3 1.3 2.7-2.7" stroke="#1f7a46" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  roommate: '<svg viewBox="0 0 40 40" width="22" height="22"><circle cx="14" cy="15" r="5.5" fill="#fff"/><circle cx="27" cy="15" r="5.5" fill="#f1691f"/><path d="M5 33c0-5.5 4-9 9-9s9 3.5 9 9" fill="#fff"/><path d="M16 33c0-5.5 4-9 9-9s9 3.5 9 9" fill="#f1691f"/></svg>',
  agent: '<svg viewBox="0 0 40 40" width="22" height="22"><rect x="7" y="14" width="26" height="20" rx="2" fill="#fff"/><polygon points="7,14 20,5 33,14" fill="#12210f"/><rect x="12" y="19" width="6" height="6" fill="#f1691f"/><rect x="22" y="19" width="6" height="6" fill="#1f7a46"/></svg>',
  safety: '<svg viewBox="0 0 40 40" width="22" height="22"><path d="M20 4l13 5.3v9.3C33 28 27.5 34 20 36 12.5 34 7 28 7 18.6V9.3L20 4Z" fill="#1f7a46"/><path d="M14.5 19.5l4 4 8-8" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  bell: '<svg viewBox="0 0 40 40" width="22" height="22"><path d="M20 6a8 8 0 0 0-8 8v6l-3 5h22l-3-5v-6a8 8 0 0 0-8-8Z" fill="#f1691f"/><circle cx="20" cy="32" r="3" fill="#12210f"/></svg>',
  search: '<svg viewBox="0 0 40 40" width="22" height="22"><circle cx="17" cy="17" r="10" fill="#fff" stroke="#1f7a46" stroke-width="2.4"/><path d="M25 25l8 8" stroke="#12210f" stroke-width="3" stroke-linecap="round"/><circle cx="17" cy="17" r="4" fill="#f1691f"/></svg>',
  lock: '<svg viewBox="0 0 40 40" width="22" height="22"><rect x="9" y="18" width="22" height="15" rx="3" fill="#fff" stroke="#1f7a46" stroke-width="1.6"/><path d="M13 18v-4a7 7 0 0 1 14 0v4" stroke="#1f7a46" stroke-width="2.2" fill="none"/><circle cx="20" cy="25" r="2.6" fill="#f1691f"/></svg>',
};

// Renders the shared top nav. Call renderNav('browse') etc with the current page key.
function renderNav(activeKey){
  const el = document.getElementById('topbar');
  if (!el) return;
  const role = state.user ? state.user.role : null;

  // Base tabs everyone can see, logged in or not.
  const tabs = [
    { key: 'browse', label: 'Browse', href: 'browse.html' },
    { key: 'roommates', label: 'Roommates', href: 'roommates.html' },
    { key: 'reviews', label: 'Reviews', href: 'reviews.html' },
  ];

  // Extra tabs only shown once someone is logged in.
  if (state.user) {
    tabs.push({ key: 'messages', label: 'Messages', href: 'messages.html' });
    // "Agent" always points somewhere different depending on who's looking:
    // an actual agent goes to their dashboard; anyone else (tenant or admin)
    // sees the pitch/apply page instead.
    tabs.push({
      key: 'dashboard',
      label: 'Agent',
      href: role === 'agent' ? 'dashboard.html' : 'become-agent.html',
    });
    if (role === 'admin') {
      tabs.push({ key: 'admin', label: 'Admin', href: 'admin.html' });
    }
  }

  const authHtml = state.user
    ? `<span style="font-size:0.8rem; color:var(--grey); font-weight:600;">${state.user.name} (${state.user.role})</span><button class="btn-ghost btn-sm" onclick="logout()">Log out</button>`
    : `<a class="btn btn-sm" href="auth.html">Log in</a>`;

  el.innerHTML = `
    <div class="brand">
      <svg class="leaf" viewBox="0 0 24 24" fill="none"><path d="M12 2C6 2 3 7 3 12c0 5 4 9 9 9 1 0-1-3-1-6 0-4 3-7 7-9 1-.5 2-1 2-2-2-1-5-2-8-2Z" fill="#1F7A46"/><path d="M8 17l7-9" stroke="#F1691F" stroke-width="1.6" stroke-linecap="round"/></svg>
      <a href="index.html"><span class="fol">Fol</span><span class="roof"></span><span class="trest">trest</span></a>
    </div>
    <div class="nav-tabs">
      ${tabs.map(t => `<a href="${t.href}" class="${t.key === activeKey ? 'active' : ''}" style="display:inline-flex; align-items:center; gap:5px;">${NAV_ICONS[t.key] || ''}${t.label}</a>`).join('')}
    </div>
    <div class="auth-area">${state.user ? `<a class="btn-ghost btn-sm" href="notifications.html">🔔</a>` : ''}${authHtml}</div>
  `;
}

function closeModal(id){ document.getElementById(id).classList.remove('active'); }
function openModal(id){ document.getElementById(id).classList.add('active'); }

// Shows a dismissible "verify your email" banner under the nav on every
// page, for any logged-in user whose email isn't verified yet.
function renderVerifyBanner(){
  if (!state.user || state.user.emailVerified) return;
  if (sessionStorage.getItem('foltrest_verify_banner_dismissed')) return;
  const bar = document.createElement('div');
  bar.style.cssText = 'background:var(--orange-soft,#fde6d6); color:var(--orange-dark,#d9540f); padding:10px 20px; font-size:0.85rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap; text-align:center;';
  bar.innerHTML = `<span>Please verify your email to unlock payments.</span><a href="#" id="resendVerifyLink" style="text-decoration:underline;">Resend verification email</a><a href="#" id="dismissVerifyBanner" style="text-decoration:underline;">Dismiss</a>`;
  document.body.insertBefore(bar, document.body.firstChild.nextSibling);
  document.getElementById('dismissVerifyBanner').onclick = (e) => { e.preventDefault(); sessionStorage.setItem('foltrest_verify_banner_dismissed','1'); bar.remove(); };
  document.getElementById('resendVerifyLink').onclick = async (e) => {
    e.preventDefault();
    await fetch(`${API}/auth/resend-verification`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: state.user.email || '' }) });
    e.target.textContent = 'Sent! Check your inbox.';
  };
}
document.addEventListener('DOMContentLoaded', renderVerifyBanner);
