/**
 * firebase.js — Firebase App + Analytics + Firestore Initialization
 * IGNOU Study Hub
 *
 * Import this module wherever Firebase services are needed.
 * Analytics and Firestore are initialized using the modular SDK.
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

// Initialize Auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

export { app, db, auth };

