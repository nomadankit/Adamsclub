
import { useState } from "react"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  ArrowLeft, 
  Search, 
  Mail,
  Clock,
  HelpCircle,
  AlertCircle
} from "lucide-react"
import { useLocation } from "wouter"

export default function Help() {
  const [, setLocation] = useLocation()
  const [searchQuery, setSearchQuery] = useState("")

  const handleBack = () => {
    setLocation('/profile')
  }

  const faqs = [
    {
      question: "How do I book equipment?",
      answer: "You can book equipment through the Explore Gear section on the home page. Select your preferred dates and times, then confirm your reservation. You'll receive a confirmation email with pickup details."
    },
    {
      question: "What's included in my membership?",
      answer: "Basic membership includes access to standard gear, priority booking, and member support. Premium plans include premium gear access, extended rental periods, and exclusive member events. VIP includes all benefits plus personal gear concierge service."
    },
    {
      question: "How do I cancel or modify a booking?",
      answer: "You can cancel or modify bookings up to 24 hours before your scheduled time through the My Bookings page. Cancellations made less than 24 hours in advance may incur a 25% cancellation fee."
    },
    {
      question: "What if equipment is damaged or lost?",
      answer: "Please report any damage or loss immediately to our staff. Minor wear and tear is expected and covered. Significant damage or loss may result in replacement charges based on the item's depreciated value."
    },
    {
      question: "How do Adams Credits work?",
      answer: "Adams Credits are our virtual currency that can be used to upgrade to premium gear, extend rental periods, or purchase add-on services. Credits never expire and can be earned through referrals, reviews, and special promotions."
    },
    {
      question: "What are your operating hours?",
      answer: "We're open Monday-Friday 8:00 AM - 8:00 PM, and weekends 7:00 AM - 9:00 PM. Equipment pickup and return must be done during operating hours. Late returns incur a $10/hour fee."
    },
    {
      question: "Can I share my membership with family?",
      answer: "Memberships are individual and non-transferable. However, we offer family plans that provide discounts for multiple family members. Contact support for family plan pricing."
    },
    {
      question: "What happens if weather cancels my outdoor activity?",
      answer: "If severe weather makes your activity unsafe, we offer free rescheduling or full refund. Weather cancellations must be reported within 2 hours of your scheduled pickup time."
    },
    {
      question: "How do I earn referral credits?",
      answer: "Share your unique referral code with friends. When they sign up and make their first booking, you'll both receive 50 Adams Credits. There's no limit to how many friends you can refer!"
    },
    {
      question: "Can I reserve gear for multiple days?",
      answer: "Yes! Multi-day rentals are available for most gear. Premium and VIP members get extended rental periods at discounted rates. Maximum rental period is 14 days for most items."
    },
    {
      question: "What safety equipment is included?",
      answer: "All rentals include necessary safety equipment (helmets, life jackets, etc.) at no extra charge. We inspect and maintain all safety gear to the highest standards."
    },
    {
      question: "How do I upgrade my membership?",
      answer: "You can upgrade your membership anytime through your profile settings. Upgrades take effect immediately, and you'll be prorated for the remaining billing period."
    }
  ]

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
                <h1 className="text-3xl font-bold font-['Poppins']">Help & Support</h1>
                <p className="text-muted-foreground">
                  Find answers to common questions or get in touch
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </section>

        {/* Contact Options */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Get in Touch</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

              <Card className="cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => window.location.href = 'mailto:support@adamsclub.com'} data-testid="card-email-support">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Email Support</h3>
                  <p className="text-sm text-muted-foreground">Send us a detailed message</p>
                  <p className="text-xs text-muted-foreground mt-2">support@adamsclub.com</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
            <Card>
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                {filteredFaqs.length === 0 && (
                  <div className="text-center py-8">
                    <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                    <p className="text-sm text-muted-foreground mt-2">Try different keywords or contact support</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2 text-red-800 dark:text-red-200">Emergency Support</h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                      For urgent equipment issues or emergencies during your adventure
                    </p>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      24/7 Emergency Line: (555) 911-GEAR
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Hours */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-muted/30">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Support Hours</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Monday - Friday: 8:00 AM - 8:00 PM</p>
                      <p>Saturday - Sunday: 9:00 AM - 6:00 PM</p>
                      <p>Holiday Hours: 10:00 AM - 4:00 PM</p>
                      <p className="text-xs mt-2">Live chat available 24/7</p>
                      <p className="text-xs">Emergency support always available</p>
                    </div>
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
