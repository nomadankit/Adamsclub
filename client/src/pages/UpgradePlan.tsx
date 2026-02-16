import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Crown, Coins, Lock, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/useAuth"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { TierType } from "@shared/schema"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Tier = {
  id: string
  name: string
  description: string | null
  price: string | null
  creditsPerMonth?: number
  type: string
  isActive: boolean
}

type UserData = {
  subscriptionPlan: string | null
  subscriptionStatus: string | null
}

// Plan hierarchy for upgrade restrictions
const PLAN_HIERARCHY: Record<string, { rank: number; credits: number }> = {
  'base-explorer': { rank: 1, credits: 71 },
  'premium-adventurer': { rank: 2, credits: 110 },
  'vip-pathfinder': { rank: 3, credits: 200 },
  'base': { rank: 1, credits: 71 },
  'basic': { rank: 1, credits: 71 },
  'premium': { rank: 2, credits: 110 },
  'vip': { rank: 3, credits: 200 },
};

function normalizePlanName(plan: string): string {
  const normalized = plan.toLowerCase().trim();
  if (normalized === 'base' || normalized === 'basic') return 'base-explorer';
  if (normalized === 'premium') return 'premium-adventurer';
  if (normalized === 'vip') return 'vip-pathfinder';
  return normalized;
}

function getPlanRank(plan: string | null): number {
  if (!plan) return 0;
  return PLAN_HIERARCHY[normalizePlanName(plan)]?.rank || 0;
}

function getCreditsForPlan(planName: string): number {
  const normalized = normalizePlanName(planName);
  return PLAN_HIERARCHY[normalized]?.credits || 0;
}

export default function UpgradePlan() {
  const [, setLocation] = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  // Fetch user data to get current plan
  const { data: userData } = useQuery<UserData>({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Fetch subscription tiers from database
  const { data: allTiers = [], isLoading: tiersLoading } = useQuery<Tier[]>({
    queryKey: ['/api/tiers'],
  })

  const currentPlan = userData?.subscriptionPlan || null
  const currentPlanRank = getPlanRank(currentPlan)
  const hasActiveSubscription = userData?.subscriptionStatus === 'active' || userData?.subscriptionStatus === 'trialing'

  const subscriptionTiers = allTiers
    .filter(t => t.type === TierType.SUBSCRIPTION && t.isActive && t.name.toLowerCase() !== 'employee')
    .sort((a, b) => {
      // Sort by rank (price/tier level)
      const rankA = getPlanRank(a.name);
      const rankB = getPlanRank(b.name);
      return rankA - rankB;
    });

  const handleGoBack = () => {
    setLocation("/account")
  }

  const handleSelectPlan = async (tierId: string, tierName: string) => {
    if (loading) return

    // Check if this is a downgrade
    const targetRank = getPlanRank(tierName);
    if (hasActiveSubscription && targetRank <= currentPlanRank) {
      toast({
        title: "Cannot Change Plan",
        description: targetRank === currentPlanRank
          ? "You are already on this plan."
          : "You can only upgrade to a higher tier. Cancel your subscription or wait for it to expire to change to a lower tier.",
        variant: "destructive",
      });
      return;
    }

    setLoading(tierId)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tierId })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        throw new Error(error.error || error.details || 'Failed to create checkout session')
      }

      const data = await response.json()

      if (!data.url || !data.url.includes('checkout.stripe.com')) {
        throw new Error('Invalid checkout URL received')
      }

      window.location.href = data.url
      return
    } catch (error: any) {
      console.error('Checkout error:', error)
      toast({
        title: "Checkout Error",
        description: error?.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      })
      setLoading(null)
    }
  }


  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        {/* Page Header */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold font-['Poppins']">
                  {currentPlan ? 'Upgrade Your Plan' : 'Choose Your Plan'}
                </h1>
                <p className="text-muted-foreground">
                  {currentPlan
                    ? 'Upgrade to unlock more credits and premium adventures'
                    : 'Choose the perfect plan for your adventure lifestyle'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Current Plan Notice */}
        {currentPlan && (
          <section className="py-4">
            <div className="max-w-6xl mx-auto">
              <Card className="bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-primary/20 mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Crown className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg capitalize">Currently on {currentPlan} Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        {hasActiveSubscription
                          ? 'Active subscription • You can only upgrade to a higher tier'
                          : 'Inactive subscription • You can select any plan'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {hasActiveSubscription && (
                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You can only upgrade to a higher tier while your subscription is active.
                    To change to a different plan, cancel your current subscription or wait for it to expire.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </section>
        )}

        {/* Plans */}
        <section className="py-4">
          <div className="max-w-6xl mx-auto">
            {tiersLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading subscription plans...</p>
              </div>
            ) : subscriptionTiers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No subscription plans available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {subscriptionTiers.map((tier) => {
                  const isCurrent = currentPlan?.toLowerCase() === tier.name.toLowerCase() ||
                    normalizePlanName(currentPlan || '') === normalizePlanName(tier.name);
                  const tierRank = getPlanRank(tier.name);
                  const isDowngrade = hasActiveSubscription && tierRank < currentPlanRank;
                  const isUpgrade = tierRank > currentPlanRank;
                  const price = tier.price ? parseFloat(tier.price) : 0;
                  const credits = tier.creditsPerMonth || getCreditsForPlan(tier.name);

                  return (
                    <Card
                      key={tier.id}
                      className={`relative transition-all duration-200 hover:shadow-lg ${isCurrent
                          ? 'ring-2 ring-green-500 border-green-500'
                          : isDowngrade
                            ? 'opacity-60 border-muted'
                            : 'hover:border-primary/50'
                        }`}
                    >
                      {isCurrent && (
                        <div className="absolute -top-3 right-4">
                          <Badge className="bg-green-500 text-white">
                            Current Plan
                          </Badge>
                        </div>
                      )}

                      {isDowngrade && (
                        <div className="absolute -top-3 right-4">
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            <Lock className="h-3 w-3 mr-1" />
                            Lower Tier
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="text-center pb-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Crown className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">{tier.name}</CardTitle>
                        <div className="text-4xl font-bold text-primary">
                          ${price.toFixed(2)}
                          <span className="text-lg text-muted-foreground font-normal">/month</span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {tier.description && (
                          <div className="mb-6">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                              {tier.description}
                            </p>
                          </div>
                        )}

                        {/* Credits Display */}
                        <div className="mb-6 p-4 bg-primary/10 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Coins className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold text-primary">
                              {credits} Adventure Credits
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Credits added to your account immediately
                          </p>
                        </div>

                        <Button
                          className="w-full"
                          variant={isCurrent ? "outline" : isDowngrade ? "secondary" : "default"}
                          disabled={isCurrent || isDowngrade || loading === tier.id}
                          onClick={() => !isCurrent && !isDowngrade && handleSelectPlan(tier.id, tier.name)}
                          data-testid={`button-select-tier-${tier.id}`}
                        >
                          {loading === tier.id
                            ? "Redirecting to checkout..."
                            : isCurrent
                              ? "Current Plan"
                              : isDowngrade
                                ? "Cannot Downgrade"
                                : `${isUpgrade ? 'Upgrade to' : 'Select'} ${tier.name}`}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </section>

      </main>

      <BottomNavigation />
    </div>
  )
}