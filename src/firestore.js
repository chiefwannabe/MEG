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
  serverTimestamp,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  limit,
  getCountFromServer
} from "firebase/firestore";

/**
 * Checks if a username already exists in Firestore.
 * Always compares against the lowercase version of the username
 * to enforce case-insensitive uniqueness.
 *
 * @param {string} username - The username to check (will be lowercased)
 * @returns {Promise<boolean>} True if the username is unique, false otherwise
 */
export async function isUsernameUnique(username) {
  if (!username) return false;
  // Always compare lowercase — usernames are stored in lowercase only
  const normalized = username.trim().toLowerCase();
  try {
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("username", "==", normalized), limit(1));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error("[Firestore] Error checking username uniqueness:", error);
    throw error;
  }
}

/**
 * Creates a user profile document in Firestore if it doesn't already exist.
 * Never overwrites existing user data.
 *
 * IMPORTANT: Passwords are NEVER written to Firestore.
 * Firebase Authentication handles all credential storage internally.
 *
 * Firestore document schema on creation:
 *   - uid       : string  (Firebase Auth UID)
 *   - username  : string  (lowercase, derived from username@meg.local email)
 *   - createdAt : timestamp
 *   - role      : 'student' (can only be changed by an admin via Firestore rules)
 *
 * @param {import("firebase/auth").User} user - The Firebase Auth User object
 */
export async function createUserDocument(user, retries = 3, delay = 500) {
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        // Extract username from the synthetic email (username@meg.local)
        // and enforce lowercase storage
        const username = user.email ? user.email.split("@")[0].toLowerCase() : "";

        // Only store uid, username, createdAt, role — NO password, NO email
        const profileData = {
          uid: user.uid,
          username: username,
          createdAt: serverTimestamp(),
          role: "student"        // role can only be elevated by an admin (enforced by Firestore rules)
        };

        await setDoc(userDocRef, profileData);
        console.log(`[Firestore] Profile created for user: ${user.uid} (username: ${username})`);
      } else {
        // Document already exists — update lastLogin without overwriting any data
        await updateLastLogin(user.uid);
      }
      return; // Success, exit retry loop
    } catch (error) {
      console.warn(`[Firestore] Attempt ${attempt} failed for user document setup:`, error);
      
      const isPermissionError = error.code === "permission-denied" || 
                                (error.message && error.message.toLowerCase().includes("permission"));
      
      if (isPermissionError && attempt < retries) {
        console.info(`[Firestore] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Re-throw if not a permissions error or if we've exhausted all retries
      }
    }
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

/**
 * Updates user profile fields in Firestore.
 *
 * @param {string} uid - The user's UID
 * @param {object} data - The profile fields to update
 */
export async function updateUserProfile(uid, data) {
  if (!uid || !data) return;
  const userDocRef = doc(db, "users", uid);

  try {
    await updateDoc(userDocRef, data);
    console.log(`[Firestore] Profile updated for user: ${uid}`);
  } catch (error) {
    console.error("[Firestore] Error updating user profile:", error);
    throw error;
  }
}

/**
 * Adds a new resource to Firestore.
 * TODO: Enforce admin-only writes in Firestore Security Rules
 */
export async function addResource(data, uid) {
  try {
    const resourcesCol = collection(db, "resources");
    const resourceDoc = {
      ...data,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(resourcesCol, resourceDoc);
    console.log(`[Firestore] Resource added with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("[Firestore] Error adding resource:", error);
    throw error;
  }
}

/**
 * Updates a resource in Firestore.
 * TODO: Enforce admin-only writes in Firestore Security Rules
 */
export async function updateResource(resourceId, data) {
  if (!resourceId || !data) return;
  const docRef = doc(db, "resources", resourceId);
  try {
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    await updateDoc(docRef, updateData);
    console.log(`[Firestore] Resource updated: ${resourceId}`);
  } catch (error) {
    console.error("[Firestore] Error updating resource:", error);
    throw error;
  }
}

/**
 * Deletes a resource from Firestore.
 * TODO: Enforce admin-only writes in Firestore Security Rules
 */
export async function deleteResource(resourceId) {
  if (!resourceId) return;
  const docRef = doc(db, "resources", resourceId);
  try {
    await deleteDoc(docRef);
    console.log(`[Firestore] Resource deleted: ${resourceId}`);
  } catch (error) {
    console.error("[Firestore] Error deleting resource:", error);
    throw error;
  }
}

/**
 * Fetches all resources from Firestore.
 */
export async function getAllResources() {
  try {
    const resourcesCol = collection(db, "resources");
    const querySnapshot = await getDocs(resourcesCol);
    const resources = [];
    querySnapshot.forEach((doc) => {
      resources.push({ id: doc.id, ...doc.data() });
    });
    return resources;
  } catch (error) {
    console.error("[Firestore] Error fetching resources:", error);
    throw error;
  }
}

/**
 * Fetches all users from Firestore.
 */
export async function getAllUsers() {
  try {
    const usersCol = collection(db, "users");
    const querySnapshot = await getDocs(usersCol);
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data());
    });
    return users;
  } catch (error) {
    console.error("[Firestore] Error fetching users:", error);
    throw error;
  }
}

