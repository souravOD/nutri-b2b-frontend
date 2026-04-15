// ─── Firebase Cloud Messaging — Background Service Worker ─────────────────────
// Handles push notifications when the app tab is hidden or closed.
// This file must stay in /public so it's served from the root scope.
//
// SETUP: Replace the firebaseConfig values below with your project's values.
// These are the same as your NEXT_PUBLIC_FIREBASE_* env vars — they are safe
// to include here as they are public-facing browser credentials.
// ─────────────────────────────────────────────────────────────────────────────

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// ⚠️  Fill these in after creating your Firebase project:
const firebaseConfig = {
  apiKey:            "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain:        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId:         "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId:             "NEXT_PUBLIC_FIREBASE_APP_ID",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "NutriIntel B2B";
  const body  = payload.notification?.body  ?? "";

  self.registration.showNotification(title, {
    body,
    icon: "/placeholder-logo.png",
    badge: "/placeholder-logo.png",
    data: payload.data ?? {},
  });
});
