import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scan, LogOut, AlertCircle, CheckCircle2, Clock, TrendingUp, Boxes, AlertTriangle, User, RefreshCw } from "lucide-react"
import { useLocation } from "wouter"
import { useQuery, useQueryClient } from "@tanstack/react-query"

interface StaffDashboardData {
  bookings: Array<{
    id: string
    assetName: string
    assetId: string
    memberName: string
    status: string
    startTime: string
    qrCode?: string
  }>
  inventory: {
    total: number
    available: number
    maintenance: number
    unavailable: number
  }
  pendingCheckIns: number
  totalToday: number
}

export default function StaffDashboard() {
  const { user } = useAuth()
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()

  const { data: dashboardData, isLoading, isError, error, refetch, isFetching } = useQuery<StaffDashboardData>({
    queryKey: ['/api/staff/dashboard/today'],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
    retry: 2,
  })

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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/staff/dashboard/today'] })
    refetch()
  }

  const todayBookings = dashboardData?.totalToday ?? 0
  const activeCheckouts = dashboardData?.bookings?.filter(b => b.status === 'checked_out').length ?? 0
  const pendingCheckIns = dashboardData?.pendingCheckIns ?? 0
  const inventoryTotal = dashboardData?.inventory?.total ?? 0
  const inventoryAvailable = dashboardData?.inventory?.available ?? 0
  const maintenanceItems = dashboardData?.inventory?.maintenance ?? 0

  const quickActions = [
    {
      icon: Scan,
      label: "Scan Equipment",
      description: "Scan barcodes to check in or update status",
      href: "/staff/scan",
    },
    {
      icon: User,
      label: "Scan Member ID",
      description: "Scan member QR to view profile and bookings",
      href: "/staff/members/scan",
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
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="secondary">Staff Dashboard</Badge>
                </div>
                <h1 className="text-3xl font-bold">Welcome, {user?.firstName || 'Staff Member'}</h1>
                <p className="text-muted-foreground mt-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  title="Refresh dashboard"
                  data-testid="button-refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Error State */}
            {isError && (
              <Card className="mb-8 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20" data-testid="card-error">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold">Unable to load dashboard data</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        There was a problem fetching the latest metrics. The data shown may be outdated.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        className="mt-3"
                      >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <div className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                        <div className="h-8 bg-muted rounded w-12"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Today's Stats */}
            {!isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card data-testid="card-stat-today-bookings">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Today's Bookings</p>
                        <p className="text-3xl font-bold">{todayBookings}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-stat-active-checkouts">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Checkouts</p>
                        <p className="text-3xl font-bold">{activeCheckouts}</p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-stat-pending-returns">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Returns</p>
                        <p className="text-3xl font-bold">{pendingCheckIns}</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-stat-maintenance">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Maintenance Items</p>
                        <p className="text-3xl font-bold">{maintenanceItems}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Inventory Overview */}
            {!isLoading && (
              <Card className="mb-8" data-testid="card-inventory-overview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Boxes className="h-5 w-5" />
                    Inventory Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Items</p>
                      <p className="text-2xl font-bold">{inventoryTotal}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Available</p>
                      <p className="text-2xl font-bold text-green-600">{inventoryAvailable}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">In Maintenance</p>
                      <p className="text-2xl font-bold text-red-600">{maintenanceItems}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alerts Section */}
            {maintenanceItems > 0 && (
              <Card className="mb-8 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20" data-testid="card-alerts">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold">Maintenance Alert</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {maintenanceItems} item{maintenanceItems !== 1 ? 's' : ''} need{maintenanceItems !== 1 ? '' : 's'} maintenance attention. Check inventory for details.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setLocation('/staff/inventory')}
                        className="mt-3"
                        data-testid="button-view-inventory"
                      >
                        View Inventory
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Card
                      key={action.href}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setLocation(action.href)}
                      data-testid={`card-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{action.label}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
