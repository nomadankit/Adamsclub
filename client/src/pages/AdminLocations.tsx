import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Plus, Trash2, Edit2, Search, Filter, Users, X } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { locations as locationsTable, users as usersTable } from "@shared/schema"
import { Badge } from "@/components/ui/badge"

type Location = typeof locationsTable.$inferSelect
type User = typeof usersTable.$inferSelect
interface StaffMember { id: string; firstName?: string; lastName?: string; email?: string }

export default function AdminLocations() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all")
  const [formData, setFormData] = useState({ name: "", code: "", description: "", isActive: true })
  const [manageStaffLocationId, setManageStaffLocationId] = useState<string | null>(null)

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  })

  // Fetch all staff
  const { data: allStaff = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/admin/staff"],
  })

  // Fetch staff at selected location
  const { data: staffAtLocation = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/admin/locations", manageStaffLocationId, "staff"],
    enabled: !!manageStaffLocationId,
  })

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return apiRequest("PATCH", `/api/locations/${editingId}`, formData)
      } else {
        return apiRequest("POST", "/api/locations", formData)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] })
      setFormData({ name: "", code: "", description: "", isActive: true })
      setEditingId(null)
      setShowForm(false)
      toast({
        title: editingId ? "Location updated" : "Location created",
        description: editingId ? "Location has been updated successfully" : "Location has been created successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save location",
        variant: "destructive",
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/locations/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] })
      toast({
        title: "Location deleted",
        description: "Location has been deleted successfully",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive",
      })
    },
  })

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async (location: Location) => {
      return apiRequest("PATCH", `/api/locations/${location.id}`, {
        name: location.name,
        code: location.code,
        description: location.description,
        isActive: !location.isActive,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] })
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location status",
        variant: "destructive",
      })
    },
  })

  // Assign staff mutation
  const assignStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return apiRequest("POST", `/api/admin/locations/${manageStaffLocationId}/staff/${staffId}`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/locations", manageStaffLocationId, "staff"] })
      toast({ title: "Success", description: "Staff assigned to location" })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign staff", variant: "destructive" })
    },
  })

  // Unassign staff mutation
  const unassignStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return apiRequest("DELETE", `/api/admin/locations/${manageStaffLocationId}/staff/${staffId}`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/locations", manageStaffLocationId, "staff"] })
      toast({ title: "Success", description: "Staff unassigned from location" })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to unassign staff", variant: "destructive" })
    },
  })

  const handleNew = () => {
    setEditingId(null)
    setFormData({ name: "", code: "", description: "", isActive: true })
    setShowForm(true)
  }

  const handleEdit = (location: Location) => {
    setEditingId(location.id)
    setFormData({
      name: location.name || "",
      code: location.code || "",
      description: location.description || "",
      isActive: location.isActive ?? true,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({ name: "", code: "", description: "", isActive: true })
    setShowForm(false)
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Location name is required",
        variant: "destructive",
      })
      return
    }
    if (!formData.code.trim()) {
      toast({
        title: "Error",
        description: "Location code is required",
        variant: "destructive",
      })
      return
    }
    mutation.mutate()
  }

  // Filter and search locations
  const filteredLocations = locations.filter((location) => {
    const matchesSearch = location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterActive === "active") return matchesSearch && location.isActive
    if (filterActive === "inactive") return matchesSearch && !location.isActive
    return matchesSearch
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading locations...</p>
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
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-5xl font-bold font-['Poppins']" data-testid="text-locations-title">
                  Locations Management
                </h1>
              </div>
              <p className="text-lg text-muted-foreground">
                Manage pick-up locations, drop-off points, and location details
              </p>
            </div>
            {!showForm && (
              <Button
                onClick={handleNew}
                size="lg"
                className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                data-testid="button-create-new-location"
              >
                <Plus className="h-5 w-5" />
                Add Location
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Locations</p>
                    <p className="text-3xl font-bold mt-2">{locations.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Active</p>
                    <p className="text-3xl font-bold mt-2">{locations.filter(l => l.isActive).length}</p>
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
                    <p className="text-3xl font-bold mt-2">{locations.filter(l => !l.isActive).length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-muted-foreground"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          {showForm ? (
            <Card className="lg:col-span-1 border-2 border-green-500/20">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardTitle className="flex items-center gap-2">
                  <Edit2 className="h-5 w-5" />
                  {editingId ? "Edit Location" : "New Location"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Location Name *</label>
                  <Input
                    placeholder="e.g., Downtown Hub"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-location-name"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Location Code *</label>
                  <Input
                    placeholder="e.g., DT-001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    data-testid="input-location-code"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Unique identifier for this location</p>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Description</label>
                  <Textarea
                    placeholder="Describe this location..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="input-location-description"
                    className="min-h-24 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    data-testid="checkbox-location-active"
                    className="h-4 w-4"
                  />
                  <label className="text-sm font-medium cursor-pointer flex-1">Active</label>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
                    disabled={mutation.isPending}
                    data-testid="button-save-location"
                  >
                    {mutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* List Section */}
          <div className={showForm ? "lg:col-span-2" : "lg:col-span-3"}>
            {/* Controls */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-locations"
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

            {/* Locations Grid */}
            {filteredLocations.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="pt-12 pb-12 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-lg font-medium mb-1">No locations found</p>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || filterActive !== "all" ? "Try adjusting your filters" : "Get started by creating your first location"}
                  </p>
                  {!showForm && (
                    <Button onClick={handleNew} data-testid="button-create-first-location">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Location
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredLocations.map((location) => (
                  <Card
                    key={location.id}
                    data-testid={`card-location-${location.id}`}
                    className="hover-elevate transition-all border-0"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg" data-testid={`text-location-name-${location.id}`}>
                              {location.name}
                            </h3>
                            <Badge
                              variant={location.isActive ? "default" : "secondary"}
                              className="ml-auto"
                              data-testid={`badge-status-${location.id}`}
                            >
                              {location.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                              {location.code}
                            </code>
                          </div>
                          {location.description && (
                            <p
                              className="text-sm text-muted-foreground line-clamp-2"
                              data-testid={`text-location-description-${location.id}`}
                            >
                              {location.description}
                            </p>
                          )}
                          {location.createdAt && (
                            <p className="text-xs text-muted-foreground mt-3">
                              Created {new Date(location.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setManageStaffLocationId(location.id)}
                            data-testid={`button-manage-staff-${location.id}`}
                            className="gap-2"
                          >
                            <Users className="h-4 w-4" />
                            <span className="text-xs">{staffAtLocation?.length || 0}</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEdit(location)}
                            data-testid={`button-edit-location-${location.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleActiveMutation.mutate(location)}
                            disabled={toggleActiveMutation.isPending}
                            data-testid={`button-toggle-location-${location.id}`}
                          >
                            {location.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(location.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-location-${location.id}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Staff Management Modal */}
        {manageStaffLocationId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl">
              <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manage Staff for {locations.find(l => l.id === manageStaffLocationId)?.name}
                </CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setManageStaffLocationId(null)}
                  data-testid="button-close-staff-modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Currently Assigned */}
                  <div>
                    <h3 className="font-semibold mb-3">Assigned Staff ({staffAtLocation.length})</h3>
                    {staffAtLocation.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No staff assigned yet</p>
                    ) : (
                      <div className="space-y-2">
                        {staffAtLocation.map(staff => (
                          <div key={staff.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <div>
                              <p className="font-medium">{staff.firstName} {staff.lastName}</p>
                              <p className="text-sm text-muted-foreground">{staff.email}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unassignStaffMutation.mutate(staff.id)}
                              disabled={unassignStaffMutation.isPending}
                              data-testid={`button-unassign-staff-${staff.id}`}
                              className="text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Available Staff */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3">Available Staff</h3>
                    {allStaff.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No staff available</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {allStaff.filter(s => !staffAtLocation.find(sa => sa.id === s.id)).map(staff => (
                          <div key={staff.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium">{staff.firstName} {staff.lastName}</p>
                              <p className="text-sm text-muted-foreground">{staff.email}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => assignStaffMutation.mutate(staff.id)}
                              disabled={assignStaffMutation.isPending}
                              data-testid={`button-assign-staff-${staff.id}`}
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