/**
 * Updates a user's role in Firestore.
 * TODO: Enforce admin-only writes in Firestore Security Rules
 */
export async function updateUserRole(uid, role) {
  if (!uid || !role) return;
  const docRef = doc(db, "users", uid);
  try {
    await updateDoc(docRef, { role });
    console.log(`[Firestore] User role updated for ${uid} to ${role}`);
  } catch (error) {
    console.error("[Firestore] Error updating user role:", error);
    throw error;
  }
}

/**
 * Gets analytics counts using Firestore count aggregates.
 */
export async function getAnalyticsCounts() {
  try {
    const usersCol = collection(db, "users");
    const resourcesCol = collection(db, "resources");

    const usersCountSnap = await getCountFromServer(usersCol);
    const resourcesCountSnap = await getCountFromServer(resourcesCol);

    const notesQuery = query(resourcesCol, where("type", "==", "Notes"));
    const pyqsQuery = query(resourcesCol, where("type", "==", "PYQs"));
    const booksQuery = query(resourcesCol, where("type", "==", "Books"));

    const notesCountSnap = await getCountFromServer(notesQuery);
    const pyqsCountSnap = await getCountFromServer(pyqsQuery);
    const booksCountSnap = await getCountFromServer(booksQuery);

    return {
      totalUsers: usersCountSnap.data().count,
      totalResources: resourcesCountSnap.data().count,
      totalNotes: notesCountSnap.data().count,
      totalPYQs: pyqsCountSnap.data().count,
      totalBooks: booksCountSnap.data().count
    };
  } catch (error) {
    console.error("[Firestore] Error getting analytics counts:", error);
    throw error;
  }
}

/**
 * Fetches all published resources.
 */
export async function getPublishedResources() {
  try {
    const resourcesCol = collection(db, "resources");
    const q = query(resourcesCol, where("published", "==", true));
    const querySnapshot = await getDocs(q);
    const resources = [];
    querySnapshot.forEach((doc) => {
      resources.push({ id: doc.id, ...doc.data() });
    });
    return resources;
  } catch (error) {
    console.error("[Firestore] Error fetching published resources:", error);
    throw error;
  }
}

/**
 * Fetches latest published resources limited by count.
 */
export async function getLatestResources(limitCount) {
  try {
    // Standard modular implementation: we fetch all and slice, or query.
    // Querying with order requires index, so a simple filter/sort on published resources is safer.
    const all = await getPublishedResources();
    return all
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      })
      .slice(0, limitCount);
  } catch (error) {
    console.error("[Firestore] Error fetching latest resources:", error);
    throw error;
  }
}

/**
 * Fetches published resources by type.
 */
export async function getResourcesByType(type) {
  try {
    const resourcesCol = collection(db, "resources");
    const q = query(resourcesCol, where("published", "==", true), where("type", "==", type));
    const querySnapshot = await getDocs(q);
    const resources = [];
    querySnapshot.forEach((doc) => {
      resources.push({ id: doc.id, ...doc.data() });
    });
    return resources;
  } catch (error) {
    console.error("[Firestore] Error fetching resources by type:", error);
    throw error;
  }
}

/**
 * Gets related published resources (same course or subject, excluding current)
 */
export async function getRelatedResources(res) {
  if (!res) return [];
  try {
    const all = await getPublishedResources();
    return all.filter((r) => 
      r.id !== res.id && 
      (r.course === res.course || (res.subject && r.subject === res.subject))
    ).slice(0, 3);
  } catch (error) {
    console.error("[Firestore] Error finding related resources:", error);
    return [];
  }
}

