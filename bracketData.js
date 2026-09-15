/* =========================================================================
   BRACKET 1 — SHARED DATA
   Single source of truth for who's in Bracket 1's quarterfinals and how
   each round feeds into the next. Loaded as a plain <script> BEFORE
   round1.js and status.js (both ES modules — see index.html/status.html),
   so both pages always agree on the roster — edit a name here once
   instead of in two places.

   Also assigned onto `window` explicitly: round1.js/status.js are
   `type="module"` scripts (needed so they can `import` Firebase), and
   while module scripts CAN read plain top-level `const`s from an earlier
   classic <script>, doing it via `window.*` here is unambiguous and
   doesn't rely on that subtlety.
   ========================================================================= */
const QUARTERFINAL_PLAYERS = {
  qf1: { p1: 'Nicolas Sieckowski', p2: 'Jacob Ferman' },
  qf2: { p1: 'Ben Sieckowski', p2: 'Emmanuel Montero' },
  qf3: { p1: 'Abraham Louis', p2: 'Aleksei Bitkin' },
  qf4: { p1: 'Mr. Kux', p2: 'Tyler Edge' },
};

const FEEDERS = {
  sf1: { p1: 'qf1', p2: 'qf2' },
  sf2: { p1: 'qf3', p2: 'qf4' },
  final: { p1: 'sf1', p2: 'sf2' },
};

window.QUARTERFINAL_PLAYERS = QUARTERFINAL_PLAYERS;
window.FEEDERS = FEEDERS;
