import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Heart, MapPin, Crown, LogOut, Shield, ArrowRight, Cookie, Users, Briefcase, Mail } from "lucide-react"
import { useLocation } from "wouter"

export default function AdminHome() {
  const { user } = useAuth()
  const [, setLocation] = useLocation()

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        window.location.href = '/auth'
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const managementSections = [
    {
      title: "People Management",
      description: "Manage user roles, assign staff, assign membership tiers, and reset passwords in one unified interface",
      icon: Users,
      href: "/admin/people",
      color: "from-red-500 to-pink-600",
      testId: "card-people-management",
      buttonTestId: "button-manage-people",
    },
    {
      title: "Gear Management",
      description: "Add, edit, and manage all outdoor equipment and gear across locations",
      icon: Package,
      href: "/admin/gear",
      color: "from-blue-500 to-cyan-600",
      testId: "card-gear-management",
      buttonTestId: "button-manage-gear",
    },
    {
      title: "Consumables Management",
      description: "Add and manage consumable items for sale across locations",
      icon: Cookie,
      href: "/admin/consumables",
      color: "from-purple-500 to-pink-600",
      testId: "card-consumables-management",
      buttonTestId: "button-manage-consumables",
    },
    {
      title: "Perks Management",
      description: "Create and configure membership perks and benefits",
      icon: Heart,
      href: "/admin/perks",
      color: "from-pink-500 to-rose-600",
      testId: "card-perks-management",
      buttonTestId: "button-manage-perks",
    },
    {
      title: "Locations Management",
      description: "Manage pick-up locations, drop-off points, and location details",
      icon: MapPin,
      href: "/admin/locations",
      color: "from-green-500 to-emerald-600",
      testId: "card-locations-management",
      buttonTestId: "button-manage-locations",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        <section className="py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" data-testid="badge-admin">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin Portal
                  </Badge>
                </div>
                <h1 className="text-4xl font-bold font-['Poppins'] mb-2" data-testid="text-admin-home-title">
                  Adam's Club Management
                </h1>
                <p className="text-muted-foreground text-lg">
                  Welcome, {user?.firstName || 'Administrator'}. Manage all aspects of the platform.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                data-testid="button-logout"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>

            {/* Management Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {managementSections.map((section) => {
                const Icon = section.icon
                return (
                  <Card
                    key={section.href}
                    className="hover-elevate transition-all cursor-pointer"
                    data-testid={section.testId}
                    onClick={() => setLocation(section.href)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${section.color} mb-4`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <CardTitle className="text-2xl" data-testid={`text-${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
                            {section.title}
                          </CardTitle>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground mt-1" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-6">
                        {section.description}
                      </p>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          setLocation(section.href)
                        }}
                        data-testid={section.buttonTestId}
                        className="w-full"
                      >
                        Manage
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

          </div>
        </section>
      </main>
    </div>
  )
}
