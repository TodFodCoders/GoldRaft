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
  GraphNewUpIcon,
  GraphDownNewIcon,
  CheckCircleIcon,
  ShieldWarningIcon,
} from "@solar-icons/react/outline"

export interface SectionCardsProps {
  latestGoldTenPrice?: number | null;
  spreadTenGuinea?: number | null;
  totalRecordsCount?: number;
  acceptedFilesCount?: number;
}

export function SectionCards({
  latestGoldTenPrice = 142223.00,
  spreadTenGuinea = -633.25,
  totalRecordsCount = 216,
  acceptedFilesCount = 9,
}: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {/* Card 1: Benchmark Basis */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Benchmark Basis (GOLDTEN)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ₹{latestGoldTenPrice ? latestGoldTenPrice.toLocaleString("en-IN") : "142,223"}.00
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">999 Purity</span>
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            ₹ per 10g reference base{" "}
            <CheckCircleIcon className="size-4 text-emerald-500" />
          </div>
          <div className="text-muted-foreground text-xs">
            Ex-Ahmedabad delivery center
          </div>
        </CardFooter>
      </Card>

      {/* Card 2: Observed Spread */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Spread (GOLDTEN - GUINEA)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {spreadTenGuinea !== null ? `₹${spreadTenGuinea.toFixed(2)}` : "-₹633.25"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800">
              <GraphDownNewIcon className="size-3.5" />
              -0.44%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Same-expiry 30OCT2026 gap{" "}
            <GraphDownNewIcon className="size-4" />
          </div>
          <div className="text-muted-foreground text-xs">
            Metal basis; costs & carry unapplied
          </div>
        </CardFooter>
      </Card>

      {/* Card 3: Ingested History */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Verified History Ingested</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalRecordsCount} Records
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <CheckCircleIcon className="size-3.5 text-emerald-500" />
              {acceptedFilesCount} Files
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            0 Quarantined in current drop{" "}
            <GraphNewUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground text-xs">
            SHA-256 deduplicated, trap checked
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
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            No entry / hold in tender window{" "}
            <ShieldWarningIcon className="size-4 text-amber-500" />
          </div>
          <div className="text-muted-foreground text-xs">
            Conservative earliest start policy
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
