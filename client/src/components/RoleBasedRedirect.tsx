import { useAuth } from "@/hooks/useAuth"

import { useLocation } from "wouter"
import { useEffect, useRef } from "react"

export function RoleBasedRedirect() {
  const { user, isLoading } = useAuth()
  const [, setLocation] = useLocation()
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) {
      return
    }

    if (!isLoading && user && !hasRedirected.current) {
      hasRedirected.current = true
      const userRole = user.role || 'member'
      if (userRole === 'staff') {
        setLocation('/staff/home')
      } else if (userRole === 'admin') {
        setLocation('/admin/home')
      } else {
        // Members redirect to /home
        setLocation('/home')
      }
    }
  }, [user, isLoading, setLocation])

  // Show loading while redirect happens
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}