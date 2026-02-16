import { Home, Calendar, Zap, User, LayoutDashboard, Package, Users, Heart, MapPin, LogIn } from "lucide-react"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/useAuth"

export function BottomNavigation() {
  const [location, setLocation] = useLocation()
  const { user } = useAuth()

  const memberNavItems = [
    { id: "home", icon: Home, label: "Home", path: "/home" },
    { id: "bookings", icon: Calendar, label: "Bookings", path: "/bookings" },
    { id: "credits", icon: Zap, label: "Accounts", path: "/account" }
  ]

  const staffNavItems = [
    { id: "home", icon: Home, label: "Home", path: "/staff/home" },
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/staff/dashboard" },
    { id: "schedule", icon: Calendar, label: "Schedule", path: "/staff/schedule" },
    { id: "inventory", icon: Package, label: "Inventory", path: "/staff/inventory" },
    { id: "arrivals", icon: LogIn, label: "Arrivals", path: "/staff/arrivals" }
  ]

  const adminNavItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
    { id: "home", icon: Home, label: "Home", path: "/admin/home" },
    { id: "gear", icon: Package, label: "Gear", path: "/admin/gear" },
    { id: "perks", icon: Heart, label: "Perks", path: "/admin/perks" },
    { id: "locations", icon: MapPin, label: "Locations", path: "/admin/locations" }
  ]

  const userRole = user?.role || 'member'
  let navItems = memberNavItems

  if (userRole === 'staff') {
    navItems = staffNavItems
  } else if (userRole?.includes?.('admin')) {
    navItems = adminNavItems
  }

  const handleTabClick = (tabId: string, path: string) => {
    console.log(`${tabId} tab clicked`)
    setLocation(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map(({ id, icon: Icon, label, path }) => (
          <button
            key={id}
            onClick={() => handleTabClick(id, path)}
            data-testid={`button-nav-${id}`}
            className={`flex flex-col items-center space-y-1 py-2 px-3 min-w-0 flex-1 ${
              location === path
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            } transition-colors enhanced-button variant-ghost`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
