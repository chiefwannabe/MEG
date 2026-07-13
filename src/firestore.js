/**
 * firestore.js — Firestore Helper Functions
 * IGNOU Study Hub
 *
 * Provides helper functions to manage user profiles in Firestore.
 */

import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

/**
 * Creates a user profile document in Firestore if it doesn't already exist.
 * Never overwrites existing user data.
 *
 * @param {import("firebase/auth").User} user - The Firebase Auth User object
 */
export async function createUserDocument(user) {
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);

  try {
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      // Extract provider ID (e.g. google.com, password)
      const provider = user.providerData && user.providerData.length > 0
        ? user.providerData[0].providerId
        : "password";

      const profileData = {
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        provider: provider,
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        role: "student",
        profileCompleted: false
      };

      // Set the document. Since it doesn't exist, we just write it.
      await setDoc(userDocRef, profileData);
      console.log(`[Firestore] Profile created for user: ${user.uid}`);
    } else {
      // Document already exists. We update the lastLogin timestamp without overwriting user data.
      await updateLastLogin(user.uid);
    }
  } catch (error) {
    console.error("[Firestore] Error creating user document:", error);
    throw error;
  }
}

/**
 * Updates the lastLogin timestamp for a user.
 *
 * @param {string} uid - The user's UID
 */
export async function updateLastLogin(uid) {
  if (!uid) return;
  const userDocRef = doc(db, "users", uid);

  try {
    await updateDoc(userDocRef, {
      lastLogin: serverTimestamp()
    });
    console.log(`[Firestore] lastLogin updated for user: ${uid}`);
  } catch (error) {
    console.error("[Firestore] Error updating lastLogin timestamp:", error);
    throw error;
  }
}

/**
 * Retrieves the user profile document from Firestore.
 *
 * @param {string} uid - The user's UID
 * @returns {Promise<object|null>} The user profile data or null if not found
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const userDocRef = doc(db, "users", uid);

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("[Firestore] Error retrieving user profile:", error);
    throw error;
  }
}
