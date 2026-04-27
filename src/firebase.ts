import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Use initializeFirestore to enable specific settings like long polling
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Validate Connection to Firestore on boot
async function testConnection() {
  try {
    // Attempting to fetch a non-existent document to check connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firestore connection failed: the client is offline. Please check your network or Firebase configuration.");
    } else {
      console.log("Firestore connection test completed (ignoring non-offline errors)");
    }
  }
}
testConnection();

const provider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export const handleFirestoreError = (error: any, operation: OperationType, path: string | null) => {
  console.error(`Firebase Error [${operation}] at ${path}:`, error);
  // Log standardized error if needed
};
