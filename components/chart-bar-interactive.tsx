"use client"

import * as React from "react"
import { GraphNewUpIcon } from "@solar-icons/react/outline"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { EvilAreaChart } from "@/components/evilcharts/charts/recharts-area-chart"
import { type ChartConfig } from "@/components/evilcharts/ui/recharts-chart"

export const description = "Relative Spread & Z-Score EvilCharts Design"

export type SpreadZScorePoint = {
  [key: string]: unknown
  date: string
  day: number
  spread: number
  zScore: number
}

// Clean 30-day dataset matching EvilCharts timeline structure
function generateSpreadZScoreData(): SpreadZScorePoint[] {
  let seed = 333
  function rand() {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const items: SpreadZScorePoint[] = []
  for (let d = 1; d <= 30; d++) {
    const trend = (d / 30) * 16
    const wave = Math.sin(d * 0.5) * 5 + Math.cos(d * 0.25) * 3
    const spread = Number((18 + trend + wave + (rand() - 0.5) * 2).toFixed(1))
    const zScore = Number(((spread - 22) / 6.2).toFixed(2))

    items.push({
      date: `June ${d}`,
      day: d,
      spread,
      zScore,
    })
  }
  return items
}

const chartData = generateSpreadZScoreData()

// EvilCharts color palette for Relative Spread (Emerald) & Z-Score (Rose)
const chartConfig = {
  spread: {
    label: "Relative Spread (bps)",
    colors: {
      light: ["#047857"],
      dark: ["#10b981"],
    },
  },
  zScore: {
    label: "Z-Score (σ)",
    colors: {
      light: ["#be123c"],
      dark: ["#f43f5e"],
    },
  },
} satisfies ChartConfig

export function ChartBarInteractive({ className }: { className?: string } = {}) {
  return (
    <Card className={cn("@container/card flex flex-col justify-between h-full min-h-[170px] py-2", className)}>
      <CardHeader className="px-4 py-1 pb-0">
        <CardTitle className="text-sm font-semibold">Relative Spread & Z-Score</CardTitle>
        <CardDescription className="text-xs">
          Spread & z-score tracking
        </CardDescription>
        <CardAction>
          <Badge
            variant="outline"
            className="text-[11px] font-medium gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10 py-0.5 px-1.5"
          >
            <GraphNewUpIcon className="size-3" />
            +18.4 bps
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="px-3 pt-0 pb-1 flex-1 flex flex-col justify-end min-h-[105px]">
        <EvilAreaChart
          data={chartData}
          config={chartConfig}
          className="aspect-auto h-[95px] w-full"
          curveType="monotone"
          chartProps={{ margin: { top: 4, right: 6, left: 6, bottom: 0 } }}
        >
          <EvilAreaChart.Grid strokeDasharray="3 3" />
          <EvilAreaChart.XAxis
            dataKey="date"
            tickFormatter={(value) => value.split(" ")[1]}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            fontSize={10}
          />
          <EvilAreaChart.Tooltip
            variant="frosted-glass"
            roundness="md"
            labelFormatter={(labelValue) => String(labelValue)}
            formatter={(value, name) => (
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span>{name}:</span>
                <span className="font-semibold text-foreground">
                  {value} {String(name).includes("Spread") ? "bps" : "σ"}
                </span>
              </div>
            )}
          />
          {/* EvilCharts smooth area gradients — NO DOTS, NO TIMELINE CROPPER */}
          <EvilAreaChart.Area
            dataKey="spread"
            variant="gradient"
            strokeVariant="solid"
            isClickable
          />
          <EvilAreaChart.Area
            dataKey="zScore"
            variant="gradient"
            strokeVariant="dashed"
            isClickable
          />
        </EvilAreaChart>
      </CardContent>
    </Card>
  )
}
