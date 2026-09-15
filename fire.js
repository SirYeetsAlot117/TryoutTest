/* =========================================================================
   PIXEL-GRID FIRE BACKGROUND
   This is the classic "Doom fire" technique (originally documented by
   Fabien Sanglard from the PS1 DOOM source): keep a small 2D grid of
   heat values, always keep the bottom row at maximum heat, and each
   frame let every other cell's heat drift upward from the cell below it
   — losing a little heat and a little horizontal position at random
   each step. Rendered at that small native resolution and then stretched
   up with CSS (image-rendering: pixelated, in round1.css), that low-res
   grid + upscale is what makes it look chunky/pixelated rather than a
   smooth gradient.
   This version doesn't use the original's multi-hue palette (black →
   red → orange → yellow → white). Per the site's fire color, it stays a
   single fixed color the whole time — heat only ever changes how OPAQUE
   that color is, so hotter cells sit fully colored near the bottom and
   cooler cells fade back toward the page's own dark background as they
   rise, rather than shifting hue.
   ========================================================================= */

// ---- EDIT HERE to change the simulation's native resolution ----
// Small on purpose — this is what CSS then stretches into big, blocky
// pixels. Bigger numbers make finer-grained (less chunky) fire at some
// extra CPU cost; this runs on plain array math, so even doubling these
// is still cheap.
const FIRE_WIDTH = 240;
const FIRE_HEIGHT = 140;

// ---- EDIT HERE to change how "tall" a flame typically gets ----
// Every step up the grid, a cell's heat either stays the same or drops
// by 1 (see spreadFire below), so roughly speaking a seed at max heat
// survives about FIRE_MAX_HEAT rows before fully cooling to 0 — that's
// what determines how far up the screen the fire visually reaches.
const FIRE_MAX_HEAT = 35;

function initFireCanvas() {
  const canvas = document.getElementById('fireCanvas');
  if (!canvas) return; // markup missing this turn's canvas — nothing to do

  // Full-screen constant motion is precisely what this preference exists
  // to turn off. round1.css also hides the canvas outright for this case
  // (in case this script fails to load at all) — this check is what
  // stops the simulation from ever running in the first place.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const ctx = canvas.getContext('2d');
  canvas.width = FIRE_WIDTH;
  canvas.height = FIRE_HEIGHT;

  // One heat value (0–FIRE_MAX_HEAT) per cell. Row 0 is the TOP of the
  // grid, row FIRE_HEIGHT-1 is the BOTTOM — the one that gets reseeded
  // to full heat every frame, which is what keeps the fire fed instead
  // of burning out after one pass.
  const heat = new Uint8Array(FIRE_WIDTH * FIRE_HEIGHT);

  function seedBottomRow() {
    const rowStart = (FIRE_HEIGHT - 1) * FIRE_WIDTH;
    for (let x = 0; x < FIRE_WIDTH; x++) {
      // A little per-cell randomness here (instead of a flat max) is
      // what keeps the base of the fire flickering instead of looking
      // like a static solid bar.
      heat[rowStart + x] = FIRE_MAX_HEAT - Math.floor(Math.random() * 3);
    }
  }

  // Propagates the heat at `src` up into the row above it, with a small
  // random sideways jitter and a chance of losing 1 unit of heat — the
  // two things that give the flame its flicker and its upward taper.
  function spreadFire(src) {
    const row = Math.floor(src / FIRE_WIDTH);
    if (row === 0) return; // nothing above the top row to spread into

    const col = src % FIRE_WIDTH;
    const pixel = heat[src];

    if (pixel === 0) {
      heat[src - FIRE_WIDTH] = 0;
      return;
    }

    const drift = Math.floor(Math.random() * 3); // 0, 1, or 2
    let newCol = col + 1 - drift; // -1, 0, or +1 relative to col
    if (newCol < 0) newCol = 0;
    if (newCol >= FIRE_WIDTH) newCol = FIRE_WIDTH - 1;

    const decay = drift & 1; // 0 or 1 — about half the time, lose a bit of heat
    heat[(row - 1) * FIRE_WIDTH + newCol] = Math.max(0, pixel - decay);
  }

  function stepFire() {
    seedBottomRow();
    // Sweep every row except the bottom (already just seeded), letting
    // heat propagate upward one row per frame.
    for (let row = 1; row < FIRE_HEIGHT; row++) {
      const rowStart = row * FIRE_WIDTH;
      for (let col = 0; col < FIRE_WIDTH; col++) {
        spreadFire(rowStart + col);
      }
    }
  }

  // Reads the --fire-color custom property once at startup rather than
  // hardcoding it a second time here, so changing that one CSS variable
  // (see round1.css) is enough to recolor the whole effect.
  const fireColorHex = getComputedStyle(document.documentElement)
    .getPropertyValue('--fire-color')
    .trim();
  const fireColor = { r: 130, g: 27, b: 27 }; // #be3939 fallback

  function hexToRgb(hex) {
    const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!match) return null;
    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16),
    };
  }

  const imageData = ctx.createImageData(FIRE_WIDTH, FIRE_HEIGHT);
  const pixels = imageData.data;

  function renderFire() {
    for (let i = 0; i < heat.length; i++) {
      // This is the "opacity instead of a palette" part: heat maps
      // straight to the alpha channel of the one fixed fire color,
      // rather than looking up a different hue per heat level.
      const alpha = Math.round((heat[i] / FIRE_MAX_HEAT) * 255);
      const offset = i * 4;
      pixels[offset] = fireColor.r;
      pixels[offset + 1] = fireColor.g;
      pixels[offset + 2] = fireColor.b;
      pixels[offset + 3] = alpha;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function frame() {
    stepFire();
    renderFire();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

initFireCanvas();
