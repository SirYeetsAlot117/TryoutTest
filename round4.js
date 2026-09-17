/* =========================================================================
   ROUND ROBIN — CONTROL PAGE
   Same `type="module"` + Firebase pattern as round1.js/2.js/3.js. State
   lives in Firebase Realtime Database (see firebase-sync4.js) instead of
   localStorage, so every device watching sees the same grid live.

   EDIT ACCESS: only a visitor who opened this page with the correct
   ?key=... is treated as admin (checked by trySignInFromUrl() against
   the one admin account — see SETUP.md). Everyone else gets this same
   page, live, with every cell disabled — a "plain" link is simply this
   URL without ?key.

   PARTICIPANTS comes from bracketData4.js's window.RR_PARTICIPANTS
   (loaded via a classic <script> tag before this one). The grid's size
   is entirely driven by that list's length — add/remove names there and
   nothing here needs to change.
   ========================================================================= */
import { subscribeState, writeState, trySignInFromUrl } from './firebase-sync4.js';

const PARTICIPANTS = window.RR_PARTICIPANTS;
const N = PARTICIPANTS.length;

/* =========================================================================
   STATE
   results[r][c]: 0 = undecided, 1 = row player beat column player,
   2 = row player lost to column player. The diagonal (r === c) is
   never read or written — there's no such thing as a player playing
   themselves. results[r][c] and results[c][r] are always kept as
   mirror-opposites of each other by setCell() below, so the grid can
   never show two people both "beating" each other.
   ========================================================================= */
function emptyResults() {
  return Array.from({ length: N }, () => Array(N).fill(0));
}

let results = emptyResults();
let isBlurred = true;
let isAdmin = false; // set once, at startup, by init() below

/* =========================================================================
   STATE MUTATION (admin only — see isAdmin check below)
   ========================================================================= */
function mirrorState(state) {
  // 1 (row won) mirrors to 2 (column's own row lost) and vice versa;
  // 0 mirrors to 0.
  if (state === 1) return 2;
  if (state === 2) return 1;
  return 0;
}

function handleCellClick(r, c) {
  if (!isAdmin || r === c) return; // belt-and-suspenders — diagonal cells are never wired up anyway

  const next = (results[r][c] + 1) % 3; // none -> win -> loss -> none
  results[r][c] = next;
  results[c][r] = mirrorState(next); // the opposing cell always does the opposite, in the same click
  render();
  pushState();
}

/**
 * Sends the current results + blur state to Firebase. Only called from
 * direct admin actions (a click, the toggle button) — never from the
 * subscribeState callback below, so an incoming remote update never
 * triggers a write right back out.
 */
function pushState() {
  writeState({ results, blurred: isBlurred, updatedAt: Date.now() }).catch((e) => {
    console.error('Failed to save:', e);
    alert(
      "Couldn't save that change — your admin link may be wrong, expired, or you're offline. Try reloading this page with your correct ?key= link."
    );
  });
}

/* =========================================================================
   GRID CONSTRUCTION (built once, on load)
   An (N+1) x (N+1) CSS grid: a blank corner, a header row of names, a
   header column of the same names, and an N x N block of cells in
   between. Diagonal cells are plain non-interactive divs; everything
   else is a real button.
   ========================================================================= */
function makeHeaderCell(label) {
  const cell = document.createElement('div');
  cell.className = 'rr-cell rr-header';
  cell.textContent = label;
  return cell;
}

function buildGrid() {
  const grid = document.getElementById('rrGrid');
  if (!grid) return;

  grid.style.setProperty('--rr-size', String(N + 1));
  grid.appendChild(makeHeaderCell('')); // blank top-left corner

  PARTICIPANTS.forEach((name) => grid.appendChild(makeHeaderCell(name)));

  for (let r = 0; r < N; r++) {
    grid.appendChild(makeHeaderCell(PARTICIPANTS[r])); // row header

    for (let c = 0; c < N; c++) {
      if (r === c) {
        const blank = document.createElement('div');
        blank.className = 'rr-cell rr-diagonal';
        blank.setAttribute('aria-hidden', 'true');
        grid.appendChild(blank);
        continue;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rr-cell rr-btn';
      btn.dataset.cell = `${r}-${c}`;
      btn.setAttribute('aria-label', `${PARTICIPANTS[r]} vs ${PARTICIPANTS[c]}`);
      btn.addEventListener('click', () => handleCellClick(r, c));
      grid.appendChild(btn);
    }
  }
}

/* =========================================================================
   RENDERING
   ========================================================================= */
function render() {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (r === c) continue;

      const btn = document.querySelector(`[data-cell="${r}-${c}"]`);
      if (!btn) continue;

      const state = results[r][c];
      btn.classList.remove('rr-win', 'rr-loss');
      btn.textContent = '';

      if (state === 1) {
        btn.classList.add('rr-win');
        btn.textContent = 'W';
      } else if (state === 2) {
        btn.classList.add('rr-loss');
        btn.textContent = 'L';
      }

      // Viewers (no ?key=) see live colors but can never click; admins
      // can always click, even on an already-decided cell, since a
      // third click is what resets it.
      btn.disabled = !isAdmin;
    }
  }
}

/* =========================================================================
   REVEAL / HIDE CONTROL
   Same on/off blur the single-elimination brackets use — the grid IS
   the element that gets blurred here (there's no separate wrapper),
   since every cell in it is something a spectator shouldn't see early.
   ========================================================================= */
const rrGrid = document.getElementById('rrGrid');
const toggleBtn = document.getElementById('bracketToggle');

function setGridHidden(hidden) {
  isBlurred = hidden;
  rrGrid.classList.toggle('blurred', hidden);
  rrGrid.inert = hidden;
  toggleBtn.textContent = hidden ? 'Reveal Bracket' : 'Hide Bracket';
  toggleBtn.setAttribute('aria-pressed', String(!hidden));
}

toggleBtn.addEventListener('click', () => {
  if (!isAdmin) return;
  setGridHidden(!rrGrid.classList.contains('blurred'));
  pushState();
});

/* =========================================================================
   ADMIN BANNER
   ========================================================================= */
function updateAdminBanner() {
  const banner = document.getElementById('adminBanner');
  if (banner) {
    banner.textContent = isAdmin
      ? 'Signed in as admin — your changes are live for everyone watching.'
      : 'View-only link — you can watch live, but changes require the admin link.';
    banner.classList.toggle('admin-yes', isAdmin);
    banner.classList.toggle('admin-no', !isAdmin);
  }
  toggleBtn.style.display = isAdmin ? '' : 'none';
}

/* =========================================================================
   STARTUP
   ========================================================================= */
async function init() {
  buildGrid();

  isAdmin = await trySignInFromUrl();
  updateAdminBanner();

  // First call arrives immediately with whatever's already stored (or
  // null); every call after that is a live update.
  subscribeState((remote) => {
    if (remote && Array.isArray(remote.results)) {
      results = PARTICIPANTS.map((_, r) =>
        PARTICIPANTS.map((_, c) => (remote.results[r] && remote.results[r][c] !== undefined ? remote.results[r][c] : 0))
      );
    } else {
      results = emptyResults();
    }
    setGridHidden(remote && typeof remote.blurred === 'boolean' ? remote.blurred : true);
    render();
  });
}

init();