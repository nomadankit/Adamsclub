import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Users, Plus, Trash2, Edit2, Search } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface Staff { id: string; email?: string; firstName?: string; lastName?: string; role?: string }

export default function AdminStaff() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ email: "", firstName: "", lastName: "", password: "" })

  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/admin/staff"],
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return apiRequest("PATCH", `/api/admin/staff/${editingId}`, {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
        })
      } else {
        return apiRequest("POST", "/api/admin/staff", formData)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] })
      queryClient.invalidateQueries({ queryKey: ["/api/admin/locations"] })
      setFormData({ email: "", firstName: "", lastName: "", password: "" })
      setEditingId(null)
      setShowForm(false)
      toast({ title: editingId ? "Staff updated" : "Staff created", description: editingId ? "Staff has been updated successfully" : "Staff has been created successfully" })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save staff", variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/staff/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] })
      toast({ title: "Staff deleted", description: "Staff has been deleted successfully" })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete staff", variant: "destructive" })
    },
  })

  const handleNew = () => {
    setEditingId(null)
    setFormData({ email: "", firstName: "", lastName: "", password: "" })
    setShowForm(true)
  }

  const handleEdit = (member: Staff) => {
    setEditingId(member.id)
    setFormData({
      email: member.email || "",
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      password: "",
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({ email: "", firstName: "", lastName: "", password: "" })
    setShowForm(false)
  }

  const handleSubmit = () => {
    if (!formData.email.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" })
      return
    }
    if (!editingId && !formData.password.trim()) {
      toast({ title: "Error", description: "Password is required for new staff", variant: "destructive" })
      return
    }
    mutation.mutate()
  }

  const filteredStaff = staff.filter((member) => {
    const matchesSearch = (member.firstName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (member.lastName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (member.email?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading staff...</p>
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
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-5xl font-bold font-['Poppins']" data-testid="text-staff-title">
                  Staff Management
                </h1>
              </div>
              <p className="text-lg text-muted-foreground">
                Create, manage, and assign staff members to locations
              </p>
            </div>
            {!showForm && (
              <Button
                onClick={handleNew}
                size="lg"
                className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
                data-testid="button-create-new-staff"
              >
                <Plus className="h-5 w-5" />
                Add Staff
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Staff</p>
                    <p className="text-3xl font-bold mt-2">{staff.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-card/50 to-card">
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Active Staff</p>
                    <p className="text-3xl font-bold mt-2">{staff.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {showForm ? (
            <Card className="lg:col-span-1 border-2 border-blue-500/20">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
                <CardTitle className="flex items-center gap-2">
                  <Edit2 className="h-5 w-5" />
                  {editingId ? "Edit Staff" : "New Staff"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Email *</label>
                  <Input
                    type="email"
                    placeholder="staff@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-staff-email"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">First Name *</label>
                  <Input
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    data-testid="input-staff-first-name"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Last Name *</label>
                  <Input
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    data-testid="input-staff-last-name"
                  />
                </div>

                {!editingId && (
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Password *</label>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      data-testid="input-staff-password"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmit} disabled={mutation.isPending} className="flex-1" data-testid="button-save-staff">
                    {mutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="flex-1" data-testid="button-cancel-staff">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className={showForm ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="mb-4 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search staff by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-staff"
                />
              </div>
            </div>

            {filteredStaff.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="pt-12 pb-12 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-lg font-medium mb-1">No staff found</p>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery ? "Try adjusting your search" : "Get started by creating your first staff member"}
                  </p>
                  {!showForm && (
                    <Button onClick={handleNew} data-testid="button-create-first-staff">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Staff
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredStaff.map((member) => (
                  <Card key={member.id} data-testid={`card-staff-${member.id}`} className="hover-elevate transition-all border-0">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg" data-testid={`text-staff-name-${member.id}`}>
                              {member.firstName} {member.lastName}
                            </h3>
                            <Badge variant="default" data-testid={`badge-role-${member.id}`}>
                              Staff
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`text-staff-email-${member.id}`}>
                            {member.email}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEdit(member)}
                            data-testid={`button-edit-staff-${member.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(member.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-staff-${member.id}`}
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
      </div>
    </div>
  )
}
