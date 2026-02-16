import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { useLocation } from "wouter"
import { Zap, Users, MapPin, Shield, TrendingUp, Compass, Instagram } from "lucide-react"
import logo from "@assets/Adams_club_logo-removebg-preview_1758801408059.png"
import heroImage from "@assets/ChatGPT_Image_Dec_5,_2025,_11_56_20_PM_1765048427747.png"
import featureImg1 from "@assets/8eb259b2-c896-4395-8af8-b2649079b4b0_1765048894852.jpg"
import featureImg2 from "@assets/ChatGPT_Image_Dec_7,_2025,_12_56_11_AM_1765049195568.png"
import featureImg3 from "@assets/ChatGPT_Image_Dec_7,_2025,_12_56_12_AM_1765049195570.png"


export function LandingPage() {
  const [, setLocation] = useLocation()

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Adams Club" className="h-10 w-10 object-contain" />
            <span className="font-bold text-lg text-slate-900 dark:text-white">Adams Club</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLocation('/login')}
              variant="ghost"
              data-testid="button-nav-login"
              className="text-slate-700 dark:text-slate-200 hover:text-primary hover:bg-primary/10"
            >
              Sign In
            </Button>
            <Button
              onClick={() => setLocation('/signup')}
              variant="default"
              data-testid="button-nav-signup"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section with Image */}
        <section className="relative overflow-hidden py-0">
          <div className="grid md:grid-cols-2 gap-0 items-center min-h-[600px]">
            {/* Image Side */}
            <div className="relative h-full min-h-[600px] order-2 md:order-2 hidden md:block">
              <img
                src={heroImage}
                alt="Adams Club Adventure"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
            </div>

            {/* Content Side */}
            <div className="space-y-8 px-6 sm:px-8 lg:px-12 py-12 order-1 md:order-1">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                  Explore Pure
                  <span className="block text-primary">
                    Creation
                  </span>
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                  Explore adventure gear, equipment, and experiences without the commitment. Join thousands of outdoor enthusiasts who've embraced the freedom of access-based rental.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => setLocation('/signup')}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6"
                  data-testid="button-hero-signup"
                >
                  Get Started Free
                </Button>

              </div>


            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Why Choose Adams Club?</h2>
              <p className="text-xl text-slate-600 dark:text-slate-300">Everything you need to explore, rent, and experience</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: "Instant Access",
                  desc: "Book gear in seconds and pick up same day from multiple locations"
                },
                {
                  icon: TrendingUp,
                  title: "Earn Rewards",
                  desc: "Accumulate credits with every booking and get loyalty benefits"
                },
                {
                  icon: Shield,
                  title: "Fully Protected",
                  desc: "Insurance coverage included with every rental for peace of mind"
                },
                {
                  icon: MapPin,
                  title: "Multiple Locations",
                  desc: "Access equipment from 8+ convenient locations across the region"
                },
                {
                  icon: Users,
                  title: "Community Driven",
                  desc: "Connect with experienced adventurers and share stories"
                },
                {
                  icon: Compass,
                  title: "Expert Support",
                  desc: "Live chat support from outdoor experts ready to help 24/7"
                }
              ].map((feature, i) => (
                <Card key={i} className="p-6 hover:shadow-lg transition">
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Images Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Experience the Adventure</h2>
              <p className="text-xl text-slate-600 dark:text-slate-300">See what our members are renting and enjoying</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition h-64 md:h-80">
                <img src={featureImg1} alt="Adventure Activity 1" className="w-full h-full object-cover" />
              </div>
              <div className="rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition h-64 md:h-80">
                <img src={featureImg2} alt="Adventure Activity 2" className="w-full h-full object-cover" />
              </div>
              <div className="rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition h-64 md:h-80">
                <img src={featureImg3} alt="Adventure Activity 3" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Flexible Membership Plans</h2>
              <p className="text-xl text-slate-600 dark:text-slate-300">Choose the plan that fits your adventure style</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  name: "Base Explorer",
                  price: "$199",
                  desc: "Perfect for weekend adventurers who want variety without commitment",
                  features: [
                    "2 weekend Camping gear kit (tents, sleeping bags, coolers, lanterns, etc.)",
                    "2 days of bike rental (mountain or city bike)",
                    "2 takeout of Farm Fresh Produce"
                  ]
                },
                {
                  name: "Premium Adventurer",
                  price: "$449",
                  desc: "For members who want consistent access and variety for a healthier, active lifestyle",
                  features: [
                    "5 days of bike rental (mountain or city bike)",
                    "2 takeout of Farm Fresh Produce",
                    "12 hours watercraft use per month (jet skis, kayaks, paddle boards)",
                    "Camping kit for 1 full week (gear refreshed each month)"
                  ],
                  featured: true
                },
                {
                  name: "VIP Pathfinder",
                  price: "$899",
                  desc: "Designed for those who want the best of everything, hassle-free",
                  features: [
                    "Unlimited bike rentals (mountain or city bike)",
                    "2 takeout of Farm Fresh Produce",
                    "3 days watercraft use per month (jet skis, kayaks, paddle boards)",
                    "Camping + adventure gear anytime (exclusive early booking access)",
                    "Personal concierge service (gear scheduling, trip planning, booking support)",
                    "One premium weekend getaway every year (2-night trip, curated lodging & activities)"
                  ]
                }
              ].map((plan, i) => (
                <Card
                  key={i}
                  className={`p-8 text-center transition ${plan.featured
                    ? 'ring-2 ring-primary shadow-lg scale-105'
                    : ''
                    }`}
                  data-testid={`card-pricing-${plan.name.toLowerCase()}`}
                >
                  {plan.featured && (
                    <div className="mb-4 inline-block px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-primary mb-2">
                    {plan.price}
                    <span className="text-lg text-slate-600 dark:text-slate-400">/month</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">{plan.desc}</p>
                  <ul className="space-y-3 mb-8 text-left text-sm">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="h-1.5 w-1.5 bg-primary rounded-full" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => setLocation('/signup')}
                    className={`w-full ${plan.featured
                      ? 'bg-primary hover:bg-primary/90'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                  >
                    Choose Plan
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Start Your Adventure?
            </h2>
            <p className="text-lg opacity-90">
              Join thousands of members who have discovered the freedom of access-based equipment rental
            </p>
            <div className="flex flex-col items-center gap-6">
              <Button
                onClick={() => setLocation('/signup')}
                size="lg"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-8 py-6 w-fit"
                data-testid="button-cta-signup"
              >
                Sign Up Now
              </Button>
            </div>
          </div>

        </section>

        {/* Footer */}
        <footer className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <img src={logo} alt="Adams Club" className="h-8 w-8 object-contain" />
                  <span className="font-bold text-slate-900 dark:text-white">Adams Club</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Access over ownership.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Socials</h4>
                <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                  <li>
                    <a href="https://discord.gg/tWkARhRNPV" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition group" aria-label="Discord">
                      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current group-hover:text-primary transition-colors">
                        <title>Discord</title>
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.5382-9.6752-3.5459-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
                      </svg>
                    </a>
                  </li>
                  <li>
                    <a href="https://www.instagram.com/team.adamsclub" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition group" aria-label="Instagram">
                      <Instagram className="w-5 h-5 group-hover:text-primary transition-colors" />
                    </a>
                  </li>
                  <li>
                    <a href="https://x.com/team_adamsclub" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition group" aria-label="X">
                      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current group-hover:text-primary transition-colors">
                        <title>X</title>
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                      </svg>
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Support</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><a href="#" className="hover:text-primary transition">Help Center</a></li>
                  <li><a href="#" className="hover:text-primary transition">FAQs</a></li>
                  <li><a href="#" className="hover:text-primary transition">Contact Us</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><a href="#" className="hover:text-primary transition">Privacy</a></li>
                  <li><a href="#" className="hover:text-primary transition">Terms</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 pt-8 text-center text-sm text-slate-600 dark:text-slate-400">
              <p>&copy; 2025 Adams Club. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div >
  )
}
