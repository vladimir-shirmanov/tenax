import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCE_STORAGE_KEY = "tenax.theme.preference";

const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

const readSystemDarkModePreference = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export const readStoredThemePreference = (): ThemePreference => {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_PREFERENCE;
  }

  try {
    const raw = window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
    return isThemePreference(raw) ? raw : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
};

const persistThemePreference = (preference: ThemePreference) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
  } catch {
    // Ignore storage failures in private/locked-down browsing contexts.
  }
};

export const resolveEffectiveTheme = (preference: ThemePreference): ResolvedTheme => {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return readSystemDarkModePreference() ? "dark" : "light";
};

export const applyResolvedTheme = (theme: ResolvedTheme) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
};

export const resolveThemeBeforeRender = () => {
  const preference = readStoredThemePreference();
  const resolvedTheme = resolveEffectiveTheme(preference);
  applyResolvedTheme(resolvedTheme);

  return {
    preference,
    resolvedTheme,
  };
};

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readStoredThemePreference()
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveEffectiveTheme(readStoredThemePreference())
  );

  useEffect(() => {
    const currentResolvedTheme = resolveEffectiveTheme(preference);
    setResolvedTheme(currentResolvedTheme);
    applyResolvedTheme(currentResolvedTheme);
  }, [preference]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    if (preference !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      const nextTheme: ResolvedTheme = event.matches ? "dark" : "light";
      setResolvedTheme(nextTheme);
      applyResolvedTheme(nextTheme);
    };

    mediaQuery.addEventListener("change", onChange);
    return () => {
      mediaQuery.removeEventListener("change", onChange);
    };
  }, [preference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    persistThemePreference(nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
};
