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
  member: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

interface ScanResult {
  asset: AssetData
  activeBooking: BookingData | null
}

type ActionType = 'check_in' | 'maintenance' | 'out_of_service' | 'available'

export default function StaffScan() {
  const { user } = useAuth()
  const [, setLocation] = useLocation()
  const { toast } = useToast()

  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(true)
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [notes, setNotes] = useState("")
  const [damageReported, setDamageReported] = useState(false)

  const scanMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const response = await apiRequest('POST', '/api/staff/scan', { barcode })
      return response as unknown as ScanResult
    },
    onSuccess: (data) => {
      setScanResult(data)
      setIsScanning(false)
    },
    onError: (error: any) => {
      toast({
        title: "Asset Not Found",
        description: error.message || "No asset found with this barcode",
        variant: "destructive"
      })
    }
  })

  const actionMutation = useMutation({
    mutationFn: async ({ assetId, action, notes, bookingId, damageReported }: { 
      assetId: string
      action: ActionType
      notes?: string
      bookingId?: string
      damageReported?: boolean
    }) => {
      const actionEndpointMap: Record<ActionType, string> = {
        check_in: 'check-in',
        maintenance: 'maintenance',
        out_of_service: 'out-of-service',
        available: 'available'
      }
      const endpoint = `/api/staff/assets/${assetId}/${actionEndpointMap[action]}`
      return apiRequest('POST', endpoint, { notes, bookingId, damageReported })
    },
    onSuccess: (_, variables) => {
      const actionLabels: Record<ActionType, string> = {
        check_in: 'checked in',
        maintenance: 'marked for maintenance',
        out_of_service: 'marked out of service',
        available: 'marked available'
      }
      toast({
        title: "Success",
        description: `Asset ${actionLabels[variables.action]} successfully`
      })
      resetScan()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update asset status",
        variant: "destructive"
      })
    }
  })

  const handleScan = (barcode: string) => {
    scanMutation.mutate(barcode)
  }

  const handleAction = (action: ActionType) => {
    if (!scanResult) return
    setSelectedAction(action)
  }

  const confirmAction = () => {
    if (!scanResult || !selectedAction) return

    actionMutation.mutate({
      assetId: scanResult.asset.id,
      action: selectedAction,
      notes: notes || undefined,
      bookingId: scanResult.activeBooking?.id,
      damageReported: selectedAction === 'maintenance' ? damageReported : undefined
    })
  }

  const resetScan = () => {
    setScanResult(null)
    setIsScanning(true)
    setSelectedAction(null)
    setNotes("")
    setDamageReported(false)
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
              {scanMutation.isPending && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Looking up asset...</span>
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
                      <span className="text-muted-foreground">Barcode:</span>
                    </div>
                    <span className="font-mono">{scanResult.asset.barcode}</span>

                    {scanResult.asset.brand && (
                      <>
                        <div className="text-muted-foreground">Brand:</div>
                        <span>{scanResult.asset.brand}</span>
                      </>
                    )}

                    {scanResult.asset.model && (
                      <>
                        <div className="text-muted-foreground">Model:</div>
                        <span>{scanResult.asset.model}</span>
                      </>
                    )}

                    <div className="text-muted-foreground">Condition:</div>
                    <span className="capitalize">{scanResult.asset.condition}</span>
                  </div>

                  {scanResult.activeBooking && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800 dark:text-blue-200">Active Booking</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">Member: </span>
                          {scanResult.activeBooking.member?.firstName} {scanResult.activeBooking.member?.lastName}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Email: </span>
                          {scanResult.activeBooking.member?.email}
                        </p>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-muted-foreground">
                            {new Date(scanResult.activeBooking.startDate).toLocaleDateString()} - {new Date(scanResult.activeBooking.endDate).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Action</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950/30"
                    onClick={() => handleAction('check_in')}
                    data-testid="button-action-checkin"
                  >
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <span>Check In</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950/30"
                    onClick={() => handleAction('maintenance')}
                    data-testid="button-action-maintenance"
                  >
                    <Wrench className="h-6 w-6 text-orange-600" />
                    <span>Maintenance</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/30"
                    onClick={() => handleAction('out_of_service')}
                    data-testid="button-action-outofservice"
                  >
                    <XCircle className="h-6 w-6 text-red-600" />
                    <span>Out of Service</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={resetScan}
                    data-testid="button-scan-another"
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

      <Dialog open={!!selectedAction} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction === 'check_in' && 'Check In Asset'}
              {selectedAction === 'maintenance' && 'Mark for Maintenance'}
              {selectedAction === 'out_of_service' && 'Mark Out of Service'}
              {selectedAction === 'available' && 'Mark Available'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {scanResult && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{scanResult.asset.name}</p>
                <p className="text-sm text-muted-foreground font-mono">{scanResult.asset.barcode}</p>
              </div>
            )}

            {selectedAction === 'maintenance' && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={damageReported}
                  onChange={(e) => setDamageReported(e.target.checked)}
                  className="rounded border-gray-300"
                  data-testid="checkbox-damage-reported"
                />
                <span className="text-sm">Report damage</span>
              </label>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
              <Textarea
                placeholder="Add any notes about this action..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                data-testid="textarea-notes"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedAction(null)}
              disabled={actionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionMutation.isPending}
              data-testid="button-confirm-action"
            >
              {actionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
