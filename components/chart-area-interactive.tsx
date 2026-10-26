"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
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
import { cn } from "@/lib/utils"

import { EvilAreaChart } from "@/components/evilcharts/charts/recharts-area-chart"
import { type ChartConfig } from "@/components/evilcharts/ui/recharts-chart"

export const description = "Normalized Price Comparison with EvilCharts Brush"

export type GoldPricePoint = {
  [key: string]: unknown
  date: string
  day: number
  futures: number
  spot: number
  spread: number
  spreadBps: number
}

// Clean 30-day dataset matching EvilCharts' official demo structure
function generateMonthlyData(): GoldPricePoint[] {
  let seed = 777
  function rand() {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const items: GoldPricePoint[] = []
  for (let d = 1; d <= 30; d++) {
    const trend = (d / 30) * 1100
    const wave = Math.sin(d * 0.45) * 180 + Math.cos(d * 0.2) * 120
    const futures = Math.round(74800 + trend + wave + (rand() - 0.48) * 90)
    const spot = Math.round(futures - 420 - Math.sin(d * 0.3) * 80 + (rand() - 0.5) * 40)
    const spread = futures - spot
    const spreadBps = Number(((spread / spot) * 10000).toFixed(1))

    items.push({
      date: `June ${d}`,
      day: d,
      futures,
      spot,
      spread,
      spreadBps,
    })
  }
  return items
}

const chartData = generateMonthlyData()
const totalPoints = chartData.length

// EvilCharts signature color scheme (Emerald & Rose)
const chartConfig = {
  futures: {
    label: "MCX Futures",
    colors: {
      light: ["#047857"],
      dark: ["#10b981"],
    },
  },
  spot: {
    label: "Spot Bullion",
    colors: {
      light: ["#be123c"],
      dark: ["#f43f5e"],
    },
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ className }: { className?: string } = {}) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")
  const [startIndex, setStartIndex] = React.useState(0)
  const [endIndex, setEndIndex] = React.useState(totalPoints - 1)
  const [isDomainOptimized, setIsDomainOptimized] = React.useState(true)

  // Mobile default
  React.useEffect(() => {
    if (isMobile) {
      const id = requestAnimationFrame(() => {
        setTimeRange("14d")
        setStartIndex(Math.max(0, totalPoints - 14))
        setEndIndex(totalPoints - 1)
      })
      return () => cancelAnimationFrame(id)
    }
  }, [isMobile])

  // Handle Preset Clicks
  const handlePreset = React.useCallback((preset: string) => {
    setTimeRange(preset)
    if (preset === "30d") {
      setStartIndex(0)
      setEndIndex(totalPoints - 1)
    } else if (preset === "14d") {
      setStartIndex(Math.max(0, totalPoints - 14))
      setEndIndex(totalPoints - 1)
    } else if (preset === "7d") {
      setStartIndex(Math.max(0, totalPoints - 7))
      setEndIndex(totalPoints - 1)
    } else if (preset === "3d") {
      setStartIndex(Math.max(0, totalPoints - 3))
      setEndIndex(totalPoints - 1)
    }
  }, [])

  // Handle Brush change callback
  const handleBrushChange = React.useCallback((range: { startIndex: number; endIndex: number }) => {
    setStartIndex(range.startIndex)
    setEndIndex(range.endIndex)
    setTimeRange("custom")
  }, [])

  // Currently visible data slice
  const visibleData = React.useMemo(() => {
    return chartData.slice(startIndex, endIndex + 1)
  }, [startIndex, endIndex])

  const visibleDays = visibleData.length
  const isSmallWindow = visibleDays <= 12

  // Optimized Y-axis domain
  const { domainMin, domainMax } = React.useMemo(() => {
    if (!isDomainOptimized || visibleData.length === 0) {
      return { domainMin: 73500, domainMax: 77000 }
    }
    let min = Infinity
    let max = -Infinity
    for (const d of visibleData) {
      if (d.spot < min) min = d.spot
      if (d.futures < min) min = d.futures
      if (d.spot > max) max = d.spot
      if (d.futures > max) max = d.futures
    }
    const range = max - min
    const padding = Math.max(100, Math.round(range * 0.12))
    const rawMin = Math.max(0, min - padding)
    const rawMax = max + padding

    const roundStep = range < 600 ? 50 : 100
    const domainMin = Math.floor(rawMin / roundStep) * roundStep
    const domainMax = Math.ceil(rawMax / roundStep) * roundStep

    return { domainMin, domainMax }
  }, [isDomainOptimized, visibleData])

  const formatXAxisTick = React.useCallback(
    (value: string) => {
      if (isSmallWindow) {
        return value // e.g. "June 5"
      }
      return value.split(" ")[1] // e.g. "5", "10", "15" (EvilCharts style)
    },
    [isSmallWindow]
  )

  const formatYAxisTick = React.useCallback(
    (value: number) => {
      if (domainMax - domainMin <= 1500) {
        return `₹${(value / 1000).toFixed(1)}k`
      }
      return `₹${(value / 1000).toFixed(0)}k`
    },
    [domainMin, domainMax]
  )

  const startDateStr = chartData[startIndex]?.date ?? ""
  const endDateStr = chartData[endIndex]?.date ?? ""

  return (
    <Card className={cn("@container/card flex flex-col h-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle>Normalized Price Comparison</CardTitle>
          {isSmallWindow ? (
            <Badge
              variant="outline"
              className="text-[10px] font-medium gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/10 py-0.5 px-2"
            >
              <Sparkles className="size-3" />
              Fine Data Active ({visibleDays}d)
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] font-medium text-muted-foreground border-border py-0.5 px-2"
            >
              Overview ({visibleDays}d)
            </Badge>
          )}
        </div>
        <CardDescription>
          Purity-adjusted price 10g fine gold • MCX Futures vs Spot Bullion
        </CardDescription>

        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              if (value[0]) handlePreset(value[0])
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-2.5! @[767px]/card:flex"
          >
            <ToggleGroupItem value="30d">30D</ToggleGroupItem>
            <ToggleGroupItem value="14d">14D</ToggleGroupItem>
            <ToggleGroupItem value="7d">7D (Fine)</ToggleGroupItem>
            <ToggleGroupItem value="3d">3D</ToggleGroupItem>
          </ToggleGroup>

          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value) handlePreset(value)
            }}
          >
            <SelectTrigger
              className="flex w-36 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select time range"
            >
              <SelectValue placeholder="30 Days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="30d" className="rounded-lg">
                30 Days
              </SelectItem>
              <SelectItem value="14d" className="rounded-lg">
                14 Days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 Days (Fine)
              </SelectItem>
              <SelectItem value="3d" className="rounded-lg">
                3 Days (Ultra-Fine)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-1 sm:px-6 pb-3 flex-1 flex flex-col justify-between min-h-0">
        {/* EvilAreaChart with EvilBrush — NO DOTS, pure EvilCharts style */}
        <div className="flex-1 min-h-[240px] w-full flex flex-col justify-between">
          <EvilAreaChart
            data={chartData}
            config={chartConfig}
            className="w-full h-full flex flex-col justify-between"
            curveType="monotone"
            xDataKey="date"
          >
            <EvilAreaChart.Grid strokeDasharray="3 3" />
            <EvilAreaChart.XAxis
              dataKey="date"
              tickFormatter={formatXAxisTick}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={10}
            />
            <EvilAreaChart.YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              domain={[domainMin, domainMax]}
              tickFormatter={formatYAxisTick}
              width={48}
              fontSize={10}
            />
            <EvilAreaChart.Brush
              height={52}
              formatLabel={(value) => String(value)}
              startIndex={startIndex}
              endIndex={endIndex}
              onChange={handleBrushChange}
            />
            <EvilAreaChart.Legend isClickable />
            <EvilAreaChart.Tooltip
              variant="frosted-glass"
              roundness="md"
              labelFormatter={(labelValue) => String(labelValue)}
              formatter={(value, name) => (
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span>{name}:</span>
                  <span className="font-semibold text-foreground">
                    ₹{Number(value).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            />
            {/* Pure area gradient curves with NO DOTS */}
            <EvilAreaChart.Area
              dataKey="futures"
              variant="gradient"
              strokeVariant="solid"
              isClickable
            />
            <EvilAreaChart.Area
              dataKey="spot"
              variant="gradient"
              strokeVariant="dashed"
              isClickable
            />
          </EvilAreaChart>
        </div>

        {/* Domain Optimizer Status & Auto Y Control Bar */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/50 px-1 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10.5px]">
              {startDateStr} – {endDateStr}
            </span>
            <span className="hidden sm:inline font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground/80">
              ₹{(domainMin / 1000).toFixed(1)}k – ₹{(domainMax / 1000).toFixed(1)}k
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden md:inline text-[10px] text-muted-foreground">
              Narrow brush for fine data
            </span>
            <button
              type="button"
              onClick={() => setIsDomainOptimized(!isDomainOptimized)}
              title={isDomainOptimized ? "Disable Auto-Domain" : "Enable Auto-Domain Optimization"}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium transition-colors border cursor-pointer",
                isDomainOptimized
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
            >
              Auto Y: {isDomainOptimized ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
