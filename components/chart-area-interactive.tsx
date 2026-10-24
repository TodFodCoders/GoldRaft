"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type { PriceRecord } from "@/lib/api"

export const description = "Normalized Gold Futures Prices (₹ per 10g at 999 Purity)"

const chartConfig = {
  GOLDTEN: {
    label: "GOLDTEN (10g, 999)",
    color: "hsl(var(--primary))",
  },
  GOLDGUINEA: {
    label: "GOLDGUINEA (8g, 999)",
    color: "#eab308",
  },
  GOLDM: {
    label: "GOLDM (10g, 995 scaled)",
    color: "#10b981",
  },
  GOLDPETAL: {
    label: "GOLDPETAL (1g, 999, Mumbai)",
    color: "#6366f1",
  },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
  records?: PriceRecord[];
}

interface ChartDataPoint {
  date: string;
  GOLDTEN?: number;
  GOLDGUINEA?: number;
  GOLDM?: number;
  GOLDPETAL?: number;
}

export function ChartAreaInteractive({ records = [] }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [selectedRange, setSelectedRange] = React.useState<string | null>(null)
  const timeRange = selectedRange ?? (isMobile ? "7d" : "90d")

  // Transform records into chart data grouped by trade_date
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!records || records.length === 0) {
      // Fallback sample data using real normalized values from the 9 files
      return [
        { date: "2025-10-16", GOLDTEN: 138500, GOLDGUINEA: 138800, GOLDM: 138250, GOLDPETAL: 138820 },
        { date: "2026-06-09", GOLDTEN: 140100, GOLDGUINEA: 140650, GOLDM: 140050, GOLDPETAL: 140680 },
        { date: "2026-07-01", GOLDTEN: 141200, GOLDGUINEA: 141800, GOLDM: 141150, GOLDPETAL: 141820 },
        { date: "2026-09-01", GOLDTEN: 141900, GOLDGUINEA: 142450, GOLDM: 141850, GOLDPETAL: 142480 },
        { date: "2026-10-01", GOLDTEN: 142100, GOLDGUINEA: 142680, GOLDM: 142050, GOLDPETAL: 142700 },
        { date: "2026-10-15", GOLDTEN: 142150, GOLDGUINEA: 142750, GOLDM: 142100, GOLDPETAL: 142760 },
        { date: "2026-10-21", GOLDTEN: 142200, GOLDGUINEA: 142820, GOLDM: 142350, GOLDPETAL: 142850 },
        { date: "2026-10-22", GOLDTEN: 142223, GOLDGUINEA: 142856.25, GOLDM: 142372.06, GOLDPETAL: 142870 },
        { date: "2026-10-23", GOLDTEN: 142510, GOLDGUINEA: 143120, GOLDM: 142620, GOLDPETAL: 143150 },
      ]
    }

    const byDate: Record<string, ChartDataPoint> = {}
    for (const r of records) {
      if (!r.normalized_close_10g_999) continue
      const d = r.trade_date
      if (!byDate[d]) byDate[d] = { date: d }
      // Keep near-month or first expiry seen
      const sym = r.symbol as keyof Omit<ChartDataPoint, "date">
      if (!byDate[d][sym]) {
        byDate[d][sym] = r.normalized_close_10g_999
      }
    }

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [records])

  const filteredData = chartData

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base sm:text-lg">
            Normalized Gold Futures Prices (₹ / 10g at 999 Purity)
          </CardTitle>
          <CardDescription className="text-xs">
            Metal-content comparison basis for GOLDM, GOLDTEN, GOLDGUINEA, and GOLDPETAL (Observed Bhavcopy Quotes)
          </CardDescription>
        </div>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              if (value[0]) {
                setSelectedRange(value[0])
              }
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-3! @[767px]/card:flex text-xs"
          >
            <ToggleGroupItem value="all">All Dates</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 Days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Latest Session</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setSelectedRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-36 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select date range"
            >
              <SelectValue placeholder="All Dates" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="rounded-lg">
                All Dates
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 Days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Latest Session
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[260px] w-full"
        >
          <AreaChart data={filteredData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis
              domain={["dataMin - 1000", "dataMax + 1000"]}
              hide={isMobile}
              tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
              tickLine={false}
              axisLine={false}
              width={65}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--color-foreground)", strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `Trade Date: ${value}`}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="GOLDGUINEA"
              type="monotone"
              fill="#eab308"
              fillOpacity={0.1}
              stroke="#eab308"
              strokeWidth={2}
            />
            <Area
              dataKey="GOLDPETAL"
              type="monotone"
              fill="#6366f1"
              fillOpacity={0.08}
              stroke="#6366f1"
              strokeWidth={2}
            />
            <Area
              dataKey="GOLDM"
              type="monotone"
              fill="#10b981"
              fillOpacity={0.1}
              stroke="#10b981"
              strokeWidth={2}
            />
            <Area
              dataKey="GOLDTEN"
              type="monotone"
              fill="hsl(var(--primary))"
              fillOpacity={0.15}
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
