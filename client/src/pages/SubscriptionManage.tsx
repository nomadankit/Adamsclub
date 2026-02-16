
import { useState } from "react"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Crown, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  ArrowLeft, 
  Check, 
  X,
  AlertTriangle,
  Download
} from "lucide-react"
import { useLocation } from "wouter"

function SubscriptionManage() {
  const [, setLocation] = useLocation()
  const [autoRenew, setAutoRenew] = useState(true)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const handleBack = () => {
    setLocation('/account')
  }

  const handleChangePlan = () => {
    setLocation('/')
  }

  const handleUpdatePayment = () => {
    console.log('Update payment method clicked')
    // TODO: Integrate with payment provider
  }

  const handleDownloadInvoice = (invoiceId: string) => {
    console.log(`Download invoice ${invoiceId}`)
    // TODO: Implement invoice download
  }

  const handleCancelSubscription = () => {
    setShowCancelDialog(true)
  }

  const confirmCancelSubscription = () => {
    console.log('Subscription cancelled')
    setShowCancelDialog(false)
    // TODO: Implement subscription cancellation
  }

  return (
    <div className="min-h-screen bg-background">
      
      <main className="pb-20 px-4">
        {/* Page Header */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost" 
                onClick={handleBack}
                className="mr-4 p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold font-['Poppins']">Manage Subscription</h1>
                <p className="text-muted-foreground">
                  Update your plan, payment method, and billing preferences
                </p>
              </div>
            </div>
          </div>
        </section>

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
                    <h3 className="text-2xl font-bold text-primary mb-2">Premium Plan</h3>
                    <p className="text-muted-foreground mb-4">
                      Unlimited basic gear • Priority booking • Premium support
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Next billing: Jan 15, 2025</span>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">$39.99/month</span>
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

        {/* Payment Method */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment Method</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">VISA</span>
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/26</p>
                    </div>
                  </div>
                  <Button onClick={handleUpdatePayment} variant="outline">
                    Update Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Billing History */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Billing History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Invoice items */}
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Premium Plan - December 2024</p>
                      <p className="text-sm text-muted-foreground">Dec 15, 2024</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">$39.99</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadInvoice('inv_001')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Premium Plan - November 2024</p>
                      <p className="text-sm text-muted-foreground">Nov 15, 2024</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">$39.99</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadInvoice('inv_002')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">Premium Plan - October 2024</p>
                      <p className="text-sm text-muted-foreground">Oct 15, 2024</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">$39.99</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadInvoice('inv_003')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cancel Subscription */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Cancel Subscription</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  If you cancel your subscription, you'll lose access to premium features at the end of your current billing period.
                </p>
                
                {!showCancelDialog ? (
                  <Button 
                    variant="destructive" 
                    onClick={handleCancelSubscription}
                  >
                    Cancel Subscription
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                        Are you sure you want to cancel your subscription? This action cannot be undone.
                      </p>
                      <div className="flex space-x-2">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={confirmCancelSubscription}
                        >
                          Yes, Cancel Subscription
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowCancelDialog(false)}
                        >
                          Keep Subscription
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      
      <BottomNavigation />
    </div>
  )
}

export default SubscriptionManage
