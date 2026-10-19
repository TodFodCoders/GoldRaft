"use client"

import * as React from "react"

export interface ThemeContextType {
  theme: string
  setTheme: (theme: string) => void
  resolvedTheme: "light" | "dark"
  themes: string[]
  systemTheme: "light" | "dark"
  forcedTheme?: string
}

export interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  forcedTheme?: string
  themes?: string[]
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  attribute = "class",
  enableSystem = true,
  disableTransitionOnChange = false,
  forcedTheme,
  themes = ["light", "dark"],
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(storageKey) || defaultTheme
      } catch {
        return defaultTheme
      }
    }
    return defaultTheme
  })

  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light")

  // Determine resolved theme
  const effectiveTheme = forcedTheme || theme
  const resolvedTheme: "light" | "dark" =
    effectiveTheme === "system"
      ? systemTheme
      : effectiveTheme === "dark"
        ? "dark"
        : "light"

  // Listen to system color-scheme changes
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const updateSystem = () => {
      setSystemTheme(media.matches ? "dark" : "light")
    }
    updateSystem()
    media.addEventListener("change", updateSystem)
    return () => media.removeEventListener("change", updateSystem)
  }, [])

  // Apply theme attribute/class to document.documentElement
  React.useEffect(() => {
    const root = document.documentElement

    // Optional: disable transitions temporarily during theme change to prevent transition flashes
    let cleanupTransitions: (() => void) | null = null
    if (disableTransitionOnChange) {
      const css = document.createElement("style")
      css.appendChild(
        document.createTextNode(
          "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
        )
      )
      document.head.appendChild(css)
      cleanupTransitions = () => {
        window.getComputedStyle(document.body)
        setTimeout(() => {
          document.head.removeChild(css)
        }, 1)
      }
    }

    if (attribute === "class") {
      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme)
    } else {
      root.setAttribute(attribute, resolvedTheme)
    }

    root.style.colorScheme = resolvedTheme

    if (cleanupTransitions) {
      cleanupTransitions()
    }
  }, [resolvedTheme, attribute, disableTransitionOnChange])

  // Sync with storage events from other windows/tabs
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        setThemeState(e.newValue)
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [storageKey])

  const setTheme = React.useCallback(
    (newTheme: string) => {
      setThemeState(newTheme)
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch {}
    },
    [storageKey]
  )

  const value = React.useMemo<ThemeContextType>(
    () => ({
      theme: effectiveTheme,
      setTheme,
      resolvedTheme,
      themes: enableSystem ? [...themes, "system"] : themes,
      systemTheme,
      forcedTheme,
    }),
    [effectiveTheme, setTheme, resolvedTheme, enableSystem, themes, systemTheme, forcedTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextType {
  const context = React.useContext(ThemeContext)
  if (!context) {
    return {
      theme: "system",
      setTheme: () => {},
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
      systemTheme: "light",
    }
  }
  return context
}
