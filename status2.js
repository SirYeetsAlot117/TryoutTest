/* =========================================================================
   BRACKET 2 — LIVE STATUS (READ ONLY)
   Purely a viewer: subscribes to the same Firebase state round1.js
   writes to and re-renders whenever it changes — no key, no sign-in, and
   this file never calls writeState. Firebase's onValue listener (inside
   subscribeState) pushes updates instantly, so no polling loop is needed
   anymore.
   QUARTERFINAL_PLAYERS / FEEDERS come from bracketData.js's window.*
   exports (loaded via a classic <script> tag before this one).
   ========================================================================= */
import { subscribeState } from './firebase-sync2.js';

const QUARTERFINAL_PLAYERS = window.QUARTERFINAL_PLAYERS;
const FEEDERS = window.FEEDERS;

/* =========================================================================
   HELPERS
   ========================================================================= */
function getMatchPlayers(winners, matchId) {
  if (QUARTERFINAL_PLAYERS[matchId]) {
    return QUARTERFINAL_PLAYERS[matchId];
  }
  const feeders = FEEDERS[matchId];
  return {
    p1: winners[feeders.p1] ?? null,
    p2: winners[feeders.p2] ?? null,
  };
}

/* =========================================================================
   RENDERING
   ========================================================================= */
function render(remote) {
  const winners = { qf1: null, qf2: null, qf3: null, qf4: null, sf1: null, sf2: null, ...(remote && remote.winners) };
  const blurred = remote && typeof remote.blurred === 'boolean' ? remote.blurred : true;
  const updatedAt = remote && remote.updatedAt ? remote.updatedAt : null;

  // Applied FIRST, on its own, before anything below that could throw.
  // (This used to run last — if a later renderer threw because the page's
  // markup didn't have an element it expected, this line never ran, and
  // the bracket silently stopped blurring. Guarded + moved up so a
  // markup mismatch anywhere else can never block this again.)
  const bracketTree = document.getElementById('bracketTree');
  if (bracketTree) bracketTree.classList.toggle('blurred', blurred);

  renderMatch(winners, 'qf1');
  renderMatch(winners, 'qf2');
  renderMatch(winners, 'qf3');
  renderMatch(winners, 'qf4');
  renderMatch(winners, 'sf1');
  renderMatch(winners, 'sf2');
  renderFinal(winners);
  drawConnectors();

  renderBanner(blurred, updatedAt);
  renderProgress(winners);
}

function renderMatch(winners, matchId) {
  const matchEl = document.querySelector(`[data-match="${matchId}"]`);
  const players = getMatchPlayers(winners, matchId);
  const decidedWinner = winners[matchId];

  ['p1', 'p2'].forEach((slotKey) => {
    const slot = matchEl.querySelector(`[data-slot="${slotKey}"]`);
    const playerName = players[slotKey];
    const isKnown = playerName !== null;

    slot.querySelector('.slot-label').textContent = isKnown ? playerName : 'TBD';
    slot.classList.remove('winner', 'loser');

    if (!isKnown || decidedWinner === null) return;

    if (decidedWinner === playerName) {
      slot.classList.add('winner');
    } else {
      slot.classList.add('loser');
    }
  });
}

function renderFinal(winners) {
  const matchEl = document.querySelector('[data-match="final"]');
  const players = getMatchPlayers(winners, 'final');

  ['p1', 'p2'].forEach((slotKey) => {
    const label = matchEl.querySelector(`[data-slot="${slotKey}"]`);
    const playerName = players[slotKey];
    label.textContent = playerName ?? 'TBD';
    label.classList.toggle('decided', playerName !== null);
  });
}

function renderBanner(blurred, updatedAt) {
  const banner = document.getElementById('statusBanner');
  const meta = document.getElementById('statusMeta');

  if (banner) {
    banner.classList.toggle('hidden-state', blurred);
    banner.classList.toggle('revealed-state', !blurred);
    banner.textContent = blurred
      ? 'Round 2: HIDDEN — matches not yet revealed'
      : 'Round 2: REVEALED — live matches below';
  }

  if (meta) {
    meta.textContent = updatedAt
      ? `Last updated ${new Date(updatedAt).toLocaleTimeString()}`
      : 'No activity yet — waiting for Round 2 to start';
  }
}

function renderProgress(winners) {
  const label = document.getElementById('progressLabel');
  const fill = document.getElementById('progressFill');
  // status.html no longer includes the progress bar markup — nothing to
  // update. Bail out instead of throwing (a throw here used to stop the
  // rest of render() from running, including the blur toggle above).
  if (!label || !fill) return;

  const qfDecided = ['qf1', 'qf2', 'qf3', 'qf4'].filter((id) => winners[id] !== null).length;
  const sfDecided = ['sf1', 'sf2'].filter((id) => winners[id] !== null).length;
  const totalDecided = qfDecided + sfDecided;

  label.textContent =
    `${totalDecided} of 6 matches decided` +
    ` (Quarterfinals ${qfDecided}/4 · Semifinals ${sfDecided}/2)` +
    (sfDecided === 2 ? ' · Finalists set' : '');

  fill.style.width = `${(totalDecided / 6) * 100}%`;
}

/* =========================================================================
   CONNECTOR LINES (unchanged — pure layout math)
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

subscribeState(render);