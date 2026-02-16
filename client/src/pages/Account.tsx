import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Plus, ArrowUpRight, ArrowDownLeft, Crown, Gift, Star, Zap, Settings } from "lucide-react"
import { useLocation, useSearch } from "wouter"
import { useAuth } from "@/hooks/useAuth"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { useEffect } from "react"

export default function Account() {
  const [, setLocation] = useLocation()
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const search = useSearch()

  useEffect(() => {
    const params = new URLSearchParams(search)

    if (params.get('upgraded') === '1') {
      toast({
        title: "Subscription Upgraded!",
        description: "Your membership has been successfully upgraded.",
      })

      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] })
      window.history.replaceState({}, '', '/account')
    } else if (params.get('payment_success') === 'true') {
      const type = params.get('type')

      toast({
        title: "Payment Successful!",
        description: type === 'subscription'
          ? "Your membership has been upgraded successfully."
          : "Adventure Credits have been added to your account.",
      })

      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] })
      window.history.replaceState({}, '', '/account')
    }
  }, [search, toast, queryClient])

  // Fetch user data with credits from the API
  const { data: userData, isLoading: loading } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const creditsBalance = (userData as any)?.adamsCredits || '0.00';


  const handleBuyCredits = () => {
    setLocation('/buy-credits')
  }

  const handleManageSubscription = () => {
    setLocation('/subscription')
  }

  // Function to handle purchase button click
  const handlePurchase = async () => {
    try {
      const response = await fetch('/api/checkout/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include authorization token if needed
          // 'Authorization': `Bearer ${yourAuthToken}`
        },
        // You might need to send some data here depending on your API
        // body: JSON.stringify({ itemId: 'some-item-id' })
      });

      // Check if the response is a redirect (status code 303)
      if (response.status === 303) {
        const redirectUrl = response.headers.get('Location');
        if (redirectUrl) {
          window.location.href = redirectUrl; // Redirect the user
        } else {
          toast({
            title: "Checkout Error",
            description: "Could not determine redirect URL. Please try again.",
            variant: "destructive",
          });
        }
        return; // Stop further processing if it's a redirect
      }

      // If not a redirect, try to parse as JSON
      const data = await response.json();

      if (response.ok) {
        // Handle successful purchase, e.g., update UI, show confirmation
        toast({
          title: "Purchase Successful",
          description: "Your purchase was completed successfully.",
        });
        // Optionally, invalidate queries to refetch updated data
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      } else {
        // Handle API errors
        toast({
          title: "Purchase Failed",
          description: data.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: "Purchase Error",
        description: "An error occurred while processing your purchase. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        {/* Page Header */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold font-['Poppins']">Account</h1>
                <p className="text-muted-foreground">
                  Manage your subscription and Adventure Credits
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription & Credits Cards */}
        <section className="py-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Current Subscription */}
              <Card className="bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-primary/20 premium-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                      <h3 className="text-2xl font-bold font-['Poppins'] text-primary capitalize">
                        {(userData as any)?.subscriptionPlan || 'No Plan'}
                      </h3>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Crown className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {(userData as any)?.subscriptionPlan === 'premium' && 'Unlimited basic gear • Priority booking'}
                    {(userData as any)?.subscriptionPlan === 'vip' && 'Unlimited bookings • VIP gear access'}
                    {(userData as any)?.subscriptionPlan === 'basic' && 'Basic gear access • Standard support'}
                    {!(userData as any)?.subscriptionPlan && 'Subscribe to unlock premium features'}
                  </p>
                  <Button
                    onClick={handleManageSubscription}
                    variant="outline"
                    className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border hover:bg-background/80"
                    data-testid="button-manage-subscription"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Plan
                  </Button>
                </CardContent>
              </Card>

              {/* Adams Credits Balance */}
              <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-green-500/20 premium-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Adventure Credits</p>
                      <h3 className="text-2xl font-bold font-['Poppins'] text-green-600">{loading ? 'Loading...' : creditsBalance}</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                      <Star className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Use for premium gear & add-ons</p>
                  <Button
                    onClick={handleBuyCredits}
                    className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-foreground border hover:bg-background/80"
                    data-testid="button-buy-credits"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Buy Adventure Credits
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="py-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border hover-card" data-testid="card-upgrade-plan">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Upgrade Plan</h3>
                  <p className="text-sm text-muted-foreground">Get access to premium gear</p>
                </CardContent>
              </Card>

              <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border hover-card" data-testid="card-add-ons">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Add-ons</h3>
                  <p className="text-sm text-muted-foreground">Extra services and premium gear</p>
                </CardContent>
              </Card>


            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="py-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <p className="text-lg mb-2">No transaction history yet</p>
                <p className="text-sm">Your credit transactions will appear here</p>
              </div>
              {/* Purchase Button */}
              <div className="mt-8">
                <Button onClick={handlePurchase} data-testid="button-purchase">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Purchase Now
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  )
}