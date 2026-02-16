import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, ArrowLeft, Calendar, DollarSign } from "lucide-react"
import { useLocation } from "wouter"
import { formatDistanceToNow } from "date-fns"

interface CheckoutItem {
  id: string
  assetName: string
  assetCategory?: string
  creditsCost: number
  issuedAt: string
  returnDeadline?: string
  returnedAt?: string
  condition: string
  notes?: string
}

interface CheckoutData {
  active: CheckoutItem[]
  returned: CheckoutItem[]
}

export default function MemberCheckouts() {
  const [, setLocation] = useLocation()

  const { data: checkouts, isLoading } = useQuery<CheckoutData>({
    queryKey: ['/api/member/checkouts'],
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading your checkouts...</p>
        </div>
      </div>
    )
  }

  const active = checkouts?.active || []
  const returned = checkouts?.returned || []

  const totalActiveCredits = active.reduce((sum, item) => sum + parseFloat(item.creditsCost.toString()), 0)

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4">
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" onClick={() => setLocation('/home')} data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold font-['Poppins']" data-testid="text-checkouts-title">
                  My Equipment
                </h1>
                <p className="text-muted-foreground">
                  Equipment you've checked out from Adam's Club
                </p>
              </div>
            </div>

            {/* Active Checkouts Summary */}
            {active.length > 0 && (
              <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950" data-testid="card-active-summary">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Checkouts</p>
                      <p className="text-2xl font-bold mt-1">{active.length} {active.length === 1 ? 'item' : 'items'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Credits Reserved</p>
                      <p className="text-2xl font-bold mt-1">{parseFloat(totalActiveCredits.toString()).toFixed(2)} credits</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active Checkouts */}
            <Card data-testid="card-active-checkouts">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Currently Checked Out ({active.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {active.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                    <p className="text-muted-foreground mb-4">No active checkouts</p>
                    <Button onClick={() => setLocation('/explore')} data-testid="button-explore">
                      Explore Gear
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {active.map((checkout) => (
                      <div key={checkout.id} className="p-4 border rounded-lg hover-elevate transition-all" data-testid={`checkout-item-${checkout.id}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate" data-testid={`text-asset-${checkout.id}`}>
                              {checkout.assetName}
                            </h3>
                            <div className="flex gap-2 flex-wrap mt-2">
                              {checkout.assetCategory && (
                                <Badge variant="outline" className="text-xs">
                                  {checkout.assetCategory}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {checkout.condition}
                              </Badge>
                            </div>
                            {checkout.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{checkout.notes}</p>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 mb-2">
                              <p className="font-semibold">{parseFloat(checkout.creditsCost?.toString() || '0').toFixed(2)} credits</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Issued {formatDistanceToNow(new Date(checkout.issuedAt), { addSuffix: true })}
                            </p>
                            {checkout.returnDeadline && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                Due {formatDistanceToNow(new Date(checkout.returnDeadline), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Returned Checkouts */}
            {returned.length > 0 && (
              <Card className="mt-6" data-testid="card-returned-checkouts">
                <CardHeader>
                  <CardTitle>Returned History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {returned.map((checkout) => (
                      <div key={checkout.id} className="p-4 border rounded-lg opacity-75" data-testid={`returned-item-${checkout.id}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate text-muted-foreground">{checkout.assetName}</h3>
                            <div className="flex gap-2 flex-wrap mt-2">
                              {checkout.assetCategory && (
                                <Badge variant="outline" className="text-xs">
                                  {checkout.assetCategory}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                Returned
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-muted-foreground">
                              Returned {checkout.returnedAt ? formatDistanceToNow(new Date(checkout.returnedAt), { addSuffix: true }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
