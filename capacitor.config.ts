import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nihongodiary.app",
  appName: "Nihongo Diary",
  // webDir is required by Capacitor even in server-URL mode (used as fallback).
  // Using "public" — it already exists, is in git, and has static assets.
  webDir: "public",
  server: {
    // Load production site directly — no static export needed
    url: "https://nihongodiary.app",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    // Respect device safe areas (notch / home indicator)
    contentInset: "always",
    backgroundColor: "#0f3d2e",
    preferredContentMode: "mobile",
    scrollEnabled: true,
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0f3d2e",
      iosSpinnerStyle: "small",
      spinnerColor: "#e8f5e9",
      showSpinner: false,
    },
  },
};

export default config;
