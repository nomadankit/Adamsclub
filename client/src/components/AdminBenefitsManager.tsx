
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Palette,
  Star,
  Save,
  X,
  Eye
} from "lucide-react"

interface BenefitCard {
  id: string
  title: string
  description: string
  icon: string
  remaining: number | string
  total: number | string
  premium: boolean
  category: string
  color: string
  popular: boolean
}

interface AdminBenefitsManagerProps {
  benefits: BenefitCard[]
  onUpdate: (benefits: BenefitCard[]) => void
}

export function AdminBenefitsManager({ benefits, onUpdate }: AdminBenefitsManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<BenefitCard | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const [formData, setFormData] = useState<Omit<BenefitCard, 'id'>>({
    title: '',
    description: '',
    icon: '🎯',
    remaining: 0,
    total: 0,
    premium: false,
    category: 'gear-rentals',
    color: 'from-green-500 to-emerald-600',
    popular: false
  })

  const categories = [
    { id: 'gear-rentals', name: 'Premium Gear Rentals' },
    { id: 'experiences', name: 'Exclusive Experiences' },
    { id: 'locations', name: 'Premium Locations' },
    { id: 'services', name: 'Member Services' },
    { id: 'rewards', name: 'Loyalty Rewards' },
    { id: 'social', name: 'Community & Events' }
  ]

  const colorOptions = [
    { name: 'Green', value: 'from-green-500 to-emerald-600' },
    { name: 'Blue', value: 'from-blue-500 to-cyan-600' },
    { name: 'Purple', value: 'from-purple-500 to-violet-600' },
    { name: 'Orange', value: 'from-orange-500 to-red-600' },
    { name: 'Yellow', value: 'from-yellow-500 to-amber-600' },
    { name: 'Pink', value: 'from-pink-500 to-rose-600' }
  ]

  const iconOptions = [
    '🚣‍♀️', '⛺', '🚵‍♂️', '🥾', '🗻', '📸', '🧘‍♀️', '🔥',
    '🏖️', '🏔️', '🏞️', '🚗', '🔧', '🚨', '🧭', '📦',
    '⭐', '🎁', '🎂', '🏷️', '🎉', '🤝', '📚', '🌟'
  ]

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      icon: '🎯',
      remaining: 0,
      total: 0,
      premium: false,
      category: 'gear-rentals',
      color: 'from-green-500 to-emerald-600',
      popular: false
    })
    setEditingCard(null)
    setIsCreating(false)
  }

  const handleCreate = () => {
    setIsCreating(true)
    resetForm()
  }

  const handleEdit = (card: BenefitCard) => {
    setEditingCard(card)
    setFormData({
      title: card.title,
      description: card.description,
      icon: card.icon,
      remaining: card.remaining,
      total: card.total,
      premium: card.premium,
      category: card.category,
      color: card.color,
      popular: card.popular
    })
  }

  const handleSave = () => {
    const newCard: BenefitCard = {
      id: editingCard?.id || `card-${Date.now()}`,
      ...formData
    }

    let updatedBenefits
    if (editingCard) {
      updatedBenefits = benefits.map(b => b.id === editingCard.id ? newCard : b)
    } else {
      updatedBenefits = [...benefits, newCard]
    }

    onUpdate(updatedBenefits)
    resetForm()
  }

  const handleDelete = (cardId: string) => {
    const updatedBenefits = benefits.filter(b => b.id !== cardId)
    onUpdate(updatedBenefits)
  }

  const getBadgeColor = (remaining: any, total: any) => {
    if (remaining === 'Unlimited' || remaining === 'Active') return 'bg-green-100 text-green-800'
    if (typeof remaining === 'string') return 'bg-blue-100 text-blue-800'
    const ratio = remaining / total
    if (ratio > 0.5) return 'bg-green-100 text-green-800'
    if (ratio > 0.2) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const PreviewCard = ({ card }: { card: any }) => (
    <Card className={`relative overflow-hidden transition-all duration-200 ${card.premium ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-transparent' : 'border-gray-200'
      }`}>
      {card.premium && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
            <Star className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start space-x-3 mb-3">
          <div className="text-2xl flex-shrink-0">{card.icon}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Badge className={getBadgeColor(card.remaining, card.total)}>
            {typeof card.remaining === 'string'
              ? card.remaining
              : `${card.remaining} of ${card.total} left`
            }
          </Badge>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-24 right-4 z-50 rounded-full w-14 h-14 shadow-lg">
          <Settings className="h-6 w-6" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Manage Benefit Cards</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="ml-auto"
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? 'Edit Mode' : 'Preview Mode'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Card Section */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Benefit Cards</h3>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add New Card
            </Button>
          </div>

          {/* Cards Grid */}
          {!previewMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
              {benefits.map((card) => (
                <Card key={card.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{card.icon}</span>
                        <div>
                          <h4 className="font-medium text-sm">{card.title}</h4>
                          <p className="text-xs text-muted-foreground">{card.description}</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(card)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(card.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="outline">{categories.find(c => c.id === card.category)?.name}</Badge>
                      {card.premium && <Badge className="bg-amber-100 text-amber-800">Premium</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Preview Mode */}
          {previewMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {benefits.map((card) => (
                <PreviewCard key={card.id} card={card} />
              ))}
            </div>
          )}

          {/* Edit/Create Form */}
          {(editingCard || isCreating) && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{editingCard ? 'Edit Card' : 'Create New Card'}</span>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium block mb-1">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-2 border rounded-md text-sm"
                        placeholder="Enter card title"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-1">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full p-2 border rounded-md text-sm h-20 resize-none"
                        placeholder="Enter card description"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Visual Options */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium block mb-1">Icon</label>
                      <div className="grid grid-cols-6 gap-2">
                        {iconOptions.map(icon => (
                          <button
                            key={icon}
                            onClick={() => setFormData(prev => ({ ...prev, icon }))}
                            className={`p-2 border rounded-md text-lg hover:bg-gray-50 ${formData.icon === icon ? 'border-primary bg-primary/10' : ''
                              }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-1">Color Theme</label>
                      <div className="grid grid-cols-2 gap-2">
                        {colorOptions.map(color => (
                          <button
                            key={color.value}
                            onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                            className={`p-2 border rounded-md text-sm hover:bg-gray-50 flex items-center space-x-2 ${formData.color === color.value ? 'border-primary bg-primary/10' : ''
                              }`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${color.value}`} />
                            <span>{color.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Remaining/Total and Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Remaining</label>
                    <input
                      type="text"
                      value={formData.remaining}
                      onChange={(e) => setFormData(prev => ({ ...prev, remaining: e.target.value }))}
                      className="w-full p-2 border rounded-md text-sm"
                      placeholder="e.g., 3 or 'Unlimited'"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1">Total</label>
                    <input
                      type="text"
                      value={formData.total}
                      onChange={(e) => setFormData(prev => ({ ...prev, total: e.target.value }))}
                      className="w-full p-2 border rounded-md text-sm"
                      placeholder="e.g., 5 or 'Unlimited'"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="premium"
                        checked={formData.premium}
                        onChange={(e) => setFormData(prev => ({ ...prev, premium: e.target.checked }))}
                      />
                      <label htmlFor="premium" className="text-sm">Premium Card</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="popular"
                        checked={formData.popular}
                        onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))}
                      />
                      <label htmlFor="popular" className="text-sm">Popular</label>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="text-sm font-medium block mb-2">Preview</label>
                  <div className="max-w-sm">
                    <PreviewCard card={formData} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {editingCard ? 'Update Card' : 'Create Card'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
