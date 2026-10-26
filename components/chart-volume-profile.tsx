"use client"

import * as React from "react"
import { GraphNewUpIcon } from "@solar-icons/react/outline"
import { Sparkles } from "lucide-react"

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

export const description = "Open Interest & Volume Profile with EvilCharts Timeline Cropper"

export type VolumeOiPoint = {
  [key: string]: unknown
  date: string
  day: number
  oi: number
  volume: number
  ratio: number
}

// Clean 30-day dataset matching EvilCharts' timeline structure
function generateVolumeOiData(): VolumeOiPoint[] {
  let seed = 888
  function rand() {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const items: VolumeOiPoint[] = []
  for (let d = 1; d <= 30; d++) {
    const trend = (d / 30) * 6500
    const wave = Math.sin(d * 0.4) * 1200 + Math.cos(d * 0.25) * 800
    const oi = Math.round(21000 + trend + wave + (rand() - 0.48) * 400)
    const volume = Math.round(13000 + trend * 0.75 + wave * 0.85 + (rand() - 0.5) * 600)
    const ratio = Number((volume / oi).toFixed(2))

    items.push({
      date: `June ${d}`,
      day: d,
      oi,
      volume,
      ratio,
    })
  }
  return items
}

const chartData = generateVolumeOiData()
const totalPoints = chartData.length

// EvilCharts color palette for Open Interest (Sky/Cyan) & Volume (Violet/Purple)
const chartConfig = {
  oi: {
    label: "Open Interest",
    colors: {
      light: ["#0284c7"],
      dark: ["#38bdf8"],
    },
  },
  volume: {
    label: "Daily Volume",
    colors: {
      light: ["#7c3aed"],
      dark: ["#a855f7"],
    },
  },
} satisfies ChartConfig

export function ChartVolumeProfile({ className }: { className?: string } = {}) {
  const [timeRange, setTimeRange] = React.useState("30d")
  const [startIndex, setStartIndex] = React.useState(0)
  const [endIndex, setEndIndex] = React.useState(totalPoints - 1)
  const [isDomainOptimized, setIsDomainOptimized] = React.useState(true)

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

  // Handle Timeline Cropper / Brush changes
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
      return { domainMin: 10000, domainMax: 30000 }
    }
    let min = Infinity
    let max = -Infinity
    for (const d of visibleData) {
      if (d.volume < min) min = d.volume
      if (d.oi < min) min = d.oi
      if (d.volume > max) max = d.volume
      if (d.oi > max) max = d.oi
    }
    const range = max - min
    const padding = Math.max(500, Math.round(range * 0.12))
    const rawMin = Math.max(0, min - padding)
    const rawMax = max + padding

    const roundStep = range < 4000 ? 500 : 1000
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
      return `${(value / 1000).toFixed(0)}k`
    },
    []
  )

  const startDateStr = chartData[startIndex]?.date ?? ""
  const endDateStr = chartData[endIndex]?.date ?? ""

  return (
    <Card className={cn("@container/card flex flex-col justify-between h-full bg-card dark:bg-[#0A0A0A] overflow-hidden border border-border dark:border-white/10", className)}>
      <CardHeader className="p-4 sm:p-5 pb-2 dark:bg-[#0A0A0A]">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Open Interest & Volume</CardTitle>
              {isSmallWindow ? (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10 py-0.5 px-1.5"
                >
                  <Sparkles className="size-2.5" />
                  Fine Data ({visibleDays}d)
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[11px] font-medium gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10 py-0.5 px-1.5"
                >
                  <GraphNewUpIcon className="size-3" />
                  +12.8%
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Active positions & contract turnover
            </CardDescription>
          </div>

          <CardAction className="flex items-center gap-2">
            <ToggleGroup
              multiple={false}
              value={timeRange ? [timeRange] : []}
              onValueChange={(value) => {
                if (value[0]) handlePreset(value[0])
              }}
              variant="outline"
              className="hidden *:data-[slot=toggle-group-item]:px-2.5! *:data-[slot=toggle-group-item]:text-xs! @[600px]/card:flex"
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
                className="flex w-24 h-7 text-xs **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[600px]/card:hidden"
                size="sm"
                aria-label="Select range"
              >
                <SelectValue placeholder="30D" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="30d" className="rounded-lg text-xs">
                  30 Days
                </SelectItem>
                <SelectItem value="14d" className="rounded-lg text-xs">
                  14 Days
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg text-xs">
                  7 Days (Fine)
                </SelectItem>
                <SelectItem value="3d" className="rounded-lg text-xs">
                  3 Days (Ultra-Fine)
                </SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 pb-3 flex-1 flex flex-col justify-between min-h-0">
        {/* EvilAreaChart with EvilBrush Timeline Cropper — NO DOTS */}
        <div className="flex-1 min-h-[220px] w-full flex flex-col justify-between">
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
              tickMargin={6}
              fontSize={10}
            />
            <EvilAreaChart.YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              domain={[domainMin, domainMax]}
              tickFormatter={formatYAxisTick}
              width={38}
              fontSize={10}
            />
            <EvilAreaChart.Brush
              height={48}
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
                    {Number(value).toLocaleString("en-IN")} lots
                  </span>
                </div>
              )}
            />
            {/* Smooth curves with NO DOTS */}
            <EvilAreaChart.Area
              dataKey="oi"
              variant="gradient"
              strokeVariant="solid"
              isClickable
            />
            <EvilAreaChart.Area
              dataKey="volume"
              variant="gradient"
              strokeVariant="dashed"
              isClickable
            />
          </EvilAreaChart>
        </div>

        {/* Timeline Cropper Status & Auto Y Bar */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/50 px-1 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10.5px]">
              {startDateStr} – {endDateStr}
            </span>
            <span className="hidden sm:inline font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground/80">
              {(domainMin / 1000).toFixed(0)}k – {(domainMax / 1000).toFixed(0)}k lots
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden md:inline text-[10px] text-muted-foreground">
              Crop timeline for fine data
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
