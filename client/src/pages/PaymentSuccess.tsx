import { useEffect, useState } from "react"
import { useLocation, useSearch } from "wouter"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, XCircle, ArrowLeft } from "lucide-react"

import { useQueryClient } from "@tanstack/react-query"

// Helper function to get subscription credits based on plan type
const getSubscriptionCredits = (planType: string): number => {
  const creditsMap: Record<string, number> = {
    'base-explorer': 71,
    'premium-adventurer': 110,
    'vip-pathfinder': 200,
    'basic': 71,
    'base': 71,
    'premium': 110,
    'vip': 200,
  };
  return creditsMap[planType?.toLowerCase()] || 0;
};

export default function PaymentSuccess() {
  const [, setLocation] = useLocation()
  const search = useSearch()
  const [paymentStatus, setPaymentStatus] = useState<string>('checking')
  const [sessionDetails, setSessionDetails] = useState<any>(null)
  const [creditsGranted, setCreditsGranted] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    const checkStatus = async () => {
      const urlParams = new URLSearchParams(search);
      const sessionId = urlParams.get('session_id')
      const canceled = urlParams.get('canceled')

      if (canceled === 'true') {
        setPaymentStatus('canceled')
        setLoading(false)
        return
      }

      if (!sessionId) {
        setPaymentStatus('unavailable')
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // AGGRESSIVE SYNC: Call sync immediately, don't wait for stripe-js check
        try {
          console.log('🔄 Triggering immediate payment sync...');
          const syncResponse = await fetch('/api/stripe/sync-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ sessionId })
          });

          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            console.log('✅ Sync successful! Response:', syncData);
            console.log('💰 Updated credits balance:', syncData.creditsBalance);

            // Store credits granted for display (subscription credits)
            if (syncData.creditsGranted) {
              setCreditsGranted(syncData.creditsGranted);
            }

            // Force refetch user data and credit history
            await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/credits/history'] });

            // Wait a moment for cache invalidation to propagate
            await new Promise(resolve => setTimeout(resolve, 500));

            // Force a refetch to ensure latest data
            await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
          } else {
            const errorText = await syncResponse.text();
            console.error('❌ Sync failed:', syncResponse.status, errorText);
          }
        } catch (e) {
          console.error('❌ Sync network error:', e);
        }

        // Check status (for display only)
        const { checkPaymentStatus } = await import('@/lib/stripe')
        const session = await checkPaymentStatus(sessionId)

        setSessionDetails(session)
        setPaymentStatus(session.payment_status === 'paid' ? 'completed' : session.payment_status)
      } catch (error) {
        console.error('Error checking payment status:', error)
        setPaymentStatus('error')
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [search, queryClient])

  const handleGoToAccount = () => {
    window.location.href = '/account'
  }

  const handleGoHome = () => {
    setLocation('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pb-20 px-4">
          <div className="max-w-2xl mx-auto py-8">
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Checking Payment Status...</h2>
                <p className="text-muted-foreground">Please wait while we verify your payment.</p>
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNavigation />
      </div>
    )
  }

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'completed':
        return <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
      case 'pending':
        return <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
      case 'canceled':
        return <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
      case 'failed':
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      default:
        return <Clock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
    }
  }

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'completed':
        const isSubscription = sessionDetails?.metadata?.type === 'subscription';
        const planType = sessionDetails?.metadata?.planType || 'your';
        const subscriptionCredits = creditsGranted || getSubscriptionCredits(planType);
        const creditPurchaseAmount = sessionDetails?.metadata?.credits;

        return {
          title: 'Payment Successful!',
          message: isSubscription
            ? `${subscriptionCredits} Adventure Credits have been added to your account for taking this subscription! Your ${planType} plan is now active.`
            : `${creditPurchaseAmount || 'Your'} Adventure Credits have been added to your account.`
        }
      case 'canceled':
        return {
          title: 'Payment Canceled',
          message: 'Your payment process was canceled. No charges were made to your account.'
        }
      case 'pending':
        return {
          title: 'Payment Pending',
          message: 'Your payment is being processed. You will receive a confirmation once completed.'
        }
      case 'failed':
        return {
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again or contact support.'
        }
      case 'error':
        return {
          title: 'Error Checking Status',
          message: 'We could not verify your payment status. Please contact support if you believe this is an error.'
        }
      case 'unavailable':
        return {
          title: 'Payment Processing Unavailable',
          message: 'Payment processing is temporarily unavailable. Please contact support to complete your purchase.'
        }
      default:
        return {
          title: 'Unknown Status',
          message: 'We could not determine your payment status.'
        }
    }
  }

  const statusInfo = getStatusMessage()

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        <div className="max-w-2xl mx-auto py-8">
          <Card>
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoHome}
                className="w-fit mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </CardHeader>
            <CardContent className="p-8 text-center">
              {getStatusIcon()}
              <CardTitle className="text-2xl mb-4">{statusInfo.title}</CardTitle>
              <p className="text-muted-foreground mb-6">{statusInfo.message}</p>

              {sessionDetails && (
                <div className="bg-muted p-4 rounded-lg mb-6 text-sm">
                  <p><strong>Amount:</strong> ${(sessionDetails.amount_total / 100).toFixed(2)}</p>
                  <p><strong>Status:</strong> {sessionDetails.payment_status}</p>
                  {sessionDetails.customer_details?.email && (
                    <p><strong>Email:</strong> {sessionDetails.customer_details.email}</p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {paymentStatus === 'completed' && (
                  <Button onClick={handleGoToAccount} className="w-full">
                    View Account
                  </Button>
                )}
                {paymentStatus === 'canceled' && (
                  <Button onClick={() => setLocation('/credits')} className="w-full">
                    Try Again
                  </Button>
                )}
                {paymentStatus === 'failed' && (
                  <Button onClick={() => setLocation('/buy-credits')} className="w-full">
                    Try Again
                  </Button>
                )}
                {paymentStatus === 'unavailable' && (
                  <Button onClick={() => setLocation('/account')} className="w-full">
                    Contact Support
                  </Button>
                )}
                <Button variant="outline" onClick={handleGoHome} className="w-full">
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNavigation />
    </div>
  )
}