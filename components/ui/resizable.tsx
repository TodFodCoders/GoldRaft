"use client"

import * as React from "react"
import { GripVerticalIcon } from "@solar-icons/react/outline"
import { Group, Panel, Separator } from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group
      data-slot="resizable-panel-group"
      orientation={orientation}
      className={cn(
        "flex h-full w-full data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex w-2 items-center justify-center bg-transparent transition-colors hover:bg-primary/20 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring data-[orientation=vertical]:h-2 data-[orientation=vertical]:w-full cursor-col-resize data-[orientation=vertical]:cursor-row-resize",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-20 flex h-8 w-4 items-center justify-center rounded-sm border bg-card shadow-xs hover:bg-muted cursor-col-resize active:scale-95 transition-transform">
          <GripVerticalIcon className="size-3.5 text-muted-foreground" />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
