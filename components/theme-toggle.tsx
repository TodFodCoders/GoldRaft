"use client"

import * as React from "react"
import { useTheme } from "@/components/theme-provider"
import {
  Sun2Icon,
  MoonIcon,
  MonitorIcon,
  CheckIcon,
} from "@solar-icons/react/outline"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-8 text-muted-foreground", className)}
        aria-label="Toggle theme"
      >
        <Sun2Icon className="size-4 opacity-50" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-8 text-muted-foreground hover:text-foreground", className)}
            aria-label="Toggle theme"
          />
        }
      >
        <Sun2Icon className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center justify-between text-xs cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Sun2Icon className="size-3.5" />
            Light
          </span>
          {theme === "light" && <CheckIcon className="size-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center justify-between text-xs cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <MoonIcon className="size-3.5" />
            Dark
          </span>
          {theme === "dark" && <CheckIcon className="size-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center justify-between text-xs cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <MonitorIcon className="size-3.5" />
            System
          </span>
          {theme === "system" && <CheckIcon className="size-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
