import { useState, useEffect, useCallback } from "react";
import type { PageView } from "../types";

// pageView state + navigateTo + popstate
// （history.pushState + WKWebView の Back/Forward スワイプ対応）
export function useNavigation() {
  const [pageView, setPageViewRaw] = useState<PageView>("dashboard");

  const navigateTo = useCallback((view: PageView) => {
    setPageViewRaw(view);
    history.pushState({ pageView: view }, "", "");
  }, []);

  useEffect(() => {
    history.replaceState({ pageView: "dashboard" }, "", "");
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { pageView?: PageView } | null;
      if (state?.pageView) {
        setPageViewRaw(state.pageView);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return { pageView, navigateTo } as const;
}
