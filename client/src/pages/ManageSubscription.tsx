
import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Crown, Calendar, CreditCard, Download, Check, ArrowLeft } from "lucide-react"
import { useState } from "react"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/useAuth"
import { useQuery } from "@tanstack/react-query"

export default function ManageSubscription() {
  const [, setLocation] = useLocation()
  const { user } = useAuth()
  const [autoRenew, setAutoRenew] = useState(true)

  // Fetch user data with subscription info from the API
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refetch every 5 seconds to catch updates
  })

  const handleGoBack = () => {
    setLocation("/account")
  }

  const handleChangePlan = () => {
    setLocation("/upgrade")
  }

  const handleCancelSubscription = () => {
    console.log("Cancel subscription clicked")
    // TODO: Implement subscription cancellation
  }

  const handleDownloadInvoice = (invoiceId: string) => {
    console.log(`Download invoice: ${invoiceId}`)
    // TODO: Implement invoice download
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pb-20 px-4">
          <section className="py-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center">
                <p>Loading subscription information...</p>
              </div>
            </div>
          </section>
        </main>
        <BottomNavigation />
      </div>
    )
  }

  // Check if user has an active subscription
  const hasSubscription = (userData as any)?.subscriptionStatus === 'active' && (userData as any)?.subscriptionPlan
  const subscriptionPlan = (userData as any)?.subscriptionPlan || null

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        {/* Page Header */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="flex justify-start mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="ml-0">
                <h1 className="text-3xl font-bold font-['Poppins']">Manage Subscription</h1>
                <p className="text-muted-foreground">
                  {hasSubscription ? 'Update your plan, billing, and subscription settings' : 'You don\'t have an active subscription yet'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {hasSubscription ? (
          <>
            {/* Current Plan */}
            <section className="py-4">
              <div className="max-w-4xl mx-auto">
                <Card className="bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-primary/20 mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Crown className="h-5 w-5 text-primary" />
                      <span>Current Plan</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-2xl font-bold text-primary mb-2 capitalize">
                          {subscriptionPlan ? `${subscriptionPlan} Plan` : 'No Plan'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {subscriptionPlan === 'premium' && 'Unlimited basic gear • Priority booking • Premium support'}
                          {subscriptionPlan === 'vip' && 'Unlimited bookings • VIP gear access • Concierge service'}
                          {subscriptionPlan === 'basic' && 'Basic gear access • Standard support'}
                          {!subscriptionPlan && 'You currently have no active subscription plan'}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Active subscription</span>
                          </div>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold">
                            {subscriptionPlan === 'basic' && '$29.99/month'}
                            {subscriptionPlan === 'premium' && '$39.99/month'}
                            {subscriptionPlan === 'vip' && '$79.99/month'}
                          </span>
                          <Button onClick={handleChangePlan} variant="outline">
                            Change Plan
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto-renewal</span>
                          <Switch
                            checked={autoRenew}
                            onCheckedChange={setAutoRenew}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Billing History */}
            <section className="py-4">
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Billing History</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No billing history available yet</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="py-8">
              <div className="max-w-4xl mx-auto">
                <Card className="border-red-200 dark:border-red-800">
                  <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium mb-1">Cancel Subscription</h3>
                        <p className="text-sm text-muted-foreground">
                          You'll retain access until your current billing period ends
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleCancelSubscription}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        ) : (
          // No subscription - show upgrade option
          <section className="py-4">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardContent className="p-12 text-center">
                  <Crown className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-bold mb-2">No Active Subscription</h2>
                  <p className="text-muted-foreground mb-6">
                    Subscribe to unlock premium features and benefits
                  </p>
                  <Button onClick={handleChangePlan}>
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </main>

      <BottomNavigation />
    </div>
  )
}
