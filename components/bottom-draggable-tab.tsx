"use client"

import * as React from "react"
import {
  Calculator,
  Coins,
  Scale,
  TrendingUp,
  Percent,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"
import {
  AltArrowUpIcon,
  AltArrowDownIcon,
  CloseIcon,
} from "@solar-icons/react/outline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const COLLAPSED_HEIGHT = 56 // height of the bottom tab header in px

// Standard MCX contracts benchmark data
const CONTRACT_SPECS = {
  GOLDDM: {
    name: "GOLDDM (100g)",
    unitGrams: 100,
    basePrice: 752400,
    purity: 0.995,
    purityLabel: "995 Purity",
    marginPercent: 12.5,
    tickSize: 1,
    tickValue: 100,
    type: "Delivery Benchmark",
  },
  GOLDTEN: {
    name: "GOLDTEN (10g)",
    unitGrams: 10,
    basePrice: 78450,
    purity: 0.999,
    purityLabel: "999 Purity",
    marginPercent: 10.0,
    tickSize: 1,
    tickValue: 10,
    type: "Spot Delivery",
  },
  GOLDGUINEA: {
    name: "GOLDGUINEA (8g)",
    unitGrams: 8,
    basePrice: 62760,
    purity: 0.999,
    purityLabel: "999 Purity",
    marginPercent: 10.0,
    tickSize: 1,
    tickValue: 8,
    type: "Sovereign Coin",
  },
  GOLDPETAL: {
    name: "GOLDPETAL (1g)",
    unitGrams: 1,
    basePrice: 7845,
    purity: 0.999,
    purityLabel: "999 Purity",
    marginPercent: 10.0,
    tickSize: 1,
    tickValue: 1,
    type: "Micro Accumulation",
  },
  GOLD1KG: {
    name: "GOLD (1 kg)",
    unitGrams: 1000,
    basePrice: 7842000,
    purity: 0.995,
    purityLabel: "995 Purity",
    marginPercent: 12.5,
    tickSize: 1,
    tickValue: 1000,
    type: "Institutional Standard",
  },
} as const

type ContractKey = keyof typeof CONTRACT_SPECS

const PURITY_PRESETS = [
  { label: "24K (999 Fine)", value: 0.999, karat: 24 },
  { label: "24K (995 MCX)", value: 0.995, karat: 24 },
  { label: "22K (916 Hallmark)", value: 0.916, karat: 22 },
  { label: "18K (750 Jewelry)", value: 0.75, karat: 18 },
  { label: "14K (585 Commercial)", value: 0.585, karat: 14 },
]

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value)
}

