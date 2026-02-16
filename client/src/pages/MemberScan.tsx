import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useLocation } from "wouter"
import { BarcodeScanner } from "@/components/BarcodeScanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Scan, 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock
} from "lucide-react"

interface MemberData {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  adamsCredits: string
  upcomingBookings: Array<{
    id: string
    assetName: string
    startDate: string
    endDate: string
    status: string
  }>
}

interface MemberScanResult {
  member: MemberData
}

export default function MemberScan() {
  const { user } = useAuth()
  const [, setLocation] = useLocation()

  const [memberId, setMemberId] = useState("")
  const [isScanning, setIsScanning] = useState(true)
  const [manualEntry, setManualEntry] = useState(false)

  const { data: memberData, isLoading: isLoadingMember, error: memberError } = useQuery<MemberScanResult>({
    queryKey: ['/api/staff/members', memberId],
    enabled: !!memberId && memberId.length > 0,
  })

  const handleScan = (code: string) => {
    setMemberId(code)
    setIsScanning(false)
  }

  const handleManualSubmit = () => {
    if (memberId.trim()) {
      setIsScanning(false)
    }
  }

  const handleReset = () => {
    setMemberId("")
    setIsScanning(true)
    setManualEntry(false)
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
              <h1 className="text-2xl font-bold">Scan Member ID</h1>
              <p className="text-muted-foreground">Scan member QR code or enter ID</p>
            </div>
          </div>

          {isScanning && !memberData ? (
            <div className="space-y-4">
              {!manualEntry ? (
                <>
                  <BarcodeScanner 
                    onScan={handleScan}
                    isScanning={isScanning && !isLoadingMember}
                  />
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => setManualEntry(true)}
                    data-testid="button-manual-entry"
                  >
                    Enter ID Manually
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Member ID</label>
                    <Input
                      placeholder="Paste or type member ID"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      data-testid="input-member-id"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleManualSubmit}
                      className="flex-1"
                      disabled={!memberId.trim()}
                      data-testid="button-submit-id"
                    >
                      Find Member
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setManualEntry(false)
                        setMemberId("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {isLoadingMember && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Finding member...</span>
                </div>
              )}
            </div>
          ) : memberData && memberData.member ? (
            <div className="space-y-4">
              <Card data-testid="card-member-profile">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {memberData.member.firstName} {memberData.member.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {memberData.member.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{memberData.member.email}</span>
                    </div>
                  )}
                  {memberData.member.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{memberData.member.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold">{memberData.member.adamsCredits} credits</span>
                  </div>
                </CardContent>
              </Card>

              {memberData.member.upcomingBookings && memberData.member.upcomingBookings.length > 0 && (
                <Card data-testid="card-upcoming-bookings">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Upcoming Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {memberData.member.upcomingBookings.map((booking) => (
                      <div key={booking.id} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{booking.assetName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {booking.status === 'active' ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </div>
                          )}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleReset}
                className="w-full"
                data-testid="button-scan-another"
              >
                Scan Another Member
              </Button>
            </div>
          ) : memberError ? (
            <Card className="border-destructive">
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-lg font-semibold">Member Not Found</p>
                <p className="text-muted-foreground text-sm mt-2">
                  No member found with this ID. Please try again.
                </p>
                <Button 
                  onClick={handleReset}
                  className="mt-4 w-full"
                  data-testid="button-try-again"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </main>
    </div>
  )
}

// Simple Zap icon fallback
const Zap = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)
