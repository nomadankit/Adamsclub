
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Calendar, Clock, MapPin, Users, Mountain, ChevronLeft, CheckCircle, Star, Info, AlertCircle } from "lucide-react"
import { useLocation } from "wouter"
import { useState } from "react"

export function MemberEvents() {
  const { user } = useAuth()
  const [, setLocation] = useLocation()
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([])
  const [selectedEventDetails, setSelectedEventDetails] = useState<typeof upcomingEvents[0] | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const upcomingEvents = [
    {
      id: 'event-1',
      title: 'Sunrise Kayak Expedition',
      date: 'Saturday, May 18',
      time: '6:00 AM - 10:00 AM',
      location: 'Lake Tahoe',
      spots: 8,
      spotsTotal: 12,
      difficulty: 'Beginner',
      description: 'Join fellow members for a peaceful morning paddle as the sun rises over the mountains.',
      leadGuide: 'Sarah Johnson',
      featured: true
    },
    {
      id: 'event-2',
      title: 'Mountain Biking Adventure',
      date: 'Sunday, May 19',
      time: '8:00 AM - 2:00 PM',
      location: 'Marin Headlands',
      spots: 3,
      spotsTotal: 10,
      difficulty: 'Intermediate',
      description: 'Explore scenic trails with experienced guides. Lunch included.',
      leadGuide: 'Mike Chen',
      featured: false
    },
    {
      id: 'event-3',
      title: 'Camping Skills Workshop',
      date: 'Saturday, May 25',
      time: '10:00 AM - 4:00 PM',
      location: 'Point Reyes Station',
      spots: 12,
      spotsTotal: 15,
      difficulty: 'All Levels',
      description: 'Learn essential camping techniques from setup to campfire cooking.',
      leadGuide: 'Alex Martinez',
      featured: false
    },
    {
      id: 'event-4',
      title: 'Full Moon Hike',
      date: 'Friday, May 31',
      time: '8:00 PM - 11:00 PM',
      location: 'Muir Woods',
      spots: 6,
      spotsTotal: 20,
      difficulty: 'Easy',
      description: 'Experience the magic of the forest under moonlight with headlamps and hot cocoa.',
      leadGuide: 'Emma Davis',
      featured: true
    }
  ]

  const handleRegister = (eventId: string) => {
    if (!registeredEvents.includes(eventId)) {
      setRegisteredEvents([...registeredEvents, eventId])
      console.log(`Registered for event: ${eventId}`)
    }
  }

  const handleUnregister = (eventId: string) => {
    setRegisteredEvents(registeredEvents.filter(id => id !== eventId))
    console.log(`Unregistered from event: ${eventId}`)
  }

  const handleViewDetails = (event: typeof upcomingEvents[0]) => {
    setSelectedEventDetails(event)
    setShowDetailsModal(true)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'Beginner':
      case 'Easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-blue-50/50 dark:from-primary/20 dark:via-primary/10 dark:to-blue-950/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-20 translate-x-20" />
        <div className="relative z-10 px-4 py-6 max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/')}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-primary/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-primary/30 shadow-lg">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-['Poppins'] text-foreground">
                Member Events
              </h1>
              <p className="text-muted-foreground">
                Join exclusive club expeditions
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="pb-20 px-4">
        {/* Event Stats */}
        <section className="py-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{upcomingEvents.length}</p>
                  <p className="text-xs text-muted-foreground">Upcoming Events</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{registeredEvents.length}</p>
                  <p className="text-xs text-muted-foreground">Your Events</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-950/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">Free</p>
                  <p className="text-xs text-muted-foreground">Member Perks</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Events List */}
        <section className="py-2">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-lg font-bold font-['Poppins'] mb-4">Upcoming Expeditions</h2>
            <div className="space-y-4">
              {upcomingEvents.map((event) => {
                const isRegistered = registeredEvents.includes(event.id)
                return (
                  <Card 
                    key={event.id}
                    className={`transition-all duration-200 hover:shadow-md ${
                      event.featured ? 'border-primary/30 bg-gradient-to-r from-primary/5 to-transparent' : ''
                    } ${isRegistered ? 'ring-2 ring-green-500/30' : ''}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-bold text-lg">{event.title}</h3>
                            {event.featured && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                            {isRegistered && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Registered
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                          
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center space-x-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{event.date}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{event.time}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{event.location}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Mountain className="h-4 w-4 text-muted-foreground" />
                              <span>Led by {event.leadGuide}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Badge className={getDifficultyColor(event.difficulty)}>
                              {event.difficulty}
                            </Badge>
                            <div className="text-sm">
                              <span className={`font-semibold ${event.spots < 5 ? 'text-orange-600' : 'text-green-600'}`}>
                                {event.spots} spots left
                              </span>
                              <span className="text-muted-foreground"> of {event.spotsTotal}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 mt-4">
                        {isRegistered ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUnregister(event.id)}
                            className="flex-1"
                          >
                            Cancel Registration
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => handleRegister(event.id)}
                            disabled={event.spots === 0}
                            className="flex-1"
                          >
                            {event.spots === 0 ? 'Sold Out' : 'Register'}
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(event)}
                        >
                          Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Event Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center space-x-2">
              <span>{selectedEventDetails?.title}</span>
              {selectedEventDetails?.featured && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete event information and requirements
            </DialogDescription>
          </DialogHeader>

          {selectedEventDetails && (
            <div className="space-y-6">
              {/* Event Overview */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Overview
                </h3>
                <p className="text-muted-foreground">{selectedEventDetails.description}</p>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Date</p>
                        <p className="text-sm text-muted-foreground">{selectedEventDetails.date}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Time</p>
                        <p className="text-sm text-muted-foreground">{selectedEventDetails.time}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{selectedEventDetails.location}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Mountain className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Lead Guide</p>
                        <p className="text-sm text-muted-foreground">{selectedEventDetails.leadGuide}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Difficulty & Availability */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium mb-1">Difficulty Level</p>
                  <Badge className={getDifficultyColor(selectedEventDetails.difficulty)}>
                    {selectedEventDetails.difficulty}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium mb-1">Availability</p>
                  <p className={`text-lg font-bold ${selectedEventDetails.spots < 5 ? 'text-orange-600' : 'text-green-600'}`}>
                    {selectedEventDetails.spots} / {selectedEventDetails.spotsTotal} spots
                  </p>
                </div>
              </div>

              {/* What to Bring */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  What to Bring
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Water bottle (minimum 1 liter)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Comfortable outdoor clothing and closed-toe shoes</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Sun protection (hat, sunscreen, sunglasses)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Personal medications if needed</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>All equipment provided by club</span>
                  </li>
                </ul>
              </div>

              {/* Important Notes */}
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Important Notes</h3>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>• Please arrive 15 minutes early for check-in</li>
                  <li>• Event may be rescheduled due to weather conditions</li>
                  <li>• Cancellations must be made 24 hours in advance</li>
                  <li>• Participants must sign a waiver before the event</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                {registeredEvents.includes(selectedEventDetails.id) ? (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      handleUnregister(selectedEventDetails.id)
                      setShowDetailsModal(false)
                    }}
                    className="flex-1"
                  >
                    Cancel Registration
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      handleRegister(selectedEventDetails.id)
                      setShowDetailsModal(false)
                    }}
                    disabled={selectedEventDetails.spots === 0}
                    className="flex-1"
                  >
                    {selectedEventDetails.spots === 0 ? 'Event Full' : 'Register Now'}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  )
}
