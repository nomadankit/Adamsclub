import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Crown, Plus, Trash2, Edit2, Search, Filter, Zap } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { tiers as tiersTable, TierType } from "@shared/schema"
import { Badge } from "@/components/ui/badge"

type Tier = typeof tiersTable.$inferSelect

export default function AdminTiers() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [creatingTierType, setCreatingTierType] = useState<string | null>(null)
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all")
  const [formData, setFormData] = useState<{ name: string; description: string; price: string; monthsRequired: string; type: string; isActive: boolean }>({ name: "", description: "", price: "", monthsRequired: "", type: TierType.SUBSCRIPTION, isActive: true })

  // Fetch tiers
  const { data: tiers = [], isLoading } = useQuery<Tier[]>({
    queryKey: ["/api/tiers"],
  })

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        price: formData.price ? parseFloat(formData.price) : null,
        monthsRequired: formData.monthsRequired ? parseInt(formData.monthsRequired) : null,
        isActive: formData.isActive,
      }

      if (editingId) {
        return apiRequest("PATCH", `/api/tiers/${editingId}`, payload)
      } else {
        return apiRequest("POST", "/api/tiers", payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tiers"] })
      setFormData({ name: "", description: "", price: "", monthsRequired: "", type: TierType.SUBSCRIPTION, isActive: true })
      setEditingId(null)
      setIsCreating(false)
      setCreatingTierType(null)
      toast({
        title: editingId ? "Tier updated" : "Tier created",
        description: editingId ? "Tier has been updated successfully" : "Tier has been created successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save tier",
        variant: "destructive",
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tiers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tiers"] })
      toast({
        title: "Tier deleted",
        description: "Tier has been deleted successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tier",
        variant: "destructive",
      })
    },
  })

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async (tier: Tier) => {
      return apiRequest("PATCH", `/api/tiers/${tier.id}`, {
        name: tier.name,
        description: tier.description,
        type: tier.type,
        price: tier.price,
        isActive: !tier.isActive,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tiers"] })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tier status",
        variant: "destructive",
      })
    },
  })

  const handleNew = (tierType?: string) => {
    setEditingId(null)
    setIsCreating(true)
    setCreatingTierType(tierType || null)
    setFormData({ name: "", description: "", price: "", monthsRequired: "", type: tierType === TierType.LOYALTY ? TierType.LOYALTY : TierType.SUBSCRIPTION, isActive: true })
  }

  const handleEdit = (tier: Tier) => {
    setEditingId(tier.id)
    setCreatingTierType(tier.type || "")
    setFormData({
      name: tier.name || "",
      description: tier.description || "",
      price: tier.price?.toString() || "",
      monthsRequired: tier.monthsRequired?.toString() || "",
      type: tier.type || TierType.SUBSCRIPTION,
      isActive: tier.isActive ?? true,
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsCreating(false)
    setCreatingTierType(null)
    setFormData({ name: "", description: "", price: "", monthsRequired: "", type: TierType.SUBSCRIPTION, isActive: true })
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Tier name is required",
        variant: "destructive",
      })
      return
    }
    mutation.mutate()
  }

  // Filter and search tiers
  const filteredTiers = tiers.filter((tier) => {
    const matchesSearch = tier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tier.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterActive === "active") return matchesSearch && tier.isActive
    if (filterActive === "inactive") return matchesSearch && !tier.isActive
    return matchesSearch
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tiers...</p>
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
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-5xl font-bold font-['Poppins']" data-testid="text-tiers-title">
                Tiers Management
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Configure subscription and loyalty tiers with pricing and benefits
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Tiers</p>
                    <p className="text-3xl font-bold mt-2">{tiers.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Active</p>
                    <p className="text-3xl font-bold mt-2">{tiers.filter(t => t.isActive).length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Inactive</p>
                    <p className="text-3xl font-bold mt-2">{tiers.filter(t => !t.isActive).length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-muted-foreground"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tier Form Modal */}
        <Dialog open={editingId !== null || isCreating} onOpenChange={(open) => {
          if (!open) handleCancel()
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                {editingId ? (creatingTierType === TierType.LOYALTY ? "Edit Loyalty Tier" : "Edit Subscription Tier") : (creatingTierType === TierType.LOYALTY ? "Add Loyalty Tier" : "Add Subscription Tier")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Tier Name *</label>
                <Input
                  placeholder="e.g., Premium, VIP"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-tier-name"
                />
              </div>

              {formData.type === TierType.SUBSCRIPTION && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">Monthly Price</label>
                  <Input
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    data-testid="input-tier-price"
                  />
                </div>
              )}

              {formData.type === TierType.LOYALTY && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">Months to Achieve</label>
                  <Input
                    placeholder="e.g., 6, 12, 24"
                    type="number"
                    min="1"
                    value={formData.monthsRequired}
                    onChange={(e) => setFormData({ ...formData, monthsRequired: e.target.value })}
                    data-testid="input-tier-months-required"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold mb-2 block">Description</label>
                <Textarea
                  placeholder="Describe this membership tier..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="input-tier-description"
                  className="min-h-24 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  data-testid="checkbox-tier-active"
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
                className="bg-gradient-to-r from-purple-500 to-indigo-600"
                disabled={mutation.isPending}
                data-testid="button-save-tier"
              >
                {mutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Controls */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tiers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-tiers"
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
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Subscription Tiers
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal mt-2">Core membership tiers (BASE, PREMIUM, VIP, EMPLOYEE)</p>
          </CardHeader>
          <CardContent className="pt-6">
            {filteredTiers.filter(t => t.type === TierType.SUBSCRIPTION).length === 0 ? (
              <div className="text-center py-8">
                <Crown className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No subscription tiers created yet</p>
                <Button onClick={() => handleNew()} variant="outline" className="mb-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Subscription Tier
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTiers.filter(t => t.type === TierType.SUBSCRIPTION).map((tier) => (
                  <Card
                    key={tier.id}
                    data-testid={`card-tier-${tier.id}`}
                    className="hover-elevate transition-all border-0"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg" data-testid={`text-tier-name-${tier.id}`}>
                              {tier.name}
                            </h3>
                            <Badge
                              variant={tier.isActive ? "default" : "secondary"}
                              data-testid={`badge-status-${tier.id}`}
                            >
                              {tier.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {tier.price && (
                            <p className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-2">
                              ${tier.price}/month
                            </p>
                          )}
                          {tier.description && (
                            <p
                              className="text-sm text-muted-foreground whitespace-pre-wrap break-words"
                              data-testid={`text-tier-description-${tier.id}`}
                            >
                              {tier.description}
                            </p>
                          )}
                          {tier.createdAt && (
                            <p className="text-xs text-muted-foreground mt-3">
                              Created {new Date(tier.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEdit(tier)}
                            data-testid={`button-edit-tier-${tier.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleActiveMutation.mutate(tier)}
                            disabled={toggleActiveMutation.isPending}
                            data-testid={`button-toggle-tier-${tier.id}`}
                          >
                            {tier.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(tier.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-tier-${tier.id}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  onClick={() => handleNew()}
                  variant="outline"
                  className="w-full justify-center"
                  data-testid="button-add-subscription-tier"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subscription Tier
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
              Loyalty Tiers
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal mt-2">Additional benefits for loyal members (stack on top of subscription tiers)</p>
          </CardHeader>
          <CardContent className="pt-6">
            {filteredTiers.filter(t => t.type === TierType.LOYALTY).length === 0 ? (
              <div className="text-center py-8">
                <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No loyalty tiers created yet</p>
                <Button onClick={() => handleNew(TierType.LOYALTY)} variant="outline" className="mb-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Loyalty Tier
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTiers.filter(t => t.type === TierType.LOYALTY).map((tier) => (
                  <Card
                    key={tier.id}
                    data-testid={`card-tier-${tier.id}`}
                    className="hover-elevate transition-all border-0"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg" data-testid={`text-tier-name-${tier.id}`}>
                              {tier.name}
                            </h3>
                            <Badge
                              variant={tier.isActive ? "default" : "secondary"}
                              data-testid={`badge-status-${tier.id}`}
                            >
                              {tier.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {tier.price && (
                            <p className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-2">
                              ${tier.price}/month
                            </p>
                          )}
                          {tier.description && (
                            <p
                              className="text-sm text-muted-foreground whitespace-pre-wrap break-words"
                              data-testid={`text-tier-description-${tier.id}`}
                            >
                              {tier.description}
                            </p>
                          )}
                          {tier.createdAt && (
                            <p className="text-xs text-muted-foreground mt-3">
                              Created {new Date(tier.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEdit(tier)}
                            data-testid={`button-edit-tier-${tier.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleActiveMutation.mutate(tier)}
                            disabled={toggleActiveMutation.isPending}
                            data-testid={`button-toggle-tier-${tier.id}`}
                          >
                            {tier.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(tier.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-tier-${tier.id}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  onClick={() => handleNew(TierType.LOYALTY)}
                  variant="outline"
                  className="w-full justify-center"
                  data-testid="button-add-loyalty-tier"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Loyalty Tier
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
