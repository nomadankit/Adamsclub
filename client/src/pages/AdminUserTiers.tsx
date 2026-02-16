import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, Plus, Search, Filter, Zap, Settings } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { tiers as tiersTable } from "@shared/schema"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Tier = typeof tiersTable.$inferSelect
interface User { id: string; email?: string; firstName?: string; lastName?: string; currentTierId?: string }

export default function AdminUserTiers() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [tierTypeFilter, setTierTypeFilter] = useState<"all" | "subscription" | "loyalty" | "unassigned">("all")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [selectedLoyaltyTierId, setSelectedLoyaltyTierId] = useState<string | null>(null)
  const [assignmentMode, setAssignmentMode] = useState<"subscription" | "loyalty">("subscription")
  const [autoDaysSetting, setAutoDaysSetting] = useState("")

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  })

  const { data: tiers = [] } = useQuery<Tier[]>({
    queryKey: ["/api/tiers"],
  })

  const { data: settings = {} } = useQuery<{ autoDaysSetting?: number }>({
    queryKey: ["/api/admin/settings"],
  })

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) return
      const tierId = assignmentMode === "subscription" ? selectedTierId : selectedLoyaltyTierId
      if (!tierId) return
      return apiRequest("POST", `/api/admin/users/${selectedUserId}/tier`, { tierId, tierType: assignmentMode })
    },
    onSuccess: (response: any) => {
      const selectedUser = users.find(u => u.id === selectedUserId);
      const tierId = assignmentMode === "subscription" ? selectedTierId : selectedLoyaltyTierId
      const assignedTier = tiers.find(t => t.id === tierId);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] })
      setSelectedUserId(null)
      setSelectedTierId(null)
      setSelectedLoyaltyTierId(null)
      toast({
        title: "Success!",
        description: `${selectedUser?.firstName} ${selectedUser?.lastName} assigned ${assignedTier?.name}`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign tier",
        variant: "destructive",
      })
    },
  })

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
  })

  const filteredUsers = users.filter((user) => {
    const matchesSearch = (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.firstName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.lastName?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    if (tierTypeFilter === "all") return true
    
    const userTier = tiers.find(t => t.id === user.currentTierId)
    
    if (tierTypeFilter === "unassigned") return !userTier
    if (tierTypeFilter === "subscription") return userTier?.type === "subscription"
    if (tierTypeFilter === "loyalty") return userTier?.type === "loyalty"
    
    return true
  })

  if (usersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-12">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-5xl font-bold font-['Poppins']">User Tier Assignment</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Manually assign subscription tiers to members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Users</p>
                    <p className="text-3xl font-bold mt-2">{users.length}</p>
                  </div>
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Available Tiers</p>
                    <p className="text-3xl font-bold mt-2">{tiers.filter(t => t.type === 'subscription').length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tier Management</CardTitle>
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-users"
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

            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => {
                  const userTier = tiers.find(t => t.id === user.currentTierId)
                  return (
                    <Card key={user.id} className="hover-elevate">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="mt-2">
                              {userTier ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                                  {userTier.name}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  No tier assigned
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedUserId(user.id)
                              setSelectedTierId("")
                            }}
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-purple-600"
                            data-testid={`button-assign-tier-${user.id}`}
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

        <Dialog open={!!selectedUserId && selectedUserId !== "settings"} onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null)
            setSelectedTierId(null)
            setSelectedLoyaltyTierId(null)
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Tier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Tabs value={assignmentMode} onValueChange={(val: any) => setAssignmentMode(val)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="subscription">Subscription</TabsTrigger>
                  <TabsTrigger value="loyalty" className="flex items-center gap-2">
                    <Zap className="h-3 w-3" /> Loyalty
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="subscription">
                  <Select value={selectedTierId || ""} onValueChange={setSelectedTierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a tier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.filter(t => t.type === 'subscription').map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>{tier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="loyalty">
                  <Select value={selectedLoyaltyTierId || ""} onValueChange={setSelectedLoyaltyTierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a loyalty tier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.filter(t => t.type === 'loyalty').map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>{tier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUserId(null)}>Cancel</Button>
              <Button
                onClick={() => assignMutation.mutate()}
                disabled={assignMutation.isPending || (!selectedTierId && !selectedLoyaltyTierId)}
                className="bg-gradient-to-r from-blue-500 to-purple-600"
              >
                {assignMutation.isPending ? "Assigning..." : "Assign Tier"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
