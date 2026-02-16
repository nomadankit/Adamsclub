import { useEffect, useRef, useState, useCallback } from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { NotFoundException } from "@zxing/library"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, X, Keyboard, RefreshCw } from "lucide-react"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose?: () => void
  isScanning?: boolean
}

export function BarcodeScanner({ onScan, onClose, isScanning = true }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null)
  const [hasCamera, setHasCamera] = useState(true)
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [manualBarcode, setManualBarcode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
  }, [])

  const startCamera = useCallback(async () => {
    if (!videoRef.current || isManualEntry) return

    try {
      setError(null)
      const reader = new BrowserMultiFormatReader()
      setCodeReader(reader)

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices()
      
      if (videoInputDevices.length === 0) {
        setHasCamera(false)
        setIsManualEntry(true)
        return
      }

      const selectedDeviceId = videoInputDevices[0].deviceId

      await reader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const barcodeText = result.getText()
            onScan(barcodeText)
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error("Scan error:", err)
          }
        }
      )
      setIsCameraActive(true)
    } catch (err) {
      console.error("Camera error:", err)
      setError("Unable to access camera. Please allow camera permissions or use manual entry.")
      setHasCamera(false)
      setIsManualEntry(true)
    }
  }, [isManualEntry, onScan])

  useEffect(() => {
    if (isScanning && !isManualEntry) {
      startCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isScanning, isManualEntry, startCamera, stopCamera])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim())
      setManualBarcode("")
    }
  }

  const toggleMode = () => {
    if (!isManualEntry) {
      stopCamera()
    }
    setIsManualEntry(!isManualEntry)
    setError(null)
  }

  const handleRetry = () => {
    setError(null)
    setIsManualEntry(false)
    startCamera()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4 space-y-4">
        {onClose && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                stopCamera()
                onClose()
              }}
              data-testid="button-close-scanner"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        {isManualEntry ? (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="text-center mb-4">
              <Keyboard className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Enter the barcode manually
              </p>
            </div>
            <Input
              type="text"
              placeholder="Enter barcode number..."
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              autoFocus
              data-testid="input-barcode-manual"
              className="text-center text-lg font-mono"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={!manualBarcode.trim()}
                className="flex-1"
                data-testid="button-submit-barcode"
              >
                Look Up
              </Button>
              {hasCamera && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleMode}
                  data-testid="button-use-camera"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {!isCameraActive && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 border-2 border-white/50 rounded-lg">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground">
              Position barcode within the frame
            </div>

            <Button
              variant="outline"
              onClick={toggleMode}
              className="w-full"
              data-testid="button-manual-entry"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Enter Manually
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
