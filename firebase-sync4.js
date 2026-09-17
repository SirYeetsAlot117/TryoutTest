/* =========================================================================
   FIREBASE SYNC — round4.js (the round robin control page). Same shape as
   firebase-sync.js/2/3, just pointed at its own 'bracket4' node so it
   never collides with the three single-elimination brackets.
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
const bracket4Ref = ref(db, 'bracket4');

/**
 * Subscribes to live changes on the round robin's state. Calls `callback`
 * immediately with whatever's currently stored (or `null` if nothing has
 * ever been written yet), and again every time it changes — on ANY
 * device, admin or viewer.
 */
export function subscribeState(callback) {
  onValue(bracket4Ref, (snapshot) => callback(snapshot.val()));
}

/**
 * Writes a full replacement state object ({ results, updatedAt }). Only
 * actually succeeds if the caller is signed in as the admin account —
 * enforced server-side by the database's security rules, same as the
 * other three brackets.
 */
export function writeState(state) {
  return set(bracket4Ref, state);
}

/**
 * Looks for ?key=... in the current page's URL and, if present, tries to
 * sign in as the one admin account using it as the password. Resolves to
 * true if that succeeded (this visitor can now write), false otherwise.
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
