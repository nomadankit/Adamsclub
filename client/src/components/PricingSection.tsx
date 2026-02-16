import { PricingCard } from "./PricingCard"
import { initiateCheckout } from "@/lib/checkout"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

export function PricingSection() {
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  const plans = [
    {
      id: 'starter',
      title: 'Starter',
      price: '$29',
      features: ['10 adventures per month', 'Basic gear access', 'Community events'],
      isPopular: false
    },
    {
      id: 'premium',
      title: 'Premium',
      price: '$49',
      features: ['25 adventures per month', 'Premium gear access', 'Priority booking'],
      isPopular: true
    },
    {
      id: 'vip',
      title: 'VIP',
      price: '$99',
      features: ['Unlimited adventures', 'VIP gear access', 'Concierge service'],
      isPopular: false
    }
  ]

  const handlePlanSelect = async (planSlug: string) => {
    setLoading(planSlug)
    try {
      await initiateCheckout(planSlug)
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 max-w-6xl mx-auto">
      {plans.map((plan) => (
        <PricingCard
          key={plan.id}
          title={plan.title}
          price={plan.price}
          isPopular={plan.isPopular}
          features={plan.features}
          onSignUp={() => handlePlanSelect(plan.id)}
          loading={loading === plan.id}
          buttonText="Get Started"
        />
      ))}
    </div>
  )
}