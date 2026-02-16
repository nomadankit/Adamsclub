import { useAuth } from "@/hooks/useAuth"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mountain, Star, Gift, Users, Compass, Tent, Camera, Shield, Zap, Coffee, MapPin, Calendar, ArrowRight, Sun, Backpack, Trophy, Loader } from "lucide-react"
import { useLocation } from "wouter"
import { useEffect, useState } from "react"
import { getCheckoutIntent, clearCheckoutIntent } from "@/lib/checkoutIntent"
import { createCheckoutSession } from "@/lib/stripe"
import { useToast } from "@/hooks/use-toast"
import StaffDashboard from "@/pages/StaffDashboard"
import { useQuery } from "@tanstack/react-query"



interface Booking {
  id: string
  benefitTitle: string
  date: string
  location: string
  status: string
  type: string
}

interface Benefit {
  id: string
  name: string
  description: string
}

interface Asset {
  id: string
  name: string
  category?: string
  [key: string]: any
}


interface CreditsData {
  credits?: number
  transactions?: any[]
}

export default function Home() {
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  const [processingIntent, setProcessingIntent] = useState(true)
  const [, setLocation] = useLocation()

  // Fetch user's bookings
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ['/api/bookings'],
    enabled: !!user && !isLoading
  })

  // Fetch user's benefits

  // Fetch user's credits
  const { data: creditsData = {} as CreditsData } = useQuery<CreditsData>({
    queryKey: ['/api/users', user?.id, 'credits'],
    enabled: !!user && !isLoading
  })

  // Fetch available assets
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    enabled: !!user && !isLoading
  })

  useEffect(() => {
    const processCheckoutIntent = async () => {
      // If user is not logged in, don't process any intent and allow redirection to auth page
      if (!user) {
        setProcessingIntent(false)
        return
      }

      // Check for payment success/cancel flags from Stripe redirects
      const params = new URLSearchParams(window.location.search)
      if (params.get('payment_success') === 'true') {
        toast({
          title: 'Payment Successful!',
          description: 'Your subscription has been activated.',
        })
        // Clean URL to remove query params
        window.history.replaceState({}, '', '/home')
      } else if (params.get('payment_canceled') === 'true') {
        toast({
          title: 'Payment Canceled',
          description: 'Your payment was canceled. You can try again anytime.',
          variant: 'destructive'
        })
        // Clean URL to remove query params
        window.history.replaceState({}, '', '/home')
      }

      // Check if there's a stored checkout intent
      const intent = getCheckoutIntent()
      if (intent) {
        try {
          // Clear the intent from local storage so it's not processed again
          clearCheckoutIntent()
          // Create a Stripe checkout session
          await createCheckoutSession(intent.priceId, intent.planType)
        } catch (error) {
          console.error('Failed to process checkout intent:', error)
          toast({
            title: 'Error',
            description: 'Failed to start checkout. Please try again.',
            variant: 'destructive'
          })
          setProcessingIntent(false) // Stop processing state if there's an error
        }
      } else {
        // No intent found, stop processing state
        setProcessingIntent(false)
      }
    }

    processCheckoutIntent()
  }, [user, toast]) // Depend on user to re-run when authentication state changes

  // Show loading indicator if user is loading or if we are processing a checkout intent
  if (isLoading || processingIntent) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader className="h-8 w-8 text-primary animate-spin" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  }

  // For staff users, show staff-specific home page content instead of member content
  if (user?.role === 'staff') {
    return <StaffDashboard />
  }

  // Get unique asset categories from available assets
  const assetsByCategory = assets.reduce((acc: any, asset: any) => {
    const category = asset.category || 'General'
    if (!acc[category]) acc[category] = []
    acc[category].push(asset)
    return acc
  }, {})

  // Get upcoming bookings (next 3)
  const upcomingBookings = bookings
    .filter((b: Booking) => b.status === 'upcoming' || b.status === 'active')
    .slice(0, 3)

  // Map icons based on asset type
  const getIconForType = (type: string) => {
    const iconMap: Record<string, any> = {
      'kayak': <Sun className="h-6 w-6" />,
      'camping': <Tent className="h-6 w-6" />,
      'bike': <Backpack className="h-6 w-6" />,
      'hiking': <Mountain className="h-6 w-6" />,
      'gear': <Compass className="h-6 w-6" />
    }
    return iconMap[type] || <Compass className="h-6 w-6" />
  }

  // Create features from available categories
  const membershipFeatures = Object.entries(assetsByCategory).slice(0, 4).map(([category, items]: any) => {
    const colors = [
      "from-green-500 to-emerald-600",
      "from-blue-500 to-cyan-600",
      "from-purple-500 to-pink-600",
      "from-orange-500 to-red-600"
    ]
    return {
      icon: <Compass className="h-6 w-6" />,
      title: category,
      description: `${items.length} items available in ${category}`,
      color: colors[Object.keys(assetsByCategory).indexOf(category) % 4]
    }
  }).concat([
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Member Support",
      description: "Get help with bookings and gear",
      color: "from-orange-500 to-red-600"
    }
  ]).slice(0, 4)


  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-blue-50/50 dark:from-primary/20 dark:via-primary/10 dark:to-blue-950/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-200/20 rounded-full translate-y-16 -translate-x-16" />
        <div className="relative z-10 px-4 py-12 max-w-6xl mx-auto text-center">
          <h1 className="text-3xl font-bold font-['Poppins'] mb-3">
            Welcome, {user?.firstName || 'Explorer'}!
          </h1>
          <p className="text-muted-foreground text-lg mb-6">
            {upcomingBookings.length > 0 ? `You have ${upcomingBookings.length} upcoming booking${upcomingBookings.length !== 1 ? 's' : ''}` : 'Ready to book your next adventure?'}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={() => setLocation('/bookings')} className="gap-2" data-testid="button-book-adventure">
              Book Adventure <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setLocation('/benefits')} data-testid="button-view-benefits">
              View Benefits
            </Button>
            {creditsData?.credits && (
              <Button variant="outline" onClick={() => setLocation('/credits')} data-testid="button-view-credits">
                Credits: {creditsData.credits}
              </Button>
            )}
          </div>
        </div>
      </section>

      <main className="pb-20 px-4">


        {/* Membership Features */}
        <section className="py-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center space-x-2 mb-4">
              <Compass className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold font-['Poppins']">What's Included</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {membershipFeatures.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>


        {/* Upcoming Experiences */}
        <section className="py-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold font-['Poppins']">Your Bookings</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/bookings')} data-testid="button-view-all-bookings">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingBookings.length > 0 ? (
                upcomingBookings.map((booking: any) => (
                  <Card key={booking.id} className="hover:shadow-md transition-shadow cursor-pointer hover-elevate" onClick={() => setLocation('/bookings')} data-testid={`card-booking-${booking.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
                            {getIconForType(booking.type)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{booking.benefitTitle}</h3>
                            <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(booking.date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {booking.location}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs whitespace-nowrap ml-2 ${booking.status === 'active' ? 'bg-green-500/10 text-green-700 border-green-200' :
                          booking.status === 'completed' ? 'bg-gray-500/10 text-gray-700 border-gray-200' :
                            'bg-primary/10 text-primary border-primary/20'
                          }`}>
                          {booking.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground mb-4">No upcoming bookings</p>
                    <Button onClick={() => setLocation('/bookings')} data-testid="button-make-first-booking">
                      Book Your First Adventure
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>



        {/* CTA Section */}
        <section className="py-6">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10">
                <Mountain className="h-32 w-32 text-primary transform rotate-12" />
              </div>
              <CardContent className="p-8 text-center relative">
                <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Explore More Gear</h3>
                <p className="text-muted-foreground mb-6">
                  Browse our {assets.length} available items across {Object.keys(assetsByCategory).length} categories and start booking
                </p>
                <Button size="lg" onClick={() => setLocation('/explore')} data-testid="button-browse-gear">
                  Browse Available Gear
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  )
}