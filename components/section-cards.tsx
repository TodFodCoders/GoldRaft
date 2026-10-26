"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GraphNewUpIcon, GraphDownNewIcon } from "@solar-icons/react/outline"

interface MiniSparklineProps {
  id: string
  growthText: string
  lossText: string
  pathD: string
  areaD: string
  endPoint: { x: number; y: number }
  isNetPositive?: boolean
}

/**
 * Reusable mini sparkline graph showing both growth (green) and loss (red) periods
 * positioned at the bottom right side of each card.
 */
function MiniSparkline({
  id,
  growthText,
  lossText,
  pathD,
  areaD,
  endPoint,
  isNetPositive = true,
}: MiniSparklineProps) {
  const fillGradId = `sparkline-fill-${id}`
  const strokeGradId = `sparkline-stroke-${id}`

  return (
    <div
      className="flex flex-col items-end gap-0.5 shrink-0 select-none"
      aria-label={`${id} growth and loss sparkline`}
    >
      <svg
        className="w-20 h-8 sm:w-24 sm:h-9 overflow-visible"
        viewBox="0 0 100 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Dual-tone vertical gradient: emerald for growth (top), rose for loss (bottom) */}
          <linearGradient
            id={fillGradId}
            x1="0"
            y1="0"
            x2="0"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
            <stop offset="48%" stopColor="#10b981" stopOpacity="0.05" />
            <stop offset="52%" stopColor="#f43f5e" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
          </linearGradient>

          {/* Stroke horizontal gradient reflecting market movement */}
          <linearGradient
            id={strokeGradId}
            x1="0"
            y1="0"
            x2="100"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            {isNetPositive ? (
              <>
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="35%" stopColor="#f43f5e" />
                <stop offset="65%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#10b981" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="35%" stopColor="#f43f5e" />
                <stop offset="70%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#f43f5e" />
              </>
            )}
          </linearGradient>
        </defs>

        {/* Break-even zero baseline */}
        <line
          x1="0"
          y1="19"
          x2="100"
          y2="19"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeDasharray="2 2"
          strokeWidth="1"
        />

        {/* Gradient Area Fill */}
        <path d={areaD} fill={`url(#${fillGradId})`} />

        {/* Trend line depicting growth & loss */}
        <path
          d={pathD}
          fill="none"
          stroke={`url(#${strokeGradId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Peak/closing indicator dot */}
        <circle
          cx={endPoint.x}
          cy={endPoint.y}
          r="2.5"
          className={cn(
            "animate-pulse",
            isNetPositive ? "fill-emerald-500" : "fill-rose-500"
          )}
        />
      </svg>

      {/* Numerical growth & loss tags */}
      <div className="flex items-center gap-1 font-mono text-[9px] leading-none">
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {growthText}
        </span>
        <span className="text-muted-foreground/40">/</span>
        <span className="font-semibold text-rose-600 dark:text-rose-400">
          {lossText}
        </span>
      </div>
    </div>
  )
}

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-[#0A0A0A] dark:*:data-[slot=card]:border-white/10">
      {/* 1. GOLDDM (100g, 995 purity) */}
      <Card className="@container/card flex flex-col justify-between h-full bg-card dark:bg-[#0A0A0A] border border-border dark:border-white/10">
        <CardHeader>
          <CardDescription>GOLDDM (100g)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ₹7,52,400.00
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <GraphNewUpIcon className="size-3.5" />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex items-end justify-between gap-2 text-sm pt-0 mt-auto">
          <div className="flex flex-col items-start gap-1 min-w-0">
            <div className="line-clamp-1 flex gap-2 font-medium">
              995 Purity • 100g{" "}
              <GraphNewUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground text-xs truncate">
              MCX Benchmark Delivery Price
            </div>
          </div>
          <MiniSparkline
            id="dm"
            growthText="+12.5%"
            lossText="-4.2%"
            pathD="M 0 18 C 15 10, 25 28, 38 27 C 50 26, 60 12, 75 14 C 88 16, 92 4, 100 3"
            areaD="M 0 19 L 0 18 C 15 10, 25 28, 38 27 C 50 26, 60 12, 75 14 C 88 16, 92 4, 100 3 L 100 19 Z"
            endPoint={{ x: 100, y: 3 }}
            isNetPositive={true}
          />
        </CardFooter>
      </Card>

      {/* 2. GOLDTEN (10g, 999 purity) */}
      <Card className="@container/card flex flex-col justify-between h-full bg-card dark:bg-[#0A0A0A] border border-border dark:border-white/10">
        <CardHeader>
          <CardDescription>GOLDTEN (10g)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ₹75,890.00
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <GraphDownNewIcon className="size-3.5" />
              -20.0%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex items-end justify-between gap-2 text-sm pt-0 mt-auto">
          <div className="flex flex-col items-start gap-1 min-w-0">
            <div className="line-clamp-1 flex gap-2 font-medium">
              999 Purity • 10g{" "}
              <GraphDownNewIcon className="size-4" />
            </div>
            <div className="text-muted-foreground text-xs truncate">
              Spot Delivery Price
            </div>
          </div>
          <MiniSparkline
            id="ten"
            growthText="+3.5%"
            lossText="-20.0%"
            pathD="M 0 6 C 15 4, 25 14, 38 12 C 50 10, 60 26, 75 24 C 88 22, 94 34, 100 32"
            areaD="M 0 19 L 0 6 C 15 4, 25 14, 38 12 C 50 10, 60 26, 75 24 C 88 22, 94 34, 100 32 L 100 19 Z"
            endPoint={{ x: 100, y: 32 }}
            isNetPositive={false}
          />
        </CardFooter>
      </Card>

      {/* 3. GOLDGUINEA (8g, 999 purity) */}
      <Card className="@container/card flex flex-col justify-between h-full bg-card dark:bg-[#0A0A0A] border border-border dark:border-white/10">
        <CardHeader>
          <CardDescription>GOLDGUINEA (8g)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ₹60,712.00
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <GraphNewUpIcon className="size-3.5" />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex items-end justify-between gap-2 text-sm pt-0 mt-auto">
          <div className="flex flex-col items-start gap-1 min-w-0">
            <div className="line-clamp-1 flex gap-2 font-medium">
              999 Purity • 8g{" "}
              <GraphNewUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground text-xs truncate">
              Sovereign Bullion Rate
            </div>
          </div>
          <MiniSparkline
            id="guinea"
            growthText="+12.5%"
            lossText="-3.8%"
            pathD="M 0 22 C 12 28, 25 26, 38 18 C 50 10, 62 22, 75 15 C 88 8, 92 6, 100 5"
            areaD="M 0 19 L 0 22 C 12 28, 25 26, 38 18 C 50 10, 62 22, 75 15 C 88 8, 92 6, 100 5 L 100 19 Z"
            endPoint={{ x: 100, y: 5 }}
            isNetPositive={true}
          />
        </CardFooter>
      </Card>

      {/* 4. GOLDPETAL (1g, 999 purity) */}
      <Card className="@container/card flex flex-col justify-between h-full bg-card dark:bg-[#0A0A0A] border border-border dark:border-white/10">
        <CardHeader>
          <CardDescription>GOLDPETAL (1g)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ₹7,590.00
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <GraphNewUpIcon className="size-3.5" />
              +4.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex items-end justify-between gap-2 text-sm pt-0 mt-auto">
          <div className="flex flex-col items-start gap-1 min-w-0">
            <div className="line-clamp-1 flex gap-2 font-medium">
              999 Purity • 1g{" "}
              <GraphNewUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground text-xs truncate">
              Micro-Lot Bullion Price
            </div>
          </div>
          <MiniSparkline
            id="petal"
            growthText="+4.5%"
            lossText="-1.8%"
            pathD="M 0 22 C 15 24, 25 18, 38 20 C 50 22, 65 15, 78 16 C 88 17, 94 11, 100 10"
            areaD="M 0 19 L 0 22 C 15 24, 25 18, 38 20 C 50 22, 65 15, 78 16 C 88 17, 94 11, 100 10 L 100 19 Z"
            endPoint={{ x: 100, y: 10 }}
            isNetPositive={true}
          />
        </CardFooter>
      </Card>
    </div>
  )
}
