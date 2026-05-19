import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  role: "employee" | "manager" | "admin";
  managerId?: string;
  department?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setError(null);
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            let data = userSnap.data() as UserProfile;
            // Force admin for the primary user and SYNC with Firestore
            if (user.email === "sonalikam05@gmail.com" && data.role !== "admin") {
              data.role = "admin";
              await setDoc(userRef, { role: "admin" }, { merge: true });
            }
            setProfile(data);
          } else {
            const defaultRole = (user.email === "sonalikam05@gmail.com" || user.email?.includes("admin")) ? "admin" : 
                               user.email?.includes("manager") ? "manager" : "employee";
            
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              name: user.displayName || user.email?.split("@")[0] || "User",
              role: defaultRole as any,
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err: any) {
          console.error("Auth initialization error:", err);
          setError("Failed to connect to security matrix. Please refresh.");
          try {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          } catch (e) {
            // Already logged by handler
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const signOut = () => auth.signOut();

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
