import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAuth, getIdTokenResult, onAuthStateChanged, signOut, User } from "firebase/auth";
import { isSystemAdminClaim, USER_ROLES, type AuthClaims, type SystemAdminRole } from "./roles";

export type AdminAuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden"; user: User }
  | {
      status: "authorized";
      user: User;
      role: SystemAdminRole;
    }
  | { status: "error"; error: unknown };

type AdminAuthContextValue = {
  state: AdminAuthState;
  user: User | null;
  role: SystemAdminRole | null;
  loading: boolean;
  error: unknown | null;
  logout: () => Promise<void>;
  retry: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminAuthState>({ status: "loading" });
  const auth = useMemo(() => getAuth(), []);

  const resolveClaims = useCallback(async (user: User, shouldCommit: () => boolean = () => true) => {
    setState({ status: "loading" });
    try {
      const token = await getIdTokenResult(user);
      if (!shouldCommit()) return;

      const authorized = isSystemAdminClaim(token.claims as AuthClaims);

      if (!authorized) {
        setState({ status: "forbidden", user });
        return;
      }

      setState({
        status: "authorized",
        user,
        role: USER_ROLES.SYSTEM_ADMIN,
      });
    } catch (error) {
      if (!shouldCommit()) return;
      setState({ status: "error", error });
    }
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!active) return;

      if (!user) {
        setState({ status: "unauthenticated" });
        return;
      }

      resolveClaims(user, () => active);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth, resolveClaims]);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  const retry = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setState({ status: "unauthenticated" });
      return;
    }

    await user.getIdToken(true);
    await resolveClaims(user);
  }, [auth, resolveClaims]);

  const value = useMemo<AdminAuthContextValue>(() => {
    const user = state.status === "authorized" || state.status === "forbidden" ? state.user : null;
    const role = state.status === "authorized" ? state.role : null;
    const error = state.status === "error" ? state.error : null;

    return {
      state,
      user,
      role,
      loading: state.status === "loading",
      error,
      logout,
      retry,
    };
  }, [logout, retry, state]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider.");
  }
  return context;
}
