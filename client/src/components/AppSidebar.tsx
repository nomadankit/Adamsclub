import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Home, Scan, Calendar, Package, Users, BarChart3, ClipboardList, Mail, Settings } from "lucide-react"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/useAuth"

const staffMenuItems = [
  {
    title: "Dashboard",
    href: "/staff/home",
    icon: Home,
  },
  {
    title: "Check-In/Out",
    href: "/staff/checkin",
    icon: Scan,
  },
  {
    title: "Schedule",
    href: "/staff/schedule",
    icon: Calendar,
  },
  {
    title: "Inventory",
    href: "/staff/inventory",
    icon: Package,
  },
  {
    title: "Member Arrivals",
    href: "/staff/arrivals",
    icon: Users,
  },
  {
    title: "Email Config",
    href: "/admin/email-config",
    icon: Mail,
  },
]

export function AppSidebar() {
  const [location, setLocation] = useLocation()
  const { user } = useAuth()

  // Show sidebar for staff and admin
  if (user?.role !== 'staff' && user?.role !== 'admin') {
    return null
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Staff Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {staffMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = location === item.href
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="cursor-pointer"
                      data-testid={`sidebar-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <button onClick={() => setLocation(item.href)}>
                        <Icon />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
