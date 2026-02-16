import { PricingCard } from "../PricingCard"

export default function PricingCardExample() {
  return (
    <div className="p-4 max-w-xs mx-auto">
      <PricingCard 
        title="Premium"
        price="$49"
        isPopular={true}
        features={["5 bookings per month", "Premium gear access", "Priority booking"]}
        onSignUp={() => console.log("Premium signup clicked")}
      />
    </div>
  )
}