/**
 * Toggles a bookmark for a user.
 */
export async function toggleBookmark(uid, resourceId) {
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return false;

    const data = docSnap.data();
    const bookmarks = data.bookmarks || [];
    let updated;
    if (bookmarks.includes(resourceId)) {
      updated = bookmarks.filter((id) => id !== resourceId);
    } else {
      updated = [...bookmarks, resourceId];
    }
    await updateDoc(userDocRef, { bookmarks: updated });
    return updated.includes(resourceId);
  } catch (error) {
    console.error("[Firestore] Error toggling bookmark:", error);
    throw error;
  }
}

/**
 * Appends a resource to the user's reading progress list.
 */
export async function logReadingProgress(uid, resourceId) {
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const progress = data.progress || [];
    const updateData = { lastVisitedResource: resourceId };
    if (!progress.includes(resourceId)) {
      updateData.progress = [...progress, resourceId];
    }
    await updateDoc(userDocRef, updateData);
  } catch (error) {
    console.error("[Firestore] Error logging reading progress:", error);
  }
}

/**
 * Appends a resource to the user's downloaded items list.
 */
export async function logDownload(uid, resourceId) {
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const downloads = data.downloads || [];
    if (!downloads.includes(resourceId)) {
      await updateDoc(userDocRef, { downloads: [...downloads, resourceId] });
    }
  } catch (error) {
    console.error("[Firestore] Error logging download:", error);
  }
}

/**
 * Updates user settings inside their profile document.
 */
export async function updateUserSettings(uid, settings) {
  try {
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, { settings });
  } catch (error) {
    console.error("[Firestore] Error updating user settings:", error);
    throw error;
  }
}

/**
 * Fetches notes written by the student.
 */
export async function getUserNotes(uid) {
  try {
    const notesCol = collection(db, "users", uid, "notes");
    const snapshot = await getDocs(notesCol);
    const notes = [];
    snapshot.forEach((docSnap) => {
      notes.push({ id: docSnap.id, ...docSnap.data() });
    });
    return notes;
  } catch (error) {
    console.error("[Firestore] Error fetching user notes:", error);
    return [];
  }
}

/**
 * Adds a new note for the student.
 */
export async function addUserNote(uid, note) {
  try {
    const notesCol = collection(db, "users", uid, "notes");
    const docRef = await addDoc(notesCol, {
      ...note,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("[Firestore] Error adding user note:", error);
    throw error;
  }
}

/**
 * Deletes a note.
 */
export async function deleteUserNote(uid, noteId) {
  try {
    const noteDocRef = doc(db, "users", uid, "notes", noteId);
    await deleteDoc(noteDocRef);
  } catch (error) {
    console.error("[Firestore] Error deleting user note:", error);
    throw error;
  }
}

/**
 * Updates an existing note for the student.
 */
export async function updateUserNote(uid, noteId, noteData) {
  try {
    const noteDocRef = doc(db, "users", uid, "notes", noteId);
    await updateDoc(noteDocRef, noteData);
  } catch (error) {
    console.error("[Firestore] Error updating user note:", error);
    throw error;
  }
}

/**
 * Sets a note document with a specific ID.
 */
export async function setUserNote(uid, noteId, note) {
  try {
    const noteDocRef = doc(db, "users", uid, "notes", noteId);
    await setDoc(noteDocRef, note);
  } catch (error) {
    console.error("[Firestore] Error setting user note:", error);
    throw error;
  }
}

/**
 * Fetches user quiz records.
 */
export async function getUserQuizzes(uid) {
  try {
    const quizzesCol = collection(db, "users", uid, "quizzes");
    const snapshot = await getDocs(quizzesCol);
    const scores = [];
    snapshot.forEach((docSnap) => {
      scores.push({ id: docSnap.id, ...docSnap.data() });
    });
    return scores;
  } catch (error) {
    console.error("[Firestore] Error fetching user quizzes:", error);
    return [];
  }
}

/**
 * Adds a new quiz score record.
 */
export async function addUserQuizScore(uid, quizScore) {
  try {
    const quizzesCol = collection(db, "users", uid, "quizzes");
    await addDoc(quizzesCol, {
      ...quizScore,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Firestore] Error adding user quiz score:", error);
    throw error;
  }
}
