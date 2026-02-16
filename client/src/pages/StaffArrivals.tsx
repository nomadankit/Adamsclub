import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react"
import { useLocation } from "wouter"

interface Booking {
  id: string
  assetName: string
  memberName: string
  status: string
  startTime: string
  qrCode: string
  checkedOutAt?: string
  checkedInAt?: string
}

interface StaffDashboardData {
  bookings: Booking[]
  inventory: {
    total: number
    available: number
    maintenance: number
    unavailable: number
  }
  pendingCheckIns: number
  totalToday: number
}

export default function StaffArrivals() {
  const [, setLocation] = useLocation()
  const { data: dashboard, isLoading } = useQuery<StaffDashboardData>({
    queryKey: ['/api/staff/dashboard/today'],
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading member arrivals...</p>
        </div>
      </div>
    )
  }

  const bookings = dashboard?.bookings || []
  const pending = bookings.filter(b => b.status !== 'checked_out')
  const checkedOut = bookings.filter(b => b.status === 'checked_out')

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/staff/home')}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold font-['Poppins']" data-testid="text-arrivals-title">
                  Member Arrivals & Pickups
                </h1>
                <p className="text-muted-foreground">
                  Manage member check-in and gear pickup
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card data-testid="card-total-members">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Members Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{bookings.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">All bookings</p>
                </CardContent>
              </Card>

              <Card data-testid="card-awaiting-pickup">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Awaiting Pickup
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{pending.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Not yet checked out</p>
                </CardContent>
              </Card>

              <Card data-testid="card-already-checked-out">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Already Checked Out
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{checkedOut.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">In use</p>
                </CardContent>
              </Card>
            </div>

            {/* Awaiting Pickup Section */}
            <div className="space-y-6">
              <div data-testid="section-awaiting-pickup">
                <h2 className="text-2xl font-bold font-['Poppins'] mb-4">
                  Awaiting Pickup ({pending.length})
                </h2>
                {pending.length > 0 ? (
                  <div className="space-y-3">
                    {pending.map((booking) => (
                      <Card
                        key={booking.id}
                        className="cursor-pointer hover-elevate border-blue-200 dark:border-blue-800"
                        data-testid={`card-member-${booking.id}`}
                        onClick={() => setLocation('/staff/checkin')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold text-lg">{booking.memberName}</h3>
                              <p className="text-sm text-muted-foreground">
                                Booking: {booking.assetName}
                              </p>
                              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(booking.startTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Ready for Checkout
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="h-8 w-8 text-blue-600 mx-auto mb-2 opacity-50" />
                      <p className="text-muted-foreground">All members have been checked out</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Already Checked Out Section */}
              <div data-testid="section-checked-out">
                <h2 className="text-2xl font-bold font-['Poppins'] mb-4">
                  Already Checked Out ({checkedOut.length})
                </h2>
                {checkedOut.length > 0 ? (
                  <div className="space-y-3">
                    {checkedOut.map((booking) => (
                      <Card
                        key={booking.id}
                        className="cursor-pointer hover-elevate border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                        data-testid={`card-checked-out-${booking.id}`}
                        onClick={() => setLocation('/staff/checkin')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold text-lg">{booking.memberName}</h3>
                              <p className="text-sm text-muted-foreground">
                                Using: {booking.assetName}
                              </p>
                              {booking.checkedOutAt && (
                                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Checked out at{' '}
                                  {new Date(booking.checkedOutAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              )}
                            </div>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              In Use
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-8 w-8 text-green-600 mx-auto mb-2 opacity-50" />
                      <p className="text-muted-foreground">No members currently using equipment</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
