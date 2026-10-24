"use client"

import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { PriceRecord } from "@/lib/api"

const CONTRACT_COLORS: Record<string, string> = {
  GOLDTEN: "#3b82f6", // Blue
  GOLDGUINEA: "#eab308", // Yellow / Gold
  GOLDM: "#10b981", // Emerald
  GOLDPETAL: "#a855f7", // Purple (Mumbai basis)
}

interface ChartAreaInteractiveProps {
  records?: PriceRecord[];
}

export function ChartAreaInteractive({ records = [] }: ChartAreaInteractiveProps) {
  const [viewMode, setViewMode] = React.useState<"curve_snapshot" | "same_contract_time">("curve_snapshot")

  // Extract all distinct trade dates sorted descending (latest first)
  const availableTradeDates = React.useMemo(() => {
    const dates = Array.from(new Set(records.map((r) => r.trade_date)))
    return dates.sort((a, b) => b.localeCompare(a))
  }, [records])

  // Extract all distinct expiry groups (e.g. "30OCT2026", "05NOV2026")
  const availableExpiries = React.useMemo(() => {
    const exps = Array.from(new Set(records.map((r) => r.raw_expiry || r.expiry_date)))
    return exps.sort()
  }, [records])

  const [userSelectedTradeDate, setUserSelectedTradeDate] = React.useState<string | null>(null)
  const [userSelectedExpiry, setUserSelectedExpiry] = React.useState<string | null>(null)

  const selectedTradeDate =
    userSelectedTradeDate && availableTradeDates.includes(userSelectedTradeDate)
      ? userSelectedTradeDate
      : availableTradeDates[0] || ""

  const selectedExpiry =
    userSelectedExpiry && availableExpiries.includes(userSelectedExpiry)
      ? userSelectedExpiry
      : availableExpiries.includes("30OCT2026")
        ? "30OCT2026"
        : availableExpiries[0] || ""

  // 1. DATA FOR VIEW A: Curve Snapshot across expiries on a chosen trade date
  const snapshotData = React.useMemo(() => {
    if (!selectedTradeDate || records.length === 0) return []
    const dayRecords = records.filter(
      (r) => r.trade_date === selectedTradeDate && r.normalized_close_10g_999 !== null
    )

    // Group by expiry
    const byExpiry: Record<string, { expiry: string; expiry_date: string; [symbol: string]: unknown }> = {}
    for (const r of dayRecords) {
      const expKey = r.raw_expiry || r.expiry_date
      if (!byExpiry[expKey]) {
        byExpiry[expKey] = { expiry: expKey, expiry_date: r.expiry_date }
      }
      byExpiry[expKey][r.symbol] = r.normalized_close_10g_999
    }

    return Object.values(byExpiry).sort((a, b) =>
      a.expiry_date.localeCompare(b.expiry_date)
    )
  }, [records, selectedTradeDate])

  // 2. DATA FOR VIEW B: Same Contract Over Time across actual trade dates
  const timeSeriesData = React.useMemo(() => {
    if (!selectedExpiry || records.length === 0) return []
    const expRecords = records.filter(
      (r) =>
        (r.raw_expiry === selectedExpiry || r.expiry_date === selectedExpiry) &&
        r.normalized_close_10g_999 !== null
    )

    const byDate: Record<string, { trade_date: string; [symbol: string]: unknown }> = {}
    for (const r of expRecords) {
      const d = r.trade_date
      if (!byDate[d]) {
        byDate[d] = { trade_date: d }
      }
      byDate[d][r.symbol] = r.normalized_close_10g_999
    }

    return Object.values(byDate).sort((a, b) =>
      a.trade_date.localeCompare(b.trade_date)
    )
  }, [records, selectedExpiry])

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Futures Curve Analytics</CardTitle>
          <CardDescription>No contract observations available in database.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const distinctTradingDaysCount = availableTradeDates.length

  return (
    <Card className="border shadow-none">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold">
              {viewMode === "curve_snapshot"
                ? `Curve Snapshot — Session ${selectedTradeDate || "Latest"}`
                : `Contract History — ${selectedExpiry || "Selected Expiry"}`}
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              ₹ per 10g at 999
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {viewMode === "curve_snapshot"
              ? "Discrete term structure across listed expiries; straight segments without curve smoothing."
              : "Isolated historical observations over true time axis; gaps visible across missing dates."}
          </CardDescription>
        </div>

        {/* View Switcher and Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border bg-muted/40 p-1">
            <Button
              variant={viewMode === "curve_snapshot" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode("curve_snapshot")}
            >
              Curve Snapshot
            </Button>
            <Button
              variant={viewMode === "same_contract_time" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode("same_contract_time")}
            >
              Same Contract Over Time
            </Button>
          </div>

          {/* Selector Dropdown */}
          {viewMode === "curve_snapshot" ? (
            <select
              aria-label="Select Trade Session"
              className="rounded border border-input bg-background px-2.5 py-1 text-xs font-mono"
              value={selectedTradeDate}
              onChange={(e) => setUserSelectedTradeDate(e.target.value)}
            >
              {availableTradeDates.map((d) => (
                <option key={d} value={d}>
                  Session: {d}
                </option>
              ))}
            </select>
          ) : (
            <select
              aria-label="Select Contract Expiry"
              className="rounded border border-input bg-background px-2.5 py-1 text-xs font-mono"
              value={selectedExpiry}
              onChange={(e) => setUserSelectedExpiry(e.target.value)}
            >
              {availableExpiries.map((exp) => (
                <option key={exp} value={exp}>
                  Expiry: {exp}
                </option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* VIEW A: Curve Snapshot */}
        {viewMode === "curve_snapshot" && (
          <div className="space-y-2">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={snapshotData}
                  margin={{ top: 15, right: 25, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="expiry"
                    tick={{ fontSize: 11 }}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(1)}k`}
                    width={65}
                  />
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [
                      typeof val === "number" ? `₹${val.toFixed(2)} / 10g` : String(val ?? "—"),
                      name === "GOLDPETAL" ? "GOLDPETAL (Mumbai basis)" : String(name ?? ""),
                    ]}
                    labelFormatter={(label) => `Contract Expiry: ${label}`}
                  />
                  <Line
                    type="linear"
                    dataKey="GOLDM"
                    name="GOLDM"
                    stroke={CONTRACT_COLORS.GOLDM}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="linear"
                    dataKey="GOLDTEN"
                    name="GOLDTEN"
                    stroke={CONTRACT_COLORS.GOLDTEN}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="linear"
                    dataKey="GOLDGUINEA"
                    name="GOLDGUINEA"
                    stroke={CONTRACT_COLORS.GOLDGUINEA}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="linear"
                    dataKey="GOLDPETAL"
                    name="GOLDPETAL"
                    stroke={CONTRACT_COLORS.GOLDPETAL}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 border-t">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono">
                  <span className="size-2 rounded-full bg-emerald-500 inline-block" /> GOLDM
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <span className="size-2 rounded-full bg-blue-500 inline-block" /> GOLDTEN
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <span className="size-2 rounded-full bg-yellow-500 inline-block" /> GOLDGUINEA
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <span className="size-2 rounded-full bg-purple-500 inline-block" /> GOLDPETAL (Mumbai)
                </span>
              </div>
              <span className="font-mono text-[11px]">
                Only {distinctTradingDaysCount} trading days loaded; not a continuous series.
              </span>
            </div>
          </div>
        )}

        {/* VIEW B: Same Contract Over Time */}
        {viewMode === "same_contract_time" && (
          <div className="space-y-2">
            {timeSeriesData.length < 3 && (
              <div className="rounded border bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
                Only {timeSeriesData.length} observations loaded for {selectedExpiry}. Insufficient points to establish a continuous trajectory.
              </div>
            )}
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timeSeriesData}
                  margin={{ top: 15, right: 25, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="trade_date"
                    tick={{ fontSize: 11 }}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(1)}k`}
                    width={65}
                  />
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [
                      typeof val === "number" ? `₹${val.toFixed(2)} / 10g` : String(val ?? "—"),
                      name === "GOLDPETAL" ? "GOLDPETAL (Mumbai basis)" : String(name ?? ""),
                    ]}
                    labelFormatter={(label) => `Session Date: ${label} (Expiry ${selectedExpiry})`}
                  />
                  <Line
                    type="linear"
                    dataKey="GOLDM"
                    name="GOLDM"
                    stroke={CONTRACT_COLORS.GOLDM}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="linear"
                    dataKey="GOLDTEN"
                    name="GOLDTEN"
                    stroke={CONTRACT_COLORS.GOLDTEN}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="linear"
                    dataKey="GOLDGUINEA"
                    name="GOLDGUINEA"
                    stroke={CONTRACT_COLORS.GOLDGUINEA}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="linear"
                    dataKey="GOLDPETAL"
                    name="GOLDPETAL"
                    stroke={CONTRACT_COLORS.GOLDPETAL}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 border-t">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono">
                  <span className="size-2 rounded-full bg-emerald-500 inline-block" /> GOLDM
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <span className="size-2 rounded-full bg-blue-500 inline-block" /> GOLDTEN
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <span className="size-2 rounded-full bg-yellow-500 inline-block" /> GOLDGUINEA
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <span className="size-2 rounded-full bg-purple-500 inline-block" /> GOLDPETAL (Mumbai)
                </span>
              </div>
              <span className="font-mono text-[11px]">
                Only {distinctTradingDaysCount} trading days loaded; not a continuous series.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
