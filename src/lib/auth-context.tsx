import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  currency: string;
  refreshCurrency: () => Promise<void>;
};

const DEFAULT_CURRENCY = "KES";

function readCachedCurrency(): string {
  try {
    const raw = localStorage.getItem("pp_profile");
    if (raw) {
      const parsed = JSON.parse(raw) as { currency?: string };
      if (parsed?.currency) return parsed.currency;
    }
  } catch {
    // ignore storage/parse failures
  }
  return DEFAULT_CURRENCY;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  session: null,
  currency: DEFAULT_CURRENCY,
  refreshCurrency: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState<string>(readCachedCurrency);

  const refreshCurrency = async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("currency")
      .eq("id", uid)
      .single();
    const cur = (profile as { currency?: string } | null)?.currency;
    if (cur) setCurrency(cur);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
      if (s?.user) void refreshCurrency();
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
      if (s?.user) void refreshCurrency();
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
      value={{ isAuthenticated: !!user, isLoading, user, session, currency, refreshCurrency }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
