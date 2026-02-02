"use client"

import * as React from "react"
import {
  BriefcaseBusiness,
  CalendarClock,
  LayoutDashboard,
  MapPin,
  Package,
  ShieldCheck,
  Users,
  Wrench,
  MessageSquare,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Naqiago Ops",
    email: "ops@naqiago.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Operations",
      logo: LayoutDashboard,
      plan: "Admin",
    },

  ],
  navMain: [

  ],
  projects: [
    {
      name: "Overview",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Customers",
      url: "/dashboard/customers",
      icon: Users,
    },
    {
      name: "Services",
      url: "/dashboard/services",
      icon: Package,
    },
    {
      name: "Bookings",
      url: "/dashboard/bookings",
      icon: CalendarClock,
    },
    {
      name: "Map",
      url: "/dashboard/map",
      icon: MapPin,
    },
    {
      name: "Workers",
      url: "/dashboard/workers",
      icon: Wrench,
    },
    {
      name: "Payments",
      url: "/dashboard/payments",
      icon: ShieldCheck,
    },
    {
      name: "Messages",
      url: "/dashboard/messages",
      icon: MessageSquare,
    },
  ],
}

export function AppSidebar({
  ...props
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2">
          <TeamSwitcher teams={data.teams} />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
