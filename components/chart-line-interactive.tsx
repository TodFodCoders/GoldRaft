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

export const description = "Z-Score (30D) EvilCharts Design"

export type ZScorePoint = {
  [key: string]: unknown
  date: string
  day: number
  zScore: number
  bound: number
}

// Clean 30-day dataset matching EvilCharts timeline structure
function generateZScoreData(): ZScorePoint[] {
  let seed = 444
  function rand() {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const items: ZScorePoint[] = []
  for (let d = 1; d <= 30; d++) {
    const wave = Math.sin(d * 0.35) * 1.1 + Math.cos(d * 0.18) * 0.6
    const zScore = Number((wave + (rand() - 0.48) * 0.4).toFixed(2))

    items.push({
      date: `June ${d}`,
      day: d,
      zScore,
      bound: 2.0,
    })
  }
  return items
}

const chartData = generateZScoreData()

// EvilCharts color palette for Z-Score (Sky/Cyan) & 2σ Bound (Amber)
const chartConfig = {
  zScore: {
    label: "Z-Score (σ)",
    colors: {
      light: ["#0284c7"],
      dark: ["#38bdf8"],
    },
  },
  bound: {
    label: "2σ Bound",
    colors: {
      light: ["#f59e0b"],
      dark: ["#fbbf24"],
    },
  },
} satisfies ChartConfig

export function ChartLineInteractive({ className }: { className?: string } = {}) {
  return (
    <Card className={cn("@container/card flex flex-col justify-between h-full py-2", className)}>
      <CardHeader className="px-4 py-1 pb-0">
        <CardTitle className="text-sm font-semibold">Z-Score (30D)</CardTitle>
        <CardDescription className="text-xs">
          30-day standardized distribution
        </CardDescription>
        <CardAction>
          <Badge
            variant="outline"
            className="text-[11px] font-medium gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10 py-0.5 px-1.5"
          >
            <GraphNewUpIcon className="size-3" />
            +1.3σ
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="px-3 pt-0 pb-1 flex-1 flex flex-col justify-end min-h-0">
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
                  {value}σ
                </span>
              </div>
            )}
          />
          {/* EvilCharts smooth area gradients — NO DOTS, NO TIMELINE CROPPER */}
          <EvilAreaChart.Area
            dataKey="zScore"
            variant="gradient"
            strokeVariant="solid"
            isClickable
          />
          <EvilAreaChart.Area
            dataKey="bound"
            variant="gradient"
            strokeVariant="dashed"
            isClickable
          />
        </EvilAreaChart>
      </CardContent>
    </Card>
  )
}
