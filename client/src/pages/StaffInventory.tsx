import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, AlertCircle, ArrowLeft, Loader2, Clock, Wrench, Calendar, Plus, Trash2, X, Edit2 } from "lucide-react"
import { useLocation } from "wouter"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface Asset {
  id: string
  name: string
  category?: string
  type?: string
  condition?: string
}

interface InventoryItem {
  id: string
  locationId: string
  assetId: string
  quantity: number
  creditPrice: number
  assetName: string
  assetCategory?: string
  assetCondition?: string
  type?: string
  maintenanceMode?: boolean
  lastUpdatedBy?: string
  updatedAt?: string
}

interface LocationInventoryData {
  location: { id: string; name: string }
  inventory: InventoryItem[]
  stats: {
    pendingCheckIns: number
    availableGear: number
    inMaintenance: number
    todaysBookings: number
  }
}

export default function StaffInventory() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "quantity" | "category">("name")
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAssetName, setSelectedAssetName] = useState("")
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editDetailsModal, setEditDetailsModal] = useState<string | null>(null)
  const [editDetails, setEditDetails] = useState<any>({})

  const { data: inventoryData, isLoading } = useQuery<LocationInventoryData>({
    queryKey: ['/api/staff/location-inventory'],
  })

  const locationId = inventoryData?.location?.id

  const addItemMutation = useMutation({
    mutationFn: async ({ locationId, assetName, quantity }: { locationId: string; assetName: string; quantity: number }) => {
      return apiRequest('POST', `/api/staff/location-inventory/${locationId}`, { assetName, quantity })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/location-inventory'] })
      setShowAddModal(false)
      setSelectedAssetName("")
      setSelectedQuantity(1)
      toast({ title: "Success", description: "Item added to inventory" })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" })
    }
  })

  const deleteItemMutation = useMutation({
    mutationFn: async ({ locationId, assetId }: { locationId: string; assetId: string }) => {
      return apiRequest('DELETE', `/api/staff/location-inventory/${locationId}/${assetId}`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/location-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['/api/staff/available-assets'] })
      setDeleteConfirm(null)
      toast({ title: "Success", description: "Item removed from inventory" })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" })
    }
  })

  const updateAssetDetailsMutation = useMutation({
    mutationFn: async ({ locationId, assetId, quantity, maintenanceMode, ...details }: any) => {
      const updatePromises = []
      
      // Update asset details (name, category, type, condition)
      if (Object.keys(details).length > 0) {
        updatePromises.push(apiRequest('PATCH', `/api/admin/assets/${assetId}`, details))
      }
      
      // Update maintenance mode if changed
      if (maintenanceMode !== undefined) {
        updatePromises.push(apiRequest('PATCH', `/api/admin/assets/${assetId}`, { maintenanceMode }))
      }
      
      // Update quantity if changed
      if (quantity !== undefined) {
        updatePromises.push(apiRequest('PATCH', `/api/staff/location-inventory/${locationId}/${assetId}`, { quantity }))
      }
      
      await Promise.all(updatePromises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/location-inventory'] })
      setEditDetailsModal(null)
      setEditDetails({})
      toast({ title: "Success", description: "Equipment details updated" })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update equipment", variant: "destructive" })
    }
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    )
  }

  const location = inventoryData?.location
  const inventory = inventoryData?.inventory || []
  const stats = inventoryData?.stats || { pendingCheckIns: 0, availableGear: 0, inMaintenance: 0, todaysBookings: 0 }

  if (!location) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h2 className="text-xl font-semibold mb-2">No Location Assigned</h2>
          <p className="text-muted-foreground mb-4">You don't have a location assigned yet. Please contact your administrator.</p>
          <Button variant="outline" onClick={() => setLocation('/staff/home')} data-testid="button-back-to-home">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const categories = Array.from(new Set(inventory.map(item => item.assetCategory).filter(Boolean)))
  
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.assetName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || item.assetCategory === filterCategory
    return matchesSearch && matchesCategory
  })

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    if (sortBy === "name") return a.assetName.localeCompare(b.assetName)
    if (sortBy === "quantity") return b.quantity - a.quantity
    if (sortBy === "category") return (a.assetCategory || "").localeCompare(b.assetCategory || "")
    return 0
  })


  const handleAddItem = () => {
    if (!selectedAssetName.trim()) {
      toast({ title: "Error", description: "Please enter an asset name", variant: "destructive" })
      return
    }
    if (selectedQuantity < 1) {
      toast({ title: "Error", description: "Please enter a quantity of at least 1", variant: "destructive" })
      return
    }
    if (location) {
      addItemMutation.mutate({
        locationId: location.id,
        assetName: selectedAssetName,
        quantity: selectedQuantity
      })
    }
  }

  const handleDeleteItem = (assetId: string) => {
    if (location) {
      deleteItemMutation.mutate({
        locationId: location.id,
        assetId
      })
    }
  }

  const quickStats = [
    { label: 'Pending Check-ins', value: stats.pendingCheckIns, icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950' },
    { label: 'Available Gear', value: stats.availableGear, icon: Package, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950' },
    { label: 'In Maintenance', value: stats.inMaintenance, icon: Wrench, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950' },
    { label: "Today's Bookings", value: stats.todaysBookings, icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 px-4">
        <section className="py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" onClick={() => setLocation('/staff/home')} data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold font-['Poppins']" data-testid="text-inventory-title">
                  Location Inventory
                </h1>
                <p className="text-muted-foreground">
                  {location?.name} - Manage and track equipment inventory
                </p>
              </div>
              <Button onClick={() => setShowAddModal(true)} className="gap-2" data-testid="button-add-item">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {quickStats.map((stat, idx) => {
                const Icon = stat.icon
                return (
                  <div key={idx} className={`${stat.bgColor} p-4 rounded-lg border`} data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <div className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</div>
                      </div>
                      <Icon className={`h-8 w-8 ${stat.color} opacity-20`} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Panel */}
              {showAddModal ? (
                <Card className="lg:col-span-1 border-2 border-green-500/20 h-fit">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Item
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    <div>
                      <label className="text-xs font-semibold mb-1 block">Asset Name *</label>
                      <Input 
                        placeholder="e.g., Mountain Bike, Kayak"
                        value={selectedAssetName} 
                        onChange={(e) => setSelectedAssetName(e.target.value)} 
                        data-testid="input-asset-name" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold mb-1 block">Quantity *</label>
                      <Input 
                        type="number" 
                        min="1" 
                        value={selectedQuantity} 
                        onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)} 
                        data-testid="input-quantity" 
                      />
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={handleAddItem}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
                        disabled={addItemMutation.isPending}
                        data-testid="button-add-confirm"
                      >
                        {addItemMutation.isPending ? "Adding..." : "Add Item"}
                      </Button>
                      <Button
                        onClick={() => setShowAddModal(false)}
                        variant="outline"
                        size="sm"
                        data-testid="button-cancel-add"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Inventory List */}
              <div className={showAddModal ? "lg:col-span-2" : "lg:col-span-3"}>
                {/* Search and Filter Controls */}
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Input placeholder="Search inventory..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search" />
                  </div>

                  <div className="flex gap-2">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-1.5 text-sm border rounded-md bg-background" data-testid="select-sort">
                      <option value="name">Sort: Name</option>
                      <option value="quantity">Sort: Quantity</option>
                      <option value="category">Sort: Category</option>
                    </select>

                    <select value={filterCategory || ""} onChange={(e) => setFilterCategory(e.target.value || null)} className="px-3 py-1.5 text-sm border rounded-md bg-background" data-testid="select-category">
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat || "Uncategorized"}</option>
                      ))}
                    </select>
                  </div>

                  {!showAddModal && (
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600"
                      data-testid="button-add-item"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  )}
                </div>

                {/* Inventory List */}
                <Card data-testid="card-inventory-list">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Inventory Items ({sortedInventory.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {sortedInventory.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                    <p className="text-muted-foreground mb-2">
                      {inventory.length === 0 ? "No inventory items for this location yet." : "No results matching your search."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedInventory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover-elevate transition-all" data-testid={`inventory-item-${item.assetId}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold truncate" data-testid={`text-asset-name-${item.assetId}`}>
                              {item.assetName}
                            </h3>
                            {item.maintenanceMode && (
                              <Badge variant="destructive" className="text-xs flex-shrink-0">Down for Maintenance</Badge>
                            )}
                            {!item.maintenanceMode && item.quantity === 0 && (
                              <Badge variant="destructive" className="text-xs flex-shrink-0">Low Stock</Badge>
                            )}
                            {!item.maintenanceMode && item.quantity > 0 && item.quantity <= 2 && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">Low</Badge>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {item.assetCategory && (
                              <Badge variant="outline" className="text-xs">
                                {item.assetCategory}
                              </Badge>
                            )}
                            {item.assetCondition && (
                              <Badge variant="outline" className="text-xs">
                                {item.assetCondition}
                              </Badge>
                            )}
                            {item.type && (
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <div className="flex flex-col items-end gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Credit Price</p>
                              <p className="text-lg font-semibold" data-testid={`text-price-${item.assetId}`}>{Math.round(Number(item.creditPrice) || 0)} credits</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Quantity</p>
                              <div className="text-2xl font-bold" data-testid={`text-quantity-${item.assetId}`}>
                                {item.quantity}
                              </div>
                              <p className="text-xs text-muted-foreground">units</p>
                            </div>
                          </div>
                          
                          <Button size="sm" variant="outline" onClick={() => { setEditDetailsModal(item.assetId); setEditDetails({ name: item.assetName, category: item.assetCategory, type: item.type, condition: item.assetCondition, quantity: item.quantity, maintenanceMode: item.maintenanceMode || false }); }} data-testid={`button-edit-details-${item.assetId}`}>
                            Edit Details
                          </Button>
                          
                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(item.assetId)} data-testid={`button-delete-${item.assetId}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
              </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="delete-confirm-overlay">
                <Card className="w-96">
                  <CardHeader>
                    <CardTitle>Remove Item?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">Are you sure you want to remove "{sortedInventory.find(item => item.assetId === deleteConfirm)?.assetName}" from this location's inventory?</p>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="button-cancel-delete">
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={() => handleDeleteItem(deleteConfirm)} disabled={deleteItemMutation.isPending} data-testid="button-confirm-delete">
                        {deleteItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Edit Details Modal */}
            {editDetailsModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="edit-details-overlay">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>Edit Equipment Details</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => { setEditDetailsModal(null); setEditDetails({}); }} data-testid="button-close-details-modal">
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Name</label>
                      <Input value={editDetails.name || ""} onChange={(e) => setEditDetails({...editDetails, name: e.target.value})} data-testid="input-edit-name" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <Input value={editDetails.category || ""} onChange={(e) => setEditDetails({...editDetails, category: e.target.value})} data-testid="input-edit-category" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Type</label>
                      <Input value={editDetails.type || ""} onChange={(e) => setEditDetails({...editDetails, type: e.target.value})} data-testid="input-edit-type" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Condition</label>
                      <Input value={editDetails.condition || ""} onChange={(e) => setEditDetails({...editDetails, condition: e.target.value})} data-testid="input-edit-condition" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Quantity</label>
                      <Input type="number" min="0" value={editDetails.quantity || 0} onChange={(e) => setEditDetails({...editDetails, quantity: parseInt(e.target.value) || 0})} data-testid="input-edit-quantity" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="maintenance" checked={editDetails.maintenanceMode || false} onChange={(e) => setEditDetails({...editDetails, maintenanceMode: e.target.checked})} data-testid="checkbox-maintenance" className="rounded border-gray-300" />
                      <label htmlFor="maintenance" className="text-sm font-medium cursor-pointer">Mark for Maintenance</label>
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                      <Button variant="outline" onClick={() => { setEditDetailsModal(null); setEditDetails({}); }} data-testid="button-cancel-details">
                        Cancel
                      </Button>
                      <Button onClick={() => updateAssetDetailsMutation.mutate({locationId: location?.id, assetId: editDetailsModal, ...editDetails})} disabled={updateAssetDetailsMutation.isPending} data-testid="button-save-details">
                        {updateAssetDetailsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : ''}
                        Save Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
