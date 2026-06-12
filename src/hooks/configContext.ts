import { createContext, useContext } from "react";
import type { useConfig } from "./useConfig";

export type ConfigStore = ReturnType<typeof useConfig>;

// useConfig() は App で1回だけ呼び、この Context で全コンポーネントへ共有する。
// 二重インスタンス化は configRef の分裂によるデータ損失を招くため禁止
// （REFACTORING_PLAN.md Phase 2-1）。
export const ConfigContext = createContext<ConfigStore | null>(null);

export function useConfigContext(): ConfigStore {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfigContext must be used within ConfigContext.Provider");
  return ctx;
}
