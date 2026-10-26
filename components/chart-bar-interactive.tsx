"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

const chartData = [
  { month: "Feb", spread: 18.2, zScore: 0.4 },
  { month: "Apr", spread: 24.5, zScore: 1.1 },
  { month: "Jun", spread: 31.0, zScore: 1.8 },
  { month: "Aug", spread: 22.4, zScore: 0.7 },
  { month: "Oct", spread: 28.6, zScore: 1.4 },
  { month: "Dec", spread: 35.2, zScore: 2.1 },
]

const chartConfig = {
  spread: {
    label: "Relative Spread (bps)",
    color: "var(--primary)",
  },
  zScore: {
    label: "Z-Score",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartBarInteractive({ className }: { className?: string }) {
  return (
    <Card className={cn("@container/card flex flex-col justify-between h-full py-2", className)}>
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
      <CardContent className="px-3 pt-0 pb-1 flex-1 flex flex-col justify-end min-h-0">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[95px] w-full"
        >
          <AreaChart data={chartData} margin={{ top: 4, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id="fillTopSpread" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-spread)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-spread)"
                  stopOpacity={0.08}
                />
              </linearGradient>
              <linearGradient id="fillTopZ" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-zScore)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-zScore)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              fontSize={10}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => (
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span>{name}:</span>
                      <span className="font-semibold text-foreground">
                        {value} {name === "Relative Spread (bps)" ? "bps" : "σ"}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Area
              dataKey="zScore"
              type="natural"
              fill="url(#fillTopZ)"
              stroke="var(--color-zScore)"
              strokeWidth={1.5}
            />
            <Area
              dataKey="spread"
              type="natural"
              fill="url(#fillTopSpread)"
              stroke="var(--color-spread)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
