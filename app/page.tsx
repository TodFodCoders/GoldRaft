"use client"

import * as React from "react"
import {
  PulseIcon as Activity,
  ArrowRightUpIcon as ArrowUpRight,
  CheckCircleIcon as CheckCircle2,
  ClockCircleIcon as Clock,
  CardIcon as CreditCard,
  DollarMinimalisticIcon as DollarSign,
  FolderKanbanIcon as FolderKanban,
  AddIcon as Plus,
  MagnifierIcon as Search,
  StarsMinimalisticIcon as Sparkles,
  GraphNewUpIcon as TrendingUp,
  UsersGroupRoundedIcon as Users,
} from "@solar-icons/react/outline"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"

const stats = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    change: "+20.1%",
    period: "from last month",
    icon: DollarSign,
    positive: true,
  },
  {
    title: "Active Subscriptions",
    value: "+2,350",
    change: "+180.1%",
    period: "from last month",
    icon: Users,
    positive: true,
  },
  {
    title: "Active Projects",
    value: "12",
    change: "+3 new",
    period: "this quarter",
    icon: FolderKanban,
    positive: true,
  },
  {
    title: "Tasks Completed",
    value: "89.4%",
    change: "+4.3%",
    period: "team velocity",
    icon: Activity,
    positive: true,
  },
]

const recentProjects = [
  {
    name: "Design System 2.0",
    client: "Internal / Core UI",
    status: "In Progress",
    badgeVariant: "default" as const,
    progress: 78,
    dueDate: "Tomorrow",
  },
  {
    name: "Mobile App Redesign",
    client: "Acme Corp",
    status: "Review",
    badgeVariant: "secondary" as const,
    progress: 92,
    dueDate: "Oct 24",
  },
  {
    name: "Analytics Dashboard",
    client: "Manali Labs",
    status: "Completed",
    badgeVariant: "outline" as const,
    progress: 100,
    dueDate: "Oct 12",
  },
  {
    name: "Payment Gateway v3",
    client: "FinTech Global",
    status: "In Progress",
    badgeVariant: "default" as const,
    progress: 45,
    dueDate: "Nov 02",
  },
]

const recentActivity = [
  {
    user: "Alex Morgan",
    action: "deployed build to production",
    project: "manali-web-app",
    time: "12m ago",
    icon: Sparkles,
  },
  {
    user: "Sarah Chen",
    action: "closed issue #142",
    project: "Design System 2.0",
    time: "45m ago",
    icon: CheckCircle2,
  },
  {
    user: "David Miller",
    action: "submitted a pull request",
    project: "Payment Gateway v3",
    time: "2h ago",
    icon: ArrowUpRight,
  },
  {
    user: "System",
    action: "completed scheduled database backup",
    project: "Production DB",
    time: "5h ago",
    icon: Clock,
  },
]

export default function Home() {
  return (
    <SidebarProvider>
      {/* Shadcn Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <SidebarInset>
        {/* Top Navigation Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden sm:block">
                  <BreadcrumbLink href="#">Manali Platform</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden w-48 lg:w-64 md:block">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search anything..."
                className="pl-8 text-xs bg-muted/40"
              />
            </div>
            <Button size="sm" className="gap-1.5 shadow-sm">
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Project</span>
            </Button>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          {/* Welcome Header */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Dashboard Overview
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, Alex! Here is your latest project and workspace performance.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              <Button variant="outline" size="sm">
                Download Report
              </Button>
              <Button size="sm">
                <Sparkles className="mr-1.5 size-3.5" />
                AI Insights
              </Button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.title}>
                  <CardHeader>
                    <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <CardAction>
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </div>
                    </CardAction>
                    <div className="text-2xl font-bold tracking-tight text-foreground">
                      {stat.value}
                    </div>
                    <CardDescription className="flex items-center gap-1.5 text-xs">
                      <span className="inline-flex items-center font-medium text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="mr-0.5 size-3" />
                        {stat.change}
                      </span>
                      <span>{stat.period}</span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>

          {/* Draggable Resizable Half Area */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Workspace Split View
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                Drag the center divider to adjust panel widths
              </span>
            </div>

            <ResizablePanelGroup
              orientation="horizontal"
              className="min-h-[440px] gap-2"
            >
              {/* Left Half Panel (Projects) */}
              <ResizablePanel defaultSize="50%" minSize="30%" maxSize="70%">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Active Projects</CardTitle>
                        <CardDescription>
                          Overview of deliverables currently in progress.
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentProjects.map((project) => (
                        <div
                          key={project.name}
                          className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {project.name}
                              </span>
                              <Badge variant={project.badgeVariant}>
                                {project.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {project.client} • Due {project.dueDate}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                              {project.progress}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </ResizablePanel>

              {/* Draggable Center Resize Handle */}
              <ResizableHandle withHandle />

              {/* Right Half Panel (Activity & Feed) */}
              <ResizablePanel defaultSize="50%" minSize="30%" maxSize="70%">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Latest updates across the workspace.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.map((activity, idx) => {
                        const Icon = activity.icon
                        return (
                          <div key={idx} className="flex items-start gap-3 text-sm">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mt-0.5">
                              <Icon className="size-3.5" />
                            </div>
                            <div className="flex-1 space-y-0.5">
                              <p className="text-xs leading-normal">
                                <span className="font-medium text-foreground">
                                  {activity.user}
                                </span>{" "}
                                {activity.action} on{" "}
                                <span className="font-medium text-foreground">
                                  {activity.project}
                                </span>
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {activity.time}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
