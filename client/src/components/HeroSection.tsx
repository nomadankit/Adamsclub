import { Button } from "@/components/ui/button"
import heroImage from "@assets/generated_images/Adventure_kayaking_hero_image_94d401b6.png"

export function HeroSection() {
  const handleJoinClick = () => {
    console.log('Join Adam\'s Club clicked')
  }

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Hero Image with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage}
          alt="Adventure kayaking on mountain lake"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-background/90" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <h1 className="text-5xl md:text-6xl font-bold font-['Poppins'] text-white mb-6">
          Adam's Club
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
          Join the club. <br />
          Rent outdoor gear.
        </h2>
        
        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Access high-quality equipment and exclusive experiences.
        </p>
        
        <Button 
          size="lg"
          onClick={() => window.location.href = '/auth'}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold shadow-lg"
        >
          Sign in to get started
        </Button>
      </div>
    </section>
  )
}