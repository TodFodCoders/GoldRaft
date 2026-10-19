"use client"

import * as React from "react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  GraphNewUpIcon,
  PulseIcon,
  CheckCircleIcon,
  ClockCircleIcon,
  UsersGroupRoundedIcon,
  FolderKanbanIcon,
  StarsMinimalisticIcon,
} from "@solar-icons/react/outline"

export function DashboardResizableSplit() {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace Split View
            </span>
            <Badge variant="outline" className="text-[11px] gap-1 font-normal py-0">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Draggable 50/50 Area
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Drag the center handle to resize panels
          </p>
        </div>

        <ResizablePanelGroup
          orientation="horizontal"
          className="min-h-[460px] rounded-xl border bg-card/40 shadow-xs"
        >
          {/* Left Half: Interactive Chart Area */}
          <ResizablePanel defaultSize="50%" minSize="30%" maxSize="70%">
            <div className="h-full p-2 sm:p-3">
              <ChartAreaInteractive />
            </div>
          </ResizablePanel>

          {/* Draggable Center Resize Handle */}
          <ResizableHandle withHandle />

          {/* Right Half: Live Delivery & Performance Intelligence */}
          <ResizablePanel defaultSize="50%" minSize="30%" maxSize="70%">
            <div className="h-full p-2 sm:p-3">
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                          <PulseIcon className="size-4 text-primary" />
                          Delivery Intelligence
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Real-time sprint velocity and active reviewer workload
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <StarsMinimalisticIcon className="size-3 text-amber-500" />
                        AI Verified
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-1">
                    {/* Live Metric Pills */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="rounded-lg border bg-muted/30 p-2.5 sm:p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Sprint Progress</span>
                          <span className="text-emerald-600 font-medium inline-flex items-center text-[11px]">
                            <GraphNewUpIcon className="size-3 mr-0.5" /> +8.4%
                          </span>
                        </div>
                        <div className="text-xl font-bold">84.2%</div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary h-full rounded-full w-[84.2%]" />
                        </div>
                      </div>

                      <div className="rounded-lg border bg-muted/30 p-2.5 sm:p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Active Reviewers</span>
                          <UsersGroupRoundedIcon className="size-3.5" />
                        </div>
                        <div className="text-xl font-bold">14 / 16</div>
                        <p className="text-[11px] text-muted-foreground">92% online rate</p>
                      </div>
                    </div>

                    {/* Milestone Highlights */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Critical Milestone Deliverables
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-lg border p-2 text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircleIcon className="size-4 text-emerald-500 shrink-0" />
                            <div className="font-medium truncate max-w-[140px] sm:max-w-xs">
                              API Security Audit
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            Passed
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-2 text-xs">
                          <div className="flex items-center gap-2">
                            <ClockCircleIcon className="size-4 text-amber-500 shrink-0" />
                            <div className="font-medium truncate max-w-[140px] sm:max-w-xs">
                              Q4 Infrastructure Scale
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            In Review
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-2 text-xs">
                          <div className="flex items-center gap-2">
                            <FolderKanbanIcon className="size-4 text-primary shrink-0" />
                            <div className="font-medium truncate max-w-[140px] sm:max-w-xs">
                              Design Token Alignment
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            90% Done
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Synced 2m ago</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      Refresh
                    </Button>
                    <Button size="sm" className="h-7 text-xs">
                      View Details
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