export function BottomDraggableTab() {
  const [height, setHeight] = React.useState<number>(COLLAPSED_HEIGHT)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const [activeTab, setActiveTab] = React.useState<"purity" | "margin" | "arbitrage">("purity")

  // --- Calculator 1: Purity & Value States ---
  const [calcWeight, setCalcWeight] = React.useState<number>(10)
  const [calcPurity, setCalcPurity] = React.useState<number>(0.999)
  const [ratePer10g24k, setRatePer10g24k] = React.useState<number>(78450)
  const [includeGst, setIncludeGst] = React.useState<boolean>(true)
  const [makingChargePct, setMakingChargePct] = React.useState<number>(0)

  // --- Calculator 2: Contract Margin States ---
  const [selectedContract, setSelectedContract] = React.useState<ContractKey>("GOLDDM")
  const [numLots, setNumLots] = React.useState<number>(1)

  // --- Calculator 3: Import Parity States ---
  const [intlPriceOz, setIntlPriceOz] = React.useState<number>(2735.0)
  const [usdinrRate, setUsdinrRate] = React.useState<number>(84.15)
  const [importDutyPct, setImportDutyPct] = React.useState<number>(6.0)
  const [aidcPct, setAidcPct] = React.useState<number>(5.35)

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
  const isHalfView =
    Math.abs(height - (typeof window !== "undefined" ? window.innerHeight * 0.5 : 450)) < 40

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
    if (target.closest("button") || target.closest("a") || target.closest("input")) {
      return
    }
    setIsDragging(true)
    dragStartRef.current = {
      startY: e.clientY,
      startHeight: height,
      hasMoved: false,
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const deltaY = dragStartRef.current.startY - e.clientY
    if (Math.abs(deltaY) > 4) {
      dragStartRef.current.hasMoved = true
    }
    const minHeight = COLLAPSED_HEIGHT
    const maxHeight = getMaxHeight()
    const newHeight = Math.max(minHeight, Math.min(maxHeight, dragStartRef.current.startHeight + deltaY))
    setHeight(newHeight)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    if (!dragStartRef.current.hasMoved) {
      toggleExpand()
      return
    }
    const halfHeight = getHalfHeight()
    const maxHeight = getMaxHeight()
    const currentHeight = height
    if (currentHeight < (halfHeight + COLLAPSED_HEIGHT) / 2) {
      snapToCollapse()
    } else if (currentHeight < (halfHeight + maxHeight) / 2) {
      snapToHalf()
    } else {
      snapTo(maxHeight)
    }
  }

  const { state: sidebarState, isMobile } = useSidebar()
  const isSidebarExpanded = sidebarState === "expanded" && !isMobile
  const leftOffset = isMobile
    ? "0px"
    : isSidebarExpanded
      ? "calc(var(--sidebar-width) + 0.5rem)"
      : "calc(var(--sidebar-width-icon, 3rem) + 0.5rem)"

  // --- Calculations for Tab 1: Purity & Value ---
  const pureGrams = calcWeight * calcPurity
  const baseRatePerGram = ratePer10g24k / 10
  const baseValue = baseRatePerGram * calcWeight * (calcPurity / 0.999)
  const makingCharges = baseValue * (makingChargePct / 100)
  const taxableValue = baseValue + makingCharges
  const gstAmount = includeGst ? taxableValue * 0.03 : 0
  const totalValue = taxableValue + gstAmount
  const effectiveRatePerGram = calcWeight > 0 ? totalValue / calcWeight : 0

  // --- Calculations for Tab 2: Contract Margin ---
  const activeSpec = CONTRACT_SPECS[selectedContract]
  const totalContractGrams = activeSpec.unitGrams * numLots
  const totalExposure = activeSpec.basePrice * numLots
  const requiredMargin = totalExposure * (activeSpec.marginPercent / 100)
  const totalTickValue = activeSpec.tickValue * numLots

  // --- Calculations for Tab 3: Import Parity ---
  const totalCustomsPct = importDutyPct + aidcPct
  const landedPerGram = (intlPriceOz / 31.1034768) * usdinrRate * (1 + totalCustomsPct / 100)
  const landedPer10g = landedPerGram * 10
  const domesticSpot = ratePer10g24k
  const arbitrageSpread = domesticSpot - landedPer10g
  const spreadPercent = landedPer10g > 0 ? (arbitrageSpread / landedPer10g) * 100 : 0

  return (
    <div
      style={{
        height: `${height}px`,
        left: leftOffset,
        right: isMobile ? 0 : "0.5rem",
        bottom: 0,
        marginBottom: 0,
        boxShadow: "none",
        WebkitBoxShadow: "none",
        transition: isDragging
          ? "left 200ms ease-linear"
          : "height 340ms cubic-bezier(0.32, 0.72, 0, 1), left 200ms ease-linear",
        willChange: isDragging ? "height" : "auto",
      }}
      className={cn(
        "fixed bottom-0 z-30 flex flex-col m-0 mb-0 p-0",
        "border-t border-border dark:border-white/10 bg-background dark:bg-[#0A0A0A] shadow-none",
        "rounded-t-2xl overflow-hidden",
        "animate-in fade-in-0 slide-in-from-bottom-6 duration-400 ease-out fill-mode-both"
      )}
    >
      {/* Top Draggable Tab Bar / Grab Header: Styled with #171717 theme */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label="Draggable Gold Calculation Tool tab"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggleExpand()
          }
        }}
        className={cn(
          "group/tab flex h-14 shrink-0 cursor-grab select-none flex-col justify-between px-3 sm:px-6 pt-1.5 pb-2 transition-colors",
          "bg-muted/80 dark:bg-[#171717] border-b border-border dark:border-white/10",
          "hover:bg-muted dark:hover:bg-[#1c1c1c] active:cursor-grabbing",
          isDragging ? "bg-muted dark:bg-[#1c1c1c] cursor-grabbing" : ""
        )}
      >
        {/* Centered Pill Drag Handle Indicator */}
        <div className="mx-auto flex items-center justify-center pt-0.5">
          <div className="flex h-1.5 w-14 items-center justify-center rounded-full bg-muted-foreground/30 dark:bg-white/20 transition-all group-hover/tab:bg-primary/70 group-hover/tab:w-16" />
        </div>

        {/* Tab Header Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Title without badge */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/20">
              <Calculator className="size-4" />
            </div>
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                Gold Calculator & Margin Suite
              </span>
            </div>
          </div>

          {/* Right: Quick Snap & Toggle Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border dark:border-white/10 bg-background dark:bg-[#0A0A0A] px-1.5 font-mono text-[10px] text-muted-foreground select-none">
              Ctrl+O
            </kbd>

            {/* Quick Snap to 50% Half View */}
            <Button
              variant={isHalfView ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1 font-medium dark:hover:bg-white/10"
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
                className={cn("size-3.5 transition-transform", isHalfView ? "rotate-180" : "")}
              />
              <span className="hidden xs:inline">50% View</span>
            </Button>

            {/* Main Expand/Collapse Chevron Button */}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 dark:hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand()
              }}
              title={isExpanded ? "Collapse tab (Ctrl+O)" : "Expand calculator (Ctrl+O)"}
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
                className="size-7 text-muted-foreground hover:text-foreground dark:hover:bg-white/10"
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

      {/* Expanded Calculation Content Area: Styled with #0A0A0A theme & smooth drawer entrance animation */}
      {isExpanded && (
        <div className="flex flex-1 flex-col overflow-y-auto px-4 lg:px-6 py-4 space-y-4 bg-background dark:bg-[#0A0A0A] animate-in fade-in-0 slide-in-from-bottom-5 duration-300 ease-out fill-mode-both">
          {/* Top Sub-tabs Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border dark:border-white/10 pb-3">
            <div className="flex items-center gap-1 rounded-lg bg-muted/60 dark:bg-[#171717] p-1 border border-border dark:border-white/10">
              <Button
                variant={activeTab === "purity" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs px-3 font-medium",
                  activeTab === "purity"
                    ? "dark:bg-[#0A0A0A] dark:text-foreground dark:shadow-xs"
                    : "text-muted-foreground"
                )}
                onClick={() => setActiveTab("purity")}
              >
                <Scale className="size-3.5 mr-1.5 text-amber-500" />
                Purity & Weight
              </Button>

              <Button
                variant={activeTab === "margin" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs px-3 font-medium",
                  activeTab === "margin"
                    ? "dark:bg-[#0A0A0A] dark:text-foreground dark:shadow-xs"
                    : "text-muted-foreground"
                )}
                onClick={() => setActiveTab("margin")}
              >
                <Percent className="size-3.5 mr-1.5 text-emerald-500" />
                Contract Margin
              </Button>

              <Button
                variant={activeTab === "arbitrage" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs px-3 font-medium",
                  activeTab === "arbitrage"
                    ? "dark:bg-[#0A0A0A] dark:text-foreground dark:shadow-xs"
                    : "text-muted-foreground"
                )}
                onClick={() => setActiveTab("arbitrage")}
              >
                <TrendingUp className="size-3.5 mr-1.5 text-blue-500" />
                Import Parity
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="border-border dark:border-white/10 font-mono text-[11px] gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" />
                Live MCX Benchmark
              </Badge>
            </div>
          </div>

          {/* TAB 1: Purity & Weight Value Calculator */}
          {activeTab === "purity" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Inputs Form */}
              <div className="lg:col-span-6 space-y-4 rounded-xl border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Scale className="size-4 text-amber-500" />
                    Weight & Karat Inputs
                  </h4>
                  <span className="text-xs text-muted-foreground">Instant Value</span>
                </div>

                {/* Weight Input + Quick Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gold-weight" className="text-xs font-medium">
                      Gold Weight (Grams)
                    </Label>
                    <div className="flex gap-1">
                      {[1, 8, 10, 100, 1000].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setCalcWeight(w)}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors border",
                            calcWeight === w
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/10 text-muted-foreground"
                          )}
                        >
                          {w >= 1000 ? "1kg" : `${w}g`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    id="gold-weight"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="font-mono text-sm bg-background dark:bg-[#0A0A0A] border-border dark:border-white/10"
                  />
                </div>

                {/* Karat / Purity Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Purity / Karat</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {PURITY_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setCalcPurity(p.value)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all",
                          calcPurity === p.value
                            ? "bg-amber-500/15 border-amber-500/50 text-amber-500 dark:text-amber-400 font-semibold"
                            : "border-border dark:border-white/10 bg-background dark:bg-[#0A0A0A] text-muted-foreground hover:bg-muted dark:hover:bg-white/5"
                        )}
                      >
                        <div>{p.label}</div>
                        <div className="text-[10px] opacity-75 font-mono">{(p.value * 100).toFixed(1)}% Gold</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 24K Benchmark Rate Input */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="base-rate" className="text-xs font-medium">
                      24K Rate (₹ / 10g)
                    </Label>
                    <Input
                      id="base-rate"
                      type="number"
                      step="10"
                      value={ratePer10g24k}
                      onChange={(e) => setRatePer10g24k(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="font-mono text-xs bg-background dark:bg-[#0A0A0A] border-border dark:border-white/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="making-charge" className="text-xs font-medium">
                      Making Charge (%)
                    </Label>
                    <Input
                      id="making-charge"
                      type="number"
                      min="0"
                      max="50"
                      value={makingChargePct}
                      onChange={(e) => setMakingChargePct(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="font-mono text-xs bg-background dark:bg-[#0A0A0A] border-border dark:border-white/10"
                    />
                  </div>
                </div>

                {/* GST Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-border dark:border-white/10">
                  <span className="text-xs text-muted-foreground">Apply 3% Jewelry GST</span>
                  <button
                    type="button"
                    onClick={() => setIncludeGst(!includeGst)}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors",
                      includeGst
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "border-border dark:border-white/10 bg-background dark:bg-[#0A0A0A] text-muted-foreground"
                    )}
                  >
                    {includeGst ? "3% GST Included" : "GST Excluded"}
                  </button>
                </div>
              </div>

              {/* Right Column: Output Summary Cards */}
              <div className="lg:col-span-6 space-y-4">
                {/* Hero Total Card */}
                <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total Estimated Valuation</span>
                    <Badge variant="outline" className="font-mono border-amber-500/30 text-amber-500 bg-amber-500/10">
                      {calcWeight}g @ {(calcPurity * 100).toFixed(1)}% Purity
                    </Badge>
                  </div>

                  <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground tabular-nums">
                    {formatINR(totalValue)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border dark:border-white/10 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Pure Fine Gold Weight</span>
                      <span className="font-mono font-semibold text-foreground text-sm">
                        {pureGrams.toFixed(3)} grams
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[11px]">Effective Rate / Gram</span>
                      <span className="font-mono font-semibold text-foreground text-sm">
                        {formatINR(effectiveRatePerGram)}/g
                      </span>
                    </div>
                  </div>
                </div>

                {/* Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-lg border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-3">
                    <span className="text-[10px] text-muted-foreground block">Base Metal Value</span>
                    <span className="font-mono font-semibold text-foreground text-xs tabular-nums">
                      {formatINR(baseValue)}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-3">
                    <span className="text-[10px] text-muted-foreground block">Making Charges ({makingChargePct}%)</span>
                    <span className="font-mono font-semibold text-foreground text-xs tabular-nums">
                      {formatINR(makingCharges)}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-3">
                    <span className="text-[10px] text-muted-foreground block">GST (3%)</span>
                    <span className="font-mono font-semibold text-foreground text-xs tabular-nums">
                      {formatINR(gstAmount)}
                    </span>
                  </div>
                </div>

                {/* Benchmark Rates Quick Reference */}
                <div className="rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-[#171717]/60 p-3 text-xs flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span>24K Benchmark: <strong className="text-foreground font-mono">₹{(ratePer10g24k / 10).toFixed(0)}/g</strong></span>
                  </div>
                  <div>
                    <span>22K Jewelry: <strong className="text-foreground font-mono">₹{((ratePer10g24k / 10) * 0.916).toFixed(0)}/g</strong></span>
                  </div>
                  <div>
                    <span>18K Fashion: <strong className="text-foreground font-mono">₹{((ratePer10g24k / 10) * 0.75).toFixed(0)}/g</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MCX Contract Margin & Exposure Estimator */}
          {activeTab === "margin" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Contract Selection & Lots */}
              <div className="lg:col-span-6 space-y-4 rounded-xl border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Percent className="size-4 text-emerald-500" />
                    Select Contract Specification
                  </h4>
                  <Badge variant="outline" className="border-border dark:border-white/10 font-mono text-[10px]">
                    MCX Traded
                  </Badge>
                </div>

                {/* Contract Radio / Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(CONTRACT_SPECS) as ContractKey[]).map((key) => {
                    const c = CONTRACT_SPECS[key]
                    const isSelected = selectedContract === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedContract(key)}
                        className={cn(
                          "flex flex-col p-2.5 rounded-lg border text-left transition-all",
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "border-border dark:border-white/10 bg-background dark:bg-[#0A0A0A] text-muted-foreground hover:bg-muted dark:hover:bg-white/5"
                        )}
                      >
                        <div className="text-xs font-semibold text-foreground">{c.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground flex justify-between mt-0.5">
                          <span>{c.purityLabel}</span>
                          <span>{formatINR(c.basePrice)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Number of Lots Selector */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="num-lots" className="text-xs font-medium">
                      Number of Lots
                    </Label>
                    <div className="flex gap-1">
                      {[1, 2, 5, 10, 25].map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setNumLots(l)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-mono transition-colors border",
                            numLots === l
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/10 text-muted-foreground"
                          )}
                        >
                          {l} {l === 1 ? "Lot" : "Lots"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    id="num-lots"
                    type="number"
                    min="1"
                    max="1000"
                    value={numLots}
                    onChange={(e) => setNumLots(Math.max(1, parseInt(e.target.value) || 1))}
                    className="font-mono text-sm bg-background dark:bg-[#0A0A0A] border-border dark:border-white/10"
                  />
                </div>
              </div>

              {/* Margin & Exposure Breakdown */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Required Initial Margin ({activeSpec.marginPercent}%)</span>
                    <Badge variant="outline" className="font-mono text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                      {numLots} Lot(s) Exposure
                    </Badge>
                  </div>

                  <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground tabular-nums">
                    {formatINR(requiredMargin)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border dark:border-white/10 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Total Contract Notional</span>
                      <span className="font-mono font-semibold text-foreground text-sm">
                        {formatINR(totalExposure)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[11px]">Delivery Weight</span>
                      <span className="font-mono font-semibold text-foreground text-sm">
                        {formatNumber(totalContractGrams)}g ({totalContractGrams >= 1000 ? `${totalContractGrams / 1000}kg` : `${totalContractGrams}g`})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-lg border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-3">
                    <span className="text-[10px] text-muted-foreground block">Tick Value per Point</span>
                    <span className="font-mono font-semibold text-foreground text-xs tabular-nums">
                      {formatINR(totalTickValue)} / ₹1 move
                    </span>
                  </div>

                  <div className="rounded-lg border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-3">
                    <span className="text-[10px] text-muted-foreground block">Contract Purity</span>
                    <span className="font-mono font-semibold text-foreground text-xs">
                      {activeSpec.purityLabel}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-3">
                    <span className="text-[10px] text-muted-foreground block">Contract Type</span>
                    <span className="font-mono font-semibold text-foreground text-xs truncate block">
                      {activeSpec.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Import Parity & Arbitrage Spread */}
          {activeTab === "arbitrage" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Inputs Column */}
              <div className="lg:col-span-6 space-y-4 rounded-xl border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="size-4 text-blue-500" />
                    Global Import Parity Calculator
                  </h4>
                  <Badge variant="outline" className="border-border dark:border-white/10 font-mono text-[10px]">
                    Arbitrage Model
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="intl-price" className="text-xs font-medium">
                      Intl Gold ($/Troy Oz)
                    </Label>
                    <Input
                      id="intl-price"
                      type="number"
                      step="0.5"
                      value={intlPriceOz}
                      onChange={(e) => setIntlPriceOz(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="font-mono text-xs bg-background dark:bg-[#0A0A0A] border-border dark:border-white/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="usd-rate" className="text-xs font-medium">
                      USD/INR Exchange Rate
                    </Label>
                    <Input
                      id="usd-rate"
                      type="number"
                      step="0.05"
                      value={usdinrRate}
                      onChange={(e) => setUsdinrRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="font-mono text-xs bg-background dark:bg-[#0A0A0A] border-border dark:border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="customs-duty" className="text-xs font-medium">
                      Basic Customs Duty (%)
                    </Label>
                    <Input
                      id="customs-duty"
                      type="number"
                      step="0.25"
                      value={importDutyPct}
                      onChange={(e) => setImportDutyPct(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="font-mono text-xs bg-background dark:bg-[#0A0A0A] border-border dark:border-white/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="aidc-cess" className="text-xs font-medium">
                      AIDC Cess (%)
                    </Label>
                    <Input
                      id="aidc-cess"
                      type="number"
                      step="0.25"
                      value={aidcPct}
                      onChange={(e) => setAidcPct(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="font-mono text-xs bg-background dark:bg-[#0A0A0A] border-border dark:border-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="domestic-spot" className="text-xs font-medium">
                    Domestic MCX Spot Price (₹ / 10g)
                  </Label>
                  <Input
                    id="domestic-spot"
                    type="number"
                    step="10"
                    value={domesticSpot}
                    onChange={(e) => setRatePer10g24k(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="font-mono text-xs bg-background dark:bg-[#0A0A0A] border-border dark:border-white/10"
                  />
                </div>
              </div>

              {/* Arbitrage Analysis Result */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Landed Cost Parity (₹ / 10g)</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-xs font-semibold",
                        arbitrageSpread >= 0
                          ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                          : "border-rose-500/30 text-rose-500 bg-rose-500/10"
                      )}
                    >
                      {arbitrageSpread >= 0 ? "+" : ""}
                      {formatINR(arbitrageSpread)} ({spreadPercent >= 0 ? "+" : ""}
                      {spreadPercent.toFixed(2)}%)
                    </Badge>
                  </div>

                  <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground tabular-nums">
                    {formatINR(landedPer10g)}
                  </div>

                  <div className="pt-2 border-t border-border dark:border-white/10 text-xs flex items-center justify-between">
                    <span className="text-muted-foreground">Arbitrage Signal:</span>
                    <span
                      className={cn(
                        "font-semibold",
                        arbitrageSpread > 100
                          ? "text-emerald-500"
                          : arbitrageSpread < -100
                          ? "text-rose-500"
                          : "text-muted-foreground"
                      )}
                    >
                      {arbitrageSpread > 100
                        ? "Domestic Premium (Favorable for Importers)"
                        : arbitrageSpread < -100
                        ? "Domestic Discount (Favorable for Local Buyers)"
                        : "Parity Equilibrium"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-3">
                    <span className="text-[10px] text-muted-foreground block">Landed Cost per Gram</span>
                    <span className="font-mono font-semibold text-foreground text-xs tabular-nums">
                      {formatINR(landedPerGram)}/g
                    </span>
                  </div>

                  <div className="rounded-lg border border-border dark:border-white/10 bg-card dark:bg-[#171717] p-3">
                    <span className="text-[10px] text-muted-foreground block">Total Import Duties (BCD + AIDC)</span>
                    <span className="font-mono font-semibold text-foreground text-xs tabular-nums">
                      {totalCustomsPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
