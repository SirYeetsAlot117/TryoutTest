/* =========================================================================
   FIREBASE CONFIG — fill this in with YOUR project's values.
   Firebase console → (gear icon) Project settings → General → scroll to
   "Your apps" → the web app (</>) you create → "SDK setup and
   configuration" → "Config". Copy each value below.
   None of this is a secret — it's fine for this to be visible in a
   public file; it just tells the page which Firebase project to talk
   to. The actual access control happens in the Realtime Database
   security rules (see SETUP.md) plus the one admin account below.
   ========================================================================= */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDxhHtVxB3eE6Sczl7PSWN92kF-2e80T2U",
  authDomain: "wbrchsesportstryouts.firebaseapp.com",
  databaseURL: "https://wbrchsesportstryouts-default-rtdb.firebaseio.com",
  projectId: "wbrchsesportstryouts",
  storageBucket: "wbrchsesportstryouts.firebasestorage.app",
  messagingSenderId: "166272422573",
  appId: "1:166272422573:web:e62226ff0194489a2d6c24"
};

/* The single admin account's email. You create this yourself in
   Firebase console → Authentication → Users → Add user, and set
   whatever password you want THAT password becomes the secret in your
   admin link (round1.html?key=that-password) — see SETUP.md. The email
   itself doesn't need to be real or receive mail; it's just an ID. */
export const ADMIN_EMAIL = "marcosfraguela09@gmail.com";
