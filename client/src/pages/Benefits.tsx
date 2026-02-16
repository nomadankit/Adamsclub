import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Gift,
  Zap,
  Users,
  Clock,
  TrendingUp,
  Star,
  Lightbulb,
  Heart,
  Lock,
  DollarSign,
  Smartphone
} from "lucide-react"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/useAuth"

export default function Benefits() {
  const [, setLocation] = useLocation()
  const { user } = useAuth()

  const handleGoBack = () => {
    setLocation('/home')
  }

  // Subscription benefits available to all members
  const benefitCategories = [
    {
      id: 'credits',
      title: 'Monthly Credits',
      icon: <Zap className="h-6 w-6" />,
      color: 'from-amber-500 to-orange-600',
      benefits: [
        {
          title: 'Monthly Credit Allowance',
          description: 'Receive credits each month to spend on gear rentals and services',
          icon: TrendingUp
        },
        {
          title: 'Rollover Credits',
          description: 'Unused credits roll over to the next month (up to 3 months)',
          icon: Clock
        },
        {
          title: 'Credit Bonus on Renewals',
          description: 'Get bonus credits when you renew your subscription',
          icon: Gift
        },
        {
          title: 'No Credit Expiration',
          description: 'Your credits never expire as long as your subscription is active',
          icon: Star
        }
      ]
    },
    {
      id: 'booking-perks',
      title: 'Booking & Rental Benefits',
      icon: <Clock className="h-6 w-6" />,
      color: 'from-blue-500 to-cyan-600',
      benefits: [
        {
          title: 'Extended Booking Window',
          description: 'Book gear up to 30 days in advance with your available credits',
          icon: Lock
        },
        {
          title: 'Priority Access During Peak Times',
          description: 'Get priority access to equipment during high-demand periods',
          icon: Lightbulb
        },
        {
          title: 'Flexible Cancellation',
          description: 'Cancel bookings up to 24 hours before for full credit refund',
          icon: Clock
        },
        {
          title: 'Credit-Only Pricing',
          description: 'Pay with credits instead of cash - simpler, faster checkout',
          icon: Smartphone
        }
      ]
    },
    {
      id: 'exclusive-access',
      title: 'Member Exclusives',
      icon: <Star className="h-6 w-6" />,
      color: 'from-purple-500 to-violet-600',
      benefits: [
        {
          title: 'Premium Gear Access',
          description: 'Exclusive access to premium equipment as a subscriber',
          icon: Gift
        },
        {
          title: 'Member Community',
          description: 'Connect with other members and join exclusive community events',
          icon: Users
        },
        {
          title: 'Early Equipment Releases',
          description: 'First access to newly added equipment before general availability',
          icon: Zap
        },
        {
          title: 'Priority Support',
          description: 'Dedicated support line and faster response times for members',
          icon: Lightbulb
        }
      ]
    },
    {
      id: 'special-offers',
      title: 'Subscription Perks',
      icon: <Heart className="h-6 w-6" />,
      color: 'from-rose-500 to-pink-600',
      benefits: [
        {
          title: 'Bonus Credits for Subscriptions',
          description: 'Get extra credits when you upgrade your subscription tier',
          icon: TrendingUp
        },

        {
          title: 'Birthday Credit Gift',
          description: 'Receive bonus credits on your birthday month',
          icon: Gift
        },
        {
          title: 'Subscriber-Only Deals',
          description: 'Exclusive credit discounts and special offers for active subscribers',
          icon: Zap
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Header */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-blue-50/50 dark:from-primary/20 dark:via-primary/10 dark:to-blue-950/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-20 translate-x-20" />
        <div className="relative z-10 px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="mr-4"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center space-x-2">
                  <Gift className="h-7 w-7 text-primary" />
                  <span>Subscription Benefits</span>
                </h1>
                <p className="text-muted-foreground text-sm">What you get with your monthly subscription</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Info Card */}
          <Card className="mb-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/20 rounded-lg p-3 flex-shrink-0">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg mb-1">Your subscription includes everything below</h2>
                  <p className="text-muted-foreground text-sm">
                    With your active subscription, you get monthly credits to rent equipment and unlock exclusive member benefits.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits Categories */}
          <div className="space-y-8">
            {benefitCategories.map((category) => (
              <section key={category.id}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${category.color} rounded-lg flex items-center justify-center text-white`}>
                    {category.icon}
                  </div>
                  <h2 className="text-xl font-bold">{category.title}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.benefits.map((benefit, index) => {
                    const BenefitIcon = benefit.icon
                    return (
                      <Card
                        key={index}
                        className="hover:shadow-md transition-all duration-200 hover-elevate"
                        data-testid={`card-benefit-${category.id}-${index}`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 mt-1">
                              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                                <BenefitIcon className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm mb-1">{benefit.title}</h3>
                              <p className="text-xs text-muted-foreground">{benefit.description}</p>
                              <div className="mt-3">
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                                  Included
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Call to Action */}
          <section className="mt-12 py-8">
            <Card className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border-primary/30">
              <CardContent className="p-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-3">Ready to rent?</h2>
                  <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Use your monthly subscription credits to book the gear you need today. Browse our full selection and start your adventure.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={() => setLocation('/explore')}
                      size="lg"
                      data-testid="button-explore-gear"
                    >
                      Browse Gear
                    </Button>
                    <Button
                      onClick={() => setLocation('/credits')}
                      variant="outline"
                      size="lg"
                      data-testid="button-my-credits"
                    >
                      View Credits
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
