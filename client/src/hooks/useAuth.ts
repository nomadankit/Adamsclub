import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

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
  const { data: user, isLoading: userLoading, error: userError } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - return null instead of throwing
          return null as any;
        }
        throw new Error(`Failed to fetch user: ${response.status}`);
      }
      
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  // Removed the original capabilities query here as it is being replaced by the modified version below.

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

  // The following is the modified query for capabilities with error handling.
  const { data: capabilities, error: capabilitiesError, isLoading: capabilitiesLoading } = useQuery<UserCapabilities>({
    queryKey: ['user-capabilities', user?.id],
    queryFn: async () => {
      try {
        const response = await fetch('/api/me/capabilities', {
          credentials: 'include'
        });
        if (!response.ok) {
          // Don't throw for 404/500 errors during initial setup
          if (response.status >= 404) {
            console.warn('Capabilities endpoint not ready, using fallback');
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
        console.warn('Capabilities fetch failed, using fallback:', error);
        return {
          user_id: user?.id || '',
          roles: [user?.role || 'member'],
          permissions: [],
          entitlements: []
        };
      }
    },
    enabled: !!user, // Only fetch if user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false // Don't retry, use fallback instead
  });


  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user,
    capabilities,
    isLoading: userLoading || capabilitiesLoading,
    isAuthenticated: !!user,
    hasPermission,
    logout,
    capabilitiesError,
  };
}