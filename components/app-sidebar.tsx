"use client"

import * as React from "react"
import {
  Widget2Icon,
  Chart2Icon,
  FolderKanbanIcon,
  ChecklistIcon,
  CalendarIcon,
  FileTextIcon,
  BoxMinimalisticIcon,
  SettingsMinimalisticIcon,
  QuestionCircleIcon,
  SendSquareIcon,
  ChevronsUpDownIcon,
  LayersMinimalisticIcon,
  AddIcon,
  CheckIcon,
  StarsMinimalisticIcon,
  FileCodeIcon,
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
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { NavMain } from "@/components/nav-main"
import { NavDocuments } from "@/components/nav-documents"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"

// Navigation items configuration
const data = {
  user: {
    name: "Alex Morgan",
    email: "alex@manali.dev",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80",
  },
  workspaces: [
    {
      name: "Manali Labs",
      plan: "Enterprise",
      icon: LayersMinimalisticIcon,
    },
    {
      name: "Acme Studio",
      plan: "Pro",
      icon: BoxMinimalisticIcon,
    },
    {
      name: "Personal",
      plan: "Hobby",
      icon: StarsMinimalisticIcon,
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/",
      icon: <Widget2Icon className="size-4" />,
    },
    {
      title: "Analytics",
      url: "/dashboard",
      icon: <Chart2Icon className="size-4" />,
      badge: "Live",
    },
    {
      title: "Projects",
      url: "/#projects",
      icon: <FolderKanbanIcon className="size-4" />,
      badge: "8",
    },
    {
      title: "Tasks",
      url: "/#tasks",
      icon: <ChecklistIcon className="size-4" />,
      badge: "3",
    },
    {
      title: "Calendar",
      url: "/#calendar",
      icon: <CalendarIcon className="size-4" />,
    },
  ],
  documents: [
    {
      name: "Design System 2.0",
      url: "/#design-system",
      icon: <FileTextIcon className="size-4" />,
    },
    {
      name: "Technical Approach",
      url: "/#technical-approach",
      icon: <FileTextIcon className="size-4" />,
    },
    {
      name: "Q4 Roadmap",
      url: "/#roadmap",
      icon: <FileTextIcon className="size-4" />,
    },
    {
      name: "Integration Specs",
      url: "/#specs",
      icon: <FileCodeIcon className="size-4" />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/#settings",
      icon: <SettingsMinimalisticIcon className="size-4" />,
    },
    {
      title: "Support",
      url: "/#support",
      icon: <QuestionCircleIcon className="size-4" />,
    },
    {
      title: "Feedback",
      url: "/#feedback",
      icon: <SendSquareIcon className="size-4" />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeWorkspace, setActiveWorkspace] = React.useState(data.workspaces[0])
  const WorkspaceIcon = activeWorkspace.icon

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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
                  <WorkspaceIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">
                    {activeWorkspace.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activeWorkspace.plan}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Workspaces
                </DropdownMenuLabel>
                {data.workspaces.map((workspace) => {
                  const Icon = workspace.icon
                  const isSelected = workspace.name === activeWorkspace.name
                  return (
                    <DropdownMenuItem
                      key={workspace.name}
                      onClick={() => setActiveWorkspace(workspace)}
                      className="gap-2 p-2 cursor-pointer"
                    >
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        <Icon className="size-3.5 shrink-0" />
                      </div>
                      <span className="flex-1 text-sm font-medium">
                        {workspace.name}
                      </span>
                      {isSelected && <CheckIcon className="size-4 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 p-2 cursor-pointer text-muted-foreground">
                  <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                    <AddIcon className="size-3.5" />
                  </div>
                  <span className="text-sm font-medium">Create workspace</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
