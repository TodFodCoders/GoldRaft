"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type Row,
  type SortingState,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"
import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  GripVerticalIcon,
  MenuDotsVerticalIcon as EllipsisVerticalIcon,
  Columns3Icon,
  AltArrowDownIcon as ChevronDownIcon,
  AddIcon as PlusIcon,
  DoubleAltArrowLeftIcon as ChevronsLeftIcon,
  AltArrowLeftIcon as ChevronLeftIcon,
  AltArrowRightIcon as ChevronRightIcon,
  DoubleAltArrowRightIcon as ChevronsRightIcon,
} from "@solar-icons/react/outline"

export const schema = z.object({
  id: z.number(),
  contract: z.string(),
  symbol: z.string(),
  expiry: z.string(),
  segment: z.string(),
  purityOrSpec: z.string(),
  lastPrice: z.number(),
  changeNet: z.number(),
  changePercent: z.number(),
  volumeLots: z.number(),
  turnoverCr: z.number(),
  openInterest: z.number(),
  oiChangePercent: z.number(),
  dayHigh: z.number(),
  dayLow: z.number(),
  vwap: z.number(),
  target: z.string(),
  stopLoss: z.string(),
  status: z.string(),
  strategy: z.string(),
})

export type MarketSnapshot = z.infer<typeof schema>

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value)
}

// TanStack Table v9 features registration
const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<
  typeof features,
  MarketSnapshot
>()

// Separate component for the sortable drag handle
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({
    id,
  })
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

