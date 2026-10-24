"use client"

import * as React from "react"
import {
  CalendarIcon,
  CheckCircleIcon,
  CloseIcon,
  FolderKanbanIcon,
  AltArrowDownIcon,
  AltArrowUpIcon,
  ShieldWarningIcon,
  DocumentTextIcon,
} from "@solar-icons/react/outline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  fetchCalendar,
  fetchCoverage,
  type CalendarPayload,
  type CoveragePayload,
} from "@/lib/api"

const COLLAPSED_HEIGHT = 56 // height of the bottom tab header in px

export function BottomDraggableTab() {
  const [height, setHeight] = React.useState<number>(COLLAPSED_HEIGHT)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const [activeTab, setActiveTab] = React.useState<"coverage" | "calendar" | "verdict" | "attribution">("coverage")

  const [coverageData, setCoverageData] = React.useState<CoveragePayload | null>(null)
  const [calendarData, setCalendarData] = React.useState<CalendarPayload | null>(null)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [selectedExpiry, setSelectedExpiry] = React.useState<string>("2026-10-30")

  const isExpanded = height > COLLAPSED_HEIGHT + 20
  const isHalfView = Math.abs(height - (typeof window !== "undefined" ? window.innerHeight * 0.5 : 450)) < 40

  const getHalfHeight = React.useCallback(() => {
    if (typeof window === "undefined") return 450
    return Math.round(window.innerHeight * 0.5)
  }, [])

  const getMaxHeight = React.useCallback(() => {
    if (typeof window === "undefined") return 750
    return Math.round(window.innerHeight * 0.85)
  }, [])

  const snapTo = React.useCallback((targetHeight: number) => {
    setHeight(targetHeight)
  }, [])

  const snapToHalf = React.useCallback(() => {
    snapTo(getHalfHeight())
  }, [snapTo, getHalfHeight])

  const snapToCollapse = React.useCallback(() => {
    snapTo(COLLAPSED_HEIGHT)
  }, [snapTo])

  const toggleExpand = React.useCallback(() => {
    setHeight((prev) => {
      const isCurrentlyExpanded = prev > COLLAPSED_HEIGHT + 20
      return isCurrentlyExpanded ? COLLAPSED_HEIGHT : getHalfHeight()
    })
  }, [getHalfHeight])

  // Fetch coverage and calendar data when expanded
  React.useEffect(() => {
    if (!isExpanded || coverageData) return
    let ignore = false
    Promise.all([
      fetchCoverage("2025-01-01"),
      fetchCalendar(selectedExpiry),
    ])
      .then(([covRes, calRes]) => {
        if (!ignore) {
          setCoverageData(covRes.payload)
          setCalendarData(calRes.payload)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [isExpanded, coverageData, selectedExpiry])

  // Handle selected expiry changes for tender window calculation
  const handleExpiryChange = (exp: string) => {
    setSelectedExpiry(exp)
    fetchCalendar(exp).then((res) => {
      setCalendarData(res.payload)
    }).catch(() => {})
  }

  // Keyboard shortcut: Ctrl+O / Cmd+O
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "o") {
        event.preventDefault()
        toggleExpand()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleExpand])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest("button") || target.closest("a") || target.closest("select")) {
      return
    }
    setIsDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const currentY = e.clientY
    const windowH = window.innerHeight
    const newHeight = Math.max(COLLAPSED_HEIGHT, Math.min(getMaxHeight(), windowH - currentY))
    setHeight(newHeight)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    const halfHeight = getHalfHeight()
    const maxHeight = getMaxHeight()
    const currentHeight = height

    if (currentHeight < (COLLAPSED_HEIGHT + halfHeight) / 2) {
      snapToCollapse()
    } else if (currentHeight < (halfHeight + maxHeight) / 2) {
      snapToHalf()
    } else {
      snapTo(maxHeight)
    }
  }

  const { isMobile, state } = useSidebar()
  const leftOffset = isMobile
    ? "0px"
    : state === "collapsed"
      ? "calc(var(--sidebar-width-icon) + 1rem + 2px)"
      : "var(--sidebar-width)"

  return (
    <div
      style={{
        height: `${height}px`,
        left: leftOffset,
        right: isMobile ? 0 : "0.5rem",
        bottom: 0,
        marginBottom: 0,
        transition: isDragging
          ? "left 200ms ease-linear"
          : "height 280ms cubic-bezier(0.16, 1, 0.3, 1), left 200ms ease-linear",
      }}
      className={cn(
        "fixed bottom-0 z-40 flex flex-col m-0 mb-0 p-0",
        "border-t border-border bg-card/95 backdrop-blur-xl",
        "rounded-t-2xl overflow-hidden shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      )}
    >
      {/* Top Header */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label="Data and Calendar inspection drawer"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggleExpand()
          }
        }}
        className={cn(
          "group/tab flex h-14 shrink-0 cursor-grab select-none flex-col justify-between px-3 sm:px-6 pt-1.5 pb-2 transition-colors",
          "hover:bg-muted/40 active:cursor-grabbing",
          isDragging ? "bg-muted/50 cursor-grabbing" : ""
        )}
      >
        <div className="mx-auto flex items-center justify-center pt-0.5">
          <div className="flex h-1.5 w-14 items-center justify-center rounded-full bg-muted-foreground/30 transition-all group-hover/tab:bg-primary/70 group-hover/tab:w-16" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarIcon className="size-4" />
            </div>
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                Data & Calendar Inspection
              </span>
              <Badge
                variant={isExpanded ? "default" : "outline"}
                className="hidden sm:inline-flex text-[11px] font-normal py-0 px-2 gap-1"
              >
                {isHalfView
                  ? "50% View"
                  : isExpanded
                    ? "Expanded View"
                    : "Drawer (Ctrl+O)"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] text-muted-foreground select-none">
              Ctrl+O
            </kbd>

            <Button
              variant={isHalfView ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1 font-medium"
              onClick={(e) => {
                e.stopPropagation()
                if (isHalfView) {
                  snapToCollapse()
                } else {
                  snapToHalf()
                }
              }}
              title="Toggle 50% Half Area"
            >
              <AltArrowUpIcon
                className={cn(
                  "size-3.5 transition-transform",
                  isHalfView ? "rotate-180" : ""
                )}
              />
              <span className="hidden xs:inline">50% View</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand()
              }}
              title={isExpanded ? "Collapse Drawer (Ctrl+O)" : "Expand Drawer (Ctrl+O)"}
            >
              {isExpanded ? (
                <AltArrowDownIcon className="size-4" />
              ) : (
                <AltArrowUpIcon className="size-4" />
              )}
              <span className="sr-only">Toggle drawer height</span>
            </Button>

            {isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  snapToCollapse()
                }}
                title="Close drawer"
              >
                <CloseIcon className="size-3.5" />
                <span className="sr-only">Close drawer</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="flex flex-1 flex-col overflow-y-auto px-4 lg:px-6 py-4 space-y-4 bg-background/50">
          {/* Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
              <Button
                variant={activeTab === "coverage" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setActiveTab("coverage")}
              >
                <DocumentTextIcon className="size-3.5 mr-1 text-primary" />
                Data Coverage
              </Button>
              <Button
                variant={activeTab === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setActiveTab("calendar")}
              >
                <CalendarIcon className="size-3.5 mr-1 text-primary" />
                Calendar & Tender
              </Button>
              <Button
                variant={activeTab === "verdict" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setActiveTab("verdict")}
              >
                <CheckCircleIcon className="size-3.5 mr-1 text-primary" />
                Verdict
              </Button>
              <Button
                variant={activeTab === "attribution" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setActiveTab("attribution")}
              >
                <FolderKanbanIcon className="size-3.5 mr-1 text-primary" />
                Attribution
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              {loading ? "Fetching API data..." : "Live backend query"}
            </div>
          </div>

          {/* TAB 1: DATA COVERAGE */}
          {activeTab === "coverage" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-card shadow-none border">
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Trading Days Loaded</div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {coverageData?.trading_days_with_file_count ?? "..."}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {coverageData?.first_accepted_date} to {coverageData?.last_accepted_date}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-none border">
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Missing Trading Days</div>
                    <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                      {coverageData?.missing_trading_days_count ?? "..."}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Out of {coverageData?.total_trading_days_in_range} total calendar trading days
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-none border">
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Date-Trap Mismatches</div>
                    <div className="text-xl font-bold font-mono">
                      {coverageData?.mismatched_date_trap_files_count ?? 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Quarantined safely</div>
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-none border">
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Duplicate Hashes</div>
                    <div className="text-xl font-bold font-mono">
                      {coverageData?.duplicate_hash_files_count ?? 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Deduplicated by SHA-256</div>
                  </CardContent>
                </Card>
              </div>

              {/* Requirement Note */}
              <div className="rounded-lg border bg-amber-500/10 border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-300">
                <strong>History Requirement:</strong> Z-scores and walk-forward backtests strictly require at least 30 consecutive trading days. The current dataset contains a sparse sample across non-consecutive trading sessions.
              </div>

              {/* Missing Dates Scrollbox */}
              {coverageData && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Missing Trading Sessions ({coverageData.missing_trading_days_count} dates):
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded-lg border bg-muted/30 p-2 font-mono text-[11px] grid grid-cols-3 sm:grid-cols-6 gap-1">
                    {coverageData.missing_trading_days.map((d) => (
                      <span key={d} className="text-muted-foreground">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CALENDAR & TENDER */}
          {activeTab === "calendar" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium">Select Expiry for Tender Window:</span>
                <select
                  aria-label="Select Expiry for Tender Window"
                  className="rounded border border-input bg-background px-2 py-1 text-xs font-mono"
                  value={selectedExpiry}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                >
                  <option value="2026-10-30">30OCT2026 (GOLDTEN / GUINEA / PETAL)</option>
                  <option value="2026-11-05">05NOV2026 (GOLDM)</option>
                  <option value="2026-06-30">30JUN2026 (Moharram holiday test)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-card shadow-none border">
                  <CardContent className="p-3 space-y-1">
                    <div className="text-xs text-muted-foreground">Conservative Tender Start</div>
                    <div className="text-lg font-bold font-mono text-primary">
                      {String(calendarData?.sample_tender_checks?.conservative_start || "Calculating...")}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Earliest start across all trading policies
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-none border">
                  <CardContent className="p-3 space-y-1">
                    <div className="text-xs text-muted-foreground">Tender Rule Status</div>
                    <div className="text-lg font-bold font-mono">
                      {String(calendarData?.sample_tender_checks?.status || "VALID")}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Compulsory physical delivery blackout
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-none border">
                  <CardContent className="p-3 space-y-1">
                    <div className="text-xs text-muted-foreground">Calendar Verification</div>
                    <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                      verified: false
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      31 holidays unverified pending MCX confirmation
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-lg border p-3 text-xs space-y-1 text-muted-foreground">
                <p><strong>Tender Gate Rule:</strong> Last 3 trading days including expiry day. Open positions must close before tender start; entries prohibited if remaining horizon intersects tender window.</p>
                <p><strong>Coverage Range:</strong> {calendarData?.coverage_start} to {calendarData?.coverage_end}</p>
              </div>
            </div>
          )}

          {/* TAB 3: VERDICT */}
          {activeTab === "verdict" && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 border rounded-xl bg-muted/20">
              <ShieldWarningIcon className="size-8 text-muted-foreground/60" />
              <div className="text-sm font-semibold">Backtest Verdict Not Available Yet</div>
              <p className="text-xs text-muted-foreground max-w-md">
                Requires Phase 3 walk-forward backtest implementation and sufficient consecutive historical trading sessions. No simulated verdict is fabricated from sparse fixture or demo data.
              </p>
            </div>
          )}

          {/* TAB 4: ATTRIBUTION */}
          {activeTab === "attribution" && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 border rounded-xl bg-muted/20">
              <ShieldWarningIcon className="size-8 text-muted-foreground/60" />
              <div className="text-sm font-semibold">P&L Attribution Not Available Yet</div>
              <p className="text-xs text-muted-foreground max-w-md">
                Independent 3-way attribution (Gold Delta, Carry, Alpha minus Costs) requires Phase 3 backtest execution and reviewed attribution specification.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
