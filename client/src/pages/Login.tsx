import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLocation } from "wouter"
import logo from "@assets/Adams_club_logo-removebg-preview_1758801408059.png"

export default function Login() {
  const [, setLocation] = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loginData, setLoginData] = useState({ email: '', password: '' })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Try backend local login first (for test accounts)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const userRole = data.user?.role || 'member';
        
        if (userRole === 'admin') {
          window.location.href = '/admin/home';
        } else if (userRole === 'staff') {
          window.location.href = '/staff/home';
        } else {
          window.location.href = '/home';
        }
        return;
      }

      // If backend login fails, try Supabase (for production/legacy compatibility)
      const { supabase } = await import('@/lib/supabase')

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      })

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

      if (data.user && data.session) {
        // Sync session with backend to maintain HTTP-only cookie session
        const response = await fetch('/api/auth/supabase/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.user,
            provider: 'email'
          }),
        })

        if (response.ok) {
          window.location.href = '/home'
        } else {
          setError('Failed to sync session with server')
          setIsLoading(false)
        }
      } else {
        setError('Login failed')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'google') => {
    setOauthLoading(provider)
    setError(null)

    try {
      const { supabase } = await import('@/lib/supabase')

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        setError(authError.message)
        setOauthLoading(null)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('OAuth error:', err)
      setError('OAuth login failed. Please try again.')
      setOauthLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-primary/5 to-blue-50/50 dark:from-primary/20 dark:via-primary/10 dark:to-blue-950/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img src={logo} alt="Adams Club" className="h-12 w-12 object-contain" data-testid="img-adams-club-logo" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="your@email.com"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
                data-testid="input-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Don't have an account? <button onClick={() => setLocation('/signup')} className="text-primary hover:underline" data-testid="button-signup-link">Sign up here</button></p>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthLogin('google')}
              disabled={oauthLoading !== null}
              data-testid="button-google-login"
            >
              {oauthLoading === 'google' ? 'Signing in...' : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          </div>

          <button
            onClick={() => setLocation('/')}
            className="w-full mt-6 py-2 text-sm text-primary hover:text-primary/80 transition flex items-center justify-center gap-1"
            data-testid="button-back-to-landing"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
