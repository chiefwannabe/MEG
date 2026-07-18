import { auth } from "../../../firebase.js";
import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged
} from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function signInAnon() {
  return signInAnonymously(auth);
}

export function signInGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOut() {
  return fbSignOut(auth);
}

export function currentUser() {
  return auth.currentUser;
}
