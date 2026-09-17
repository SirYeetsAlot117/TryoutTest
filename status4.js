/* =========================================================================
   ROUND ROBIN — LIVE STATUS (READ ONLY)
   Purely a viewer: subscribes to the same Firebase state round4.js
   writes to (see firebase-sync4.js) and re-renders whenever it changes —
   no key, no sign-in, and this file never calls writeState.
   PARTICIPANTS comes from bracketData4.js's window.RR_PARTICIPANTS
   (loaded via a classic <script> tag before this one) — same source
   round4.js reads from, so both pages always agree on the roster and
   grid size.
   ========================================================================= */
import { subscribeState } from './firebase-sync4.js';

const PARTICIPANTS = window.RR_PARTICIPANTS;
const N = PARTICIPANTS.length;
const TOTAL_PAIRS = (N * (N - 1)) / 2; // every unordered pair plays exactly once

function emptyResults() {
  return Array.from({ length: N }, () => Array(N).fill(0));
}

/* =========================================================================
   GRID CONSTRUCTION (built once, on load)
   Same (N+1) x (N+1) layout as admin4.html's grid, but every match cell
   is a plain, non-interactive <div> instead of a <button> — this page
   only ever displays state, it never changes it (same convention as
   status.html's read-only slot divs vs round1.html's slot buttons).
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
  grid.appendChild(makeHeaderCell(''));

  PARTICIPANTS.forEach((name) => grid.appendChild(makeHeaderCell(name)));

  for (let r = 0; r < N; r++) {
    grid.appendChild(makeHeaderCell(PARTICIPANTS[r]));

    for (let c = 0; c < N; c++) {
      const cell = document.createElement('div');
      cell.className = r === c ? 'rr-cell rr-diagonal' : 'rr-cell rr-btn';
      cell.dataset.cell = `${r}-${c}`;
      if (r === c) cell.setAttribute('aria-hidden', 'true');
      grid.appendChild(cell);
    }
  }
}

/* =========================================================================
   RENDERING
   ========================================================================= */
function render(remote) {
  const results =
    remote && Array.isArray(remote.results)
      ? PARTICIPANTS.map((_, r) =>
          PARTICIPANTS.map((_, c) => (remote.results[r] && remote.results[r][c] !== undefined ? remote.results[r][c] : 0))
        )
      : emptyResults();
  const blurred = remote && typeof remote.blurred === 'boolean' ? remote.blurred : true;
  const updatedAt = remote && remote.updatedAt ? remote.updatedAt : null;

  // Applied FIRST, on its own, before anything below that could throw —
  // same defensive ordering status.js/2/3 use for their blur toggle.
  const grid = document.getElementById('rrGrid');
  if (grid) grid.classList.toggle('blurred', blurred);

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (r === c) continue;

      const cell = document.querySelector(`[data-cell="${r}-${c}"]`);
      if (!cell) continue;

      const state = results[r][c];
      cell.classList.remove('rr-win', 'rr-loss');
      cell.textContent = '';

      if (state === 1) {
        cell.classList.add('rr-win');
        cell.textContent = 'W';
      } else if (state === 2) {
        cell.classList.add('rr-loss');
        cell.textContent = 'L';
      }
    }
  }

  renderBanner(blurred, updatedAt);
  renderProgress(results);
}

function renderBanner(blurred, updatedAt) {
  const banner = document.getElementById('statusBanner');
  const meta = document.getElementById('statusMeta');

  if (banner) {
    banner.classList.toggle('hidden-state', blurred);
    banner.classList.toggle('revealed-state', !blurred);
    banner.textContent = blurred
      ? 'Round Robin: HIDDEN — matches not yet revealed'
      : 'Round Robin: REVEALED — live matches below';
  }

  if (meta) {
    meta.textContent = updatedAt
      ? `Last updated ${new Date(updatedAt).toLocaleTimeString()}`
      : 'No activity yet — waiting for the round robin to start';
  }
}

function renderProgress(results) {
  const label = document.getElementById('progressLabel');
  const fill = document.getElementById('progressFill');
  if (!label || !fill) return;

  let decided = 0;
  for (let r = 0; r < N; r++) {
    for (let c = r + 1; c < N; c++) {
      if (results[r][c] !== 0) decided++;
    }
  }

  label.textContent = `${decided} of ${TOTAL_PAIRS} matches decided`;
  fill.style.width = TOTAL_PAIRS > 0 ? `${(decided / TOTAL_PAIRS) * 100}%` : '0%';
}

buildGrid();
subscribeState(render);