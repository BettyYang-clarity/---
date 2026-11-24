import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { ensureUserAccountDoc } from '../services/firestoreClientService';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  accountSynced: boolean;
  authBusy: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accountSynced, setAccountSynced] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setAccountSynced(false);
      setAuthReady(true);

      if (nextUser) {
        void (async () => {
          try {
            await ensureUserAccountDoc(nextUser);
            if (active) {
              setAccountSynced(true);
              setAuthError(null);
            }
          } catch (err) {
            if (active) {
              const raw = err instanceof Error ? err.message : String(err);
              if (raw.includes('Quota exceeded')) {
                setAuthError(
                  'Firebase 今日免費額度已達上限，系統將於明日重置，目前仍可使用本機瀏覽器模式。'
                );
              } else {
                setAuthError(
                  '無法初始化雲端帳號空間，請稍後重新登入或檢查網路連線。'
                );
              }
            }
          }
        })();
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        // User closed popup intentionally; no scary error needed
        setAuthError(null);
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          '瀏覽器封鎖了 Google 登入視窗，請允許此網站開啟彈出視窗後再點一次登入。'
        );
      } else {
        setAuthError('Google 登入未完成，請稍後再試。');
      }
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signOut(auth);
      setAccountSynced(false);
    } catch {
      setAuthError('登出時發生異常，請重新整理頁面。');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        accountSynced,
        authBusy,
        authError,
        clearAuthError,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside FirebaseProvider');
  }
  return ctx;
}
