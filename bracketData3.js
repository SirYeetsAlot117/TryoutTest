/* =========================================================================
   BRACKET 3 — SHARED DATA
   Same shape as bracketData.js (Bracket 1) — loaded before round3.js and
   status3.js (both ES modules), so both pages always agree on the
   roster. Window.* assignment is the same trick as bracketData.js: an
   unambiguous way for the module scripts loaded after it to read this.
   ========================================================================= */
const QUARTERFINAL_PLAYERS = {
  qf1: { p1: 'Nick Eliav', p2: 'Malik Jacques' },
  qf2: { p1: "Landon D'Albenzio", p2: 'Shyam Shroff' },
  qf3: { p1: 'Orvin Hasan', p2: 'Marcos Fraguela' },
  qf4: { p1: 'Luca Batista', p2: 'Henrique Pozes' },
};

const FEEDERS = {
  sf1: { p1: 'qf1', p2: 'qf2' },
  sf2: { p1: 'qf3', p2: 'qf4' },
  final: { p1: 'sf1', p2: 'sf2' },
};

window.QUARTERFINAL_PLAYERS = QUARTERFINAL_PLAYERS;
window.FEEDERS = FEEDERS;
