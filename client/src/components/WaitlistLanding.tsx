import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useLocation } from "wouter"
import { useState } from "react"
import { Backpack, Coins, Mountain, Check } from "lucide-react"
import logo from "@assets/Adams_club_logo-removebg-preview_1758801408059.png"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/ThemeToggle"

export function WaitlistLanding() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    state: '',
    optInMarketing: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to join waitlist')
      }

      toast({
        title: "Success!",
        description: "You've been added to the waitlist. Check your email for updates!"
      })
      
      setFormData({
        firstName: '',
        email: '',
        state: '',
        optInMarketing: false
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to join waitlist. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToForm = () => {
    const formElement = document.getElementById('waitlist-form')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Adams Club" className="h-10 w-10 object-contain" />
            <span className="font-bold text-lg text-slate-900 dark:text-white">Adam's Club</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900">
          <div className="max-w-4xl mx-auto text-center text-white space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Be First in Line for Adventure
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Access quality gear, curated experiences, and exclusive deals. Join the waitlist to secure your spot as a founding member.
            </p>
            <Button 
              onClick={scrollToForm}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-6"
              data-testid="button-hero-join-waitlist"
            >
              Join the Waitlist
            </Button>
          </div>
        </section>

        {/* Gradient Fade Transition */}
        <div className="h-16 bg-gradient-to-b from-slate-800 dark:from-slate-900 to-background"></div>

        {/* What is Adam's Club */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Your Membership for Gear, Getaways & Good Deals
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-8 text-center hover:shadow-lg transition">
                <Backpack className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Gear You Don't Have to Own
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Access quality camping, adventure, and lifestyle gear without the full purchase cost.
                </p>
              </Card>

              <Card className="p-8 text-center hover:shadow-lg transition">
                <Coins className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Member-Only Offers & Credits
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Earn and spend Adam's Credits on rentals, upgrades, and partner perks.
                </p>
              </Card>

              <Card className="p-8 text-center hover:shadow-lg transition">
                <Mountain className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Curated Experiences
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  From weekend camping to bucket-list trips, get first dibs on limited spots.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Why Join Early */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                  Early Adopters Get More
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                  We're rewarding the first wave of supporters with exclusive perks.
                </p>

                <div className="space-y-4">
                  {[
                    "Locked founder pricing for Year 1",
                    "Priority access to new gear and categories",
                    "Early invitations to beta tests and trip pilots",
                    "Exclusive 'Founding Member' badge on your profile",
                    "Higher earning rate of Adam's Credits during launch period"
                  ].map((perk, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 dark:text-slate-300">{perk}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={scrollToForm}
                  variant="outline"
                  size="lg"
                  className="mt-8"
                  data-testid="button-reserve-spot"
                >
                  Reserve Your Spot →
                </Button>
              </div>

              <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg p-8 text-center">
                <p className="text-slate-700 dark:text-slate-300 text-lg font-semibold">
                  Limited founding member spots available
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                How It Will Work
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Tell Us Where You Adventure",
                  desc: "Share your location and interests so we can prioritize launch cities and gear types."
                },
                {
                  step: "2",
                  title: "Get Your Early Access Code",
                  desc: "As we open your region, you'll receive an email with your access link and perks."
                },
                {
                  step: "3",
                  title: "Unlock Gear & Perks",
                  desc: "Log in, browse gear and offers, book what you want, and start earning credits."
                }
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-12">
              We'll roll out in phases, starting with the most active waitlist regions.
            </p>
          </div>
        </section>

        {/* Waitlist Form */}
        <section id="waitlist-form" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Join the Waitlist
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Founding members will receive priority invites, locked-in pricing, and surprise drops.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="firstName" className="text-slate-700 dark:text-slate-300">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    data-testid="input-first-name"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <Label htmlFor="state" className="text-slate-700 dark:text-slate-300">
                    State
                  </Label>
                  <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                    <SelectTrigger id="state" data-testid="select-state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AL">Alabama</SelectItem>
                      <SelectItem value="AK">Alaska</SelectItem>
                      <SelectItem value="AZ">Arizona</SelectItem>
                      <SelectItem value="AR">Arkansas</SelectItem>
                      <SelectItem value="CA">California</SelectItem>
                      <SelectItem value="CO">Colorado</SelectItem>
                      <SelectItem value="CT">Connecticut</SelectItem>
                      <SelectItem value="DE">Delaware</SelectItem>
                      <SelectItem value="FL">Florida</SelectItem>
                      <SelectItem value="GA">Georgia</SelectItem>
                      <SelectItem value="HI">Hawaii</SelectItem>
                      <SelectItem value="ID">Idaho</SelectItem>
                      <SelectItem value="IL">Illinois</SelectItem>
                      <SelectItem value="IN">Indiana</SelectItem>
                      <SelectItem value="IA">Iowa</SelectItem>
                      <SelectItem value="KS">Kansas</SelectItem>
                      <SelectItem value="KY">Kentucky</SelectItem>
                      <SelectItem value="LA">Louisiana</SelectItem>
                      <SelectItem value="ME">Maine</SelectItem>
                      <SelectItem value="MD">Maryland</SelectItem>
                      <SelectItem value="MA">Massachusetts</SelectItem>
                      <SelectItem value="MI">Michigan</SelectItem>
                      <SelectItem value="MN">Minnesota</SelectItem>
                      <SelectItem value="MS">Mississippi</SelectItem>
                      <SelectItem value="MO">Missouri</SelectItem>
                      <SelectItem value="MT">Montana</SelectItem>
                      <SelectItem value="NE">Nebraska</SelectItem>
                      <SelectItem value="NV">Nevada</SelectItem>
                      <SelectItem value="NH">New Hampshire</SelectItem>
                      <SelectItem value="NJ">New Jersey</SelectItem>
                      <SelectItem value="NM">New Mexico</SelectItem>
                      <SelectItem value="NY">New York</SelectItem>
                      <SelectItem value="NC">North Carolina</SelectItem>
                      <SelectItem value="ND">North Dakota</SelectItem>
                      <SelectItem value="OH">Ohio</SelectItem>
                      <SelectItem value="OK">Oklahoma</SelectItem>
                      <SelectItem value="OR">Oregon</SelectItem>
                      <SelectItem value="PA">Pennsylvania</SelectItem>
                      <SelectItem value="RI">Rhode Island</SelectItem>
                      <SelectItem value="SC">South Carolina</SelectItem>
                      <SelectItem value="SD">South Dakota</SelectItem>
                      <SelectItem value="TN">Tennessee</SelectItem>
                      <SelectItem value="TX">Texas</SelectItem>
                      <SelectItem value="UT">Utah</SelectItem>
                      <SelectItem value="VT">Vermont</SelectItem>
                      <SelectItem value="VA">Virginia</SelectItem>
                      <SelectItem value="WA">Washington</SelectItem>
                      <SelectItem value="WV">West Virginia</SelectItem>
                      <SelectItem value="WI">Wisconsin</SelectItem>
                      <SelectItem value="WY">Wyoming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketing"
                    checked={formData.optInMarketing}
                    onCheckedChange={(checked) => setFormData({ ...formData, optInMarketing: checked as boolean })}
                    data-testid="checkbox-marketing"
                  />
                  <Label htmlFor="marketing" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                    I want early access to gear rentals, travel deals, and member-only perks
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                  disabled={isLoading}
                  data-testid="button-join-waitlist"
                >
                  {isLoading ? 'Joining...' : 'Join the Waitlist'}
                </Button>

                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  No spam. You can unsubscribe at any time.
                </p>
              </form>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: "Does joining the waitlist cost anything?",
                  a: "No, it's free with no commitment. You'll only pay when Adam's Club launches in your region."
                },
                {
                  q: "Where will Adam's Club launch first?",
                  a: "Regions with the highest waitlist demand will be prioritized for launch."
                },
                {
                  q: "Is this for gear rental, travel, or both?",
                  a: "Both! We offer physical gear access plus curated experiences and member-only offers."
                },
                {
                  q: "How will you contact me?",
                  a: "We'll reach out via email. You won't receive SMS unless you opt-in later."
                },
                {
                  q: "What if I'm on the waitlist but not in a launch region yet?",
                  a: "You'll be notified as soon as we expand to your area, and you'll get your founding member benefits."
                }
              ].map((item, i) => (
                <Card key={i} className="p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    {item.q}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {item.a}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-muted/50">
          <div className="max-w-6xl mx-auto text-center text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={logo} alt="Adams Club" className="h-8 w-8 object-contain" />
              <span className="font-bold text-slate-900 dark:text-white">Adam's Club</span>
            </div>
            <div className="flex gap-6 justify-center mb-4 text-sm">
              <a href="#" className="hover:text-slate-900 dark:hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-white">Terms</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-white">Contact</a>
            </div>
            <p className="text-xs">© Adam's Club, a Strategy Industries project.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
