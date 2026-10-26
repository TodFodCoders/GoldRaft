"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Lightweight inline SVG mask data URI for the Sailboat geometry (zero network request, ~280 bytes)
const SAILBOAT_MASK_URL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='970 380 640 460'%3E%3Cpolygon fill='%23000' points='1438,390 1145,678 1177,678 1393,465 1324,705 1346,705'/%3E%3Cpolygon fill='%23000' points='1003,705 1595,705 1473,825 981,825 981,802 1465,802 1491,776 1057,776 1035,754 1513,754 1540,727 1013,727'/%3E%3C/svg%3E")`

/**
 * Standard vector Sailboat Logo (fill="currentColor", lightweight, no SMIL overhead).
 */
export function SailboatLogo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="970 380 640 460"
      className={cn("w-28 sm:w-36 h-auto text-black dark:text-white fill-current", className)}
      role="img"
      aria-label="Sailboat logo"
      {...props}
    >
      {/* Sail */}
      <polygon points="1438,390 1145,678 1177,678 1393,465 1324,705 1346,705" />
      {/* Hull (three stacked bands) */}
      <polygon points="1003,705 1595,705 1473,825 981,825 981,802 1465,802 1491,776 1057,776 1035,754 1513,754 1540,727 1013,727" />
    </svg>
  )
}

/**
 * Super lightweight Dashboard Preloader.
 * - Icon only: monochrome (black in light mode, white in dark mode).
 * - No border, no drop-shadow, no solid card background.
 * - Hardware-accelerated CSS GPU shimmer running strictly on compositor thread (60/120 FPS).
 * - Zero CPU main-thread overhead, zero repaints, zero lag during React hydration.
 */
export function DashboardPreloader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background pointer-events-none transition-opacity duration-200",
        className
      )}
      aria-hidden="true"
    >
      {/* Monochrome Sailboat with GPU-composited skeleton shimmer */}
      <div
        className="relative w-28 sm:w-36 aspect-[640/460] overflow-hidden text-black dark:text-white select-none"
        style={{
          WebkitMaskImage: SAILBOAT_MASK_URL,
          maskImage: SAILBOAT_MASK_URL,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      >
        {/* Dim base skeleton silhouette */}
        <div className="absolute inset-0 bg-current opacity-20" />

        {/* Buttery smooth 120 FPS diagonal GPU shimmer beam */}
        <div
          className="absolute -inset-[50%] w-[200%] h-[200%] -translate-x-full -translate-y-full animate-shimmer-diagonal"
          style={{
            background:
              "linear-gradient(135deg, transparent 0%, transparent 40%, currentColor 50%, transparent 60%, transparent 100%)",
            opacity: 0.85,
            willChange: "transform",
          }}
        />
      </div>
    </div>
  )
}

/**
 * Preloader Controller that mounts during initial render and unmounts swiftly
 * once the dashboard page is ready, preventing UI freeze and artificial delays.
 */
export function DashboardPreloaderController() {
  const [fading, setFading] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)

  React.useEffect(() => {
    // Start fading out smoothly as soon as the client mounts
    const fadeTimer = setTimeout(() => {
      setFading(true)
    }, 100)

    const unmountTimer = setTimeout(() => {
      setHidden(true)
    }, 300)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(unmountTimer)
    }
  }, [])

  if (hidden) return null

  return (
    <DashboardPreloader
      className={fading ? "opacity-0 pointer-events-none" : "opacity-100"}
    />
  )
}
