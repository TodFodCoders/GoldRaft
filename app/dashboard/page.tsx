import { AppSidebar } from "@/components/app-sidebar"
import { BottomDraggableTab } from "@/components/bottom-draggable-tab"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ChartBarInteractive } from "@/components/chart-bar-interactive"
import { ChartLineInteractive } from "@/components/chart-line-interactive"
import { ChartVolumeProfile } from "@/components/chart-volume-profile"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import data from "./data.json"

export default function Page() {
  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="md:peer-data-[variant=inset]:mb-0 md:peer-data-[variant=inset]:rounded-b-none md:peer-data-[variant=inset]:shadow-none">
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 pb-24">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 @xl/main:grid-cols-2 items-stretch">
                  <ChartAreaInteractive className="h-full" />
                  <div className="grid grid-cols-1 md:grid-rows-2 gap-4 h-full">
                    <ChartBarInteractive className="h-full" />
                    <ChartLineInteractive className="h-full" />
                  </div>
                </div>
              </div>
              <div className="px-4 lg:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
                  <div className="lg:col-span-3 min-w-0 flex flex-col">
                    <DataTable data={data} className="w-full" />
                  </div>
                  <div className="lg:col-span-2 min-w-0 flex flex-col">
                    <ChartVolumeProfile className="h-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Draggable Half Area Tab from Bottom */}
        <BottomDraggableTab />
      </SidebarInset>
    </SidebarProvider>
  )
}
