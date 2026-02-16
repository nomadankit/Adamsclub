import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, Lightbulb, LogOut, Scan, Package, AlertTriangle, Calendar } from "lucide-react"
import { useLocation } from "wouter"

export default function StaffHome() {
  const { user } = useAuth()
  const [, setLocation] = useLocation()

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        window.location.href = '/auth'
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const dailyChecklist = [
    {
      title: "Inspect all gear at start of shift",
      description: "Check equipment condition, cleanliness, and function before operations begin",
      icon: Package
    },
    {
      title: "Verify QR codes are scanning properly",
      description: "Test the check-in/out scanner to ensure it's working correctly",
      icon: Scan
    },
    {
      title: "Review today's bookings",
      description: "Check your schedule for member arrivals and planned pickups",
      icon: Calendar
    },
    {
      title: "Check for pending returns",
      description: "Confirm all items checked out yesterday have been returned or follow up with members",
      icon: AlertCircle
    }
  ]

  const bestPractices = [
    {
      title: "Always scan QR codes",
      description: "Never manually enter checkout/checkin information. Always use the QR scanner to track equipment accurately.",
    },
    {
      title: "Document equipment condition",
      description: "When checking out equipment, note any existing damage or wear. This protects both the member and the company.",
    },
    {
      title: "Deduct credits immediately",
      description: "Issue equipment and deduct credits from the member's account in the same transaction to prevent disputes.",
    },
    {
      title: "Keep inventory updated",
      description: "Report any maintenance issues, lost items, or damaged gear immediately in the inventory system.",
    },
    {
      title: "Greet members professionally",
      description: "Create a positive experience by being friendly and answering questions about gear features and usage.",
    },
    {
      title: "Follow safety protocols",
      description: "Brief members on safety considerations and proper usage of equipment before they leave with gear.",
    }
  ]

  const importantReminders = [
    {
      title: "Credit Policy",
      description: "Members pay credits upfront for equipment. Never allow checkout before payment is confirmed.",
      priority: "high"
    },
    {
      title: "Maintenance Holds",
      description: "Do not allow checkout of items marked as 'maintenance' in the system, even if they appear to work.",
      priority: "high"
    },
    {
      title: "Damage Protocol",
      description: "If member reports damage, document it immediately and notify management. Take photos if possible.",
      priority: "high"
    },
    {
      title: "Lost Items",
      description: "Report any missing gear to management within 2 hours of discovery. Check lost and found first.",
      priority: "medium"
    },
    {
      title: "Operating Hours",
      description: "Confirm location operating hours and do not allow checkouts outside of business hours.",
      priority: "medium"
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="secondary">Staff Guide</Badge>
                </div>
                <h1 className="text-3xl font-bold">Welcome, {user?.firstName || 'Staff Member'}</h1>
                <p className="text-muted-foreground mt-1">Your daily operations guide and best practices</p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Daily Checklist */}
            <Card className="mb-8" data-testid="card-daily-checklist">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Daily Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dailyChecklist.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <div key={index} className="flex gap-4 p-4 rounded-lg border border-border">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{item.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Best Practices */}
            <Card className="mb-8" data-testid="card-best-practices">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Best Practices for Excellence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bestPractices.map((practice, index) => (
                    <div key={index} className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-semibold mb-2">{practice.title}</h4>
                      <p className="text-sm text-muted-foreground">{practice.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Important Reminders */}
            <Card data-testid="card-important-reminders">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Important Reminders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {importantReminders.map((reminder, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border-l-4 ${
                        reminder.priority === 'high'
                          ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                          : 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {reminder.priority === 'high' ? (
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <h4 className="font-semibold">{reminder.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
