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
  { month: "Feb", zScore: 0.6, bound: 2.0 },
  { month: "Apr", zScore: 1.2, bound: 2.0 },
  { month: "Jun", zScore: -0.4, bound: 2.0 },
  { month: "Aug", zScore: 0.9, bound: 2.0 },
  { month: "Oct", zScore: 1.8, bound: 2.0 },
  { month: "Dec", zScore: 1.3, bound: 2.0 },
]

const chartConfig = {
  zScore: {
    label: "Z-Score",
    color: "var(--primary)",
  },
  bound: {
    label: "2σ Bound",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartLineInteractive({ className }: { className?: string }) {
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
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[95px] w-full"
        >
          <AreaChart data={chartData} margin={{ top: 4, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id="fillBottomZ" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-zScore)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-zScore)"
                  stopOpacity={0.08}
                />
              </linearGradient>
              <linearGradient id="fillBottomBound" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-bound)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-bound)"
                  stopOpacity={0.02}
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
                        {value}σ
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Area
              dataKey="bound"
              type="natural"
              fill="url(#fillBottomBound)"
              stroke="var(--color-bound)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Area
              dataKey="zScore"
              type="natural"
              fill="url(#fillBottomZ)"
              stroke="var(--color-zScore)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
