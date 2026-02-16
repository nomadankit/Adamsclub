import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, Plus, ArrowUpRight, Gift, Zap, Crown, Star, ArrowDownLeft, Calendar, Layers, Bike, UtensilsCrossed, Waves, Tent, Headphones, Plane, Check } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import * as stripeModule from '@/lib/stripe'
import { useLocation } from "wouter"

export default function Accounts() {
  const [pathname] = useLocation()
  const [loading, setLoading] = useState<string | null>(null)
  // Set initial tab based on URL: /credits goes to 'buy' tab
  const [activeTab, setActiveTab] = useState(pathname === '/credits' ? 'buy' : 'plans')
  const { user } = useAuth()
  const { toast } = useToast()

  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  const creditsBalance = (userData as any)?.adamsCredits || '0.00'

  const creditPackages = [
    {
      id: 'starter',
      title: 'Starter Bundle',
      price: 19.99,
      credits: 100,
      bonus: 0,
      popular: false,
      icon: Star,
      color: 'text-blue-600',
      priceId: 'price_1SBLKcD0boAhB99cdO1JN3gi',
      description: 'Perfect for a weekend getaway'
    },
    {
      id: 'popular',
      title: 'Adventure Pack',
      price: 39.99,
      credits: 250,
      bonus: 5,
      popular: true,
      icon: Zap,
      color: 'text-green-600',
      priceId: 'price_1SBLLJD0boAhB99c9NmfL6Ts',
      description: 'Most popular for active members'
    },
    {
      id: 'value',
      title: 'Expedition Kit',
      price: 79.99,
      credits: 600,
      bonus: 10,
      popular: false,
      icon: Gift,
      color: 'text-purple-600',
      priceId: 'price_1SBLLvD0boAhB99cUYZYSgZE',
      description: 'Best value for frequent explorers'
    },
    {
      id: 'premium',
      title: 'Ultimate Pass',
      price: 149.99,
      credits: 1250,
      bonus: 20,
      popular: false,
      icon: Crown,
      color: 'text-gold-600',
      priceId: 'price_1SBLMWD0boAhB99cll1Wl2ko',
      description: 'Maximum credits for bucket list trips'
    }
  ]

  const subscriptionPlans = [
    {
      id: 'base-explorer',
      name: 'Base Explorer',
      price: 199,
      priceId: import.meta.env.VITE_STRIPE_BASE_EXPLORER_PRICE_ID || 'price_1SjNUDD0boAhB99ci0QnGBke',
      desc: 'Perfect for weekend adventurers who want variety without commitment',
      features: [
        { icon: Tent, text: '2 weekend Camping gear kit (tents, sleeping bags, coolers, lanterns, etc.)' },
        { icon: Bike, text: '2 days of bike rental (mountain or city bike)' },
        { icon: UtensilsCrossed, text: '2 takeout of Farm Fresh Produce' }
      ],
      color: 'border-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600'
    },
    {
      id: 'premium-adventurer',
      name: 'Premium Adventurer',
      price: 449,
      priceId: import.meta.env.VITE_STRIPE_PREMIUM_ADVENTURER_PRICE_ID || 'price_1SjNW3D0boAhB99cCpCEnhEj',
      desc: 'For members who want consistent access and variety for a healthier, active lifestyle',
      features: [
        { icon: Bike, text: '5 days of bike rental (mountain or city bike)' },
        { icon: UtensilsCrossed, text: '2 takeout of Farm Fresh Produce' },
        { icon: Waves, text: '12 hours watercraft use per month (jet skis, kayaks, paddle boards)' },
        { icon: Tent, text: 'Camping kit for 1 full week (gear refreshed each month)' }
      ],
      featured: true,
      color: 'border-primary',
      bgColor: 'bg-primary/5',
      iconColor: 'text-primary'
    },
    {
      id: 'vip-pathfinder',
      name: 'VIP Pathfinder',
      price: 899,
      priceId: import.meta.env.VITE_STRIPE_VIP_PATHFINDER_PRICE_ID || 'price_1SjNWaD0boAhB99cTGYq3Dzh',
      desc: 'Designed for those who want the best of everything, hassle-free',
      features: [
        { icon: Bike, text: 'Unlimited bike rentals (mountain or city bike)' },
        { icon: UtensilsCrossed, text: '2 takeout of Farm Fresh Produce' },
        { icon: Waves, text: '3 days watercraft use per month (jet skis, kayaks, paddle boards)' },
        { icon: Tent, text: 'Camping + adventure gear anytime (exclusive early booking access)' },
        { icon: Headphones, text: 'Personal concierge service (gear scheduling, trip planning, booking support)' },
        { icon: Plane, text: 'One premium weekend getaway every year (2-night trip, curated lodging & activities)' }
      ],
      color: 'border-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      iconColor: 'text-amber-600'
    }
  ]

  const handleSubscribePlan = async (plan: typeof subscriptionPlans[0]) => {
    // Check if user already has this plan
    if ((userData as any)?.subscriptionPlan === plan.id) {
      toast({
        title: 'Already Subscribed',
        description: `You are already subscribed to the ${plan.name} plan.`,
      })
      return
    }

    setLoading(plan.id)

    try {
      await stripeModule.createCheckoutSession(plan.priceId, plan.id)
    } catch (error) {
      console.error('Subscription checkout error:', error)
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive'
      })
      setLoading(null)
    }
  }

  /*
  const transactions = [
    {
      id: 'txn_001',
      type: 'upgrade',
      description: 'Premium Membership Upgrade',
      amount: '+$10.00',
      date: 'Dec 15, 2024',
      status: 'completed',
      icon: ArrowUpRight,
      iconColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900'
    },
    {
      id: 'txn_002',
      type: 'credit',
      description: 'Account Credit Purchase',
      amount: '+$25.00',
      date: 'Dec 10, 2024',
      status: 'completed',
      icon: CreditCard,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900'
    },
    {
      id: 'txn_003',
      type: 'upgrade',
      description: 'Equipment Access Upgrade',
      amount: '+$15.00',
      date: 'Dec 5, 2024',
      status: 'completed',
      icon: ArrowUpRight,
      iconColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900'
    },
    {
      id: 'txn_004',
      type: 'subscription',
      description: 'Monthly Subscription Renewal',
      amount: '+$39.99',
      date: 'Dec 1, 2024',
      status: 'completed',
      icon: Calendar,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900'
    }
  ]

  const activityItems = [
    {
      id: 'act_001',
      type: 'rental',
      description: 'Gear Rental',
      amount: '-45',
      date: 'Dec 15, 2024',
      status: 'Completed',
      icon: ArrowUpRight,
      iconColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-500/10 dark:bg-red-500/20'
    },
    {
      id: 'act_002',
      type: 'referral',
      description: 'Referral Bonus',
      amount: '+25',
      date: 'Dec 10, 2024',
      status: 'Completed',
      icon: Gift,
      iconColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-500/10 dark:bg-green-500/20'
    },
    {
      id: 'act_003',
      type: 'purchase',
      description: 'Credit Purchase',
      amount: '+200',
      date: 'Dec 8, 2024',
      status: 'Completed',
      icon: CreditCard,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/20'
    }
  ]
  */

  const { data: transactionsData } = useQuery({
    queryKey: ['/api/credits/history'],
    enabled: !!user,
  })

  // Sort transactions by date (newest first)
  const transactions = ((transactionsData as any[]) || []).map((txn: any) => ({
    id: txn.id,
    type: txn.type,
    description: txn.description,
    amount: (Number(txn.amount) > 0 ? '+' : '') + txn.amount,
    date: new Date(txn.createdAt).toLocaleDateString(),
    status: 'completed', // Assuming all recorded transactions are completed
    icon: txn.amount > 0 ? ArrowUpRight : ArrowDownLeft,
    iconColor: txn.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
    iconBg: txn.amount > 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
  }))

  const activityItems = transactions

  const handleBuyPackage = async (pkg: any) => {
    if (!pkg.priceId) {
      toast({
        title: 'Error',
        description: 'Invalid package configuration',
        variant: 'destructive'
      })
      return
    }

    setLoading(pkg.id)

    try {
      await stripeModule.createCreditsCheckout({
        packageId: pkg.id,
        amount: pkg.price,
        price: pkg.price,
        credits: pkg.credits || (pkg.amount + pkg.bonus),
        priceId: pkg.priceId
      })
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive'
      })
      setLoading(null)
    }
  }

  return (
    <div className="bg-background pb-24">
      <div className="max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid w-full grid-cols-3 mb-6 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-1">
            <TabsTrigger value="plans" data-testid="tab-plans">Plans</TabsTrigger>
            <TabsTrigger value="buy" data-testid="tab-buy-credits">Credits</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>


          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Membership Plans</h2>
              <p className="text-muted-foreground">Choose the plan that fits your adventure style</p>
            </div>

            {/* Current Plan Display */}
            {(userData as any)?.subscriptionPlan && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-full">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Plan</p>
                      <p className="font-semibold capitalize">{(userData as any)?.subscriptionPlan}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Active</Badge>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {subscriptionPlans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${plan.featured ? 'ring-2 ring-primary' : ''} ${plan.bgColor}`}
                >
                  {plan.featured && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">${plan.price}</div>
                        <p className="text-sm text-muted-foreground">/month</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {plan.features.map((feature, idx) => {
                        const FeatureIcon = feature.icon
                        return (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <FeatureIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.iconColor}`} />
                            <span>{feature.text}</span>
                          </div>
                        )
                      })}
                    </div>

                    <Button
                      className="w-full"
                      variant={(userData as any)?.subscriptionPlan === plan.id ? 'secondary' : plan.featured ? 'default' : 'outline'}
                      disabled={loading === plan.id || (userData as any)?.subscriptionPlan === plan.id}
                      onClick={() => handleSubscribePlan(plan)}
                      data-testid={`button-plan-${plan.id}`}
                    >
                      {loading === plan.id ? (
                        'Processing...'
                      ) : (userData as any)?.subscriptionPlan === plan.id ? (
                        <><Check className="h-4 w-4 mr-2" /> You Have This Plan</>
                      ) : (userData as any)?.subscriptionPlan ? (
                        'Upgrade to ' + plan.name
                      ) : (
                        'Choose ' + plan.name
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              All plans include access to our member community and basic support. Cancel anytime.
            </p>
          </TabsContent>

          {/* Buy Credits Tab */}
          <TabsContent value="buy" className="space-y-6">
            {/* Available Credits Balance */}
            <div className="bg-primary text-primary-foreground p-6 rounded-lg">
              <p className="text-sm opacity-90 mb-2">Available Credits</p>
              <p className="text-4xl font-bold">{creditsBalance}</p>
            </div>

            {!(userData as any)?.subscriptionPlan ? (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mb-4">
                    <Layers className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Subscription Required</h3>
                  <p className="text-muted-foreground mb-6">
                    You need an active membership plan before you can purchase credits.
                    Choose a plan that fits your adventure style to unlock credit purchases.
                  </p>
                  <Button
                    onClick={() => setActiveTab('plans')}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    data-testid="button-go-to-plans"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    View Membership Plans
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {creditPackages.map((pkg) => {
                  const IconComponent = pkg.icon
                  return (
                    <Card key={pkg.id} className={pkg.popular ? 'border-primary bg-primary/5' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-secondary`}>
                              <IconComponent className={`h-5 w-5 ${pkg.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold">{pkg.title}</h3>
                              <p className="text-sm text-muted-foreground">{pkg.description}</p>
                              <p className="text-xs font-medium mt-1">{pkg.credits} credits total</p>
                            </div>
                          </div>
                          {pkg.popular && <Badge className="bg-primary">Popular</Badge>}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold">${pkg.price}</div>
                            {pkg.bonus > 0 && <p className="text-xs text-green-600">+{pkg.bonus}% bonus</p>}
                          </div>
                          <Button
                            onClick={() => handleBuyPackage(pkg)}
                            disabled={loading === pkg.id}
                            data-testid={`button-buy-${pkg.id}`}
                          >
                            {loading === pkg.id ? 'Processing...' : 'Buy Now'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Recent Transactions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No transactions found</p>
                    </div>
                  ) : (
                    transactions.map((transaction) => {
                      const IconComponent = transaction.icon
                      return (
                        <div key={transaction.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 ${transaction.iconBg} rounded-full flex items-center justify-center`}>
                              <IconComponent className={`h-5 w-5 ${transaction.iconColor}`} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{transaction.description}</p>
                              <p className="text-xs text-muted-foreground">{transaction.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-medium text-green-600 text-sm">{transaction.amount}</span>
                            <Badge variant="secondary" className="text-xs">
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
