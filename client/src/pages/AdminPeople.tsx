import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Shield, Users, Key, Trash2, Plus, Search, Filter, Zap, Settings, Copy, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { tiers as tiersTable } from '@shared/schema';

type Tier = typeof tiersTable.$inferSelect;
interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  currentTierId?: string | null;
  currentLoyaltyTierId?: string | null;
  role?: string;
  waiverAccepted?: boolean;
  createdAt?: string;
}

export default function AdminPeople() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    navigate('/');
    return null;
  }

  // Users Tab State
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [createUserEmail, setCreateUserEmail] = useState("");
  const [createUserFirstName, setCreateUserFirstName] = useState("");
  const [createUserLastName, setCreateUserLastName] = useState("");
  const [resetPasswordData, setResetPasswordData] = useState<{ tempPassword: string; expiresAt: string } | null>(null);
  const [copiedTempPassword, setCopiedTempPassword] = useState(false);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<{ [userId: string]: string }>({});

  // Tiers Tab State
  const [tierSearchQuery, setTierSearchQuery] = useState("");
  const [tierTypeFilter, setTierTypeFilter] = useState<"all" | "subscription" | "loyalty" | "unassigned">("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedLoyaltyTierId, setSelectedLoyaltyTierId] = useState<string | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<"subscription" | "loyalty">("subscription");
  const [autoDaysSetting, setAutoDaysSetting] = useState("");

  // Queries
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => fetch('/api/admin/users').then(r => r.json())
  });

  const { data: tiers = [] } = useQuery<Tier[]>({
    queryKey: ["/api/tiers"],
  });

  const { data: settings = {} } = useQuery<{ autoDaysSetting?: number }>({
    queryKey: ["/api/admin/settings"],
  });

  // Mutations
  const updateRoleMutation = useMutation({
    mutationFn: (params: { userId: string; role: string; reason?: string }) =>
      apiRequest('PATCH', `/api/users/${params.userId}/role`, { role: params.role, reason: params.reason }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setPendingRoleChanges(prev => {
        const updated = { ...prev };
        delete updated[variables.userId];
        return updated;
      });
      toast({
        title: 'Success',
        description: `User role updated to ${variables.role} and backed up`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update role',
        variant: 'destructive'
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/reset-password`, {});
      const data = await response.json();
      console.log('Reset password response:', data);
      return data as { tempPassword: string; expiresAt: string };
    },
    onSuccess: (data) => {
      console.log('Reset password success data:', data);
      if (!data || !data.tempPassword) {
        toast({ title: 'Error', description: 'Failed to generate reset code', variant: 'destructive' });
        return;
      }
      setResetPasswordData({ tempPassword: data.tempPassword, expiresAt: data.expiresAt });
      toast({
        title: 'Success',
        description: 'Reset code generated. Copy the password below.',
        duration: 5000
      });
    },
    onError: (error: any) => {
      console.error('Reset password error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to reset password', variant: 'destructive' });
    }
  });

  const copyTempPassword = () => {
    if (resetPasswordData?.tempPassword) {
      navigator.clipboard.writeText(resetPasswordData.tempPassword);
      setCopiedTempPassword(true);
      setTimeout(() => setCopiedTempPassword(false), 2000);
      toast({ title: 'Copied', description: 'Password copied to clipboard' });
    }
  };

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

  const assignTierMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !selectedTierId) return

      // Assign subscription tier
      await apiRequest("POST", `/api/admin/users/${selectedUserId}/tier`, { tierId: selectedTierId, tierType: "subscription" })

      // Assign loyalty tier if selected
      if (selectedLoyaltyTierId) {
        await apiRequest("POST", `/api/admin/users/${selectedUserId}/tier`, { tierId: selectedLoyaltyTierId, tierType: "loyalty" })
      }
    },
    onSuccess: (response: any) => {
      const selectedUserObj = users.find((u: User) => u.id === selectedUserId);
      const subscriptionTier = tiers.find(t => t.id === selectedTierId);
      const loyaltyTier = selectedLoyaltyTierId ? tiers.find(t => t.id === selectedLoyaltyTierId) : null;

      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] })
      setSelectedUserId(null)
      setSelectedTierId(null)
      setSelectedLoyaltyTierId(null)

      const tierNames = [subscriptionTier?.name, loyaltyTier?.name].filter(Boolean).join(" + ");
      toast({
        title: "Success!",
        description: `${selectedUserObj?.firstName} ${selectedUserObj?.lastName} assigned ${tierNames}`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign tier",
        variant: "destructive",
      })
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/settings", { autoDaysSetting: parseInt(autoDaysSetting) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] })
      setSelectedUserId(null)
      setAutoDaysSetting("")
      toast({
        title: "Success!",
        description: "Auto-promotion settings updated",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      })
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!createUserEmail || !createUserFirstName || !createUserLastName) {
        throw new Error("All fields are required");
      }
      return apiRequest("POST", "/api/admin/users", {
        email: createUserEmail,
        firstName: createUserFirstName,
        lastName: createUserLastName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setShowCreateUserDialog(false);
      setCreateUserEmail("");
      setCreateUserFirstName("");
      setCreateUserLastName("");
      toast({
        title: "Success!",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Filters
  const filteredTierUsers = users.filter((user: User) => {
    const matchesSearch = (user.email?.toLowerCase() || "").includes(tierSearchQuery.toLowerCase()) ||
      (user.firstName?.toLowerCase() || "").includes(tierSearchQuery.toLowerCase()) ||
      (user.lastName?.toLowerCase() || "").includes(tierSearchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (tierTypeFilter === "all") return true

    const userTier = tiers.find(t => t.id === user.currentTierId)

    if (tierTypeFilter === "unassigned") return !userTier
    if (tierTypeFilter === "subscription") return userTier?.type === "subscription"
    if (tierTypeFilter === "loyalty") return userTier?.type === "loyalty"

    return true
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
          <p className="text-sm text-muted-foreground">Loading...</p>
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
            <h1 className="text-3xl font-bold">People Management</h1>
          </div>
          <p className="text-muted-foreground">Manage users, assign staff roles, and configure membership tiers</p>
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

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tiers">Tier Management</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-3">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">All Users</h3>
              <Button
                onClick={() => setShowCreateUserDialog(true)}
                size="sm"
                data-testid="button-create-user"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </div>
            {users.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No users found</p>
                </CardContent>
              </Card>
            ) : (
              users.map((u: User) => (
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
                                {(u as User)?.firstName && (u as User)?.lastName ? `${(u as User)?.firstName} ${(u as User)?.lastName}` : 'Unknown User'}
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
                        <div className="flex gap-2">
                          <Select
                            value={pendingRoleChanges[u.id] || u.role}
                            onValueChange={(role) => setPendingRoleChanges(prev => ({ ...prev, [u.id]: role }))}
                          >
                            <SelectTrigger data-testid="select-user-role" className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => {
                              const newRole = pendingRoleChanges[u.id];
                              if (newRole && newRole !== u.role) {
                                updateRoleMutation.mutate({
                                  userId: u.id,
                                  role: newRole,
                                  reason: `Role changed from ${u.role} to ${newRole}`
                                });
                              }
                            }}
                            disabled={!pendingRoleChanges[u.id] || pendingRoleChanges[u.id] === u.role || updateRoleMutation.isPending}
                            size="sm"
                            data-testid="button-save-role"
                          >
                            Save
                          </Button>
                        </div>
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
                          <span className="font-medium">Created:</span> {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
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
          </TabsContent>

          {/* Tiers Tab */}
          <TabsContent value="tiers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Assign Membership Tiers</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAutoDaysSetting(String(settings?.autoDaysSetting || "30"))
                    setSelectedUserId("settings")
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={tierSearchQuery}
                      onChange={(e) => setTierSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-tier-users"
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <Select value={tierTypeFilter} onValueChange={(value: any) => setTierTypeFilter(value)}>
                      <SelectTrigger data-testid="select-tier-filter">
                        <SelectValue placeholder="Filter by tier type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="subscription">Subscription Tier</SelectItem>
                        <SelectItem value="loyalty">Loyalty Tier</SelectItem>
                        <SelectItem value="unassigned">No Tier Assigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredTierUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTierUsers.map((u: User) => {
                      const subscriptionTier = tiers.find(t => t.id === u.currentTierId)
                      const loyaltyTier = tiers.find(t => t.id === u.currentLoyaltyTierId)
                      return (
                        <Card key={u.id} className="hover-elevate">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold">{u.firstName} {u.lastName}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {subscriptionTier ? (
                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs flex items-center gap-1">
                                      <Users className="h-3 w-3" /> {subscriptionTier.name}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      No subscription tier
                                    </Badge>
                                  )}
                                  {loyaltyTier && (
                                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs flex items-center gap-1">
                                      <Zap className="h-3 w-3" /> {loyaltyTier.name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                onClick={() => {
                                  setSelectedUserId(u.id)
                                  setSelectedTierId("")
                                }}
                                size="sm"
                                className="bg-gradient-to-r from-blue-500 to-purple-600"
                                data-testid={`button-assign-tier-${u.id}`}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Assign Tier
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tier Assignment Dialog */}
        <Dialog open={!!selectedUserId && selectedUserId !== "settings"} onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null)
            setSelectedTierId(null)
            setSelectedLoyaltyTierId(null)
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Membership Tiers</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Users className="h-4 w-4" /> Subscription Tier
                </label>
                <Select value={selectedTierId || ""} onValueChange={setSelectedTierId}>
                  <SelectTrigger data-testid="select-subscription-tier">
                    <SelectValue placeholder="Choose a subscription tier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.filter(t => t.type === 'subscription').map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>{tier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Loyalty Tier (Optional)
                </label>
                <Select value={selectedLoyaltyTierId || ""} onValueChange={setSelectedLoyaltyTierId}>
                  <SelectTrigger data-testid="select-loyalty-tier">
                    <SelectValue placeholder="Choose a loyalty tier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.filter(t => t.type === 'loyalty').map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>{tier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUserId(null)}>Cancel</Button>
              <Button
                onClick={() => assignTierMutation.mutate()}
                disabled={assignTierMutation.isPending || !selectedTierId}
                className="bg-gradient-to-r from-blue-500 to-purple-600"
                data-testid="button-confirm-tier-assignment"
              >
                {assignTierMutation.isPending ? "Assigning..." : "Assign Tiers"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={selectedUserId === "settings"} onOpenChange={(open) => {
          if (!open) setSelectedUserId(null)
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Auto-Promotion Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Days Until Auto-Promotion to Loyalty Tier</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="30"
                  value={autoDaysSetting}
                  onChange={(e) => setAutoDaysSetting(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Members will automatically be promoted after this many days</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUserId(null)}>Cancel</Button>
              <Button
                onClick={() => updateSettingsMutation.mutate()}
                disabled={updateSettingsMutation.isPending || !autoDaysSetting}
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={createUserEmail}
                  onChange={(e) => setCreateUserEmail(e.target.value)}
                  data-testid="input-create-user-email"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">First Name</label>
                <Input
                  type="text"
                  placeholder="John"
                  value={createUserFirstName}
                  onChange={(e) => setCreateUserFirstName(e.target.value)}
                  data-testid="input-create-user-first-name"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Last Name</label>
                <Input
                  type="text"
                  placeholder="Doe"
                  value={createUserLastName}
                  onChange={(e) => setCreateUserLastName(e.target.value)}
                  data-testid="input-create-user-last-name"
                />
              </div>
              <p className="text-xs text-muted-foreground">New users will be created with member role by default</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>Cancel</Button>
              <Button
                onClick={() => createUserMutation.mutate()}
                disabled={createUserMutation.isPending || !createUserEmail || !createUserFirstName || !createUserLastName}
                data-testid="button-confirm-create-user"
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog with Copy Button */}
        <Dialog open={!!resetPasswordData} onOpenChange={(open) => {
          if (!open) setResetPasswordData(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Temporary Password Generated</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Share this temporary password with the user. They can use it to log in and set their own password.</p>
              <div className="bg-muted rounded-md p-4 flex items-center justify-between gap-2">
                <code className="text-lg font-mono font-bold" data-testid="text-temp-password">
                  {resetPasswordData?.tempPassword}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={copyTempPassword}
                  data-testid="button-copy-temp-password"
                >
                  {copiedTempPassword ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Expires at: {resetPasswordData?.expiresAt ? new Date(resetPasswordData.expiresAt).toLocaleString() : 'N/A'}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setResetPasswordData(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
