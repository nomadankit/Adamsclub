import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Heart, Plus, Trash2, Edit2, Search, Filter, Check, X, Crown, Zap } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { perks as perksTable, tiers as tiersTable, TierType, PerkType } from "@shared/schema"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

type Perk = typeof perksTable.$inferSelect
type Tier = typeof tiersTable.$inferSelect

interface TierPerkMapping {
  tier: Tier
  perks: Perk[]
}

export default function AdminPerks() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all")
  const [formData, setFormData] = useState<{ name: string; description: string; isActive: boolean; type: string }>({ name: "", description: "", isActive: true, type: PerkType.SUBSCRIPTION })
  const [creatingTierType, setCreatingTierType] = useState<string | null>(null)

  // Fetch perks
  const { data: perks = [], isLoading: perksLoading } = useQuery<Perk[]>({
    queryKey: ["/api/perks"],
  })

  // Fetch tiers
  const { data: tiers = [] } = useQuery<Tier[]>({
    queryKey: ["/api/tiers"],
  })

  // Fetch perks by tier
  const { data: perksByTier = [] } = useQuery<TierPerkMapping[]>({
    queryKey: ["/api/perks-by-tier"],
  })

  // Create/Update perk mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return apiRequest("PATCH", `/api/perks/${editingId}`, formData)
      } else {
        return apiRequest("POST", "/api/perks", formData)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/perks"] })
      queryClient.invalidateQueries({ queryKey: ["/api/perks-by-tier"] })
      setFormData({ name: "", description: "", isActive: true, type: PerkType.SUBSCRIPTION })
      setEditingId(null)
      setIsCreating(false)
      setCreatingTierType(null)
      toast({
        title: editingId ? "Perk updated" : "Perk created",
        description: editingId ? "Perk has been updated successfully" : "Perk has been created successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save perk",
        variant: "destructive",
      })
    },
  })

  // Delete perk mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/perks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/perks"] })
      queryClient.invalidateQueries({ queryKey: ["/api/perks-by-tier"] })
      toast({
        title: "Perk deleted",
        description: "Perk has been deleted successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete perk",
        variant: "destructive",
      })
    },
  })

  // Assign perk to tier mutation
  const assignPerkMutation = useMutation({
    mutationFn: async (vars: { tierId: string; perkId: string }) => {
      return apiRequest("POST", "/api/tier-perks", vars)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/perks-by-tier"] })
      toast({
        title: "Perk assigned",
        description: "Perk has been assigned to tier successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign perk",
        variant: "destructive",
      })
    },
  })

  // Remove perk from tier mutation
  const removePerkMutation = useMutation({
    mutationFn: async (vars: { tierId: string; perkId: string }) => {
      return apiRequest("DELETE", "/api/tier-perks", vars)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/perks-by-tier"] })
      toast({
        title: "Perk removed",
        description: "Perk has been removed from tier successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove perk",
        variant: "destructive",
      })
    },
  })

  const handleNew = (tierType?: string) => {
    setEditingId(null)
    setIsCreating(true)
    setCreatingTierType(tierType || null)
    setFormData({ name: "", description: "", isActive: true, type: tierType === TierType.LOYALTY ? PerkType.LOYALTY : PerkType.SUBSCRIPTION })
  }

  const handleEdit = (perk: Perk) => {
    setEditingId(perk.id)
    setCreatingTierType(perk.type === PerkType.LOYALTY ? TierType.LOYALTY : TierType.SUBSCRIPTION)
    setFormData({
      name: perk.name || "",
      description: perk.description || "",
      isActive: perk.isActive ?? true,
      type: perk.type as typeof PerkType.SUBSCRIPTION | typeof PerkType.LOYALTY,
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsCreating(false)
    setCreatingTierType(null)
    setFormData({ name: "", description: "", isActive: true, type: PerkType.SUBSCRIPTION })
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Perk name is required",
        variant: "destructive",
      })
      return
    }
    if (!formData.description.trim()) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      })
      return
    }
    mutation.mutate()
  }

  const isPerkInTier = (perkId: string, tierId: string): boolean => {
    const tierMapping = perksByTier.find(m => m.tier.id === tierId)
    return tierMapping?.perks.some(p => p.id === perkId) ?? false
  }

  const filteredPerks = perks.filter((perk) => {
    const matchesSearch = perk.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perk.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterActive === "active") return matchesSearch && perk.isActive
    if (filterActive === "inactive") return matchesSearch && !perk.isActive
    return matchesSearch
  })

  if (perksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading perks...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-5xl font-bold font-['Poppins']" data-testid="text-perks-title">
                  Perks Management
                </h1>
              </div>
              <p className="text-lg text-muted-foreground">
                Manage perks and control tier-based access with advanced access matrix
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Perks</p>
                    <p className="text-3xl font-bold mt-2">{perks.length}</p>
                  </div>
                  <Heart className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Active</p>
                    <p className="text-3xl font-bold mt-2">{perks.filter(p => p.isActive).length}</p>
                  </div>
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Tiers</p>
                    <p className="text-3xl font-bold mt-2">{tiers.length}</p>
                  </div>
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Perk Form Modal */}
        <Dialog open={editingId !== null || isCreating} onOpenChange={(open) => {
          if (!open) handleCancel()
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                {editingId ? (creatingTierType === TierType.LOYALTY ? "Edit Benefit" : "Edit Perk") : (creatingTierType === TierType.LOYALTY ? "Add New Benefit" : "Add New Perk")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Perk Name *</label>
                <Input
                  placeholder="e.g., Free Delivery, Extended Warranty"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-perk-name"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Description *</label>
                <Input
                  placeholder="Brief description of this perk"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="input-perk-description"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  data-testid="checkbox-perk-active"
                  className="h-4 w-4"
                />
                <label className="text-sm font-medium cursor-pointer flex-1">Active</label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCancel}
                variant="outline"
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-pink-500 to-rose-600"
                disabled={mutation.isPending}
                data-testid="button-save-perk"
              >
                {mutation.isPending ? "Saving..." : editingId ? (creatingTierType === TierType.LOYALTY ? "Update Benefit" : "Update Perk") : (creatingTierType === TierType.LOYALTY ? "Create Benefit" : "Create Perk")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MATRIX VIEW - Tier-based Perk Access Control */}
        <div className="space-y-6">
          {/* Info Banner */}
          <Card className="border-blue-200 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="pt-6">
              {(() => {
                const subTiers = tiers.filter(t => t.type === TierType.SUBSCRIPTION).map(t => t.name).join(", ");
                const loyaltyTiers = tiers.filter(t => t.type === TierType.LOYALTY).map(t => t.name).join(", ");
                return (
                  <p className="text-sm">
                    <span className="font-semibold">Subscription Tiers</span> provide standard perks{subTiers ? ` (${subTiers})` : ""}. 
                    <span className="font-semibold ml-1">Loyalty Tiers</span> stack additional benefits based on tenure{loyaltyTiers ? ` (${loyaltyTiers})` : ""}.
                  </p>
                );
              })()}
            </CardContent>
          </Card>

          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search perks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-perks"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterActive === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive("all")}
                data-testid="button-filter-all"
              >
                <Filter className="h-4 w-4 mr-2" />
                All
              </Button>
              <Button
                variant={filterActive === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive("active")}
                data-testid="button-filter-active"
              >
                Active
              </Button>
              <Button
                variant={filterActive === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive("inactive")}
                data-testid="button-filter-inactive"
              >
                Inactive
              </Button>
            </div>
          </div>

          {/* Subscription Tiers Section */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Subscription Tiers - Standard Perks
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal mt-2">Assign perks to each subscription tier. Check/uncheck boxes to control which perks are available at each membership level.</p>
            </CardHeader>
            <CardContent className="pt-6">
              {tiers.filter(t => t.type === TierType.SUBSCRIPTION).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-semibold">Perk</th>
                        <th className="text-left py-3 px-3 font-semibold">Status</th>
                        <th className="text-center py-3 px-3 font-semibold">Actions</th>
                        {tiers.filter(t => t.type === TierType.SUBSCRIPTION).map((tier) => (
                          <th key={tier.id} className="text-center py-3 px-3 font-semibold text-xs">
                            {tier.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPerks.filter(p => p.type === PerkType.SUBSCRIPTION).map((perk) => (
                        <tr key={perk.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-3">
                            <div>
                              <p className="font-medium">{perk.name}</p>
                              <p className="text-xs text-muted-foreground">{perk.description}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={perk.isActive ? "default" : "secondary"} className="text-xs">
                              {perk.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => handleEdit(perk)}
                                data-testid={`button-edit-perk-${perk.id}`}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(perk.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-perk-${perk.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          {tiers.filter(t => t.type === TierType.SUBSCRIPTION).map((tier) => {
                            const hasAccess = isPerkInTier(perk.id, tier.id)
                            return (
                              <td key={`${perk.id}-${tier.id}`} className="text-center py-3 px-3">
                                <button
                                  onClick={() => {
                                    if (hasAccess) {
                                      removePerkMutation.mutate({ tierId: tier.id, perkId: perk.id })
                                    } else {
                                      assignPerkMutation.mutate({ tierId: tier.id, perkId: perk.id })
                                    }
                                  }}
                                  disabled={assignPerkMutation.isPending || removePerkMutation.isPending}
                                  data-testid={`button-toggle-perk-${perk.id}-tier-${tier.id}`}
                                  className={`h-8 w-8 rounded inline-flex items-center justify-center transition-colors ${
                                    hasAccess
                                      ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                      : "bg-muted text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  {hasAccess ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      <tr className="border-t hover:bg-muted/30 transition-colors">
                        <td colSpan={3 + tiers.filter(t => t.type === TierType.SUBSCRIPTION).length} className="py-3 px-3">
                          <Button
                            onClick={() => handleNew()}
                            variant="outline"
                            className="w-full justify-center"
                            data-testid="button-add-perk-subscription"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Perk
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Crown className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No subscription tiers created yet</p>
                  <Button onClick={() => handleNew()} variant="outline" className="mb-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Perk
                  </Button>
                </div>
              )}
              </CardContent>
            </Card>

          {/* Loyalty Tiers Section */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Loyalty Tiers - Additional Benefits
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal mt-2">Unlock extra perks for loyal members (these stack on top of subscription tier perks)</p>
            </CardHeader>
            <CardContent className="pt-6">
              {(tiers.filter(t => t.type === TierType.LOYALTY).length > 0 || filteredPerks.filter(p => p.type === PerkType.LOYALTY).length > 0) ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-semibold">Perk</th>
                        <th className="text-left py-3 px-3 font-semibold">Status</th>
                        <th className="text-center py-3 px-3 font-semibold">Actions</th>
                        {tiers.filter(t => t.type === TierType.LOYALTY).map((tier) => (
                          <th key={tier.id} className="text-center py-3 px-3 font-semibold text-xs">
                            {tier.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPerks.filter(p => p.type === PerkType.LOYALTY).map((perk) => (
                        <tr key={perk.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-3">
                            <div>
                              <p className="font-medium">{perk.name}</p>
                              <p className="text-xs text-muted-foreground">{perk.description}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={perk.isActive ? "default" : "secondary"} className="text-xs">
                              {perk.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => handleEdit(perk)}
                                data-testid={`button-edit-perk-${perk.id}`}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(perk.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-perk-${perk.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          {tiers.filter(t => t.type === TierType.LOYALTY).map((tier) => {
                            const hasAccess = isPerkInTier(perk.id, tier.id)
                            return (
                              <td key={`${perk.id}-${tier.id}`} className="text-center py-3 px-3">
                                <button
                                  onClick={() => {
                                    if (hasAccess) {
                                      removePerkMutation.mutate({ tierId: tier.id, perkId: perk.id })
                                    } else {
                                      assignPerkMutation.mutate({ tierId: tier.id, perkId: perk.id })
                                    }
                                  }}
                                  disabled={assignPerkMutation.isPending || removePerkMutation.isPending}
                                  data-testid={`button-toggle-perk-${perk.id}-tier-${tier.id}`}
                                  className={`h-8 w-8 rounded inline-flex items-center justify-center transition-colors ${
                                    hasAccess
                                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                      : "bg-muted text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  {hasAccess ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      <tr className="border-t hover:bg-muted/30 transition-colors">
                        <td colSpan={3 + tiers.filter(t => t.type === TierType.LOYALTY).length} className="py-3 px-3">
                          <Button
                            onClick={() => handleNew(TierType.LOYALTY)}
                            variant="outline"
                            className="w-full justify-center"
                            data-testid="button-add-perk-loyalty"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Benefit
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No loyalty tiers or benefits created yet</p>
                  <Button onClick={() => handleNew(TierType.LOYALTY)} variant="outline" className="mb-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Benefit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
