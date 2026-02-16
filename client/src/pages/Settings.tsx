
import { useState } from "react"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Bell,
  Moon,
  Globe,
  Shield,
  Smartphone,
  Mail,
  MessageSquare,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export default function Settings() {
  const [, setLocation] = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Check if user has password (this property comes from our updated backend)
  const hasPassword = user && (user as any).hasPassword !== false;

  const handleDeleteAccount = async () => {
    // Validation based on auth method
    if (deletePassword !== "DELETE") {
      toast({
        title: "Error",
        description: "Please type DELETE to confirm",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      const payload = { confirmation: deletePassword };

      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete account")
      }

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      })

      // Redirect to login (refreshing to clear client state/cache)
      window.location.href = "/"

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeletePassword("")
      setDeleteDialogOpen(false)
    }
  }

  const handleBack = () => {
    setLocation('/account')
  }

  return (
    <div className="min-h-screen bg-background">

      <main className="pb-20 px-4">
        {/* Page Header */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="mr-4 p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold font-['Poppins']">Settings</h1>
                <p className="text-muted-foreground">
                  Manage your app preferences and notifications
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications Settings */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Push Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Email Alerts</h3>
                    <p className="text-sm text-muted-foreground">Get updates via email</p>
                  </div>
                  <Switch
                    checked={emailAlerts}
                    onCheckedChange={setEmailAlerts}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">SMS Alerts</h3>
                    <p className="text-sm text-muted-foreground">Receive text message notifications</p>
                  </div>
                  <Switch
                    checked={smsAlerts}
                    onCheckedChange={setSmsAlerts}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Appearance Settings */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Moon className="h-5 w-5" />
                  <span>Appearance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className="text-sm text-muted-foreground">Use the theme toggle in the header</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Language</h3>
                    <p className="text-sm text-muted-foreground">English (US)</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Globe className="h-4 w-4 mr-2" />
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Privacy Settings */}
        <section className="py-4">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Privacy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Data Collection</h3>
                    <p className="text-sm text-muted-foreground">Help improve our service</p>
                  </div>
                  <Switch defaultChecked={true} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Location Services</h3>
                    <p className="text-sm text-muted-foreground">For better gear recommendations</p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Account Actions */}
        <section className="py-4 mb-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Danger Zone
            </h2>
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-destructive">Delete Account</h3>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Delete Account Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription className="space-y-2">
                <p>
                  This action cannot be undone. This will permanently delete your account.
                </p>
                <div className="bg-destructive/10 p-3 rounded-md text-destructive text-sm font-medium border border-destructive/20">
                  <p>Terms & Conditions Note:</p>
                  <p className="mt-1 font-normal">
                    By deleting your account, you admit that all your data and credits will be lost permanently.
                    The Adam's Club team will not be responsible for any data or credit loss once deletion is confirmed.
                  </p>
                </div>
                <p>
                  Please type <span className="font-bold">DELETE</span> to confirm.
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="confirmation">
                Type DELETE to confirm
              </Label>
              <Input
                id="confirmation"
                type="text"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="DELETE"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deletePassword !== "DELETE"}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Permanently"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <BottomNavigation />
    </div >
  )
}
