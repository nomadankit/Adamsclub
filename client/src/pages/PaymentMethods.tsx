
import { useState } from "react"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  CreditCard, 
  Plus, 
  MoreVertical,
  Trash2,
  Edit,
  Check
} from "lucide-react"
import { useLocation } from "wouter"

export default function PaymentMethods() {
  const [, setLocation] = useLocation()

  const handleBack = () => {
    setLocation('/profile')
  }

  const handleAddCard = () => {
    console.log('Add new card clicked')
    // TODO: Implement add card flow
  }

  const handleEditCard = (cardId: string) => {
    console.log(`Edit card ${cardId}`)
    // TODO: Implement edit card flow
  }

  const handleDeleteCard = (cardId: string) => {
    console.log(`Delete card ${cardId}`)
    // TODO: Implement delete card flow
  }

  const handleSetDefault = (cardId: string) => {
    console.log(`Set card ${cardId} as default`)
    // TODO: Implement set default card
  }

  return (
    <div className="min-h-screen bg-background">
      
      <main className="pb-20 px-4">
        {/* Page Header */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Button
                  variant="ghost" 
                  onClick={handleBack}
                  className="mr-4 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold font-['Poppins']">Payment Methods</h1>
                  <p className="text-muted-foreground">
                    Manage your cards and payment options
                  </p>
                </div>
              </div>
              <Button onClick={handleAddCard}>
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </div>
          </div>
        </section>

        {/* Payment Methods List */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {/* Primary Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">VISA</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">•••• •••• •••• 4242</p>
                          <Badge className="bg-primary/10 text-primary">Primary</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Expires 12/26</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCard('card-1')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCard('card-1')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Secondary Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-8 bg-gradient-to-r from-red-600 to-pink-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">MC</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">•••• •••• •••• 8888</p>
                        </div>
                        <p className="text-sm text-muted-foreground">Expires 09/27</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault('card-2')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Set Default
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCard('card-2')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCard('card-2')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Security Notice */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-muted/30">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CreditCard className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Secure Payment Processing</h3>
                    <p className="text-sm text-muted-foreground">
                      Your payment information is encrypted and stored securely. We never store your full card details on our servers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      
      <BottomNavigation />
    </div>
  )
}
