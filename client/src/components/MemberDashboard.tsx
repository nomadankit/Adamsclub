import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ExploreGear } from "./ExploreGear"
import { BottomNavigation } from "./BottomNavigation"
import { Calendar, Clock, Plus, QrCode, Star, Gift, Users, Mountain, Compass, CheckCircle } from "lucide-react"
import { useLocation } from "wouter"
import { useState } from "react"
import QRCodeGenerator from 'qrcode'
import { useQueryClient, useQuery } from "@tanstack/react-query"

export function MemberDashboard() {
  const { user } = useAuth()
  const [, setLocation] = useLocation()
  const [showBookingModal, setShowBookingModal] = useState(false)
  
  const { data: apiBookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await fetch('/api/bookings', {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch bookings')
      return response.json()
    }
  })
  const [selectedBenefit, setSelectedBenefit] = useState<any>(null)
  const [bookingStep, setBookingStep] = useState<'select' | 'details' | 'confirm'>('select')
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const [bookingDetails, setBookingDetails] = useState({
    date: '',
    time: '',
    location: '',
    duration: '1'
  })
  const [showQRModal, setShowQRModal] = useState(false)
  const [memberQRCode, setMemberQRCode] = useState<string>('')
  const [userTier, setUserTier] = useState<any>(null)
  const [loyaltyDisplay, setLoyaltyDisplay] = useState('')

  // Fetch user's tier on mount
  useState(() => {
    if (user?.id) {
      fetch(`/api/users/${user.id}/tier`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setUserTier(data.tier)
          setLoyaltyDisplay(data.loyaltyDisplay)
        })
        .catch(err => console.error('Error fetching tier:', err))
    }
  })

  const handleQuickBook = () => {
    setShowBookingModal(true)
    setBookingStep('select')
    setSelectedBenefit(null)
    setBookingDetails({
      date: '',
      time: '',
      location: '',
      duration: '1'
    })
  }

  const handleSelectBenefit = (benefit: any) => {
    if (benefit.remaining > 0 && !bookingInProgress) {
      setSelectedBenefit(benefit)
      setBookingStep('details')
    }
  }

  const handleBackToSelect = () => {
    setBookingStep('select')
    setSelectedBenefit(null)
  }

  const handleProceedToConfirm = () => {
    if (bookingDetails.date && bookingDetails.time && bookingDetails.location) {
      setBookingStep('confirm')
    }
  }

  const queryClient = useQueryClient()

  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ')
    let [hours, minutes] = time.split(':')

    if (hours === '12') {
      hours = '00'
    }

    if (modifier === 'PM') {
      hours = String(parseInt(hours, 10) + 12)
    }

    return `${hours.padStart(2, '0')}:${minutes}`
  }

  const [bookingError, setBookingError] = useState<string>('')

  const handleConfirmBooking = async () => {
    if (!selectedBenefit) return

    console.log(`Creating booking for: ${selectedBenefit.id}`, bookingDetails)
    setBookingInProgress(true)
    setBookingError('')

    try {
      // Convert time to 24-hour format for API
      const time24h = convertTo24Hour(bookingDetails.time)

      // Actually create the booking via API
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          benefitId: selectedBenefit.id,
          benefitTitle: selectedBenefit.title,
          benefitIcon: selectedBenefit.icon,
          date: bookingDetails.date,
          time: time24h,
          location: bookingDetails.location,
          type: selectedBenefit.type,
          duration: selectedBenefit.duration
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create booking' }))
        throw new Error(errorData.message || 'Failed to create booking')
      }

      const newBooking = await response.json()
      console.log(`Successfully booked ${selectedBenefit.id}`, newBooking)

      // Invalidate bookings cache so the bookings page will refetch
      await queryClient.invalidateQueries({ queryKey: ['bookings'] })

      // Reset modal state
      setShowBookingModal(false)
      setBookingStep('select')
      setSelectedBenefit(null)
      setBookingDetails({
        date: '',
        time: '',
        location: '',
        duration: '1'
      })

      // Navigate to bookings page
      setLocation('/bookings')

    } catch (error) {
      console.error('Booking failed:', error)
      setBookingError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setBookingInProgress(false)
    }
  }

  const getAvailableLocations = (benefitId: string) => {
    const locationMap: { [key: string]: string[] } = {
      'kayak-premium': ['Lake Tahoe', 'Russian River', 'Tomales Bay', 'Monterey Bay'],
      'camping-kit': ['Yosemite Base', 'Big Sur Camp', 'Point Reyes Station', 'Half Moon Bay'],
      'mountain-bike': ['Mountain Trails', 'Marin Headlands', 'Mount Tamalpais', 'Tilden Park'],
      'hiking-gear': ['Muir Woods', 'Point Reyes', 'Mt. Diablo', 'Angel Island']
    }
    return locationMap[benefitId] || ['Various Locations']
  }

  const membershipBenefits = [
    {
      id: 'kayak-premium',
      title: 'Premium Kayak',
      description: 'Single or tandem kayak rental',
      duration: 'Full day',
      remaining: 3,
      total: 5,
      icon: '🚣‍♀️',
      popular: true
    },
    {
      id: 'camping-kit',
      title: 'Camping Equipment Kit',
      description: '4-person tent, sleeping bags, camping gear',
      duration: '3 days',
      remaining: 2,
      total: 2,
      icon: '⛺',
      popular: false
    },
    {
      id: 'mountain-bike',
      title: 'Mountain Bike',
      description: 'Trail-ready mountain bike rental',
      duration: 'Full day',
      remaining: 1,
      total: 3,
      icon: '🚵‍♂️',
      popular: false
    },
    {
      id: 'hiking-gear',
      title: 'Hiking Gear Package',
      description: 'Backpack, boots, poles, navigation',
      duration: '2 days',
      remaining: 2,
      total: 3,
      icon: '🥾',
      popular: false
    }
  ]

  const handleBenefitsPerks = () => {
    setLocation('/benefits')
  }

  const handleUpgradePlan = () => {
    setLocation('/upgrade')
  }

  const generateMemberQRCode = async (userId: string) => {
    try {
      const qrData = JSON.stringify({
        type: 'member_access',
        userId: userId,
        timestamp: Date.now(),
        verification: `member-${userId}-${Date.now()}`
      })
      const url = await QRCodeGenerator.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      return url
    } catch (error) {
      console.error('Error generating QR code:', error)
      return ''
    }
  }

  const handleGenerateQR = async () => {
    if (user?.id) {
      const qrUrl = await generateMemberQRCode(user.id)
      setMemberQRCode(qrUrl)
    }
    setShowQRModal(true)
  }

  const handleReferFriend = () => {
    console.log('Refer friend clicked')
  }

  const handleMemberEvents = () => {
    setLocation('/events')
  }

  const [showRewardModal, setShowRewardModal] = useState(false)
  const [rewardAmount, setRewardAmount] = useState(0)

  // Polling for recent rewards
  useQuery({
    queryKey: ['recent-rewards'],
    queryFn: async () => {
      const response = await fetch('/api/credits/history')
      if (!response.ok) return []
      const history = await response.json()
      const fiveSecondsAgo = Date.now() - 5000
      const recentEarned = history.find((t: any) => t.type === 'EARNED' && new Date(t.createdAt).getTime() > fiveSecondsAgo)
      if (recentEarned) {
        setRewardAmount(parseInt(recentEarned.amount))
        setShowRewardModal(true)
      }
      return history
    },
    refetchInterval: 5000,
    enabled: !!user
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Reward Modal */}
      <Dialog open={showRewardModal} onOpenChange={setShowRewardModal}>
        <DialogContent className="max-w-sm mx-auto text-center p-8">
          <div className="mb-4 flex justify-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce">
              <Star className="h-10 w-10 text-yellow-600" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Excellent!</DialogTitle>
            <DialogDescription className="text-lg">
              Congratulations! You earned <span className="font-bold text-primary">{rewardAmount}</span> Excellent Tokens for returning gear in perfect condition!
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <Button onClick={() => setShowRewardModal(false)} className="w-full">
              Awesome!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Section with Adventure Theme */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-blue-50/50 dark:from-primary/20 dark:via-primary/10 dark:to-blue-950/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-200/20 rounded-full translate-y-16 -translate-x-16" />
        <div className="relative z-10 px-4 py-8 max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-primary/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-primary/30 shadow-lg">
              <Mountain className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-['Poppins'] text-foreground" data-testid="text-welcome-user">
                Welcome back, {user?.firstName || 'Adventurer'}! 🏔️
              </h1>
              <p className="text-muted-foreground">
                Ready for your next adventure?
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="pb-20 px-4 relative z-10">
        {/* Primary Quick Actions */}
        <section className="py-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-primary/20 relative overflow-hidden premium-hover" onClick={handleQuickBook}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -translate-y-10 translate-x-10" />
                <CardContent className="p-6 text-center relative">
                  <div className="w-16 h-16 bg-primary/30 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-1">Book Adventure</h3>
                  <p className="text-sm text-muted-foreground">Start your next expedition</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-blue-950 dark:via-blue-900 dark:to-blue-950 border-blue-200 dark:border-blue-800 relative overflow-hidden premium-hover" onClick={handleGenerateQR}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/20 rounded-full -translate-y-10 translate-x-10" />
                <CardContent className="p-6 text-center relative">
                  <div className="w-16 h-16 bg-blue-200 dark:bg-blue-800 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <QrCode className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-1">Adventure Pass</h3>
                  <p className="text-sm text-muted-foreground">Quick access code</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Club Member Benefits */}
        <section className="py-2">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center space-x-2 mb-4">
              <Compass className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold font-['Poppins']">Your Club Benefits</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="border-green-100 dark:border-green-900 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20 hover-card" onClick={handleBenefitsPerks}>
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Gift className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-sm">Benefits/Perks</h3>
                  <p className="text-xs text-muted-foreground mt-1">View your rewards</p>
                </CardContent>
              </Card>

              <Card className="border-purple-100 dark:border-purple-900 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20 hover-card" onClick={handleMemberEvents}>
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-sm">Club Events</h3>
                  <p className="text-xs text-muted-foreground mt-1">Join expeditions</p>
                </CardContent>
              </Card>


            </div>
          </div>
        </section>

        {/* Membership Status */}
        <section className="py-2">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border-primary/30 mb-6 relative overflow-hidden premium-hover">
              <div className="absolute top-0 right-0 opacity-10">
                <Mountain className="h-32 w-32 text-primary transform rotate-12" />
              </div>
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge variant="secondary" className="bg-primary/20 text-primary font-semibold">
                        <Star className="h-3 w-3 mr-1" />
                        {userTier?.name || 'Explorer'}
                      </Badge>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                        {loyaltyDisplay || 'Loading...'}
                      </Badge>
                    </div>
                    <h3 className="font-bold mb-1 text-lg">Your Explorer Status</h3>
                    <p className="text-sm text-muted-foreground">
                      🎒 Premium gear • ⚡ Priority booking • 🏕️ Extended rentals • 🗻 Member events • ⭐ Loyalty rewards
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleUpgradePlan} className="font-semibold">
                    Upgrade Trail
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Upcoming Bookings */}
        <section className="py-2">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-lg font-bold font-['Poppins'] mb-4">Upcoming Adventures</h2>
            {isLoading ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              </div>
            ) : apiBookings.filter((b: any) => b.status === 'pending').length > 0 ? (
              apiBookings.filter((b: any) => b.status === 'pending').map((booking: any) => (
                <Card key={booking.id} className="mb-6 border-blue-100 dark:border-blue-900 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 hover-card" onClick={() => setLocation('/bookings')}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{booking.benefitTitle}</h3>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(booking.startDate).toLocaleDateString()} • {new Date(booking.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-semibold">
                          Ready
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">QR pass ready</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="mb-6 border-dashed border-2 flex items-center justify-center p-8 text-muted-foreground">
                <div className="text-center">
                  <Compass className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No upcoming adventures scheduled</p>
                </div>
              </Card>
            )}
          </div>
        </section>

        <ExploreGear />
      </main>

      <BottomNavigation />

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-md mx-auto max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mountain className="h-5 w-5 text-primary" />
              <span>
                {bookingStep === 'select' && 'Book Your Adventure'}
                {bookingStep === 'details' && 'Booking Details'}
                {bookingStep === 'confirm' && 'Confirm Booking'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {bookingStep === 'select' && 'Choose from your available monthly benefits.'}
              {bookingStep === 'details' && `Enter details for your ${selectedBenefit?.title}.`}
              {bookingStep === 'confirm' && 'Review and confirm your booking.'}
            </DialogDescription>
          </DialogHeader>

          {bookingStep === 'select' && (
            <div className="max-h-[60vh] overflow-y-auto space-y-3 py-4">
              {membershipBenefits.map((benefit) => (
                <Card
                  key={benefit.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${benefit.remaining > 0
                    ? 'border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20'
                    : 'opacity-50'
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
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Popular</Badge>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">{benefit.description}</p>
                        </div>
                      </div>
                      {benefit.remaining > 0 && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{benefit.duration}</span>
                      </div>
                      <div className="text-xs">
                        <span className={`font-semibold ${benefit.remaining > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {benefit.remaining} of {benefit.total} remaining
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {bookingStep === 'details' && selectedBenefit && (
            <div className="py-4 space-y-4">
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
                <div>
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <input
                    type="date"
                    value={bookingDetails.date}
                    onChange={(e) => setBookingDetails(prev => ({ ...prev, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border-2 border-input bg-card text-foreground rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Time</label>
                  <select
                    value={bookingDetails.time}
                    onChange={(e) => setBookingDetails(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full p-2 border-2 border-input bg-card text-foreground rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  >
                    <option value="">Select time</option>
                    {[
                      "6:00 AM",
                      "8:00 AM",
                      "9:00 AM",
                      "10:00 AM",
                      "12:00 PM",
                      "2:00 PM",
                      "4:00 PM"
                    ].map((slot) => {
                      const isToday = new Date(bookingDetails.date).toDateString() === new Date().toDateString();
                      let isDisabled = false;

                      if (isToday && bookingDetails.date) {
                        const now = new Date();
                        const [time, modifier] = slot.split(' ');
                        let [hours, minutes] = time.split(':').map(Number);

                        if (hours === 12) hours = 0;
                        if (modifier === 'PM') hours += 12;

                        const slotDate = new Date();
                        slotDate.setHours(hours, minutes, 0, 0);

                        if (slotDate < now) isDisabled = true;
                      }

                      return (
                        <option key={slot} value={slot} disabled={isDisabled} className={isDisabled ? "text-gray-400 bg-gray-100 dark:bg-gray-800 dark:text-gray-600" : ""}>
                          {slot} {isDisabled ? '(Past)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <select
                    value={bookingDetails.location}
                    onChange={(e) => setBookingDetails(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full p-2 border-2 border-input bg-card text-foreground rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  >
                    <option value="">Select location</option>
                    {getAvailableLocations(selectedBenefit.id).map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {bookingStep === 'confirm' && selectedBenefit && (
            <div className="py-4 space-y-4">
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
                      <span>{new Date(bookingDetails.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time:</span>
                      <span>{bookingDetails.time}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Location:</span>
                      <span>{bookingDetails.location}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{selectedBenefit.duration}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {bookingError && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">{bookingError}</p>
                </div>
              )}

              {bookingInProgress && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Creating your booking...</p>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t">
            {bookingStep === 'select' && (
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowBookingModal(false)}>
                  Close
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setLocation('/upgrade')}>
                  Upgrade Plan
                </Button>
              </div>
            )}

            {bookingStep === 'details' && (
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleBackToSelect}>
                  Back
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleProceedToConfirm}
                  disabled={!bookingDetails.date || !bookingDetails.time || !bookingDetails.location}
                >
                  Continue
                </Button>
              </div>
            )}

            {bookingStep === 'confirm' && (
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setBookingStep('details')} disabled={bookingInProgress}>
                  Back
                </Button>
                <Button size="sm" className="flex-1" onClick={handleConfirmBooking} disabled={bookingInProgress}>
                  {bookingInProgress ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Member QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Your Member QR Code</DialogTitle>
            <DialogDescription>
              Show this code for quick check-in at any facility
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border-2 border-primary/20 mb-4">
              {memberQRCode ? (
                <img src={memberQRCode} alt="Member QR Code" className="w-full h-auto rounded" />
              ) : (
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                  <QrCode className="h-32 w-32 text-primary animate-pulse" />
                </div>
              )}
            </div>
          </div>
          <div className="pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowQRModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}