import { useState } from "react"
import { ThemeToggle } from "./ThemeToggle"
import { useAuth } from "@/hooks/useAuth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import logoUrl from "@assets/Adams_club_logo-removebg-preview_1758801408059.png"
import { useLocation } from "wouter"
import { Menu } from "lucide-react"
import { ProfileModal } from "./ProfileModal"
import { DateTimeDisplay } from "./DateTimeDisplay"

export function Header() {
  const { user } = useAuth()
  const [, setLocation] = useLocation()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const handleRoleChange = async (newRole: string) => {
    try {
      const response = await fetch('/api/dev/change-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        // Refresh the page to reload with new role
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to change role:', error)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="hover:bg-background/80"
              data-testid="button-hamburger-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => setLocation('/')}
            >
              <img
                src={logoUrl}
                alt="Adam's Club"
                className="h-8 w-8"
                data-testid="img-logo"
              />
              <span className="font-bold text-xl font-['Poppins'] text-primary" data-testid="text-brand-name">
                Adam's Club
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <DateTimeDisplay />
            {/* Temporary Role Selector - For dev purposes */}
            {user && user.email === 'ankit3765kumar@gmail.com' && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  DEV
                </Badge>
                <Select value={user.role || 'member'} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-24 h-8 text-xs" data-testid="select-dev-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  )
}