const columns = columnHelper.columns([
  columnHelper.display({
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  }),
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={
            table.getIsSomePageRowsSelected() &&
            !table.getIsAllPageRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor("contract", {
    header: "Contract",
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
    },
    enableHiding: false,
  }),
  columnHelper.accessor("segment", {
    header: "Segment",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {row.original.segment}
      </Badge>
    ),
  }),
  columnHelper.accessor("lastPrice", {
    header: () => <div className="w-full text-right">Last Price</div>,
    cell: ({ row }) => (
      <div className="text-right font-semibold font-mono tabular-nums tracking-tight text-foreground">
        {formatINR(row.original.lastPrice)}
      </div>
    ),
  }),
  columnHelper.accessor("changePercent", {
    id: "change",
    header: () => <div className="w-full text-right">Change</div>,
    cell: ({ row }) => {
      const isPositive = row.original.changeNet >= 0
      return (
        <div className="flex flex-col items-end">
          <div
            className={cn(
              "inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums",
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="size-3.5 stroke-[2.5]" />
            ) : (
              <ArrowDownRight className="size-3.5 stroke-[2.5]" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {formatINR(row.original.changeNet)}
            </span>
          </div>
          <span
            className={cn(
              "text-[11px] font-mono tabular-nums",
              isPositive
                ? "text-emerald-600/80 dark:text-emerald-400/80"
                : "text-rose-600/80 dark:text-rose-400/80"
            )}
          >
            ({isPositive ? "+" : ""}
            {row.original.changePercent.toFixed(2)}%)
          </span>
        </div>
      )
    },
  }),
  columnHelper.accessor("volumeLots", {
    id: "volume",
    header: () => <div className="w-full text-right">Volume</div>,
    cell: ({ row }) => (
      <div className="flex flex-col items-end">
        <span className="font-mono text-xs font-medium tabular-nums text-foreground">
          {formatNumber(row.original.volumeLots)} lots
        </span>
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
          ₹{row.original.turnoverCr.toFixed(1)} Cr
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("openInterest", {
    id: "openInterest",
    header: () => <div className="w-full text-right">Open Interest</div>,
    cell: ({ row }) => {
      const isOiPositive = row.original.oiChangePercent >= 0
      return (
        <div className="flex flex-col items-end">
          <span className="font-mono text-xs font-medium tabular-nums text-foreground">
            {formatNumber(row.original.openInterest)}
          </span>
          <span
            className={cn(
              "text-[11px] font-mono tabular-nums",
              isOiPositive
                ? "text-emerald-600/80 dark:text-emerald-400/80"
                : "text-rose-600/80 dark:text-rose-400/80"
            )}
          >
            OI {isOiPositive ? "+" : ""}
            {row.original.oiChangePercent.toFixed(1)}%
          </span>
        </div>
      )
    },
  }),
  columnHelper.accessor("dayHigh", {
    id: "dayRange",
    header: () => <div className="w-full text-right">Day Range & VWAP</div>,
    cell: ({ row }) => (
      <div className="flex flex-col items-end min-w-[130px]">
        <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-muted-foreground">
          <span className="text-foreground">H:</span>
          <span>{formatINR(row.original.dayHigh)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-muted-foreground">
          <span>L: {formatINR(row.original.dayLow)}</span>
          <span>•</span>
          <span className="text-foreground/80 font-medium">VWAP: {formatINR(row.original.vwap)}</span>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("target", {
    header: () => <div className="w-full text-right">Target Alert</div>,
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 800)), {
            loading: `Setting alert for ${row.original.contract}...`,
            success: `Alert active at ₹${row.original.target}`,
            error: "Failed to set alert",
          })
        }}
      >
        <Label htmlFor={`${row.original.id}-target`} className="sr-only">
          Target Price Alert
        </Label>
        <Input
          className="h-8 w-24 border-transparent bg-transparent text-right font-mono text-xs shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30"
          defaultValue={row.original.target}
          id={`${row.original.id}-target`}
        />
      </form>
    ),
  }),
  columnHelper.accessor("strategy", {
    header: "Strategy",
    cell: ({ row }) => {
      return (
        <>
          <Label htmlFor={`${row.original.id}-strategy`} className="sr-only">
            Trading Strategy
          </Label>
          <Select
            defaultValue={row.original.strategy}
            items={[
              { label: "Benchmark Delivery", value: "Benchmark Delivery" },
              { label: "Intraday Trend", value: "Intraday Trend" },
              { label: "Hedging", value: "Hedging" },
              { label: "Arbitrage", value: "Arbitrage" },
              { label: "Retail Flow", value: "Retail Flow" },
              { label: "Positional", value: "Positional" },
              { label: "Institutional", value: "Institutional" },
            ]}
          >
            <SelectTrigger
              className="w-36 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate text-xs"
              size="sm"
              id={`${row.original.id}-strategy`}
            >
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                <SelectItem value="Benchmark Delivery">Benchmark Delivery</SelectItem>
                <SelectItem value="Intraday Trend">Intraday Trend</SelectItem>
                <SelectItem value="Hedging">Hedging</SelectItem>
                <SelectItem value="Arbitrage">Arbitrage</SelectItem>
                <SelectItem value="Retail Flow">Retail Flow</SelectItem>
                <SelectItem value="Positional">Positional</SelectItem>
                <SelectItem value="Institutional">Institutional</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </>
      )
    },
  }),
  columnHelper.display({
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground data-open:bg-muted"
              size="icon"
            />
          }
        >
          <EllipsisVerticalIcon />
          <span className="sr-only">Open menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() =>
              toast.info(`Opening technical chart for ${row.original.contract}`)
            }
          >
            Technical Chart
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              toast.success(`Added ${row.original.contract} to Watchlist`)
            }
          >
            Add to Watchlist
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard?.writeText(row.original.symbol)
              toast.success(`Copied ${row.original.symbol} symbol`)
            }}
          >
            Copy Symbol
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              toast.promise(new Promise((r) => setTimeout(r, 600)), {
                loading: "Fetching market depth...",
                success: "Market depth loaded",
                error: "Error",
              })
            }
          >
            View Market Depth
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }),
])

function DraggableRow({
  row,
}: {
  row: Row<typeof features, MarketSnapshot>
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          <FlexRender cell={cell} />
        </TableCell>
      ))}
    </TableRow>
  )
}

