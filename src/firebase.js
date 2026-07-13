/**
 * firebase.js — Firebase App + Analytics Initialization
 * IGNOU Study Hub
 *
 * Import this module wherever Firebase services are needed.
 * Analytics is initialized lazily to respect browser environments
 * that may block it (e.g., SSR / pre-render).
 */

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey:            "AIzaSyDAOlHfIej0D54kaSmPdfBCl9l5WEcnZ1E",
  authDomain:        "megol-d2cf1.firebaseapp.com",
  projectId:         "megol-d2cf1",
  storageBucket:     "megol-d2cf1.firebasestorage.app",
  messagingSenderId: "790671544534",
  appId:             "1:790671544534:web:4262f1edc47932d5957977",
  measurementId:     "G-JJW5DNP212",
};

const app = initializeApp(firebaseConfig);

// Analytics — only meaningful in browser environments
const analytics = (typeof window !== "undefined") ? getAnalytics(app) : null;

export { app, analytics };
