import { useState, useCallback, useEffect, useMemo } from "react";
import type { DashboardItem } from "../types";

interface UseKeyboardNavigationOptions {
  readonly items: readonly DashboardItem[];
  readonly enabled: boolean;
}

export function useKeyboardNavigation({ items, enabled }: UseKeyboardNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Reset when items change or navigation is disabled
  useEffect(() => {
    setFocusedIndex(-1);
  }, [items, enabled]);

  const moveFocus = useCallback((delta: number) => {
    if (items.length === 0) return;
    setFocusedIndex((prev) => {
      if (prev === -1) return delta > 0 ? 0 : items.length - 1;
      return Math.max(0, Math.min(items.length - 1, prev + delta));
    });
  }, [items.length]);

  const resetFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  const focusedItem = useMemo(
    () => (focusedIndex >= 0 && focusedIndex < items.length ? items[focusedIndex] : null),
    [items, focusedIndex],
  );

  return { focusedIndex, setFocusedIndex, focusedItem, moveFocus, resetFocus } as const;
}
