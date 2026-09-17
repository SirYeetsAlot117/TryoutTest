/* =========================================================================
   ROUND ROBIN — SHARED DATA
   The six semifinal losers from Brackets 1–3 play a round robin here.
   Same window.* trick as bracketData.js/2/3: an unambiguous way for the
   module scripts loaded after this classic <script> tag (round4.js) to
   read the roster.

   PLACEHOLDER NAMES — the real roster isn't known until Rounds 1–3
   finish producing semifinal losers. Swap these six for the real names
   once they're decided; the grid in admin4.html resizes itself to
   however many names are listed here (no other file needs to change).
   ========================================================================= */
const PARTICIPANTS = [
  'Player 1',
  'Player 2',
  'Player 3',
  'Player 4',
  'Player 5',
  'Player 6',
];

window.RR_PARTICIPANTS = PARTICIPANTS;
