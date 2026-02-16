import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useLocation } from "wouter"
import { BarcodeScanner } from "@/components/BarcodeScanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"
import { 
  Scan, 
  CheckCircle2, 
  Wrench, 
  XCircle, 
  ArrowLeft,
  Package,
  User,
  Calendar,
  AlertTriangle,
  Loader2
} from "lucide-react"

interface AssetData {
  id: string
  name: string
  barcode: string
  brand?: string
  model?: string
  status: string
  condition: string
  category?: string
}

interface BookingData {
  id: string
  status: string
  startDate: string
  endDate: string
  qrToken?: string
  member: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

interface ScanResult {
  ok: boolean
  booking: BookingData
  asset: AssetData
  member: {
    firstName: string
    lastName: string
    email: string
  } | null
}

type ActionType = 'start' | 'cancel' | 'return' | 'maintenance'

export default function StaffScan() {
  const { user } = useAuth()
  const [, setLocation] = useLocation()
  const { toast } = useToast()

  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(true)
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [notes, setNotes] = useState("")

  const scanMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch(`/api/staff/scan?code=${code}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Scan failed")
      }
      return response.json()
    },
    onSuccess: (data) => {
      setScanResult(data)
      setIsScanning(false)
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const actionMutation = useMutation({
    mutationFn: async ({ bookingId, action, condition }: { 
      bookingId: string
      action: ActionType
      condition?: string
    }) => {
      const endpoint = `/api/staff/bookings/${bookingId}/${action}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Action failed")
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: `Action ${variables.action} completed successfully`
      })
      resetScan()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const handleScan = (code: string) => {
    scanMutation.mutate(code)
  }

  const handleAction = (action: ActionType) => {
    if (!scanResult) return
    if (action === 'return') {
      setSelectedAction('return')
    } else {
      actionMutation.mutate({ bookingId: scanResult.booking.id, action })
    }
  }

  const confirmReturn = (condition: string) => {
    if (!scanResult) return
    actionMutation.mutate({ 
      bookingId: scanResult.booking.id, 
      action: 'return',
      condition 
    })
    setSelectedAction(null)
  }

  const resetScan = () => {
    setScanResult(null)
    setIsScanning(true)
    setSelectedAction(null)
    setNotes("")
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      available: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "Available" },
      checked_out: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "Checked Out" },
      maintenance: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", label: "Maintenance" },
      out_of_service: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "Out of Service" }
    }
    const config = statusConfig[status] || { className: "bg-gray-100 text-gray-800", label: status }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-muted-foreground">You need staff access to use this feature.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/staff/dashboard')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Scan Equipment</h1>
              <p className="text-muted-foreground">Scan barcode to check in or update status</p>
            </div>
          </div>

          {isScanning ? (
            <div className="space-y-4">
              <BarcodeScanner 
                onScan={handleScan}
                isScanning={isScanning && !scanMutation.isPending}
              />
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Manual Entry</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-3 py-2 border rounded-md text-sm" 
                    placeholder="Enter booking code..."
                    onKeyDown={(e) => e.key === 'Enter' && handleScan(e.currentTarget.value)}
                  />
                  <Button size="sm" onClick={(e) => {
                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement).value;
                    if (input) handleScan(input);
                  }}>Resolve</Button>
                </div>
              </div>
              {scanMutation.isPending && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Looking up booking...</span>
                </div>
              )}
            </div>
          ) : scanResult && (
            <div className="space-y-4">
              <Card data-testid="card-asset-details">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-lg">{scanResult.asset.name}</CardTitle>
                    {getStatusBadge(scanResult.asset.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Booking ID:</span>
                    </div>
                    <span className="font-mono">{scanResult.booking.id.slice(0, 8)}...</span>
                    
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Member:</span>
                    </div>
                    <span>{scanResult.member?.firstName} {scanResult.member?.lastName}</span>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Status:</span>
                    </div>
                    <span className="capitalize">{scanResult.booking.status}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Available Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {(scanResult.booking.status === 'pending' || scanResult.booking.status === 'confirmed') && (
                    <>
                      <Button
                        variant="default"
                        className="h-auto py-4 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction('start')}
                      >
                        <CheckCircle2 className="h-6 w-6" />
                        <span>Start Adventure</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleAction('cancel')}
                      >
                        <XCircle className="h-6 w-6" />
                        <span>Cancel Booking</span>
                      </Button>
                    </>
                  )}

                  {scanResult.booking.status === 'checked_out' && (
                    <Button
                      variant="default"
                      className="h-auto py-4 flex flex-col items-center gap-2 col-span-2"
                      onClick={() => handleAction('return')}
                    >
                      <Package className="h-6 w-6" />
                      <span>Collect / Return Gear</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={resetScan}
                  >
                    <Scan className="h-6 w-6" />
                    <span>Scan Another</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Dialog open={selectedAction === 'return'} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Equipment</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <Button onClick={() => confirmReturn('available')} className="bg-green-600 hover:bg-green-700">
              Return as Available
            </Button>
            <Button onClick={() => confirmReturn('maintenance')} variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50">
              Send to Maintenance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
