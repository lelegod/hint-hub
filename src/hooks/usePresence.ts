import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Pings the server every 30s while the app is open and the user is signed in,
 * so friends can see online/away/offline presence.
 */
export function usePresence(authed: boolean) {
  useEffect(() => {
    if (!authed) return;

    let cancelled = false;
    const ping = async () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") return;
      await supabase.rpc("heartbeat");
    };

    void ping();
    const interval = window.setInterval(ping, HEARTBEAT_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authed]);
}
