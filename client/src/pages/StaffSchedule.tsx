import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User, ArrowLeft, ChevronUp } from "lucide-react"
import { useLocation } from "wouter"
import { useState } from "react"

interface Booking {
  id: string
  assetName: string
  assetId: string
  memberName: string
  memberEmail: string
  status: string
  startTime: string
  endTime: string
  qrCode: string
  checkedOutAt?: string
  checkedInAt?: string
}

interface MonthlyScheduleData {
  bookingsByDate: Record<string, Booking[]>
  currentMonth: string
  totalBookings: number
}

export default function StaffSchedule() {
  const [, setLocation] = useLocation()
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const { data: monthlySchedule, isLoading } = useQuery<MonthlyScheduleData>({
    queryKey: ['/api/staff/dashboard/month'],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading schedule...</p>
        </div>
      </div>
    )
  }

  const bookingsByDate = monthlySchedule?.bookingsByDate || {}
  const dates = Object.keys(bookingsByDate).sort()

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Out'
      case 'completed':
        return 'Returned'
      case 'pending':
        return 'Pending'
      case 'cancelled':
        return 'Cancelled'
      case 'no_show':
        return 'No Show'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'pending':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'cancelled':
      case 'no_show':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  const toggleDateExpanded = (dateKey: string) => {
    const newSet = new Set(expandedDates)
    if (newSet.has(dateKey)) {
      newSet.delete(dateKey)
    } else {
      newSet.add(dateKey)
    }
    setExpandedDates(newSet)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const formatTime = (dateTime: string) => {
    if (!dateTime) return '--:--'
    const date = new Date(dateTime)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  const totalStats = {
    total: dates.reduce((sum, date) => sum + (bookingsByDate[date]?.length || 0), 0),
    checkedOut: dates.reduce((sum, date) => sum + (bookingsByDate[date]?.filter(b => b.status === 'active').length || 0), 0),
    checkedIn: dates.reduce((sum, date) => sum + (bookingsByDate[date]?.filter(b => b.status === 'completed').length || 0), 0),
    pending: dates.reduce((sum, date) => sum + (bookingsByDate[date]?.filter(b => b.status === 'pending').length || 0), 0),
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        <section className="py-8">
          <div className="max-w-5xl mx-auto">
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
                <h1 className="text-3xl font-bold font-['Poppins']" data-testid="text-schedule-title">
                  {monthlySchedule?.currentMonth} Schedule
                </h1>
                <p className="text-muted-foreground">
                  {monthlySchedule?.totalBookings || 0} booking{(monthlySchedule?.totalBookings || 0) !== 1 ? 's' : ''} remaining this month
                </p>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Checked Out</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{totalStats.checkedOut}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Returned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{totalStats.checkedIn}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{totalStats.pending}</div>
                </CardContent>
              </Card>
            </div>

            {/* Schedule by Date */}
            {dates.length > 0 ? (
              <div className="space-y-4">
                {dates.map((dateKey) => {
                  const dayBookings = bookingsByDate[dateKey] || []
                  
                  return (
                    <div key={dateKey} className="space-y-3" data-testid={`section-date-${dateKey}`}>
                      <div className="flex items-center gap-3 px-1">
                        <Calendar className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                          {formatDate(dateKey)}
                        </h3>
                        <Badge variant="outline" className="ml-auto text-[10px] py-0 h-4">
                          {dayBookings.length} {dayBookings.length === 1 ? 'Booking' : 'Bookings'}
                        </Badge>
                      </div>

                      <div className="grid gap-3">
                        {dayBookings.map((booking) => (
                          <Card 
                            key={booking.id} 
                            className="overflow-hidden border-l-4 border-l-primary/50 hover:border-l-primary transition-all"
                            data-testid={`booking-card-${booking.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-base truncate">{booking.assetName}</h4>
                                    <Badge className={`${getStatusColor(booking.status)} text-[10px] px-2 py-0 uppercase font-bold tracking-tighter`}>
                                      {getStatusLabel(booking.status)}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5" />
                                      <span className="font-medium text-foreground/80">{booking.memberName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span className="font-medium text-foreground/80">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0">
                                  {booking.status === 'pending' || booking.status === 'active' ? (
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      className="h-8 text-xs font-bold"
                                      onClick={() => setLocation(`/staff/scan?id=${booking.id}`)}
                                    >
                                      Scan
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No bookings scheduled for the rest of this month</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
