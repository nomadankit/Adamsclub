import { useAuth } from "@/hooks/useAuth"
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Scan, Calendar, Users, Settings, LogOut, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { LiveGearView } from "./LiveGearView"
import { useState, useEffect } from "react"
import { format } from "date-fns"

export default function StaffDashboard() {
  const { user, logout } = useAuth()
  const [, setLocation] = useLocation();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch("/api/staff/dashboard/today");
        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    logout();
  }

  const handleQRScan = () => {
    setLocation('/bookings'); // Placeholder
  }

  const handleManageBookings = () => {
    setLocation('/bookings');
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Staff Header */}
      <section className="bg-white border-b py-8 mb-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Staff Portal
                </Badge>
              </div>
              <h1 className="text-3xl font-bold">
                Welcome, {user?.firstName || 'Staff Member'}
              </h1>
              <p className="text-muted-foreground">
                {format(new Date(), "EEEE, MMMM do, yyyy")}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="live-status">Live Gear Status</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.pendingCheckIns || 0}</div>
                  <p className="text-xs text-muted-foreground">Checked out items</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Gear</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.inventory?.available || 0}</div>
                  <p className="text-xs text-muted-foreground">Ready for booking</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.totalToday || 0}</div>
                  <p className="text-xs text-muted-foreground">Scheduled for today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{dashboardData?.inventory?.maintenance || 0}</div>
                  <p className="text-xs text-muted-foreground">Items down</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
              {/* Today's Schedule List */}
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {dashboardData?.bookings?.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No bookings scheduled for today.</p>
                    ) : (
                      dashboardData?.bookings?.map((booking: any) => (
                        <div key={booking.id} className="flex items-center">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">{booking.assetName}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(booking.startTime), "h:mm a")} - {booking.memberName}
                            </p>
                          </div>
                          <div className="ml-auto font-medium">
                            <Badge variant={booking.status === 'active' ? 'secondary' : 'outline'}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="col-span-3 space-y-4">
                <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={handleQRScan}>
                  <CardContent className="flex items-center space-x-4 p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Scan className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Scanner</h3>
                      <p className="text-sm text-muted-foreground">Quick check-in/out</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={handleManageBookings}>
                  <CardContent className="flex items-center space-x-4 p-6">
                    <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Bookings</h3>
                      <p className="text-sm text-muted-foreground">Manage reservations</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="live-status">
            <LiveGearView />
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Inventory management implementation coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}