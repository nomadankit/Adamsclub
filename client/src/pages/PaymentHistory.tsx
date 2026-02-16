import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar
} from "lucide-react"
import { useLocation } from "wouter"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"

export default function PaymentHistory() {
  const [, setLocation] = useLocation()
  const { user } = useAuth()

  const handleBack = () => {
    setLocation('/profile')
  }

  const { data: transactionsData } = useQuery({
    queryKey: ['/api/credits/history'],
    enabled: !!user,
  })

  // Map backend data to UI format
  const transactions = ((transactionsData as any[]) || []).map((txn: any) => ({
    id: txn.id,
    type: txn.type,
    description: txn.description,
    amount: (Number(txn.amount) > 0 ? '+' : '') + txn.amount,
    date: new Date(txn.createdAt).toLocaleDateString(),
    status: 'completed',
    icon: txn.amount > 0 ? ArrowUpRight : ArrowDownLeft,
    iconColor: txn.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
    iconBg: txn.amount > 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
  }))

  return (
    <div className="min-h-screen bg-background">

      <main className="pb-24 px-3">
        {/* Header */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="hover:bg-background/80"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold font-['Poppins']">Payment History</h1>
                <p className="text-muted-foreground">View your past transactions</p>
              </div>
            </div>
          </div>
        </section>

        {/* Transaction List */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Recent Transactions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((transaction: any) => {
                    const IconComponent = transaction.icon
                    return (
                      <div key={transaction.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 ${transaction.iconBg} rounded-full flex items-center justify-center`}>
                            <IconComponent className={`h-5 w-5 ${transaction.iconColor}`} />
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">{transaction.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-medium text-green-600">{transaction.amount}</span>
                          <Badge variant="secondary" className="text-xs">
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Info Section */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-muted/30">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CreditCard className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Transaction History</h3>
                    <p className="text-sm text-muted-foreground">
                      All transactions are processed through our secure payment partner. For detailed receipts or billing inquiries, please contact support.
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