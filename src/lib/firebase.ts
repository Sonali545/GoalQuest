import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

// Test connection on boot
async function testConnection() {
  try {
    // Attempt to fetch a non-existent document from a known collection to verify rules/connectivity
    await getDocFromServer(doc(db, "config", "connection-test"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Firestore is offline. Check configuration.");
    }
    // We don't throw here to avoid crashing the app if just the test fails
  }
}
testConnection();
