
import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon, Clock, MapPin, QrCode, Plus, Mountain, CheckCircle, AlertCircle, Hourglass, CheckCheck, XCircle, Filter, Search, ChevronRight, Package, Waves, Bike, Tent, Backpack } from "lucide-react"
import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import QRCodeGenerator from 'qrcode'
import { useAuth } from "@/hooks/useAuth"

type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled'
type BookingType = 'kayak' | 'camping' | 'bike' | 'hiking'

interface Booking {
  id: string
  benefitId: string
  benefitTitle: string
  benefitIcon: string
  date: string
  time: string
  location: string
  status: BookingStatus
  type: BookingType
  duration: string
  qrCode?: string
  qrToken?: string
  checkInTime?: string
  checkOutTime?: string
  notes?: string
}

export default function Bookings() {
  const { user } = useAuth()
  const [, setLocation] = useLocation()
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [activeTab, setActiveTab] = useState<BookingStatus>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<BookingType | 'all'>('all')
  const [bookingStep, setBookingStep] = useState<'select' | 'details' | 'confirm'>('select')
  const [selectedBenefit, setSelectedBenefit] = useState<any>(null)
  const [bookingInProgress, setBookingInProgress] = useState(false)

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [bookingDetails, setBookingDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    location: '',
    duration: '1'
  })

  // Fetch available assets/benefits
  const { data: availableAssets = [], isLoading: isLoadingAssets } = useQuery({
    queryKey: ['availability', bookingDetails.date],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: bookingDetails.date,
        type: filterType === 'all' ? '' : filterType
      });
      const res = await fetch(`/api/availability?${params}`);
      if (!res.ok) throw new Error('Failed to fetch availability');
      return res.json();
    }
  });

  const { data: apiBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings');
      if (!res.ok) throw new Error('Failed to fetch bookings');
      return res.json();
    }
  });

  const handleNewBooking = () => {
    setBookingStep('select');
    setSelectedBenefit(null);
    setShowBookingModal(true);
  };

  const getAvailableTimeSlots = () => {
    if (!selectedBenefit) return [];

    // Find the availability data for the selected asset
    const assetAvailability = availableAssets.find((a: any) => a.asset.id === selectedBenefit.id);
    if (!assetAvailability) return [];

    const now = new Date();
    const isToday = new Date(bookingDetails.date).toDateString() === now.toDateString();

    return assetAvailability.slots.map((slot: any) => {
      // Parse slot time
      const [h, m] = slot.time.split(':').map(Number);

      // Check if time is in past (if today)
      let isDisabled = false;
      if (isToday) {
        if (h < now.getHours() || (h === now.getHours() && m < now.getMinutes())) {
          isDisabled = true;
        }
      }

      // Check stock availability
      if (slot.available <= 0) {
        isDisabled = true;
      }

      return {
        ...slot,
        disabled: isDisabled
      };
    });
  };

  const timeSlots = getAvailableTimeSlots();

  const getEndTimeOptions = () => {
    if (!bookingDetails.time || timeSlots.length === 0) return [];

    const options = [
      { label: '30 min', value: '0.5' },
      { label: '1 hour', value: '1' },
      { label: '1.5 hours', value: '1.5' },
      { label: '2 hours', value: '2' },
      { label: '3 hours', value: '3' },
      { label: '4 hours', value: '4' },
      { label: 'Full Day', value: '8' }
    ];

    const startIndex = timeSlots.findIndex((s: any) => s.time === bookingDetails.time);
    if (startIndex === -1) return [];

    return options.map(opt => {
      const hours = parseFloat(opt.value);
      const slotsNeeded = Math.ceil(hours * 2);

      let disabled = false;
      for (let i = 0; i < slotsNeeded; i++) {
        const slotIndex = startIndex + i;
        if (slotIndex >= timeSlots.length) {
          // allow if it fits within day roughly, or break
        }
        if (timeSlots[slotIndex] && timeSlots[slotIndex].disabled) {
          disabled = true;
          break;
        }
      }
      return { ...opt, disabled };
    });
  };

  // Helper to map assets to benefit UI model
  const mapAssetToBenefit = (assetData: any) => {
    if (!assetData || !assetData.asset) return null;
    const asset = assetData.asset;
    const typeMap: Record<string, string> = {
      'kayak': 'kayak',
      'camping': 'camping',
      'bike': 'bike',
      'hiking': 'hiking'
    };

    const iconMap: Record<string, any> = {
      'kayak': '🌊',
      'camping': '⛺',
      'bike': '🚲',
      'hiking': '⛰️'
    };

    let type = typeMap[asset.type];
    if (!type) {
      const category = (asset.category || '').toLowerCase();
      if (category.includes('bike')) type = 'bike';
      else if (category.includes('camp')) type = 'camping';
      else if (category.includes('water') || category.includes('kayak') || category.includes('board')) type = 'kayak';
      else if (category.includes('hike') || category.includes('backpack')) type = 'hiking';
      else type = 'kayak';
    }

    // Calculate total remaining stock for the day (min of all slots? or max?)
    // Actually, "remaining" in the card usually means "can I book it at all today?"
    // Let's use the max available across all slots as "remaining capacity" perception
    const maxAvailable = Math.max(...assetData.slots.map((s: any) => s.available));
    const totalStock = assetData.slots[0]?.total || 0;

    return {
      id: asset.id,
      title: asset.name,
      description: asset.description ? asset.description : (asset.brand && asset.model ? `${asset.brand} ${asset.model}` : 'Standard Gear'),
      duration: 'Full day', // Default
      remaining: maxAvailable,
      total: totalStock,
      icon: iconMap[type] || '📦',
      creditCost: asset.creditPrice || asset.mainPrice || 0, // Fallback to mainPrice if creditPrice missing
      type: type as BookingType,
      popular: asset.condition === 'new' // Just a dummy heuristic
    };
  };

  const membershipBenefits = (Array.isArray(availableAssets) ? availableAssets : [])
    .map(mapAssetToBenefit)
    .filter(Boolean)
    .filter((benefit) => {
      if (!benefit) return false;
      const plan = (user as any)?.subscriptionPlan;

      // Default fallback logic, if they are staff or admin map to VIP or let them see all
      if ((user as any)?.role === 'admin' || (user as any)?.role === 'staff') {
        return true;
      }

      if (!plan) return false;

      const normalizedPlan = plan.toLowerCase();

      if (normalizedPlan === 'base-explorer' || normalizedPlan === 'base') {
        return ['bike', 'camping'].includes(benefit.type);
      } else if (normalizedPlan === 'premium-adventurer' || normalizedPlan === 'premium') {
        return ['bike', 'camping', 'kayak'].includes(benefit.type);
      } else if (normalizedPlan === 'vip-pathfinder' || normalizedPlan === 'vip' || normalizedPlan === 'employee') {
        return true;
      }
      return false;
    });

  // Use real bookings from API
  const mockBookings: Booking[] = apiBookings

  const handleViewQR = async (booking: Booking) => {
    setSelectedBooking(booking)
    const token = (booking as any).qrToken || booking.qrCode
    if (token) {
      const qrUrl = await generateQRCode(token)
      setQrCodeUrl(qrUrl)
    }
    setShowQRModal(true)
  }

  const getStatusBadge = (status: BookingStatus, isExpired: boolean = false) => {
    if (isExpired) {
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 flex items-center space-x-1">
          <Hourglass className="h-3 w-3" />
          <span>Expired</span>
        </Badge>
      )
    }
    const configs: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'Upcoming', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Hourglass },
      active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
      completed: { label: 'Completed', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: CheckCheck },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle }
    }
    const config = configs[status] || configs.pending
    const Icon = config.icon
    return (
      <Badge className={`${config.className} flex items-center space-x-1`}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </Badge>
    )
  }

  const filteredBookings = (mockBookings || [])
    .filter(b => {
      // Robust status matching
      const currentStatus = b.status?.toLowerCase();
      const targetStatus = activeTab?.toLowerCase();

      if (currentStatus !== targetStatus) return false;

      // For "Upcoming" (pending) tab, only show future bookings
      if (activeTab === 'pending') {
        const bookingDate = new Date(b.date);
        const [hours, minutes] = b.time.split(':').map(Number);
        bookingDate.setHours(hours, minutes, 0, 0);
        return bookingDate > new Date();
      }

      // For "Active" tab, double check if it should have been completed by now (frontend safety)
      if (activeTab === 'active') {
        const bookingDate = new Date(b.date);
        const [hours, minutes] = b.time.split(':').map(Number);
        // Assuming duration is in hours for this check
        const durationHours = parseFloat(b.duration || '1');
        bookingDate.setHours(hours + durationHours, minutes, 0, 0);
        if (bookingDate < new Date()) return false;
      }

      return true;
    })
    .filter(b => filterType === 'all' || b.type === filterType)
    .filter(b => searchQuery === '' ||
      b.benefitTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (activeTab === 'pending') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })

  const expiredBookings = mockBookings.filter(b => {
    if (b.status !== 'pending') return false;
    const bookingDate = new Date(b.date);
    const [hours, minutes] = b.time.split(':').map(Number);
    bookingDate.setHours(hours, minutes, 0, 0);
    return bookingDate <= new Date();
  });

  const getBookingCount = (status: BookingStatus) => {
    if (status === 'pending') {
      // Correctly count only the items actually shown in the filtered list
      return filteredBookings.filter(b => b.status === 'pending').length;
    }
    if (status === 'cancelled') {
      // Count actual cancelled ones plus the expired ones
      const actualCancelled = mockBookings.filter(b => b.status === 'cancelled').length;
      return actualCancelled + expiredBookings.length;
    }
    return mockBookings.filter(b => b.status === status).length
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Waves': return <Waves className="h-6 w-6 text-primary" />
      case 'Tent': return <Tent className="h-6 w-6 text-primary" />
      case 'Bike': return <Bike className="h-6 w-6 text-primary" />
      case 'Mountain': return <Mountain className="h-6 w-6 text-primary" />
      case 'Backpack': return <Backpack className="h-6 w-6 text-primary" />
      default: return <Package className="h-6 w-6 text-primary" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        {/* Page Header */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold font-['Poppins']">My Bookings</h1>
                <p className="text-muted-foreground">
                  Manage your gear reservations and experiences
                </p>
              </div>
              <Button
                onClick={handleNewBooking}
                className="enhanced-button variant-primary"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as BookingType | 'all')}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="kayak">Kayak</SelectItem>
                  <SelectItem value="camping">Camping</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="hiking">Hiking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Bookings Tabs */}
        <section className="py-4">
          <div className="max-w-6xl mx-auto">
            {isLoadingBookings ? (
              <div className="text-center py-16">
                <div className="text-muted-foreground">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p className="text-lg">Loading bookings...</p>
                </div>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BookingStatus)}>
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="pending" className="relative">
                    Upcoming
                    {getBookingCount('pending') > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {getBookingCount('pending')}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="active" className="relative">
                    Active
                    {getBookingCount('active') > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {getBookingCount('active')}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="cancelled">
                    Cancelled
                  </TabsTrigger>
                </TabsList>

                {(['pending', 'active', 'completed', 'cancelled'] as BookingStatus[]).map(status => {
                  const displayBookings = status === 'pending'
                    ? filteredBookings
                    : status === 'cancelled'
                      ? [
                        ...filteredBookings,
                        ...expiredBookings.map(b => ({ ...b, isExpired: true, notes: 'Expired (Time passed)' }))
                      ]
                      : filteredBookings;

                  return (
                    <TabsContent key={status} value={status} className="space-y-4">
                      {displayBookings.length === 0 ? (
                        <div className="text-center py-16">
                          <div className="text-muted-foreground">
                            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg mb-2">No {status} bookings</p>
                            <p className="text-sm">
                              {status === 'pending' && "Book your next adventure to get started"}
                              {status === 'active' && "No gear currently checked out"}
                              {status === 'completed' && "Your completed adventures will appear here"}
                              {status === 'cancelled' && "No cancelled or expired bookings"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        displayBookings.map(booking => (
                          <Card
                            key={booking.id}
                            className="hover-card cursor-pointer transition-all duration-200"
                            onClick={() => {
                              setSelectedBooking(booking)
                              setShowDetailsModal(true)
                            }}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                                    {getIcon(booking.benefitIcon)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <h3 className="font-semibold text-lg">{booking.benefitTitle}</h3>
                                      {getStatusBadge(booking.status, (booking as any).isExpired)}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                      <div className="flex items-center space-x-1">
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        <span>{formatDate(booking.date)}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{booking.time}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span>{booking.location}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              </div>

                              {booking.status === 'active' && booking.checkInTime && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Checked in at {booking.checkInTime}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleViewQR(booking)
                                      }}
                                    >
                                      <QrCode className="h-3.5 w-3.5 mr-1.5" />
                                      View QR
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {booking.status === 'pending' && (booking as any).qrToken && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      <span className="text-sm font-medium">QR Pass Ready</span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleViewQR(booking)
                                      }}
                                    >
                                      <QrCode className="h-3.5 w-3.5 mr-1.5" />
                                      View QR
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {booking.notes && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <p className="text-sm text-muted-foreground flex items-start space-x-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <span>{booking.notes}</span>
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </div>
        </section>
      </main>

      {/* Booking Benefits Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-none px-6 pt-6">
            <DialogTitle className="flex items-center space-x-2">
              <Mountain className="h-5 w-5 text-primary" />
              <span>Book Your Adventure</span>
            </DialogTitle>
            <DialogDescription>
              {bookingStep === 'select' && 'Choose from your available monthly benefits that require advance booking.'}
              {bookingStep === 'details' && 'Select your preferred date, time, and location.'}
              {bookingStep === 'confirm' && 'Review and confirm your booking details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
            {bookingStep === 'select' && (
              <div className="space-y-3">
                {membershipBenefits.map((benefit) => (
                  <Card
                    key={benefit.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${benefit.remaining > 0
                      ? 'border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20'
                      : 'opacity-50 border-gray-200 dark:border-gray-800'
                      } ${benefit.popular ? 'ring-2 ring-primary/20' : ''}`}
                    onClick={() => handleSelectBenefit(benefit)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{benefit.icon}</div>
                          <div>
                            <h3 className="font-semibold text-sm flex items-center space-x-2">
                              <span>{benefit.title}</span>
                              {benefit.popular && (
                                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                                  Popular
                                </Badge>
                              )}
                            </h3>
                            <p className="text-xs text-muted-foreground">{benefit.description}</p>
                          </div>
                        </div>
                        {benefit.remaining > 0 && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{benefit.duration}</span>
                        </div>
                        <div className="text-xs text-right">
                          <span className="font-bold text-primary block mb-1">
                            {benefit.creditCost} Credits
                          </span>
                          <span className={`font-semibold ${benefit.remaining > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                            {benefit.remaining} of {benefit.total} remaining
                          </span>
                        </div>
                      </div>

                      {benefit.remaining === 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          All monthly allowances used. Resets next month.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 pb-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-3">
                      Need more adventures? Upgrade your membership or purchase à la carte.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setLocation('/upgrade')}
                    >
                      Upgrade Plan
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {bookingStep === 'details' && selectedBenefit && (
              <div className="space-y-4 pb-4">
                <Card className="p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="text-2xl">{selectedBenefit.icon}</div>
                    <div>
                      <h3 className="font-semibold">{selectedBenefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{selectedBenefit.description}</p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !bookingDetails.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {bookingDetails.date ? format(new Date(bookingDetails.date), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={bookingDetails.date ? new Date(bookingDetails.date) : undefined}
                          onSelect={(date) => {
                            setBookingDetails(prev => ({
                              ...prev,
                              date: date ? format(date, "yyyy-MM-dd") : '',
                              time: '',
                              duration: '' // Reset time/duration on date change
                            }));
                          }}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">Start Time</label>
                    <Select
                      value={bookingDetails.time}
                      onValueChange={(value) => setBookingDetails(prev => ({ ...prev, time: value, duration: '' }))}
                      disabled={!bookingDetails.date}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={bookingDetails.date ? "Select start time" : "Pick a date first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {timeSlots.map((slot: any) => (
                          <SelectItem
                            key={slot.time}
                            value={slot.time}
                            disabled={slot.disabled}
                            className={slot.disabled ? 'opacity-50' : ''}
                          >
                            {formatTime(slot.time)} {slot.disabled ? '(Unavailable)' : ''}
                          </SelectItem>
                        ))}
                        {timeSlots.length === 0 && bookingDetails.date && (
                          <div className="p-2 text-sm text-gray-500 text-center">Loading or no slots...</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">End Time</label>
                    <Select
                      value={bookingDetails.duration}
                      onValueChange={(value) => setBookingDetails(prev => ({ ...prev, duration: value }))}
                      disabled={!bookingDetails.time}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={bookingDetails.time ? "Select end time" : "Select start time first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getEndTimeOptions().map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            disabled={opt.disabled}
                            className={opt.disabled ? 'opacity-50' : ''}
                          >
                            {opt.label} {opt.disabled ? '(Unavailable)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Select
                      value={bookingDetails.location}
                      onValueChange={(value) => setBookingDetails(prev => ({ ...prev, location: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lake Marina Dock A">Lake Marina Dock A</SelectItem>
                        <SelectItem value="Equipment Center">Equipment Center</SelectItem>
                        <SelectItem value="Trailhead Station">Trailhead Station</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setBookingStep('select')}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 enhanced-button variant-primary"
                    onClick={handleProceedToConfirm}
                    disabled={!bookingDetails.date || !bookingDetails.time || !bookingDetails.duration || !bookingDetails.location}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {bookingStep === 'confirm' && selectedBenefit && (
              <div className="space-y-4 pb-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Booking Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">{selectedBenefit.icon}</div>
                      <div>
                        <p className="font-medium">{selectedBenefit.title}</p>
                        <p className="text-sm text-muted-foreground">{selectedBenefit.description}</p>
                      </div>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">{formatDate(bookingDetails.date)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-medium">{bookingDetails.time}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{bookingDetails.location}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{selectedBenefit.duration}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="flex space-x-2">
                  <Button variant="outline" className="flex-1" onClick={() => setBookingStep('details')} disabled={bookingInProgress}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 enhanced-button variant-primary"
                    onClick={handleConfirmBooking}
                    disabled={bookingInProgress}
                  >
                    {bookingInProgress ? 'Booking...' : 'Confirm Booking'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              View complete information about this booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-3 pb-4 border-b">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                  {getIcon(selectedBooking.benefitIcon)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedBooking.benefitTitle}</h3>
                  {getStatusBadge(selectedBooking.status)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedBooking.date)}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">{selectedBooking.time}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{selectedBooking.location}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Hourglass className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">{selectedBooking.duration}</p>
                  </div>
                </div>

                {selectedBooking.checkInTime && (
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Check-in Time</p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.checkInTime}</p>
                    </div>
                  </div>
                )}

                {selectedBooking.checkOutTime && (
                  <div className="flex items-start space-x-3">
                    <CheckCheck className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Check-out Time</p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.checkOutTime}</p>
                    </div>
                  </div>
                )}

                {selectedBooking.notes && (
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Notes</p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.notes}</p>
                    </div>
                  </div>
                )}

                {selectedBooking.qrCode && (
                  <div className="flex items-start space-x-3">
                    <QrCode className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Booking Code</p>
                      <p className="text-sm text-muted-foreground font-mono">{selectedBooking.qrCode}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t space-y-2">
                {(selectedBooking.status === 'pending' || selectedBooking.status === 'active') && selectedBooking.qrCode && (
                  <Button
                    className="w-full enhanced-button variant-primary"
                    onClick={() => {
                      setShowDetailsModal(false)
                      setShowQRModal(true)
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    View QR Code
                  </Button>
                )}

                {selectedBooking.status === 'pending' && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to cancel this booking?')) {
                        cancelBookingMutation.mutate(selectedBooking.id)
                      }
                    }}
                    disabled={cancelBookingMutation.isPending}
                  >
                    {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Booking QR Code</DialogTitle>
            <DialogDescription>
              Show this QR code at check-in
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-6">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border-2 border-primary/20 mb-4">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Booking QR Code" className="w-full h-auto rounded" />
                ) : (
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                    <QrCode className="h-32 w-32 text-primary" />
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking:</span>
                  <span className="font-medium">{selectedBooking.benefitTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{formatDate(selectedBooking.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">{selectedBooking.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code:</span>
                  <span className="font-mono font-medium">{selectedBooking.qrCode}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  )
}
