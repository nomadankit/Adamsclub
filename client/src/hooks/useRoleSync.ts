import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';

/**
 * Hook for real-time role synchronization
 * Polls for role changes every 5 seconds and updates the user cache instantly
 * Provides backup restoration capability
 */
export function useRoleSync(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    // Poll for role changes every 5 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        });

        if (response.ok) {
          const updatedUser = await response.json();
          
          // Invalidate and update the user cache instantly
          queryClient.setQueryData(['/api/auth/user'], updatedUser);
          
          // Also refetch capabilities to ensure permissions are in sync
          queryClient.invalidateQueries({
            queryKey: ['user-capabilities', userId],
          });
        }
      } catch (error) {
        console.warn('Failed to sync role:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [userId]);
}

/**
 * Hook to restore a user's role from backup
 * Used by admins to quickly restore roles in emergency situations
 */
export function useRoleRestoration() {
  const restoreRole = async (userId: string, backupIndex: number = 0) => {
    try {
      const response = await fetch(`/api/users/${userId}/restore-role`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupIndex }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore role');
      }

      const result = await response.json();
      
      // Invalidate caches to reflect the restoration
      queryClient.invalidateQueries({
        queryKey: ['/api/auth/user'],
      });
      queryClient.invalidateQueries({
        queryKey: ['user-capabilities'],
      });

      return result;
    } catch (error) {
      console.error('Role restoration error:', error);
      throw error;
    }
  };

  const getRoleHistory = async (userId: string, limit: number = 10) => {
    try {
      const response = await fetch(`/api/users/${userId}/role-history?limit=${limit}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch role history');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch role history:', error);
      throw error;
    }
  };

  return { restoreRole, getRoleHistory };
}
