"use client"

import * as React from "react"
import {
  PulseIcon,
  GraphNewUpIcon,
  CheckCircleIcon,
  ClockCircleIcon,
  UsersGroupRoundedIcon,
  FolderKanbanIcon,
  StarsMinimalisticIcon,
  AltArrowUpIcon,
  AltArrowDownIcon,
  CloseIcon,
  GripHorizontalIcon,
  ArrowRightUpIcon,
  DocumentTextIcon,
  AddIcon,
} from "@solar-icons/react/outline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const COLLAPSED_HEIGHT = 56 // height of the bottom tab header in px

export function BottomDraggableTab() {
  const [height, setHeight] = React.useState<number>(COLLAPSED_HEIGHT)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const [activeTab, setActiveTab] = React.useState<"overview" | "tasks" | "workload">("overview")

  const dragStartRef = React.useRef<{
    startY: number
    startHeight: number
    hasMoved: boolean
  }>({
    startY: 0,
    startHeight: COLLAPSED_HEIGHT,
    hasMoved: false,
  })

  const isExpanded = height > COLLAPSED_HEIGHT + 20
  const isHalfView = Math.abs(height - (typeof window !== "undefined" ? window.innerHeight * 0.5 : 450)) < 40

  // Calculate snap targets
  const getHalfHeight = React.useCallback(() => {
    if (typeof window === "undefined") return 450
    return Math.round(window.innerHeight * 0.5)
  }, [])

  const getMaxHeight = React.useCallback(() => {
    if (typeof window === "undefined") return 750
    return Math.round(window.innerHeight * 0.85)
  }, [])

  // Snap to specific heights
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
    if (isExpanded) {
      snapToCollapse()
    } else {
      snapToHalf()
    }
  }, [isExpanded, snapToCollapse, snapToHalf])

  // Drag handlers using pointer events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag with left mouse button or touch
    if (e.button !== 0) return

    // Prevent dragging if clicking directly on a button inside the header
    const target = e.target as HTMLElement
    if (target.closest("button") || target.closest("a")) {
      return
    }

    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    dragStartRef.current = {
      startY: e.clientY,
      startHeight: height,
      hasMoved: false,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return

    const deltaY = dragStartRef.current.startY - e.clientY // dragging UP increases height
    if (Math.abs(deltaY) > 4) {
      dragStartRef.current.hasMoved = true
    }

    const minHeight = COLLAPSED_HEIGHT
    const maxHeight = getMaxHeight()
    const newHeight = Math.max(
      minHeight,
      Math.min(maxHeight, dragStartRef.current.startHeight + deltaY)
    )

    setHeight(newHeight)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore if already released
    }

    // If user simply clicked without significant drag movement, toggle half-view
    if (!dragStartRef.current.hasMoved) {
      toggleExpand()
      return
    }

    // Snap to nearest point
    const halfHeight = getHalfHeight()
    const maxHeight = getMaxHeight()
    const currentHeight = height

    if (currentHeight < (halfHeight + COLLAPSED_HEIGHT) / 2) {
      // closer to collapsed
      snapToCollapse()
    } else if (currentHeight < (halfHeight + maxHeight) / 2) {
      // closer to 50% half view
      snapToHalf()
    } else {
      // closer to max
      snapTo(maxHeight)
    }
  }

  const { isMobile, state } = useSidebar()
  const leftOffset = isMobile
    ? "0px"
    : state === "collapsed"
      ? "var(--sidebar-width-icon)"
      : "var(--sidebar-width)"

  return (
    <div
      style={{
        height: `${height}px`,
        left: leftOffset,
        right: 0,
        bottom: 0,
        marginBottom: 0,
        boxShadow: "none",
        WebkitBoxShadow: "none",
        transition: isDragging
          ? "left 200ms ease-linear"
          : "height 280ms cubic-bezier(0.16, 1, 0.3, 1), left 200ms ease-linear",
      }}
      className={cn(
        "fixed bottom-0 z-40 flex flex-col m-0 mb-0 p-0",
        "border-t border-border bg-card/95 backdrop-blur-xl shadow-none",
        "rounded-t-2xl overflow-hidden"
      )}
    >
        {/* Top Draggable Tab Bar / Grab Header */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label="Draggable bottom half area tab"
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
          {/* Centered Pill Drag Handle Indicator */}
          <div className="mx-auto flex items-center justify-center pt-0.5">
            <div className="flex h-1.5 w-14 items-center justify-center rounded-full bg-muted-foreground/30 transition-all group-hover/tab:bg-primary/70 group-hover/tab:w-16" />
          </div>

          {/* Tab Header Controls */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Title & Status */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <PulseIcon className="size-4 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 truncate">
                <span className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                  Delivery Intelligence & Velocity
                </span>
                <Badge
                  variant={isExpanded ? "default" : "outline"}
                  className="hidden sm:inline-flex text-[11px] font-normal py-0 px-2 gap-1"
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isExpanded ? "bg-emerald-300 animate-ping" : "bg-emerald-500"
                    )}
                  />
                  {isHalfView
                    ? "50% Half Area"
                    : isExpanded
                      ? "Expanded View"
                      : "Draggable Tab"}
                </Badge>
              </div>
            </div>

            {/* Center: Subtle drag guidance hint */}
            <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground">
              <GripHorizontalIcon className="size-3.5 opacity-60" />
              <span>Drag tab up/down or click to toggle</span>
            </div>

            {/* Right: Quick Snap & Toggle Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Quick Snap to 50% Half View */}
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

              {/* Main Expand/Collapse Chevron Button */}
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpand()
                }}
                title={isExpanded ? "Collapse to Bottom Tab" : "Expand to Half Area"}
              >
                {isExpanded ? (
                  <AltArrowDownIcon className="size-4" />
                ) : (
                  <AltArrowUpIcon className="size-4" />
                )}
                <span className="sr-only">Toggle drawer height</span>
              </Button>

              {/* Close Button when open */}
              {isExpanded && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    snapToCollapse()
                  }}
                  title="Close panel"
                >
                  <CloseIcon className="size-3.5" />
                  <span className="sr-only">Close panel</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Half Area Content (Scrollable) */}
        {isExpanded && (
          <div className="flex flex-1 flex-col overflow-y-auto px-4 lg:px-6 py-4 space-y-5 bg-background/50">
            {/* Tab Filter Switcher & Action Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
              <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
                <Button
                  variant={activeTab === "overview" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => setActiveTab("overview")}
                >
                  <GraphNewUpIcon className="size-3.5 mr-1 text-primary" />
                  Sprint Overview
                </Button>
                <Button
                  variant={activeTab === "tasks" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => setActiveTab("tasks")}
                >
                  <FolderKanbanIcon className="size-3.5 mr-1 text-primary" />
                  Deliverables & Tasks
                </Button>
                <Button
                  variant={activeTab === "workload" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => setActiveTab("workload")}
                >
                  <UsersGroupRoundedIcon className="size-3.5 mr-1 text-primary" />
                  Team Capacity
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs">
                  <StarsMinimalisticIcon className="size-3 text-amber-500" />
                  AI Sync Active
                </Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                  <DocumentTextIcon className="size-3.5" />
                  Export Report
                </Button>
                <Button size="sm" className="h-7 text-xs gap-1.5">
                  <AddIcon className="size-3.5" />
                  New Deliverable
                </Button>
              </div>
            </div>

            {/* TAB CONTENT: Sprint Overview */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="bg-card/80 shadow-none ring-0 border border-muted/80">
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Sprint Velocity</span>
                        <span className="text-emerald-600 font-medium inline-flex items-center text-[11px]">
                          <GraphNewUpIcon className="size-3 mr-0.5" /> +12.4%
                        </span>
                      </div>
                      <div className="text-xl font-bold">88.2%</div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full w-[88.2%]" />
                      </div>
                      <p className="text-[10px] text-muted-foreground pt-0.5">
                        42 of 48 story points resolved
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/80 shadow-none ring-0 border border-muted/80">
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>PR Cycle Time</span>
                        <span className="text-emerald-600 font-medium inline-flex items-center text-[11px]">
                          -4.2h faster
                        </span>
                      </div>
                      <div className="text-xl font-bold">1.2 days</div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full w-[76%]" />
                      </div>
                      <p className="text-[10px] text-muted-foreground pt-0.5">
                        Median merge time across 24 PRs
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/80 shadow-none ring-0 border border-muted/80">
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Quality Pass Rate</span>
                        <span className="text-emerald-600 font-medium inline-flex items-center text-[11px]">
                          <CheckCircleIcon className="size-3 mr-0.5" /> 100%
                        </span>
                      </div>
                      <div className="text-xl font-bold">99.4%</div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full w-[99.4%]" />
                      </div>
                      <p className="text-[10px] text-muted-foreground pt-0.5">
                        0 critical blockers in production
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/80 shadow-none ring-0 border border-muted/80">
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Active Reviewers</span>
                        <span className="text-primary font-medium inline-flex items-center text-[11px]">
                          18 online
                        </span>
                      </div>
                      <div className="text-xl font-bold">94.0%</div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full w-[94%]" />
                      </div>
                      <p className="text-[10px] text-muted-foreground pt-0.5">
                        Reviewer SLA compliance on track
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Live Milestone Deliverables List */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderKanbanIcon className="size-4 text-primary" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Active Milestone Deliverables
                      </h4>
                    </div>
                    <span className="text-xs text-muted-foreground">Sprint 32 • Week 2</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        title: "Core API Gateway Migration to Next.js 16",
                        status: "On Track",
                        badgeVariant: "default" as const,
                        lead: "Eddie Lake",
                        progress: 92,
                        due: "Tomorrow",
                      },
                      {
                        title: "Migrate UI Icons to @solar-icons/react Outline",
                        status: "Completed",
                        badgeVariant: "secondary" as const,
                        lead: "Jane Doe",
                        progress: 100,
                        due: "Today",
                      },
                      {
                        title: "Interactive Bottom Draggable Half Area Integration",
                        status: "In Progress",
                        badgeVariant: "default" as const,
                        lead: "Sarah Chen",
                        progress: 85,
                        due: "Oct 22",
                      },
                      {
                        title: "Real-time Telemetry & Data Table Virtualization",
                        status: "Review",
                        badgeVariant: "outline" as const,
                        lead: "Alex Morgan",
                        progress: 68,
                        due: "Oct 25",
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border bg-background/50 p-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-medium text-foreground">
                              {item.title}
                            </span>
                            <Badge variant={item.badgeVariant} className="text-[10px] py-0 px-1.5">
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Lead: {item.lead} • Target: {item.due}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 sm:w-48 shrink-0">
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-medium text-muted-foreground w-9 text-right">
                            {item.progress}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Deliverables & Tasks */}
            {activeTab === "tasks" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    name: "Automated Incident Escalation Pipeline",
                    assignee: "Jamik Tashpulatov",
                    priority: "High",
                    progress: 74,
                    icon: ClockCircleIcon,
                  },
                  {
                    name: "Service Level Agreement Dashboard V2",
                    assignee: "Emma Davis",
                    priority: "Medium",
                    progress: 90,
                    icon: CheckCircleIcon,
                  },
                  {
                    name: "Technical Debt & Component Cleanup",
                    assignee: "Eddie Lake",
                    priority: "Low",
                    progress: 45,
                    icon: FolderKanbanIcon,
                  },
                  {
                    name: "Multi-tenant Workspace Switcher",
                    assignee: "Sarah Chen",
                    priority: "High",
                    progress: 88,
                    icon: StarsMinimalisticIcon,
                  },
                ].map((task, i) => {
                  const Icon = task.icon
                  return (
                    <Card key={i} className="bg-card/70 border-muted">
                      <CardContent className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-primary" />
                            <span className="text-xs font-semibold">{task.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {task.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Assignee: {task.assignee}</span>
                          <span className="font-mono">{task.progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* TAB CONTENT: Team Capacity & Workload */}
            {activeTab === "workload" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    name: "Eddie Lake",
                    role: "Staff Engineer",
                    openPRs: 5,
                    capacity: "85%",
                    status: "Optimal",
                  },
                  {
                    name: "Sarah Chen",
                    role: "Frontend Architect",
                    openPRs: 3,
                    capacity: "62%",
                    status: "Available",
                  },
                  {
                    name: "Jamik Tashpulatov",
                    role: "Backend Specialist",
                    openPRs: 7,
                    capacity: "94%",
                    status: "Busy",
                  },
                ].map((person, idx) => (
                  <Card key={idx} className="bg-card/70 border-muted">
                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold">{person.name}</div>
                          <div className="text-[11px] text-muted-foreground">{person.role}</div>
                        </div>
                        <Badge
                          variant={person.status === "Busy" ? "secondary" : "outline"}
                          className="text-[10px]"
                        >
                          {person.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-muted-foreground">Active PR Reviews</span>
                        <span className="font-semibold">{person.openPRs} PRs</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Capacity Usage</span>
                          <span className="font-mono">{person.capacity}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: person.capacity }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Bottom Status bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Telemetry updated 30s ago • Poppins font active</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[11px] text-primary gap-1"
                  onClick={snapToCollapse}
                >
                  <AltArrowDownIcon className="size-3" />
                  Dock tab to bottom
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