export function DataTable({
  data: initialData,
  className,
}: {
  data: MarketSnapshot[]
  className?: string
}) {
  const padClass = className ? "" : "px-4 lg:px-6"
  const [data, setData] = React.useState(() => initialData)
  const [activeTab, setActiveTab] = React.useState("all")
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )
  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data]
  )

  // Filter rows based on selected tab (All, Bullion, Energy, Base Metals)
  const handleTabChange = React.useCallback((val: string | null) => {
    if (!val) return
    setActiveTab(val)
    if (val === "all") {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "segment"))
    } else {
      setColumnFilters((prev) => [
        ...prev.filter((f) => f.id !== "segment"),
        { id: "segment", value: val },
      ])
    }
  }, [])

  const table = useTable({
    features,
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  const bullionCount = React.useMemo(
    () => initialData.filter((d) => d.segment === "Bullion").length,
    [initialData]
  )
  const energyCount = React.useMemo(
    () => initialData.filter((d) => d.segment === "Energy").length,
    [initialData]
  )
  const metalsCount = React.useMemo(
    () => initialData.filter((d) => d.segment === "Base Metals").length,
    [initialData]
  )

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={cn("w-full flex-col justify-start gap-4", className)}
    >
      <div className={cn("flex items-center justify-between", padClass)}>
        <Label htmlFor="view-selector" className="sr-only">
          Market Category
        </Label>
        <Select
          value={activeTab}
          onValueChange={handleTabChange}
          items={[
            { label: "All Contracts", value: "all" },
            { label: "Bullion (Gold & Silver)", value: "Bullion" },
            { label: "Energy (Crude & Gas)", value: "Energy" },
            { label: "Base Metals", value: "Base Metals" },
          ]}
        >
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden text-xs"
            size="sm"
            id="view-selector"
          >
            <SelectValue placeholder="Select market" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Contracts</SelectItem>
              <SelectItem value="Bullion">Bullion (Gold & Silver)</SelectItem>
              <SelectItem value="Energy">Energy (Crude & Gas)</SelectItem>
              <SelectItem value="Base Metals">Base Metals</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="all">
            All Contracts <Badge variant="secondary">{initialData.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="Bullion">
            Bullion <Badge variant="secondary">{bullionCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="Energy">
            Energy <Badge variant="secondary">{energyCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="Base Metals">
            Base Metals <Badge variant="secondary">{metalsCount}</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <Columns3Icon data-icon="inline-start" />
              Columns
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-xs"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.success("Watchlist scanner updated with live MCX feeds")
            }
          >
            <PlusIcon />
            <span className="hidden lg:inline">Add Contract</span>
          </Button>
        </div>
      </div>

      <TabsContent
        value={activeTab}
        className={cn("relative flex flex-col gap-4 overflow-auto", padClass)}
      >
        <div className="overflow-hidden rounded-lg border border-border dark:border-white/10 bg-background dark:bg-[#0A0A0A]">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 dark:bg-[#171717] border-b border-border dark:border-white/10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder ? null : (
                            <FlexRender header={header} />
                          )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No contracts matching filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>

        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} contract(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.state.pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
                items={[10, 20, 30, 40, 50].map((pageSize) => ({
                  label: `${pageSize}`,
                  value: `${pageSize}`,
                }))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.state.pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.state.pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

// Generate realistic intraday tick trajectory for the detail drawer
function generateIntradayChart(lastPrice: number, changePercent: number) {
  const steps = 12
  const points = []
  const startPrice = lastPrice / (1 + changePercent / 100)
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps
    const noise = (Math.sin(i * 1.5) * 0.003 - Math.cos(i * 0.8) * 0.002)
    const price = startPrice + (lastPrice - startPrice) * fraction + startPrice * noise
    const hours = 9 + Math.floor(i * 0.5)
    const minutes = (i % 2) * 30
    const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    points.push({
      time: timeStr,
      price: Math.round(price * 10) / 10,
    })
  }
  return points
}

const drawerChartConfig = {
  price: {
    label: "Price (₹)",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function TableCellViewer({ item }: { item: MarketSnapshot }) {
  const isMobile = useIsMobile()
  const isPositive = item.changeNet >= 0
  const chartData = React.useMemo(
    () => generateIntradayChart(item.lastPrice, item.changePercent),
    [item.lastPrice, item.changePercent]
  )

  return (
    <Drawer swipeDirection={isMobile ? "down" : "right"}>
      <DrawerTrigger
        render={
          <Button
            variant="link"
            className="flex flex-col items-start px-0 text-left text-foreground hover:no-underline group"
          />
        }
      >
        <span className="font-semibold text-sm group-hover:text-primary transition-colors">
          {item.contract}
        </span>
        <span className="text-[11px] text-muted-foreground font-normal">
          {item.purityOrSpec} • {item.expiry}
        </span>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold">{item.contract}</DrawerTitle>
            <Badge variant="outline" className="text-xs">
              {item.segment}
            </Badge>
          </div>
          <DrawerDescription>
            MCX Market Snapshot • Expiry: {item.expiry} • {item.purityOrSpec}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm max-h-[75vh]">
          {/* Key Price Hero in Drawer */}
          <div className="flex items-baseline justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <div className="text-xs text-muted-foreground">Last Traded Price</div>
              <div className="text-2xl font-bold font-mono tabular-nums tracking-tight">
                {formatINR(item.lastPrice)}
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums",
                  isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="size-4" />
                ) : (
                  <TrendingDown className="size-4" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {formatINR(item.changeNet)} ({isPositive ? "+" : ""}
                  {item.changePercent.toFixed(2)}%)
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Today&apos;s Session</div>
            </div>
          </div>

          {!isMobile && (
            <>
              <div className="h-44 w-full">
                <ChartContainer config={drawerChartConfig} className="h-full w-full">
                  <AreaChart
                    accessibilityLayer
                    data={chartData}
                    margin={{
                      top: 10,
                      left: 10,
                      right: 10,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      hide
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      hide
                    />
                    <ChartTooltip
                      cursor={{ strokeDasharray: "2 2" }}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Area
                      dataKey="price"
                      type="monotone"
                      fill={isPositive ? "oklch(0.65 0.18 150 / 0.25)" : "oklch(0.65 0.2 25 / 0.25)"}
                      stroke={isPositive ? "oklch(0.65 0.18 150)" : "oklch(0.65 0.2 25)"}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              <Separator />
            </>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border p-2.5">
              <span className="text-[11px] text-muted-foreground block">Day High</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatINR(item.dayHigh)}
              </span>
            </div>
            <div className="rounded-md border p-2.5">
              <span className="text-[11px] text-muted-foreground block">Day Low</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatINR(item.dayLow)}
              </span>
            </div>
            <div className="rounded-md border p-2.5">
              <span className="text-[11px] text-muted-foreground block">VWAP</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatINR(item.vwap)}
              </span>
            </div>
            <div className="rounded-md border p-2.5">
              <span className="text-[11px] text-muted-foreground block">Turnover</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                ₹{item.turnoverCr.toFixed(1)} Cr
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-2.5">
              <span className="text-[11px] text-muted-foreground block">Volume (Lots)</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatNumber(item.volumeLots)}
              </span>
            </div>
            <div className="rounded-md border p-2.5">
              <span className="text-[11px] text-muted-foreground block">Open Interest (OI)</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatNumber(item.openInterest)} ({item.oiChangePercent > 0 ? "+" : ""}{item.oiChangePercent}%)
              </span>
            </div>
            <div className="rounded-md border p-2.5 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-muted-foreground block">Trading Status</span>
              <Badge variant="outline" className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                ● {item.status}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Quick Order / Alert Setup */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              toast.success(`Market order / alert saved for ${item.contract}`)
            }}
            className="flex flex-col gap-4 pb-2"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="contract-symbol">Contract Symbol</Label>
              <Input id="contract-symbol" defaultValue={item.symbol} readOnly className="bg-muted font-mono" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="target-price">Target Alert (₹)</Label>
                <Input id="target-price" defaultValue={item.target} className="font-mono" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="stop-loss">Stop Loss (₹)</Label>
                <Input id="stop-loss" defaultValue={item.stopLoss} className="font-mono" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="drawer-strategy">Trading Strategy</Label>
              <Select
                defaultValue={item.strategy}
                items={[
                  { label: "Benchmark Delivery", value: "Benchmark Delivery" },
                  { label: "Intraday Trend", value: "Intraday Trend" },
                  { label: "Hedging", value: "Hedging" },
                  { label: "Arbitrage", value: "Arbitrage" },
                  { label: "Retail Flow", value: "Retail Flow" },
                  { label: "Positional", value: "Positional" },
                  { label: "Institutional", value: "Institutional" },
                ]}
              >
                <SelectTrigger id="drawer-strategy" className="w-full text-xs">
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Benchmark Delivery">Benchmark Delivery</SelectItem>
                    <SelectItem value="Intraday Trend">Intraday Trend</SelectItem>
                    <SelectItem value="Hedging">Hedging</SelectItem>
                    <SelectItem value="Arbitrage">Arbitrage</SelectItem>
                    <SelectItem value="Retail Flow">Retail Flow</SelectItem>
                    <SelectItem value="Positional">Positional</SelectItem>
                    <SelectItem value="Institutional">Institutional</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>

        <DrawerFooter>
          <Button
            onClick={() =>
              toast.success(`Position order queued for ${item.contract}`)
            }
          >
            Place Order / Set Alert
          </Button>
          <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
