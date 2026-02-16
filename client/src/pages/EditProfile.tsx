
import { useState, useRef, useEffect } from "react"
import { BottomNavigation } from "@/components/BottomNavigation"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft, 
  Camera, 
  Save,
  User,
  Trash2,
  Upload,
  Crop
} from "lucide-react"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"

export default function EditProfile() {
  const [, setLocation] = useLocation()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [profileImage, setProfileImage] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [croppedImage, setCroppedImage] = useState<string>("")
  const [showCropInterface, setShowCropInterface] = useState(false)
  const [cropSettings, setCropSettings] = useState({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    scale: 1
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "")
      setLastName(user.lastName || "")
      setEmail(user.email || "")
      setPhone(user.phone || "")
      setBio(user.bio || "")
      setProfileImage(user.profileImageUrl || "")
    }
  }, [user])

  const handleBack = () => {
    setLocation('/home')
  }

  const handleSave = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          bio,
          profileImageUrl: croppedImage || profileImage
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      // Invalidate auth query to refresh user data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] })

      // Show success toast
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
        duration: 3000,
      })

      // Navigate after showing toast
      setTimeout(() => setLocation('/home'), 500)
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhotoUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setProfileImage(imageUrl)
        setShowCropInterface(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCropImage = () => {
    if (!imageRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imageRef.current

    if (!ctx) return

    // Set canvas size to crop dimensions
    canvas.width = cropSettings.width
    canvas.height = cropSettings.height

    // Draw the cropped portion
    ctx.drawImage(
      img,
      cropSettings.x,
      cropSettings.y,
      cropSettings.width,
      cropSettings.height,
      0,
      0,
      cropSettings.width,
      cropSettings.height
    )

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedUrl = URL.createObjectURL(blob)
        setCroppedImage(croppedUrl)
        setShowCropInterface(false)
      }
    }, 'image/jpeg', 0.9)
  }

  const handleCropCancel = () => {
    setShowCropInterface(false)
    setSelectedFile(null)
    setProfileImage("")
  }

  const handleDeletePhoto = () => {
    setProfileImage("")
    setCroppedImage("")
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleCropSettingsChange = (setting: string, value: number) => {
    setCropSettings(prev => ({
      ...prev,
      [setting]: value
    }))
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      
      <main className="pb-24 px-3">
        {/* Page Header */}
        <section className="py-4">
          <div className="max-w-md mx-auto">
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="hover:bg-background/80"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold font-['Poppins']">Edit Profile</h1>
                <p className="text-muted-foreground">Update your information</p>
              </div>
            </div>
          </div>
        </section>

        {/* Crop Interface */}
        {showCropInterface && (
          <section className="py-4">
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Crop className="h-5 w-5" />
                    <span>Crop Photo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative w-full h-64 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                    {profileImage && (
                      <img
                        ref={imageRef}
                        src={profileImage}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onLoad={() => {
                          if (imageRef.current) {
                            const img = imageRef.current
                            const aspectRatio = img.naturalWidth / img.naturalHeight
                            const containerWidth = 300
                            const containerHeight = 300
                            
                            let newWidth, newHeight
                            if (aspectRatio > 1) {
                              newWidth = containerWidth
                              newHeight = containerWidth / aspectRatio
                            } else {
                              newHeight = containerHeight
                              newWidth = containerHeight * aspectRatio
                            }
                            
                            setCropSettings(prev => ({
                              ...prev,
                              width: Math.min(200, newWidth),
                              height: Math.min(200, newHeight)
                            }))
                          }
                        }}
                      />
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="cropX">X Position</Label>
                        <Input
                          id="cropX"
                          type="number"
                          value={cropSettings.x}
                          onChange={(e) => handleCropSettingsChange('x', parseInt(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cropY">Y Position</Label>
                        <Input
                          id="cropY"
                          type="number"
                          value={cropSettings.y}
                          onChange={(e) => handleCropSettingsChange('y', parseInt(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="cropWidth">Width</Label>
                        <Input
                          id="cropWidth"
                          type="number"
                          value={cropSettings.width}
                          onChange={(e) => handleCropSettingsChange('width', parseInt(e.target.value) || 200)}
                          min="50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cropHeight">Height</Label>
                        <Input
                          id="cropHeight"
                          type="number"
                          value={cropSettings.height}
                          onChange={(e) => handleCropSettingsChange('height', parseInt(e.target.value) || 200)}
                          min="50"
                        />
                      </div>
                    </div>
                  </div>

                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  <div className="flex space-x-2">
                    <Button
                      onClick={handleCropImage}
                      className="flex-1"
                    >
                      DONE
                    </Button>
                    <Button
                      onClick={handleCropCancel}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Profile Form */}
        {!showCropInterface && (
          <section className="py-4">
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Profile Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Photo */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={croppedImage || profileImage} alt="Profile" />
                        <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                          {firstName.charAt(0)}{lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {(croppedImage || profileImage) && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={handleDeletePhoto}
                          className="absolute -top-1 -right-1 w-6 h-6 rounded-full"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePhotoUpload}
                        className="flex items-center space-x-2"
                      >
                        <Camera className="h-4 w-4" />
                        <span>Change Photo</span>
                      </Button>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </main>
      
      <BottomNavigation />
    </div>
  )
}
