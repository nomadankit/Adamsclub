
import { useState, useEffect } from "react"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Download, 
  Share, 
  Calendar,
  Clock,
  MapPin,
  RefreshCw
} from "lucide-react"
import { useLocation } from "wouter"
import QRCodeGenerator from 'qrcode'

export default function QRViewer() {
  const [, setLocation] = useLocation()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

  // Mock booking data - in real app, get from URL params or context
  const booking = {
    id: "booking-1",
    title: "Kayak Adventure",
    equipment: "Premium Kayak #K001", 
    date: "Dec 15, 2024",
    time: "9:00 AM - 5:00 PM",
    location: "Lake Tahoe",
    status: "Confirmed",
    qrCode: JSON.stringify({
      bookingId: "booking-1",
      equipment: "K001",
      timestamp: Date.now()
    })
  }

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCodeGenerator.toDataURL(booking.qrCode, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeDataUrl(url)
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    }
    generateQR()
  }, [booking.qrCode])

  const handleBack = () => {
    setLocation('/bookings')
  }

  const handleDownload = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a')
      link.download = `booking-${booking.id}-qr.png`
      link.href = qrCodeDataUrl
      link.click()
    }
  }

  const handleShare = () => {
    console.log('Share QR code')
    // TODO: Implement sharing functionality
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const url = await QRCodeGenerator.toDataURL(booking.qrCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeDataUrl(url)
    } catch (error) {
      console.error('Error refreshing QR code:', error)
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      
      <main className="pb-20 px-4">
        {/* Page Header */}
        <section className="py-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost" 
                onClick={handleBack}
                className="mr-4 p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold font-['Poppins']">QR Code</h1>
                <p className="text-muted-foreground">
                  Show this code for check-in
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* QR Code Display */}
        <section className="py-4">
          <div className="max-w-2xl mx-auto">
            <Card className="mb-6">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-64 h-64 mx-auto bg-white rounded-lg p-4 shadow-lg">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="Booking QR Code" className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 rounded flex items-center justify-center">
                        <div className="text-white text-xs font-mono opacity-50 animate-pulse">Generating...</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 mb-6">
                  <h2 className="text-xl font-semibold">{booking.title}</h2>
                  <p className="text-muted-foreground">{booking.equipment}</p>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {booking.status}
                  </Badge>
                </div>

                <div className="flex justify-center space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleShare}
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Booking Details */}
        <section className="py-4">
          <div className="max-w-2xl mx-auto">
            <Card className="subtle-hover">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Booking Details</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">{booking.date}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">{booking.time}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{booking.location}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Instructions */}
        <section className="py-4">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Check-in Instructions</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Arrive 30 minutes before your scheduled time</li>
                  <li>• Present this QR code to staff at the equipment counter</li>
                  <li>• Bring a valid ID for verification</li>
                  <li>• Check equipment condition before leaving</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      
      <BottomNavigation />
    </div>
  )
}
