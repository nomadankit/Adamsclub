import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Cookie, Plus, Trash2, Edit2, Search, Filter, MapPin } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { assets as assetsTable, locations as locationsTable } from "@shared/schema"
import { Badge } from "@/components/ui/badge"

type Asset = typeof assetsTable.$inferSelect
type Location = typeof locationsTable.$inferSelect

interface LocationInventory {
  assetId: string
  quantity: number
  creditPrice: string
}

export default function AdminConsumables() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [formLocationId, setFormLocationId] = useState<string | null>(null)
  const [filterAvailable, setFilterAvailable] = useState<"all" | "available" | "maintenance">("all")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    brand: "",
    model: "",
    condition: "excellent",
    creditPrice: "",
    quantity: "0",
    isAvailable: true,
    maintenanceMode: false,
  })

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  })

  // Set first location as default
  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id)
    }
  }, [locations])

  // Fetch consumables/assets
  const { data: consumables = [], isLoading: consumablesLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  })

  // Fetch location inventory
  const { data: inventory = [] } = useQuery<LocationInventory[]>({
    queryKey: ["/api/location-inventory", selectedLocationId],
    enabled: !!selectedLocationId,
  })

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async () => {
      const targetLocationId = editingId ? selectedLocationId : formLocationId
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        brand: formData.brand,
        model: formData.model,
        condition: formData.condition,
        creditPrice: formData.creditPrice ? parseFloat(formData.creditPrice) : null,
        type: "consumable",
        location: targetLocationId,
        quantity: formData.quantity ? parseInt(formData.quantity) : 0,
        isAvailable: formData.isAvailable,
        maintenanceMode: formData.maintenanceMode,
      }

      if (editingId) {
        return apiRequest("PATCH", `/api/assets/${editingId}`, payload)
      } else {
        return apiRequest("POST", "/api/assets", payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] })
      queryClient.invalidateQueries({ queryKey: ["/api/location-inventory"] })
      resetForm()
      toast({
        title: editingId ? "Consumable updated" : "Consumable added",
        description: editingId ? "Consumable has been updated successfully" : "Consumable has been added successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save consumable",
        variant: "destructive",
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/assets/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] })
      queryClient.invalidateQueries({ queryKey: ["/api/location-inventory"] })
      toast({
        title: "Consumable deleted",
        description: "Consumable has been deleted successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete consumable",
        variant: "destructive",
      })
    },
  })

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      brand: "",
      model: "",
      condition: "excellent",
      creditPrice: "",
      quantity: "0",
      isAvailable: true,
      maintenanceMode: false,
    })
    setEditingId(null)
    setIsAddingNew(false)
    setFormLocationId(null)
  }

  const handleNew = () => {
    resetForm()
    setIsAddingNew(true)
    setFormLocationId(selectedLocationId)
  }

  const handleEdit = (asset: Asset) => {
    setEditingId(asset.id)
    const inventoryItem = inventory.find(i => i.assetId === asset.id)
    setFormData({
      name: asset.name || "",
      description: asset.description || "",
      category: asset.category || "",
      brand: asset.brand || "",
      model: asset.model || "",
      condition: asset.condition || "excellent",
      creditPrice: asset.creditPrice?.toString() || "",
      quantity: inventoryItem?.quantity.toString() || "0",
      isAvailable: asset.isAvailable ?? true,
      maintenanceMode: asset.maintenanceMode ?? false,
    })
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Consumable name is required",
        variant: "destructive",
      })
      return
    }
    mutation.mutate()
  }

  // Filter consumables for selected location
  const locationConsumables = consumables.filter((item) => {
    const inLocation = inventory.some(inv => inv.assetId === item.id)
    return inLocation && item.type === "consumable"
  })

  const filteredConsumables = locationConsumables.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterAvailable === "available") return matchesSearch && item.isAvailable && !item.maintenanceMode
    if (filterAvailable === "maintenance") return matchesSearch && item.maintenanceMode
    return matchesSearch
  })

  const currentLocation = locations.find(l => l.id === selectedLocationId)
  const locationStats = {
    total: locationConsumables.length,
    available: locationConsumables.filter(g => g.isAvailable && !g.maintenanceMode).length,
    maintenance: locationConsumables.filter(g => g.maintenanceMode).length,
  }

  const isLoading = consumablesLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading consumables...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
              <Cookie className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-5xl font-bold font-['Poppins']" data-testid="text-consumables-title">
              Consumables Management
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Manage consumable items for sale across all locations
          </p>
        </div>

        {/* Location Selector */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">SELECT LOCATION</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {locations.map((location) => (
              <Button
                key={location.id}
                onClick={() => {
                  setSelectedLocationId(location.id)
                  resetForm()
                }}
                variant={selectedLocationId === location.id ? "default" : "outline"}
                className="whitespace-nowrap"
                data-testid={`button-location-${location.id}`}
              >
                {location.name}
              </Button>
            ))}
          </div>
        </div>

        {currentLocation && (
          <>
            {/* Location Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
                <CardContent className="pt-6">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{currentLocation.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{currentLocation.code}</p>
                    </div>
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
                <CardContent className="pt-6">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Total Items</p>
                      <p className="text-3xl font-bold mt-2">{locationStats.total}</p>
                    </div>
                    <Cookie className="h-6 w-6 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
                <CardContent className="pt-6">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Available</p>
                      <p className="text-3xl font-bold mt-2">{locationStats.available}</p>
                    </div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
                <CardContent className="pt-6">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Low Stock</p>
                      <p className="text-3xl font-bold mt-2">{locationStats.maintenance}</p>
                    </div>
                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              {(editingId || isAddingNew) ? (
                <Card className="lg:col-span-1 border-2 border-purple-500/20 h-fit sticky top-4">
                  <CardHeader>
                    <CardTitle>{editingId ? "Edit" : "Add"} Consumable</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold mb-1 block">Name</label>
                      <Input
                        placeholder="Consumable name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        data-testid="input-consumable-name"
                      />
                    </div>

                    {isAddingNew && (
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Location *</label>
                        <select
                          value={formLocationId || ""}
                          onChange={(e) => setFormLocationId(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
                          data-testid="select-location-for-consumable"
                        >
                          <option value="">Select a location</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold mb-1 block">Category</label>
                      <Input
                        placeholder="e.g., Snacks, Drinks, Supplies"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold mb-1 block">Brand</label>
                      <Input
                        placeholder="Brand name"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold mb-1 block">Description</label>
                      <Textarea
                        placeholder="Consumable description..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="min-h-16 resize-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold mb-1 block">Credit Price</label>
                      <Input
                        placeholder="0"
                        type="number"
                        step="1"
                        value={formData.creditPrice}
                        onChange={(e) => setFormData({ ...formData, creditPrice: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold mb-1 block">Stock at {currentLocation.name}</label>
                      <Input
                        placeholder="Quantity"
                        type="number"
                        step="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        data-testid="input-consumable-quantity"
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isAvailable}
                          onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span>Available for Purchase</span>
                      </label>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={handleSubmit}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600"
                        disabled={mutation.isPending}
                        data-testid="button-save-consumable"
                      >
                        {mutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
                      </Button>
                      <Button
                        onClick={resetForm}
                        variant="outline"
                        size="sm"
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* List */}
              <div className={editingId || isAddingNew ? "lg:col-span-2" : "lg:col-span-3"}>
                {/* Controls */}
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search consumables..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-consumables"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={filterAvailable === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterAvailable("all")}
                      data-testid="button-filter-all"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      All
                    </Button>
                    <Button
                      variant={filterAvailable === "available" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterAvailable("available")}
                      data-testid="button-filter-available"
                    >
                      Available
                    </Button>
                  </div>

                  {!editingId && (
                    <Button
                      onClick={handleNew}
                      className="gap-2 bg-gradient-to-r from-purple-500 to-pink-600"
                      data-testid="button-add-consumable"
                    >
                      <Plus className="h-4 w-4" />
                      Add Consumable
                    </Button>
                  )}
                </div>

                {/* Consumables Grid */}
                {filteredConsumables.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="pt-12 pb-12 text-center">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <Cookie className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-lg font-medium mb-1">No consumables at this location</p>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery || filterAvailable !== "all" ? "Try adjusting your filters" : "Get started by adding consumables to this location"}
                      </p>
                      {!editingId && (
                        <Button onClick={handleNew} data-testid="button-create-first-consumable">
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Consumable
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredConsumables.map((item) => {
                      const inv = inventory.find(i => i.assetId === item.id)
                      return (
                        <Card
                          key={item.id}
                          data-testid={`card-consumable-${item.id}`}
                          className="hover-elevate transition-all border-0"
                        >
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h3 className="font-bold text-lg" data-testid={`text-consumable-name-${item.id}`}>
                                    {item.name}
                                  </h3>
                                  <Badge
                                    variant={item.isAvailable ? "default" : "destructive"}
                                    data-testid={`badge-status-${item.id}`}
                                  >
                                    {item.isAvailable ? "Available" : "Unavailable"}
                                  </Badge>
                                </div>
                                {item.category && (
                                  <p className="text-sm text-muted-foreground mb-1">{item.category}</p>
                                )}
                              </div>

                              <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">Stock at {currentLocation.name}</p>
                                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{inv?.quantity || 0}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3">
                                {item.creditPrice && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Credit Price</p>
                                    <p className="font-medium">{Math.round(Number(item.creditPrice))} credits</p>
                                  </div>
                                )}
                                {item.brand && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Brand</p>
                                    <p className="font-medium">{item.brand}</p>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 pt-3 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(item)}
                                  data-testid={`button-edit-consumable-${item.id}`}
                                  className="flex-1"
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => deleteMutation.mutate(item.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-consumable-${item.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
