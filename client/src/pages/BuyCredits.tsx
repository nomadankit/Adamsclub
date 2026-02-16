import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ArrowLeft, CreditCard, Zap, Gift, Crown } from "lucide-react"
import { useState } from "react"
import { useLocation } from "wouter"
import { getStripe } from "@/lib/stripe"
import * as stripeModule from '@/lib/stripe'
import { useAuth } from "@/hooks/useAuth"
import { useQuery } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

// Define a type for the credit packages for better type safety
type CreditPackage = {
  id: string;
  title: string;
  credits: number;
  price: string;
  priceId: string;
  description: string;
  features: string[];
  popular: boolean;
};


export default function BuyCredits() {
  const [, setLocation] = useLocation()
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  // Fetch user's current credit balance
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const creditsBalance = (userData as any)?.adamsCredits || '0.00'

  const handleGoBack = () => {
    setLocation("/account")
  }

  const handleBuyPackage = async (pkg: CreditPackage) => {
    if (!pkg.priceId) {
      toast({
        title: 'Error',
        description: 'Invalid package configuration',
        variant: 'destructive'
      })
      return
    }

    setLoading(pkg.id)
    setSelectedPackage(pkg.id)

    try {
      console.log("Processing package:", pkg)
      await stripeModule.createCreditsCheckout({
        packageId: pkg.id,
      })
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive'
      })
      setLoading(null)
      setSelectedPackage(null)
    }
  }

  const creditPackages: CreditPackage[] = [
    {
      id: "starter",
      title: "Starter Bundle",
      credits: 100,
      price: "$19.99",
      priceId: "price_1SBLKcD0boAhB99cdO1JN3gi",
      description: "Perfect for a weekend getaway",
      features: ["Valid for 12 months", "Use on any gear", "No booking fees"],
      popular: false
    },
    {
      id: "popular",
      title: "Adventure Pack",
      credits: 250,
      price: "$39.99",
      priceId: "price_1SBLLJD0boAhB99c9NmfL6Ts",
      description: "Most popular for active members",
      features: ["Valid for 12 months", "Use on any gear", "Priority booking", "5% Bonus Credits"],
      popular: true
    },
    {
      id: "value",
      title: "Expedition Kit",
      credits: 600,
      price: "$79.99",
      priceId: "price_1SBLLvD0boAhB99cUYZYSgZE",
      description: "Best value for frequent explorers",
      features: ["Valid for 24 months", "Use on any gear", "Priority booking", "Free cancellation", "10% Bonus Credits"],
      popular: false
    },
    {
      id: "premium",
      title: "Ultimate Pass",
      credits: 1250,
      price: "$149.99",
      priceId: "price_1SBLMWD0boAhB99cll1Wl2ko",
      description: "Maximum credits for checking off your bucket list",
      features: ["Never expire", "All benefits included", "VIP support", "20% Bonus Credits"],
      popular: false
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        {/* Page Header */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold font-['Poppins']">Buy Adventure Credits</h1>
                <p className="text-muted-foreground">
                  Purchase credits to unlock premium gear and experiences with Adventure Credits
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Current Balance */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-green-500/20 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                    <h3 className="text-3xl font-bold font-['Poppins'] text-green-600">{creditsBalance} Credits</h3>
                  </div>
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                    <Star className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Credit Packages */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-6">Choose a Credit Package</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {creditPackages.map((pkg) => {
                const isSelected = selectedPackage === pkg.id

                return (
                  <Card
                    key={pkg.id}
                    className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${pkg.popular ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
                      } ${isSelected ? 'ring-2 ring-green-500 border-green-500' : ''}`}
                    onClick={() => handleBuyPackage(pkg)}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Star className="h-8 w-8 text-primary" />
                        </div>

                        <h4 className="text-lg font-semibold mb-1">{pkg.title}</h4>
                        <h3 className="text-2xl font-bold mb-2">{pkg.credits} Credits</h3>
                        <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>

                        <div className="text-3xl font-bold text-primary mb-4">
                          {pkg.price}
                        </div>

                        <Button
                          className={`w-full ${pkg.popular
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-background border border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                            }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleBuyPackage(pkg)
                          }}
                          disabled={loading === pkg.id}
                        >
                          {loading === pkg.id ? 'Processing...' : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Purchase
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Credit Usage Info */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle>How to Use Adventure Credits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold mb-2">Premium Gear</h3>
                    <p className="text-sm text-muted-foreground">
                      Upgrade to premium equipment for enhanced experiences
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Gift className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold mb-2">Add-on Services</h3>
                    <p className="text-sm text-muted-foreground">
                      Professional guides, photography, and special experiences
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Crown className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold mb-2">VIP Experiences</h3>
                    <p className="text-sm text-muted-foreground">
                      Exclusive access to premium locations and private adventures
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  )
}