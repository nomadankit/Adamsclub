import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BottomNavigation } from "./BottomNavigation"
import { Users, DollarSign, Package, TrendingUp, LogOut, Shield, Zap, MapPin, Crown } from "lucide-react"
import { useLocation } from "wouter"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

interface DashboardMetrics {
  keyMetrics: {
    totalMembers: number
    equipmentUtilization: string
    utilizationChange: string
    growthRate: string
  }
  platformOverview: {
    totalMembers: number
    equipmentItems: number
    activeLocations: number
    membershipTiers: number
  }
  recentRegistrations: Array<{
    id: string
    name: string
    plan: string
    timestamp: string
  }>
  utilizationByLocation: Array<{
    location: string
    count: number
  }>
  systemHealth: {
    apiResponseTime: string
    databaseStatus: string
    paymentGateway: string
  }
}

export function AdminDashboard() {
  const { user, hasPermission } = useAuth()
  // Removed date state as requested

  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  })

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        window.location.href = '/auth'
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleManageUsers = () => {
    console.log('Manage users clicked')
    // For now, navigate to a placeholder or settings page
    window.location.href = '/settings'
  }

  const handleViewAnalytics = () => {
    console.log('View analytics clicked')
    // For now, navigate to a placeholder or help page
    window.location.href = '/help'
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        {/* Admin Header */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-1 rounded-md text-sm dark:bg-red-900 dark:text-red-200">
                    <Shield className="h-3 w-3" />
                    <span>Admin</span>
                  </div>
                </div>
                <h1 className="text-3xl font-bold font-['Poppins']" data-testid="text-admin-welcome">
                  Admin Dashboard - {user?.firstName || 'Administrator'}
                </h1>
                <p className="text-muted-foreground">
                  System overview and management controls
                </p>
              </div>

              <Button
                variant="outline"
                onClick={handleLogout}
                data-testid="button-logout"
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-members">{metrics?.keyMetrics.totalMembers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.keyMetrics.growthRate || '+0%'} from last month
                  </p>
                </CardContent>
              </Card>

              {/* Revenue Card Removed */}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Equipment Utilization</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-equipment-utilization">{metrics?.keyMetrics.equipmentUtilization || '0%'}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.keyMetrics.utilizationChange || '+0%'} from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-growth-rate">{metrics?.keyMetrics.growthRate || '0%'}</div>
                  <p className="text-xs text-muted-foreground">
                    Monthly growth
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Admin Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {hasPermission('members.manage') && (
                <Card className="cursor-pointer hover-elevate" onClick={handleManageUsers}>
                  <CardContent className="flex items-center space-x-4 p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg" data-testid="button-manage-users">Manage Users</h3>
                      <p className="text-sm text-muted-foreground">User roles and permissions</p>
                    </div>
                  </CardContent>
                </Card>
              )}


              {hasPermission('perks.write') && (
                <Card className="cursor-pointer hover-elevate">
                  <CardContent className="flex items-center space-x-4 p-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <span className="text-accent font-semibold">P</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Manage Perks</h3>
                      <p className="text-sm text-muted-foreground">Add and edit member perks</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {hasPermission('inventory.manage') && (
                <Card className="cursor-pointer hover-elevate">
                  <CardContent className="flex items-center space-x-4 p-6">
                    <div className="w-12 h-12 bg-muted/10 rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground font-semibold">I</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Inventory</h3>
                      <p className="text-sm text-muted-foreground">Manage equipment and assets</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Platform Overview */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold font-['Poppins'] mb-6">Platform Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-members">{metrics?.platformOverview.totalMembers || 0}</div>
                    <p className="text-xs text-muted-foreground">Active subscriptions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Equipment Items</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-equipment-items">{metrics?.platformOverview.equipmentItems || 0}</div>
                    <p className="text-xs text-muted-foreground">Across all locations</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-active-locations">{metrics?.platformOverview.activeLocations || 0}</div>
                    <p className="text-xs text-muted-foreground">Pick-up points</p>
                  </CardContent>
                </Card>

              </div>
            </div>

            {/* System Status */}
            <div>
              <h2 className="text-2xl font-bold font-['Poppins'] mb-6">System Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Registrations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics?.recentRegistrations.map((user) => (
                        <div key={user.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <span className="text-sm" data-testid="text-recent-user">{user.name || 'New User'}</span>
                            <span className="text-xs text-muted-foreground ml-2 capitalize">{user.plan}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(user.timestamp).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">API Response Time</span>
                        <span className="text-xs text-green-600 font-medium" data-testid="text-api-response">{metrics?.systemHealth.apiResponseTime || '125ms'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Database Status</span>
                        <span className="text-xs text-green-600 font-medium" data-testid="text-db-status">{metrics?.systemHealth.databaseStatus || 'Healthy'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Payment Gateway</span>
                        <span className="text-xs text-green-600 font-medium" data-testid="text-payment-status">{metrics?.systemHealth.paymentGateway || 'Online'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Equipment by Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics?.utilizationByLocation.map((loc) => (
                        <div key={loc.location} className="flex items-center justify-between">
                          <span className="text-sm">{loc.location}</span>
                          <span className="text-xs bg-muted px-2 py-1 rounded font-medium">{loc.count} items</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  )
}