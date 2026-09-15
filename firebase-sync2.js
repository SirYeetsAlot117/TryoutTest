/* =========================================================================
   FIREBASE SYNC — shared by round2.js (control page) and status2.js
   (read-only display). Everything both pages need to talk to Firebase
   lives here so neither file has to duplicate the setup.

   Loaded via the Firebase JS SDK's own CDN as ES modules — no npm/build
   step needed, works fine served as plain static files (GitHub Pages,
   etc). Pinned to a specific version on purpose: gstatic keeps old
   versions available indefinitely, so this won't break under you later.
   ========================================================================= */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js';
import {
  getDatabase,
  ref,
  onValue,
  set,
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js';
import {
  getAuth,
  signInWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { FIREBASE_CONFIG, ADMIN_EMAIL } from './firebaseConfig.js';

const app = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(app);
const auth = getAuth(app);
const bracket2Ref = ref(db, 'bracket2');

/**
 * Subscribes to live changes on Bracket 2's state. Calls `callback`
 * immediately with whatever's currently stored (or `null` if nothing has
 * ever been written yet), and again every time it changes — on ANY
 * device, admin or viewer. This is what makes every open page update
 * automatically with no polling.
 */
export function subscribeState(callback) {
  onValue(bracket2Ref, (snapshot) => callback(snapshot.val()));
}

/**
 * Writes a full replacement state object ({ winners, blurred, updatedAt }).
 * Only actually succeeds if the caller is signed in as the admin account
 * — that's enforced server-side by the database's security rules, not by
 * this function, so treat a rejected promise as "not allowed," not as a
 * bug to work around client-side.
 */
export function writeState(state) {
  return set(bracket2Ref, state);
}

/**
 * Looks for ?key=... in the current page's URL and, if present, tries to
 * sign in as the one admin account using it as the password. Resolves to
 * true if that succeeded (this visitor can now write), false otherwise
 * (no key, wrong key, or offline) — callers should treat false as
 * "read-only," not show an error.
 */
export async function trySignInFromUrl() {
  const key = new URLSearchParams(window.location.search).get('key');
  if (!key) return false;
  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, key);
    return true;
  } catch (e) {
    console.warn('Admin sign-in failed:', e.code || e);
    return false;
  }
}
