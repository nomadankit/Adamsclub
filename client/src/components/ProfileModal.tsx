import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Settings, CreditCard, Shield, HelpCircle, LogOut, Star, Trophy, Calendar, Edit, X } from "lucide-react"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/useAuth"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [, setLocation] = useLocation()
  const { user, isLoading } = useAuth()

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await fetch('/api/bookings')
      if (!response.ok) throw new Error('Failed to fetch bookings')
      return response.json()
    },
    enabled: !!user
  })

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!user || isLoading) {
    return null
  }

  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recently'

  const handleEditProfile = () => {
    setLocation('/edit-profile')
    onClose()
  }

  const handleSettings = () => {
    setLocation('/settings')
    onClose()
  }

  const handlePaymentHistory = () => {
    setLocation('/account')
    onClose()
  }

  const handlePrivacy = () => {
    setLocation('/settings')
    onClose()
  }

  const handleHelp = () => {
    setLocation('/help')
    onClose()
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        // Clear any local storage/cache if necessary
        window.location.href = '/login'
      } else {
        console.error('Logout failed')
        window.location.href = '/login' // Fallback redirect
      }
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/login' // Fallback redirect
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
        data-testid="modal-backdrop"
      />

      {/* Sliding Modal */}
      <div
        className={`fixed inset-y-0 left-0 w-full max-w-sm bg-background z-40 overflow-y-auto transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        data-testid="profile-modal"
      >
        <div className="pb-24 px-3">
          {/* Header */}
          <div className="py-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 border-b">
            <h2 className="text-lg font-semibold">Profile</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Profile Header */}
          <section className="py-4">
            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center mb-4">
                  <Avatar className="w-16 h-16 mb-3">
                    <AvatarImage src={user.profileImageUrl || ""} alt="Profile" />
                    <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mb-3">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <h1 className="text-xl font-bold font-['Poppins']">{user.firstName} {user.lastName}</h1>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleEditProfile}
                        className="h-6 w-6 hover:bg-background/80"
                        data-testid="button-edit-profile"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Badge className="bg-primary/10 text-primary text-xs">
                        {(user.role as any) === 'admin' ? 'Admin' : (user.role as any) === 'staff' ? 'Staff' : 'Member'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-1">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="font-bold text-lg">{bookings.length}</div>
                    <div className="text-xs text-muted-foreground">Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-1">
                      <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className={`font-bold capitalize ${((user as any).subscriptionPlan || '').length > 10 ? 'text-sm leading-tight' : 'text-lg'}`}>
                      {((user as any).subscriptionPlan || 'Free').replace(/-/g, ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">Plan</div>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-1">
                      <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="font-bold text-lg">{user.adamsCredits || '0'}</div>
                    <div className="text-xs text-muted-foreground">Credits</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Menu Items */}
          <section className="py-2 space-y-3">
            <div>
              <h2 className="text-lg font-semibold mb-3 px-1">Account</h2>
              <div className="space-y-2">
                <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border hover:shadow-md transition-all duration-200 cursor-pointer" onClick={handleSettings}>
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Settings className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">Settings</h3>
                        <p className="text-xs text-muted-foreground">Notifications & preferences</p>
                      </div>
                      <div className="text-muted-foreground">→</div>
                    </div>
                  </CardContent>
                </Card>


              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3 px-1">Support</h2>
              <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border hover:shadow-md transition-all duration-200 cursor-pointer" onClick={handleHelp}>
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                      <HelpCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">Help & FAQ</h3>
                      <p className="text-xs text-muted-foreground">Get answers to questions</p>
                    </div>
                    <div className="text-muted-foreground">→</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border hover:shadow-md transition-all duration-200 cursor-pointer" onClick={handleLogout}>
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                    <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm text-red-600 dark:text-red-400">Sign Out</h3>
                    <p className="text-xs text-muted-foreground">Sign out of your account</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  )
}
