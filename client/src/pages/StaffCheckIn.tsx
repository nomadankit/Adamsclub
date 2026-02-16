import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Scan, CheckCircle2, AlertCircle, ArrowLeft, Camera } from "lucide-react"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"

interface Booking {
  id: string
  assetName: string
  memberName: string
  status: string
  startTime: string
  qrCode: string
  checkedOutAt?: string
  checkedInAt?: string
}

interface StaffDashboardData {
  bookings: Booking[]
  inventory: {
    total: number
    available: number
    maintenance: number
    unavailable: number
  }
  pendingCheckIns: number
  totalToday: number
}

export default function StaffCheckIn() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [qrInput, setQrInput] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [damageNotes, setDamageNotes] = useState("")
  const [showDamageForm, setShowDamageForm] = useState(false)
  const [itemCondition, setItemCondition] = useState<"clean" | "maintenance">("clean")
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { data: dashboard, isLoading } = useQuery<StaffDashboardData>({
    queryKey: ['/api/staff/dashboard/today'],
  })

  const checkoutMutation = useMutation({
    mutationFn: (bookingId: string) =>
      apiRequest("POST", "/api/staff/checkout", { bookingId }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Equipment checked out successfully",
      })
      queryClient.invalidateQueries({ queryKey: ['/api/staff/dashboard/today'] })
      setQrInput("")
      setSelectedBooking(null)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to checkout equipment",
        variant: "destructive",
      })
    },
  })

  const checkinMutation = useMutation({
    mutationFn: ({ bookingId, damageNotes, needsMaintenance }: { bookingId: string; damageNotes: string; needsMaintenance: boolean }) =>
      apiRequest("POST", "/api/staff/checkin", { bookingId, damageNotes, needsMaintenance }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Equipment checked in successfully",
      })
      queryClient.invalidateQueries({ queryKey: ['/api/staff/dashboard/today'] })
      setQrInput("")
      setSelectedBooking(null)
      setDamageNotes("")
      setShowDamageForm(false)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to checkin equipment",
        variant: "destructive",
      })
    },
  })

  const findBookingByQR = (qrCode: string) => {
    return dashboard?.bookings.find(b => b.qrCode === qrCode)
  }

  const handleQRSubmit = () => {
    if (!qrInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a QR code",
        variant: "destructive",
      })
      return
    }

    const booking = findBookingByQR(qrInput.trim())
    if (!booking) {
      toast({
        title: "Not Found",
        description: "Booking not found for this QR code",
        variant: "destructive",
      })
      return
    }

    setSelectedBooking(booking)
  }

  const handleCheckout = () => {
    if (!selectedBooking) return
    checkoutMutation.mutate(selectedBooking.id)
  }

  const handleCheckin = () => {
    if (!selectedBooking) return
    if (selectedBooking.status === 'active') {
      setShowDamageForm(true)
    }
  }

  const submitCheckin = () => {
    if (!selectedBooking) return
    checkinMutation.mutate({
      bookingId: selectedBooking.id,
      damageNotes: itemCondition === "maintenance" ? "Equipment needs maintenance" : damageNotes,
      needsMaintenance: itemCondition === "maintenance"
    })
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please use manual QR input.",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      setCameraActive(false)
    }
  }

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        toast({
          title: "Captured",
          description: "Frame captured - manual QR input recommended",
        })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const pendingCheckouts = dashboard?.bookings.filter(b => b.status === 'pending') || []
  const checkedOutItems = dashboard?.bookings.filter(b => b.status === 'active') || []

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/staff/home')}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold font-['Poppins']" data-testid="text-checkin-title">
                  Check-In / Check-Out
                </h1>
                <p className="text-muted-foreground">
                  Scan QR codes to manage equipment
                </p>
              </div>
            </div>

            <Tabs defaultValue="scan" className="w-full">
              <TabsList className="grid w-full grid-cols-2" data-testid="tabs-checkin">
                <TabsTrigger value="scan" data-testid="tab-scan">Scan QR</TabsTrigger>
                <TabsTrigger value="manual" data-testid="tab-manual">Manual Lookup</TabsTrigger>
              </TabsList>

              {/* Scan Tab */}
              <TabsContent value="scan" className="space-y-6">
                <Card data-testid="card-camera">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Camera Scanner
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!cameraActive ? (
                      <Button
                        onClick={startCamera}
                        className="w-full"
                        data-testid="button-start-camera"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Start Camera
                      </Button>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full rounded-lg border border-border"
                          data-testid="video-camera"
                        />
                        <canvas ref={canvasRef} className="hidden" width={640} height={480} />
                        <div className="flex gap-2">
                          <Button
                            onClick={captureFrame}
                            variant="outline"
                            className="flex-1"
                            data-testid="button-capture"
                          >
                            Capture Frame
                          </Button>
                          <Button
                            onClick={stopCamera}
                            variant="destructive"
                            className="flex-1"
                            data-testid="button-stop-camera"
                          >
                            Stop Camera
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Manual Input Tab */}
              <TabsContent value="manual" className="space-y-6">
                <Card data-testid="card-manual-input">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scan className="h-5 w-5" />
                      Manual QR Code Entry
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Scan or paste QR code</label>
                      <Input
                        placeholder="Enter QR code (e.g., AC-1234567890-abc123xyz)"
                        value={qrInput}
                        onChange={(e) => setQrInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleQRSubmit()}
                        data-testid="input-qr-code"
                        autoFocus
                      />
                    </div>
                    <Button
                      onClick={handleQRSubmit}
                      className="w-full"
                      data-testid="button-search-qr"
                    >
                      <Scan className="h-4 w-4 mr-2" />
                      Search QR Code
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Booking Details */}
            {selectedBooking && (
              <Card className="mt-6" data-testid="card-booking-details">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{selectedBooking.assetName}</CardTitle>
                    <Badge
                      variant={selectedBooking.status === 'active' ? 'secondary' : 'outline'}
                      data-testid={`badge-status-${selectedBooking.id}`}
                    >
                      {selectedBooking.status === 'active' ? 'Active' : 'Pending Checkout'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Member</p>
                      <p className="font-semibold">{selectedBooking.memberName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Start Time</p>
                      <p className="font-semibold">
                        {new Date(selectedBooking.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Check-in with Condition Form */}
                  {showDamageForm && selectedBooking.status === 'active' && (
                    <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-sm font-medium">Item Condition</p>
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="radio" name="condition" value="clean" checked={itemCondition === "clean"} onChange={() => setItemCondition("clean")} data-testid="radio-clean" className="cursor-pointer" />
                          <span className="text-sm">Clean & Undamaged - Check in normally</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="radio" name="condition" value="maintenance" checked={itemCondition === "maintenance"} onChange={() => setItemCondition("maintenance")} data-testid="radio-maintenance" className="cursor-pointer" />
                          <span className="text-sm">Needs Maintenance - Mark for service</span>
                        </label>
                      </div>
                      {itemCondition === "clean" && (
                        <Textarea
                          placeholder="Note any minor wear or observations (optional)..."
                          value={damageNotes}
                          onChange={(e) => setDamageNotes(e.target.value)}
                          className="min-h-[80px]"
                          data-testid="textarea-damage-notes"
                        />
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    {selectedBooking.status !== 'active' ? (
                      <>
                        <Button
                          onClick={handleCheckout}
                          disabled={checkoutMutation.isPending}
                          className="flex-1"
                          data-testid="button-checkout"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {checkoutMutation.isPending ? 'Processing...' : 'Checkout Equipment'}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedBooking(null)
                            setQrInput("")
                          }}
                          variant="outline"
                          data-testid="button-cancel-booking"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        {!showDamageForm ? (
                          <>
                            <Button
                              onClick={handleCheckin}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              data-testid="button-checkin"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Check-in Equipment
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedBooking(null)
                                setQrInput("")
                              }}
                              variant="outline"
                              data-testid="button-cancel-checkin"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={submitCheckin}
                              disabled={checkinMutation.isPending}
                              className={`flex-1 ${itemCondition === "maintenance" ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"}`}
                              data-testid="button-submit-checkin"
                            >
                              {checkinMutation.isPending ? 'Processing...' : itemCondition === "maintenance" ? 'Mark for Maintenance' : 'Confirm Check-in'}
                            </Button>
                            <Button
                              onClick={() => {
                                setShowDamageForm(false)
                                setItemCondition("clean")
                              }}
                              variant="outline"
                              data-testid="button-back-checkin"
                            >
                              Back
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Lists */}
            {!selectedBooking && (
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Checkouts */}
                <Card data-testid="card-pending-checkouts">
                  <CardHeader>
                    <CardTitle className="text-lg">Ready for Checkout</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pendingCheckouts.length > 0 ? (
                      <div className="space-y-2">
                        {pendingCheckouts.map((booking) => (
                          <button
                            key={booking.id}
                            onClick={() => {
                              setSelectedBooking(booking)
                              setQrInput(booking.qrCode)
                            }}
                            className="w-full p-3 text-left rounded-lg hover:bg-accent transition-colors border border-border"
                            data-testid={`button-pending-${booking.id}`}
                          >
                            <p className="font-medium text-sm">{booking.assetName}</p>
                            <p className="text-xs text-muted-foreground">{booking.memberName}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No pending checkouts</p>
                    )}
                  </CardContent>
                </Card>

                {/* Checked Out Items */}
                <Card data-testid="card-checked-out">
                  <CardHeader>
                    <CardTitle className="text-lg">Awaiting Check-in</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {checkedOutItems.length > 0 ? (
                      <div className="space-y-2">
                        {checkedOutItems.map((booking) => (
                          <button
                            key={booking.id}
                            onClick={() => {
                              setSelectedBooking(booking)
                              setQrInput(booking.qrCode)
                            }}
                            className="w-full p-3 text-left rounded-lg hover:bg-accent transition-colors border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30"
                            data-testid={`button-checkedout-${booking.id}`}
                          >
                            <p className="font-medium text-sm">{booking.assetName}</p>
                            <p className="text-xs text-muted-foreground">{booking.memberName}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">All equipment checked in</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
