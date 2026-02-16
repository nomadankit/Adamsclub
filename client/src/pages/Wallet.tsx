import { Badge } from "@/components/ui/badge"
import { CreditCard, Plus, ArrowUpRight, Gift, Zap } from "lucide-react"

function Credits() {
  const handleBuyCredits = () => {
    console.log('Buy credits clicked')
  }

  const handleViewTransactions = () => {
    console.log('View transactions clicked')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <h1 className="text-2xl font-bold mb-2">Credits</h1>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Available Credits</p>
            <p className="text-3xl font-bold">247</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleBuyCredits}
              className="bg-primary-foreground text-primary rounded-full p-3 hover:bg-opacity-90 transition-colors"
              data-testid="button-buy-credits"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleBuyCredits}
            className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent transition-colors"
            data-testid="button-buy-credits-action"
          >
            <Zap className="h-8 w-8 text-primary mb-2" />
            <span className="font-medium">Buy Credits</span>
            <span className="text-sm text-muted-foreground">Top up account</span>
          </button>
          <button
            onClick={handleViewTransactions}
            className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent transition-colors"
            data-testid="button-view-history"
          >
            <ArrowUpRight className="h-8 w-8 text-primary mb-2" />
            <span className="font-medium">History</span>
            <span className="text-sm text-muted-foreground">View all activity</span>
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-background hover-elevate">
            <div className="flex items-center space-x-3">
              <div className="bg-red-500/10 dark:bg-red-500/20 p-2 rounded-full">
                <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Gear Rental</p>
                <p className="text-xs text-muted-foreground">Dec 15, 2024</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-red-600 dark:text-red-400 text-sm">-45</p>
              <Badge variant="secondary" className="text-xs mt-1">Completed</Badge>
            </div>
          </div>



          <div className="flex items-center justify-between p-4 border rounded-lg bg-background hover-elevate">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-500/10 dark:bg-blue-500/20 p-2 rounded-full">
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Credit Purchase</p>
                <p className="text-xs text-muted-foreground">Dec 8, 2024</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-green-600 dark:text-green-400 text-sm">+200</p>
              <Badge variant="secondary" className="text-xs mt-1">Completed</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Credits;
