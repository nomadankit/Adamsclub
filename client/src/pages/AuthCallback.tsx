import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Lazy load Supabase client only when needed
        const { supabase } = await import('@/lib/supabase');
        
        // Get the session data from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth error:', error);
          setLocation('/auth');
          return;
        }

        if (!session?.user?.email) {
          console.error('No user session found');
          setLocation('/auth');
          return;
        }

        // Send the session to backend for processing
        const response = await fetch('/api/auth/supabase/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: session.user,
            provider: session.user.user_metadata?.provider || 'google'
          }),
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Backend auth error:', data);
          // Sign out from Supabase to clear the session and prevent redirect loop
          await supabase.auth.signOut();
          setLocation('/auth');
          return;
        }

        // Invalidate the user query cache to force a refresh
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        // Successful login - redirect to home
        window.location.href = '/';
      } catch (err) {
        console.error('Callback error:', err);
        setLocation('/auth');
      }
    };

    handleCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
