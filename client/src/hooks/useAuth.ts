import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserCapabilities {
  user_id: string;
  roles: string[];
  permissions: Array<{
    name: string;
    scope: {
      global?: boolean;
      locations?: string[];
    };
  }>;
  tier?: string;
  entitlements: string[];
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [isInitializing, setIsInitializing] = useState(true);

  const { data: user, isLoading: userLoading, error: userError } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return null as any;
        }
        throw new Error(`Failed to fetch user: ${response.status}`);
      }
      
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync Supabase Auth state with our backend session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH_STATE] ${event}`, session?.user?.email);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Force refresh backend user query to sync
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(["/api/auth/user"], null);
      }
      
      if (isInitializing) setIsInitializing(false);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setIsInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient, isInitializing]);

  const hasPermission = (permissionName: string, locationId?: string): boolean => {
    if (!capabilities) return false;

    const permission = capabilities.permissions.find(p => p.name === permissionName);
    if (!permission) return false;

    if (permission.scope.global) return true;
    if (locationId && permission.scope.locations) {
      return permission.scope.locations.includes(locationId);
    }

    return !locationId; // No location required
  };

  const { data: capabilities, error: capabilitiesError, isLoading: capabilitiesLoading } = useQuery<UserCapabilities>({
    queryKey: ['user-capabilities', user?.id],
    queryFn: async () => {
      try {
        const response = await fetch('/api/me/capabilities', {
          credentials: 'include'
        });
        if (!response.ok) {
          if (response.status >= 404) {
            return {
              user_id: user?.id || '',
              roles: [user?.role || 'member'],
              permissions: [],
              entitlements: []
            };
          }
          throw new Error('Failed to fetch capabilities');
        }
        return response.json();
      } catch (error) {
        return {
          user_id: user?.id || '',
          roles: [user?.role || 'member'],
          permissions: [],
          entitlements: []
        };
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false 
  });

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok || true) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  return {
    user,
    capabilities,
    isLoading: userLoading || capabilitiesLoading || isInitializing,
    isAuthenticated: !!user,
    hasPermission,
    logout,
    capabilitiesError,
  };
}