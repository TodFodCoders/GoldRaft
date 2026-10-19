"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { AddCircleIcon, LetterIcon } from "@solar-icons/react/outline"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    badge?: string
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground cursor-pointer shadow-xs"
            >
              <AddCircleIcon className="size-4" />
              <span className="font-medium">Quick Create</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 shrink-0 group-data-[collapsible=icon]:hidden cursor-pointer"
              variant="outline"
              title="Notifications / Inbox"
            >
              <LetterIcon className="size-4" />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.isActive !== undefined
                ? item.isActive
                : item.url === "/"
                ? pathname === "/"
                : pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url))

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  tooltip={item.title}
                  isActive={isActive}
                  className="cursor-pointer font-medium"
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
                {item.badge && (
                  <SidebarMenuBadge className="text-[11px] font-semibold">
                    {item.badge}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

