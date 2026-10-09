import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isOfficial: boolean;
  isGovernment: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isOfficial: false,
  isGovernment: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Listen to public profile changes
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const unsubProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            const publicData = docSnap.data() as UserProfile;
            setProfile(prev => prev ? { ...prev, ...publicData } : publicData);
          }
          setLoading(false);
        }, (error) => {
          if (error.code === 'permission-denied' && !auth.currentUser) return;
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });

        // Listen to private profile changes
        const privateRef = doc(db, 'users_private', firebaseUser.uid);
        const unsubPrivate = onSnapshot(privateRef, (docSnap) => {
          if (docSnap.exists()) {
            const privateData = docSnap.data();
            setProfile(prev => prev ? { ...prev, ...privateData } : { ...privateData } as UserProfile);
          }
        }, (error) => {
          if (error.code === 'permission-denied' && !auth.currentUser) return;
          handleFirestoreError(error, OperationType.GET, `users_private/${firebaseUser.uid}`);
        });
        
        return () => {
          unsubProfile();
          unsubPrivate();
        };
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    isOfficial: profile?.role === 'official' || profile?.role === 'admin' || user?.email === 'work.aditipatwa@gmail.com',
    isGovernment: profile?.role === 'government',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
