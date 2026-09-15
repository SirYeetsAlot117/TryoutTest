/* =========================================================================
   BRACKET 1 — CONTROL PAGE
   This is now a `type="module"` script (see index.html) so it can import
   Firebase. State lives in Firebase Realtime Database instead of
   localStorage, so every device watching sees the same bracket live.

   EDIT ACCESS: only a visitor who opened this page with the correct
   ?key=... in the URL is treated as admin (see isAdmin below) — that key
   is checked by trySignInFromUrl() against the one admin account you set
   up in Firebase (see SETUP.md). Everyone else gets this exact same
   page, fully live, just with every button disabled — a "plain" link is
   simply this URL without the ?key.

   QUARTERFINAL_PLAYERS / FEEDERS come from bracketData.js's window.*
   exports (loaded via a classic <script> tag before this one).
   ========================================================================= */
import { subscribeState, writeState, trySignInFromUrl } from './firebase-sync.js';

const QUARTERFINAL_PLAYERS = window.QUARTERFINAL_PLAYERS;
const FEEDERS = window.FEEDERS;

/* =========================================================================
   STATE
   ========================================================================= */
const winners = {
  qf1: null,
  qf2: null,
  qf3: null,
  qf4: null,
  sf1: null,
  sf2: null,
};

let isBlurred = true;
let isAdmin = false; // set once, at startup, by init() below

/* =========================================================================
   HELPERS
   ========================================================================= */
function getMatchPlayers(matchId) {
  if (QUARTERFINAL_PLAYERS[matchId]) {
    return QUARTERFINAL_PLAYERS[matchId];
  }
  const feeders = FEEDERS[matchId];
  return {
    p1: winners[feeders.p1] ?? null,
    p2: winners[feeders.p2] ?? null,
  };
}

function getDownstreamMatches(matchId) {
  return Object.keys(FEEDERS).filter(
    (id) => FEEDERS[id].p1 === matchId || FEEDERS[id].p2 === matchId
  );
}

/* =========================================================================
   STATE MUTATION (admin only — see isAdmin checks below)
   ========================================================================= */
function clearDownstream(matchId) {
  for (const downstreamId of getDownstreamMatches(matchId)) {
    if (downstreamId in winners && winners[downstreamId] !== null) {
      winners[downstreamId] = null;
      clearDownstream(downstreamId);
    }
  }
}

function handleSlotClick(matchId, playerName) {
  if (!isAdmin) return; // belt-and-suspenders — these buttons are only ever wired up for admins anyway

  if (winners[matchId] === playerName) {
    winners[matchId] = null;
    clearDownstream(matchId);
  } else {
    winners[matchId] = playerName;
  }
  render();
  pushState();
}

/**
 * Sends the current winners + blur state to Firebase. Only called from
 * direct admin actions (a click, the toggle button) — never from the
 * subscribeState callback below, so an incoming remote update never
 * triggers a write right back out.
 */
function pushState() {
  writeState({ winners: { ...winners }, blurred: isBlurred, updatedAt: Date.now() }).catch(
    (e) => {
      console.error('Failed to save:', e);
      alert(
        "Couldn't save that change — your admin link may be wrong, expired, or you're offline. Try reloading this page with your correct ?key= link."
      );
    }
  );
}

/* =========================================================================
   RENDERING
   ========================================================================= */
function render() {
  renderMatch('qf1');
  renderMatch('qf2');
  renderMatch('qf3');
  renderMatch('qf4');
  renderMatch('sf1');
  renderMatch('sf2');
  renderFinal();
  drawConnectors();
}

