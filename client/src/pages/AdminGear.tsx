import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Package, Plus, Trash2, Edit2, Search, Filter, Wrench, MapPin } from "lucide-react"
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

export default function AdminGear() {
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
    type: "gear",
    dailyRate: "",
    depositAmount: "",
    quantity: "0",
    isAvailable: true,
    maintenanceMode: false,
    mainPrice: "",
    excellentTokenReward: "",
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

  // Fetch gear/assets
  const { data: gear = [], isLoading: gearLoading } = useQuery<Asset[]>({
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
        dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : null,
        depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : null,
        mainPrice: formData.mainPrice ? parseFloat(formData.mainPrice) : null,
        excellentTokenReward: formData.excellentTokenReward ? parseInt(formData.excellentTokenReward) : 0,
        type: formData.type,
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
        title: editingId ? "Gear updated" : "Gear added",
        description: editingId ? "Gear has been updated successfully" : "Gear has been added successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save gear",
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
        title: "Gear deleted",
        description: "Gear has been deleted successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete gear",
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
      type: "gear",
      dailyRate: "",
      depositAmount: "",
      quantity: "0",
      isAvailable: true,
      maintenanceMode: false,
      mainPrice: "",
      excellentTokenReward: "",
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
      type: asset.type || "gear",
      dailyRate: asset.dailyRate?.toString() || "",
      depositAmount: asset.depositAmount?.toString() || "",
      quantity: inventoryItem?.quantity.toString() || "0",
      isAvailable: asset.isAvailable ?? true,
      maintenanceMode: asset.maintenanceMode ?? false,
      mainPrice: asset.mainPrice?.toString() || "",
      excellentTokenReward: asset.excellentTokenReward?.toString() || "0",
    })
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Gear name is required",
        variant: "destructive",
      })
      return
    }
    mutation.mutate()
  }

  // Filter gear for selected location
  const locationGear = gear.filter((item) => {
    const inLocation = inventory.some(inv => inv.assetId === item.id)
    return inLocation && item.type === "gear"
  })

  const filteredGear = locationGear.filter((item) => {
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
    total: locationGear.length,
    available: locationGear.filter(g => g.isAvailable && !g.maintenanceMode).length,
    maintenance: locationGear.filter(g => g.maintenanceMode).length,
  }

  const isLoading = gearLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading gear...</p>
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
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-5xl font-bold font-['Poppins']" data-testid="text-gear-title">
              Gear Management
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Manage equipment inventory across all locations
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
                    <Package className="h-6 w-6 text-primary" />
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
                      <p className="text-sm text-muted-foreground font-medium">Maintenance</p>
                      <p className="text-3xl font-bold mt-2">{locationStats.maintenance}</p>
                    </div>
                    <Wrench className="h-6 w-6 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              {editingId || isAddingNew ? (
                <Card className="lg:col-span-1 border-2 border-blue-500/20 h-fit">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
                    <CardTitle className="flex items-center gap-2">
                      <Edit2 className="h-5 w-5" />
                      {editingId ? "Edit Gear" : "New Gear"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    <div>
                      <label className="text-xs font-semibold mb-1 block">Name *</label>
                      <Input
                        placeholder="Gear name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        data-testid="input-gear-name"
                      />
                    </div>

                    {isAddingNew && (
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Location *</label>
                        <select
                          value={formLocationId || ""}
                          onChange={(e) => setFormLocationId(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
                          data-testid="select-location-for-gear"
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
                        placeholder="e.g., Camping"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Brand</label>
                        <Input
                          placeholder="Brand"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Model</label>
                        <Input
                          placeholder="Model"
                          value={formData.model}
                          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold mb-1 block">Description</label>
                      <Textarea
                        placeholder="Gear description..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="min-h-16 resize-none text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Type</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded-md bg-background"
                          data-testid="select-asset-type"
                        >
                          <option value="gear">Gear</option>
                          <option value="experience">Experience</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Condition</label>
                        <select
                          value={formData.condition}
                          onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded-md bg-background"
                          data-testid="select-asset-condition"
                        >
                          <option value="excellent">Excellent</option>
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="poor">Poor</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Adventure Price (Credits)</label>
                        <Input
                          placeholder="0"
                          type="number"
                          step="0.01"
                          value={formData.mainPrice}
                          onChange={(e) => setFormData({ ...formData, mainPrice: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Excellent Token Reward</label>
                        <Input
                          placeholder="0"
                          type="number"
                          step="1"
                          value={formData.excellentTokenReward}
                          onChange={(e) => setFormData({ ...formData, excellentTokenReward: e.target.value })}
                        />
                      </div>
                    </div>



                    <div>
                      <label className="text-xs font-semibold mb-1 block">Stock at {currentLocation.name}</label>
                      <Input
                        placeholder="Quantity"
                        type="number"
                        step="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        data-testid="input-gear-quantity"
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
                        <span>Available for Booking</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.maintenanceMode}
                          onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span>In Maintenance</span>
                      </label>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={handleSubmit}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600"
                        disabled={mutation.isPending}
                        data-testid="button-save-gear"
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
                      placeholder="Search gear..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-gear"
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
                    <Button
                      variant={filterAvailable === "maintenance" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterAvailable("maintenance")}
                      data-testid="button-filter-maintenance"
                    >
                      Maintenance
                    </Button>
                  </div>

                  {!editingId && (
                    <Button
                      onClick={handleNew}
                      className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-600"
                      data-testid="button-add-gear"
                    >
                      <Plus className="h-4 w-4" />
                      Add Gear
                    </Button>
                  )}
                </div>

                {/* Gear Grid */}
                {filteredGear.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="pt-12 pb-12 text-center">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-lg font-medium mb-1">No gear at this location</p>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery || filterAvailable !== "all" ? "Try adjusting your filters" : "Get started by adding gear to this location"}
                      </p>
                      {!editingId && (
                        <Button onClick={handleNew} data-testid="button-create-first-gear">
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Gear
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredGear.map((item) => {
                      const inv = inventory.find(i => i.assetId === item.id)
                      return (
                        <Card
                          key={item.id}
                          data-testid={`card-gear-${item.id}`}
                          className="hover-elevate transition-all border-0"
                        >
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h3 className="font-bold text-lg" data-testid={`text-gear-name-${item.id}`}>
                                    {item.name}
                                  </h3>
                                  <Badge
                                    variant={item.maintenanceMode ? "secondary" : item.isAvailable ? "default" : "destructive"}
                                    data-testid={`badge-status-${item.id}`}
                                  >
                                    {item.maintenanceMode ? "Maintenance" : item.isAvailable ? "Available" : "Unavailable"}
                                  </Badge>
                                </div>
                                {item.category && (
                                  <p className="text-sm text-muted-foreground mb-1">{item.category}</p>
                                )}
                              </div>

                              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Stock at {currentLocation.name}</p>
                                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{inv?.quantity || 0}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3">

                                {item.condition && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Condition</p>
                                    <p className="font-medium capitalize">{item.condition}</p>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 pt-3 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(item)}
                                  data-testid={`button-edit-gear-${item.id}`}
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
                                  data-testid={`button-delete-gear-${item.id}`}
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
