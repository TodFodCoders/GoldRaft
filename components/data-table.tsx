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
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  GripVerticalIcon,
  Columns3Icon,
  AltArrowDownIcon,
  ShieldWarningIcon,
  DoubleAltArrowLeftIcon,
  AltArrowLeftIcon,
  AltArrowRightIcon,
  DoubleAltArrowRightIcon,
  ClockCircleIcon,
} from "@solar-icons/react/outline"

export const schema = z.object({
  id: z.string(),
  trade_date: z.string(),
  symbol: z.string(),
  expiry_date: z.string(),
  raw_expiry: z.string(),
  close: z.number().nullable(),
  normalized_close_10g_999: z.number().nullable(),
  volume_lots: z.number(),
  volume_grams: z.number(),
  open_interest_lots: z.number(),
  trading_unit_g: z.number(),
  trading_status: z.string(),
  quote_location: z.string().optional(),
  source_file: z.string().optional(),
})

export type ContractRow = z.infer<typeof schema>

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

const columnHelper = createColumnHelper<typeof features, ContractRow>()

function formatINR(val: number | null): string {
  if (val === null || val === undefined) return "—"
  if (val < 0) {
    return `-₹${Math.abs(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({ id })
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent cursor-grab active:cursor-grabbing"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

function TableCellViewer({ item }: { item: ContractRow }) {
  const isMobile = useIsMobile()
  const isMumbai = item.symbol === "GOLDPETAL"
  const isPurityScaled = item.symbol === "GOLDM"

  return (
    <Drawer swipeDirection={isMobile ? "down" : "right"}>
      <DrawerTrigger
        render={
          <Button
            variant="link"
            className="w-fit px-0 text-left font-bold text-foreground hover:text-primary flex items-center gap-1.5"
          />
        }
      >
        <span>{item.symbol}</span>
        {isMumbai && (
          <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-400 text-amber-600 dark:text-amber-400">
            Mumbai basis
          </Badge>
        )}
      </DrawerTrigger>
      <DrawerContent className="max-w-lg mx-auto">
        <DrawerHeader className="gap-1 border-b pb-3">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold flex items-center gap-2">
              {item.symbol} — {item.raw_expiry}
            </DrawerTitle>
            <Badge variant={item.trading_status === "TRADE" ? "default" : "secondary"}>
              {item.trading_status}
            </Badge>
          </div>
          <DrawerDescription className="text-xs">
            Observed MCX Bhavcopy record for trade date {item.trade_date}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 text-xs">
          {/* Key Pricing Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Observed Close</span>
              <div className="text-lg font-bold">
                {formatINR(item.close)}
              </div>
              <span className="text-[10px] text-muted-foreground">
                Quoted per {item.symbol === "GOLDGUINEA" ? "8g" : item.symbol === "GOLDPETAL" ? "1g" : "10g"}
              </span>
            </div>

            <div className="rounded-lg border p-3 bg-primary/5 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Normalized (₹/10g @ 999)</span>
              <div className="text-lg font-bold text-primary">
                {formatINR(item.normalized_close_10g_999)}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {isPurityScaled ? "Scaled by 999/995" : "Exact 999 fineness"}
              </span>
            </div>
          </div>

          <Separator />

          {/* Contract Specifications Table */}
          <div className="space-y-2">
            <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Contract Specification Sheet (Unverified)
            </span>
            <div className="grid grid-cols-2 gap-y-2 rounded-lg border p-3 bg-background">
              <span className="text-muted-foreground">Trading Unit</span>
              <span className="font-medium text-right">{item.trading_unit_g} g</span>

              <span className="text-muted-foreground">Purity / Fineness</span>
              <span className="font-medium text-right">{item.symbol === "GOLDM" ? "995" : "999"}</span>

              <span className="text-muted-foreground">Quote Location</span>
              <span className="font-medium text-right">{isMumbai ? "Mumbai" : "Ahmedabad"}</span>

              <span className="text-muted-foreground">Settlement Type</span>
              <span className="font-medium text-right text-rose-600 dark:text-rose-400 font-semibold">COMPULSORY DELIVERY</span>

              <span className="text-muted-foreground">Tender Window</span>
              <span className="font-medium text-right">Last 3 trading days</span>

              <span className="text-muted-foreground">Volume (Grams)</span>
              <span className="font-medium text-right tabular-nums">{item.volume_grams.toLocaleString("en-IN")} g</span>

              <span className="text-muted-foreground">Open Interest</span>
              <span className="font-medium text-right tabular-nums">{item.open_interest_lots} lots</span>
            </div>
          </div>

          {/* Mathematical Assumption Disclaimer */}
          <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-500/10 p-3 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
              <ShieldWarningIcon className="size-4 shrink-0" />
              <span>Analytical Assumption Notice</span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Normalized price is a metal-content comparison basis, NOT executable parity.
              Official exchange Close is not an executable fill price.
              Physical delivery logistics and location freight differentials (Ahmedabad vs Mumbai) are unhedged.
            </p>
          </div>
        </div>

        <DrawerFooter className="border-t pt-3">
          <DrawerClose render={<Button variant="outline" className="w-full text-xs" />}>
            Close Inspector
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
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
  columnHelper.accessor("trade_date", {
    header: "Trade Date",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.trade_date}
      </span>
    ),
  }),
  columnHelper.accessor("symbol", {
    header: "Contract Symbol",
    cell: ({ row }) => <TableCellViewer item={row.original} />,
    enableHiding: false,
  }),
  columnHelper.accessor("raw_expiry", {
    header: "Expiry Date",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 font-mono text-xs">
        <ClockCircleIcon className="size-3.5 text-muted-foreground" />
        <span>{row.original.raw_expiry}</span>
      </div>
    ),
  }),
  columnHelper.accessor("close", {
    header: () => <div className="text-right">Observed Close</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono font-medium">
        {formatINR(row.original.close)}
      </div>
    ),
  }),
  columnHelper.accessor("normalized_close_10g_999", {
    header: () => <div className="text-right text-primary font-bold">Normalized (₹/10g 999)</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono font-bold text-primary">
        {formatINR(row.original.normalized_close_10g_999)}
      </div>
    ),
  }),
  columnHelper.accessor("volume_grams", {
    header: () => <div className="text-right">Volume (Grams)</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono text-xs text-muted-foreground">
        {row.original.volume_grams.toLocaleString("en-IN")} g
      </div>
    ),
  }),
  columnHelper.accessor("open_interest_lots", {
    header: () => <div className="text-right">OI (Lots)</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono text-xs text-muted-foreground">
        {row.original.open_interest_lots.toLocaleString("en-IN")}
      </div>
    ),
  }),
  columnHelper.accessor("trading_status", {
    header: "Trading Status",
    cell: ({ row }) => {
      const isTrade = row.original.trading_status === "TRADE"
      return (
        <Badge
          variant="outline"
          className={`px-1.5 text-xs font-semibold ${
            isTrade
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
              : "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10"
          }`}
        >
          {row.original.trading_status}
        </Badge>
      )
    },
  }),
])

function DraggableRow({ row }: { row: Row<typeof features, ContractRow> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Translate.toString(transform),
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

export function DataTable({ data: initialData }: { data: ContractRow[] }) {
  // Extract distinct trade dates sorted descending (latest first)
  const availableTradeDates = React.useMemo(() => {
    const dates = Array.from(new Set(initialData.map((d) => d.trade_date)))
    return dates.sort((a, b) => b.localeCompare(a))
  }, [initialData])

  const [userSelectedSession, setUserSelectedSession] = React.useState<string | null>(null)
  const selectedSession = userSelectedSession ?? (availableTradeDates[0] || "all")

  // Filter data by selected trade date if not "all"
  const filteredData = React.useMemo(() => {
    if (selectedSession === "all") return initialData
    return initialData.filter((r) => r.trade_date === selectedSession)
  }, [initialData, selectedSession])

  const [data, setData] = React.useState(() => filteredData)
  const [prevFilteredData, setPrevFilteredData] = React.useState(() => filteredData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  if (prevFilteredData !== filteredData) {
    setPrevFilteredData(filteredData)
    setData(filteredData)
  }

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
    getRowId: (row: ContractRow) => row.id,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((prevData) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(prevData, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="w-full flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">Contract observations</span>
          <Badge variant="outline" className="text-xs font-mono">
            {filteredData.length} records
          </Badge>
          {selectedSession !== "all" && (
            <Badge variant="secondary" className="text-[10px] font-mono">
              Session: {selectedSession}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Trade Date Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Session:</span>
            <select
              aria-label="Filter observations by session date"
              className="rounded border border-input bg-background px-2.5 py-1 text-xs font-mono"
              value={selectedSession}
              onChange={(e) => setUserSelectedSession(e.target.value)}
            >
              <option value="all">All Sessions ({initialData.length} total)</option>
              {availableTradeDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <Columns3Icon className="size-3.5 mr-1" />
              Columns
              <AltArrowDownIcon className="size-3.5 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
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
                      className="capitalize text-xs cursor-pointer"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.replace(/_/g, " ")}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card/40">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
        >
          <Table>
            <TableHeader className="bg-muted/50">
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
            <TableBody>
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
                    className="h-24 text-center text-muted-foreground text-xs"
                  >
                    No contract records available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          Showing {table.getRowModel().rows.length} of {data.length} contracts
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <DoubleAltArrowLeftIcon className="size-3" />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <AltArrowLeftIcon className="size-3" />
          </Button>
          <span className="px-2 font-mono">
            Page {table.state.pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <AltArrowRightIcon className="size-3" />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
          >
            <DoubleAltArrowRightIcon className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