function renderMatch(matchId) {
  const matchEl = document.querySelector(`[data-match="${matchId}"]`);
  const players = getMatchPlayers(matchId);
  const decidedWinner = winners[matchId];

  ['p1', 'p2'].forEach((slotKey) => {
    const button = matchEl.querySelector(`[data-slot="${slotKey}"]`);
    const playerName = players[slotKey];
    const isKnown = playerName !== null;

    button.querySelector('.slot-label').textContent = isKnown ? playerName : 'TBD';
    button.classList.remove('winner', 'loser');

    if (!isKnown) {
      button.disabled = true;
      return;
    }

    if (!isAdmin) {
      // Read-only visitor: reflect the current result, but nothing here
      // is ever clickable.
      button.disabled = true;
      if (decidedWinner === playerName) button.classList.add('winner');
      else if (decidedWinner !== null) button.classList.add('loser');
      return;
    }

    if (decidedWinner === null) {
      button.disabled = false;
    } else if (decidedWinner === playerName) {
      button.disabled = false;
      button.classList.add('winner');
    } else {
      button.disabled = true;
      button.classList.add('loser');
    }

    if (!button.dataset.wired) {
      button.addEventListener('click', () => handleSlotClick(matchId, playerName));
      button.dataset.wired = 'true';
    }
  });
}

function renderFinal() {
  const matchEl = document.querySelector('[data-match="final"]');
  const players = getMatchPlayers('final');

  ['p1', 'p2'].forEach((slotKey) => {
    const label = matchEl.querySelector(`[data-slot="${slotKey}"]`);
    const playerName = players[slotKey];
    label.textContent = playerName ?? 'TBD';
    label.classList.toggle('decided', playerName !== null);
  });
}

/* =========================================================================
   CONNECTOR LINES (unchanged from the original — pure layout math)
   ========================================================================= */
const CONNECTOR_GROUPS = [
  { feederA: 'qf1', feederB: 'qf2', target: 'sf1' },
  { feederA: 'qf3', feederB: 'qf4', target: 'sf2' },
  { feederA: 'sf1', feederB: 'sf2', target: 'final' },
];

function drawConnectors() {
  const container = document.getElementById('bracketTree');
  const svg = document.getElementById('connectorSvg');
  const containerRect = container.getBoundingClientRect();

  svg.innerHTML = '';

  const bottomCenter = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - containerRect.left, y: r.bottom - containerRect.top };
  };
  const topCenter = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - containerRect.left, y: r.top - containerRect.top };
  };

  CONNECTOR_GROUPS.forEach(({ feederA, feederB, target }) => {
    const elA = document.querySelector(`[data-match="${feederA}"]`);
    const elB = document.querySelector(`[data-match="${feederB}"]`);
    const elTarget =
      target === 'final'
        ? document.querySelector('.final-ring')
        : document.querySelector(`[data-match="${target}"]`);

    const a = bottomCenter(elA);
    const b = bottomCenter(elB);
    const t = topCenter(elTarget);
    const midY = a.y + (t.y - a.y) / 2;

    const elbow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    elbow.setAttribute('d', `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`);
    svg.appendChild(elbow);

    const drop = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    drop.setAttribute('d', `M ${t.x} ${midY} L ${t.x} ${t.y}`);
    svg.appendChild(drop);
  });
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawConnectors, 100);
});

/* =========================================================================
   REVEAL / HIDE CONTROL
   ========================================================================= */
const bracketTree = document.getElementById('bracketTree');
const toggleBtn = document.getElementById('bracketToggle');

function setBracketHidden(hidden) {
  isBlurred = hidden;
  bracketTree.classList.toggle('blurred', hidden);
  bracketTree.inert = hidden;
  toggleBtn.textContent = hidden ? 'Reveal Bracket' : 'Hide Bracket';
  toggleBtn.setAttribute('aria-pressed', String(!hidden));
}

toggleBtn.addEventListener('click', () => {
  if (!isAdmin) return;
  setBracketHidden(!bracketTree.classList.contains('blurred'));
  pushState();
});

/* =========================================================================
   ADMIN BANNER
   Small status line (markup in index.html) telling whoever's looking at
   this page whether THEY can edit it.
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
  isAdmin = await trySignInFromUrl();
  updateAdminBanner();

  // First call arrives immediately with whatever's already stored (or
  // null); every call after that is a live update — from THIS admin's
  // own actions echoing back, or (in the unlikely event two people have
  // the admin link) anyone else's.
  subscribeState((remote) => {
    const remoteWinners = (remote && remote.winners) || {};
    Object.keys(winners).forEach((key) => {
      winners[key] = key in remoteWinners ? remoteWinners[key] : null;
    });
    setBracketHidden(remote && typeof remote.blurred === 'boolean' ? remote.blurred : true);
    render();
  });
}

init();
