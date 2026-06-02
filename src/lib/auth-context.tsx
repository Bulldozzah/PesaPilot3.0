import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
};

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  session: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    const hydrate = async () => {
      const { data } = await supabase.auth.getSession();
      let s = data.session;
      // Refresh if token expires within 5 minutes (handles long idle / sleep)
      const expSec = s?.expires_at ?? 0;
      const nowSec = Math.floor(Date.now() / 1000);
      if (s && expSec - nowSec < 300) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        s = refreshed.session ?? s;
      }
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    };
    hydrate();

    const onVisible = () => {
      if (document.visibilityState === "visible") void hydrate();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: !!user, isLoading, user, session }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
