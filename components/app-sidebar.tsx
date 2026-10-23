"use client"

import * as React from "react"
import Image from "next/image"
import {
  Widget2Icon,
  Chart2Icon,
  FolderKanbanIcon,
  ChecklistIcon,
  CalendarIcon,
  BoxMinimalisticIcon,
  SettingsMinimalisticIcon,
  QuestionCircleIcon,
  ChevronsUpDownIcon,
  LayersMinimalisticIcon,
  CheckIcon,
} from "@solar-icons/react/outline"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"

// Navigation items configuration
const data = {
  user: {
    name: "Alex Morgan",
    email: "quant@goldraft.internal",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80",
  },
  instruments: [
    {
      name: "MCX Gold Derivatives",
      plan: "GOLDM / TEN / GUINEA / PETAL",
      logo: "/goldraft.png",
      icon: LayersMinimalisticIcon,
      available: true,
    },
    {
      name: "MCX Silver Derivatives",
      plan: "SILVER / MIC / MINI (Coming Soon)",
      icon: BoxMinimalisticIcon,
      available: false,
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <Widget2Icon className="size-4" />,
    },
    {
      title: "Contracts & Prices",
      url: "/dashboard#contracts",
      icon: <LayersMinimalisticIcon className="size-4" />,
      badge: "4",
    },
    {
      title: "Spreads & Carry",
      url: "/dashboard#spreads",
      icon: <Chart2Icon className="size-4" />,
    },
    {
      title: "Backtest",
      url: "/dashboard#backtest",
      icon: <FolderKanbanIcon className="size-4" />,
    },
    {
      title: "Quiet Mode Alerts",
      url: "/dashboard#alerts",
      icon: <ChecklistIcon className="size-4" />,
      badge: "Quiet",
    },
    {
      title: "Contract Calendar",
      url: "/dashboard#calendar",
      icon: <CalendarIcon className="size-4" />,
    },
  ],
  navSecondary: [
    {
      title: "Data Quality Log",
      url: "/dashboard#data-quality",
      icon: <SettingsMinimalisticIcon className="size-4" />,
    },
    {
      title: "MCX Rules & Specs",
      url: "/dashboard#specs",
      icon: <QuestionCircleIcon className="size-4" />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, state } = useSidebar()
  const [activeInstrument, setActiveInstrument] = React.useState(data.instruments[0])
  const InstrumentIcon = activeInstrument.icon

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
                  />
                }
              >
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg overflow-hidden border bg-background text-primary-foreground font-semibold">
                  {"logo" in activeInstrument && activeInstrument.logo ? (
                    <Image
                      src={activeInstrument.logo}
                      alt={activeInstrument.name}
                      width={32}
                      height={32}
                      className="size-full object-cover"
                      priority
                    />
                  ) : (
                    <InstrumentIcon className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-foreground">
                    {activeInstrument.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activeInstrument.plan}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : state === "collapsed" ? "right" : "bottom"}
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Commodity Derivatives
                  </DropdownMenuLabel>
                  {data.instruments.map((instrument) => {
                    const Icon = instrument.icon
                    const isSelected = instrument.name === activeInstrument.name
                    return (
                      <DropdownMenuItem
                        key={instrument.name}
                        disabled={!instrument.available}
                        onClick={() => {
                          if (instrument.available) {
                            setActiveInstrument(instrument)
                          }
                        }}
                        className={`gap-2 p-2 ${instrument.available ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
                      >
                        <div className="flex size-6 items-center justify-center rounded-sm overflow-hidden border bg-background">
                          {"logo" in instrument && instrument.logo ? (
                            <Image
                              src={instrument.logo}
                              alt={instrument.name}
                              width={24}
                              height={24}
                              className="size-full object-cover"
                            />
                          ) : (
                            <Icon className="size-3.5 shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-medium">
                            {instrument.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {instrument.plan}
                          </span>
                        </div>
                        {isSelected && <CheckIcon className="size-4 ml-auto text-primary" />}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
