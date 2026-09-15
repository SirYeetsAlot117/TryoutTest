/* =========================================================================
   BRACKET 2 — SHARED DATA
   Same shape as bracketData.js (Bracket 1) — loaded before round2.js and
   status2.js (both ES modules), so both pages always agree on the
   roster. Window.* assignment is the same trick as bracketData.js: an
   unambiguous way for the module scripts loaded after it to read this.
   ========================================================================= */
const QUARTERFINAL_PLAYERS = {
  qf1: { p1: 'Asher Teran', p2: 'Jonathan Melgar' },
  qf2: { p1: 'Hayden Casey', p2: 'Jacob Pinto' },
  qf3: { p1: 'Marco Pisano', p2: 'Matheus Peruchi' },
  qf4: { p1: 'Jacob Georgiou', p2: 'Drake Schluth' },
};

const FEEDERS = {
  sf1: { p1: 'qf1', p2: 'qf2' },
  sf2: { p1: 'qf3', p2: 'qf4' },
  final: { p1: 'sf1', p2: 'sf2' },
};

window.QUARTERFINAL_PLAYERS = QUARTERFINAL_PLAYERS;
window.FEEDERS = FEEDERS;
