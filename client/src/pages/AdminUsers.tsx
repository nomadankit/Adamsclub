import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Shield, Users, Key, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

export default function AdminUsers() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    navigate('/');
    return null;
  }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => fetch('/api/admin/users').then(r => r.json())
  });

  const updateRoleMutation = useMutation({
    mutationFn: (params: { userId: string; role: string }) =>
      apiRequest('PATCH', `/api/users/${params.userId}/role`, { role: params.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Success', description: 'User role updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/reset-password`, {});
      return response as unknown as { token: string };
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Success', 
        description: `Reset code: ${data.token}` 
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reset password', variant: 'destructive' });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest('DELETE', `/api/admin/users/${userId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Success', description: 'User deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
    }
  });

  const getRoleBadgeColor = (role: string | undefined) => {
    const normalizedRole = role || 'member';
    switch (normalizedRole) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'staff':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>
          <p className="text-muted-foreground">Manage user roles and reset passwords with secure temporary access codes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold">{users.filter((u: any) => u.role === 'admin').length}</p>
                </div>
                <Shield className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Staff</p>
                  <p className="text-2xl font-bold">{users.filter((u: any) => u.role === 'staff').length}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {users.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No users found</p>
              </CardContent>
            </Card>
          ) : (
            users.map((u: any) => (
              <Card key={u.id} className="hover-elevate overflow-hidden">
                <div
                  onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                  className="cursor-pointer"
                  data-testid="card-user-row"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div>
                            <CardTitle className="text-base">
                              {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : 'Unknown User'}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={getRoleBadgeColor(u.role || 'member')}>
                            {(u.role || 'member').charAt(0).toUpperCase() + (u.role || 'member').slice(1)}
                          </Badge>
                          {u.waiverAccepted && (
                            <Badge variant="outline" className="text-xs">
                              ✓ Waiver Signed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {expandedUserId === u.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </div>

                {expandedUserId === u.id && (
                  <CardContent className="space-y-4 border-t pt-4">
                    {/* Role Management */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Assign Role
                      </label>
                      <Select value={u.role} onValueChange={(role) => updateRoleMutation.mutate({ userId: u.id, role })}>
                        <SelectTrigger data-testid="select-user-role" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Password Reset */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Reset Password
                      </label>
                      <Button
                        onClick={() => resetPasswordMutation.mutate(u.id)}
                        disabled={resetPasswordMutation.isPending}
                        variant="outline"
                        className="w-full"
                        data-testid="button-reset-password"
                      >
                        {resetPasswordMutation.isPending ? 'Generating Code...' : 'Generate Reset Code'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Generates a temporary password and 24-hour reset code for the user
                      </p>
                    </div>

                    {/* User Info */}
                    <div className="bg-muted rounded-md p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Created:</span> {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">User ID:</span> {u.id.slice(0, 8)}...
                      </p>
                    </div>

                    {/* Delete User */}
                    <div className="space-y-2 border-t pt-4">
                      <Button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${u.firstName} ${u.lastName}? This cannot be undone.`)) {
                            deleteUserMutation.mutate(u.id);
                          }
                        }}
                        disabled={deleteUserMutation.isPending}
                        variant="destructive"
                        className="w-full"
                        data-testid="button-delete-user"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
