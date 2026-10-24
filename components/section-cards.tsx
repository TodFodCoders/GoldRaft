"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CheckCircleIcon,
  ShieldWarningIcon,
  GraphDownNewIcon,
} from "@solar-icons/react/outline"
import type { PairSpreadResult } from "@/lib/api"

export interface SectionCardsProps {
  benchmarkRecord?: {
    close: number | null;
    symbol: string;
    trade_date: string;
    raw_expiry: string;
  } | null;
  spreadPair?: PairSpreadResult | null;
  totalRecordsCount?: number;
  acceptedFilesCount?: number;
  quarantinedFilesCount?: number;
}

export function SectionCards({
  benchmarkRecord,
  spreadPair,
  totalRecordsCount,
  acceptedFilesCount,
  quarantinedFilesCount = 0,
}: SectionCardsProps) {
  const benchmarkClose = benchmarkRecord?.close ?? null
  const spreadValue = spreadPair?.spread_value_rs ?? null
  const spreadPct = spreadPair?.spread_percentage ?? null

  const formatPrice = (val: number | null) => {
    if (val === null || val === undefined) return "—"
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatSpread = (val: number | null) => {
    if (val === null || val === undefined) return "—"
    if (val < 0) {
      return `-₹${Math.abs(val).toFixed(2)}`
    }
    return `₹${val.toFixed(2)}`
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {/* Card 1: Benchmark Basis (GOLDTEN nearest expiry on latest session) */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Benchmark Basis (GOLDTEN)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPrice(benchmarkClose)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">999 Purity</span>
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-xs">
            {benchmarkRecord ? `${benchmarkRecord.raw_expiry}, session ${benchmarkRecord.trade_date}` : "Awaiting data"}
          </div>
          <div className="text-muted-foreground text-xs">
            Quote basis: ex-Ahmedabad • 10g trading unit
          </div>
        </CardFooter>
      </Card>

      {/* Card 2: Observed Spread (Server-side computed same-expiry gap) */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Spread (GOLDTEN - GOLDGUINEA)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatSpread(spreadValue)}
          </CardTitle>
          <CardAction>
            {spreadPct !== null ? (
              <Badge
                variant="outline"
                className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800"
              >
                <GraphDownNewIcon className="size-3.5" />
                {spreadPct.toFixed(2)}%
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                —
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-xs">
            {spreadPair ? `same-expiry ${spreadPair.raw_expiry_a}, trade date ${spreadPair.trade_date}` : "Awaiting data"}
          </div>
          <div className="text-muted-foreground text-xs font-medium">
            {spreadPair?.label || "Observed gap (not a signal)"}
          </div>
        </CardFooter>
      </Card>

      {/* Card 3: Ingested History */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Manual Import Ingestion</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalRecordsCount !== undefined ? `${totalRecordsCount} Records` : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <CheckCircleIcon className="size-3.5 text-emerald-500" />
              {acceptedFilesCount !== undefined ? `${acceptedFilesCount} Files` : "0 Files"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-xs">
            {acceptedFilesCount !== undefined
              ? `Manual import: ${acceptedFilesCount} accepted, ${quarantinedFilesCount} quarantined`
              : "0 Files accepted"}
          </div>
          <div className="text-muted-foreground text-[11px]">
            Contract specs and holiday calendar unverified
          </div>
        </CardFooter>
      </Card>

      {/* Card 4: Tender Window Status */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Tender Gate Rule</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            3 Trading Days
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400">
              <ShieldWarningIcon className="size-3.5 text-amber-500" />
              Compulsory
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-xs">
            No entry / hold in tender window
          </div>
          <div className="text-muted-foreground text-xs">
            Conservative earliest start policy
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
