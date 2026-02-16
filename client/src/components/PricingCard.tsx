import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PricingCardProps {
  title: string
  price: string
  period?: string
  isPopular?: boolean
  features?: string[]
  onSignUp: () => void
  loading?: boolean
  buttonText?: string
}

export function PricingCard({
  title,
  price,
  period = "month",
  isPopular = false,
  features = [],
  onSignUp,
  loading,
  buttonText = 'Get Started'
}: PricingCardProps) {
  return (
    <Card className={cn(
      "relative p-6 transition-all duration-300 interactive-card",
      isPopular ? "border-primary shadow-lg scale-105" : "hover:shadow-md"
    )}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
            Popular
          </span>
        </div>
      )}

      <CardHeader className="text-center pt-8">
        <h3 className="text-xl font-bold" data-testid={`text-plan-${title.toLowerCase()}`}>
          {title}
        </h3>
        <div className="mt-4">
          <span className="text-4xl font-bold" data-testid={`text-price-${title.toLowerCase()}`}>
            {price}
          </span>
          {price !== "Free" && (
            <span className="text-muted-foreground">/{period}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {features.length > 0 && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
                {feature}
              </li>
            ))}
          </ul>
        )}

        <Button
          className="w-full"
          variant={isPopular ? "default" : "outline"}
          onClick={onSignUp}
          disabled={loading}
        >
          {loading ? "Processing..." : buttonText}
        </Button>
      </CardContent>
    </Card>
  )
}