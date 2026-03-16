import {
  THEME_PREFERENCE_STORAGE_KEY,
  applyResolvedTheme,
  readStoredThemePreference,
  resolveEffectiveTheme,
  ThemeProvider,
  useTheme,
  type ThemePreference,
} from "./theme";
import { act, renderHook } from "@testing-library/react";
import { ReactNode, createElement } from "react";

const mockMatchMedia = (isDarkMode: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-color-scheme") ? isDarkMode : false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe("theme resolution", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    mockMatchMedia(false);
  });

  it("defaults to system preference when storage is empty", () => {
    expect(readStoredThemePreference()).toBe("system");
  });

  it("resolves system preference using current OS theme", () => {
    mockMatchMedia(true);

    expect(resolveEffectiveTheme("system")).toBe("dark");
  });

  it("keeps explicit preference even when OS is dark", () => {
    mockMatchMedia(true);

    expect(resolveEffectiveTheme("light")).toBe("light");
  });

  it("reads only supported preference values from storage", () => {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, "sepia");

    expect(readStoredThemePreference()).toBe("system");
  });

  it("applies resolved theme and browser color-scheme", () => {
    applyResolvedTheme("dark");

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("persists valid user preference", () => {
    const value: ThemePreference = "light";
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, value);

    expect(readStoredThemePreference()).toBe("light");
  });

  it("reacts to OS changes only when preference is system", () => {
    let isDark = false;
    let listener: ((event: MediaQueryListEvent) => void) | null = null;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        get matches() {
          return isDark;
        },
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: (_event: string, callback: (event: MediaQueryListEvent) => void) => {
          listener = callback;
        },
        removeEventListener: () => {
          listener = null;
        },
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(ThemeProvider, null, children);

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.preference).toBe("system");
    expect(result.current.resolvedTheme).toBe("light");

    act(() => {
      isDark = true;
      listener?.({ matches: true } as MediaQueryListEvent);
    });

    expect(result.current.resolvedTheme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    act(() => {
      result.current.setPreference("light");
    });

    expect(result.current.preference).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");

    act(() => {
      isDark = false;
      listener?.({ matches: false } as MediaQueryListEvent);
    });

    expect(result.current.resolvedTheme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
