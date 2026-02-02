"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
 import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { 
  Package, DollarSign, Clock, Image as ImageIcon, 
  Save, Loader2, AlertCircle, Plus, X, Upload, Trash2
} from 'lucide-react'
import { createService, updateService } from '@/services/services'
import { supabase } from '@/services/supabaseClient'

export function ServiceForm({ service, mode = 'create' }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState(service?.image_url || '')
  
  // Form state - matching the database schema exactly
  const [formData, setFormData] = useState({
    key: service?.key || '',
    title: service?.title || '',
    description: service?.description || '',
    category: service?.category || '',
    cartype: service?.cartype || '',
    base_price: service?.base_price || '',
    duration_minutes: service?.duration_minutes || '',
    icon_name: service?.icon_name || '',
    is_active: service?.is_active !== undefined ? service.is_active : true,
    sedan_multiplier: service?.sedan_multiplier || 1.00,
    suv_multiplier: service?.suv_multiplier || 1.20,
    van_multiplier: service?.van_multiplier || 1.40,
    truck_multiplier: service?.truck_multiplier || 1.60,
    price: service?.price || '',
    image_url: service?.image_url || '',
    notes: service?.notes || '',
    inclusions: service?.inclusions || [],
    exclusions: service?.exclusions || []
  })

  // Form validation errors
  const [errors, setErrors] = useState({})
  
  // New inclusion input
  const [newInclusion, setNewInclusion] = useState('')
  
  // New exclusion input
  const [newExclusion, setNewExclusion] = useState('')

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Auto-generate key from title if creating new service
    if (field === 'title' && mode === 'create') {
      const generatedKey = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '')
      setFormData(prev => ({
        ...prev,
        key: generatedKey
      }))
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }

  // Add inclusion
  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setFormData(prev => ({
        ...prev,
        inclusions: [...prev.inclusions, newInclusion.trim()]
      }))
      setNewInclusion('')
    }
  }

  // Remove inclusion
  const handleRemoveInclusion = (index) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== index)
    }))
  }

  // Add exclusion
  const handleAddExclusion = () => {
    if (newExclusion.trim()) {
      setFormData(prev => ({
        ...prev,
        exclusions: [...prev.exclusions, newExclusion.trim()]
      }))
      setNewExclusion('')
    }
  }

  // Remove exclusion
  const handleRemoveExclusion = (index) => {
    setFormData(prev => ({
      ...prev,
      exclusions: prev.exclusions.filter((_, i) => i !== index)
    }))
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = 'Service title is required'
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required'
    }
    
    if (!formData.base_price || isNaN(formData.base_price) || parseFloat(formData.base_price) <= 0) {
      newErrors.base_price = 'Valid base price is required'
    }
    
    if (!formData.duration_minutes || isNaN(formData.duration_minutes) || parseInt(formData.duration_minutes) <= 0) {
      newErrors.duration_minutes = 'Valid duration is required'
    }

    // Validate multipliers
    const multipliers = ['sedan_multiplier', 'suv_multiplier', 'van_multiplier', 'truck_multiplier']
    multipliers.forEach(mult => {
      if (formData[mult] && (isNaN(formData[mult]) || parseFloat(formData[mult]) < 0)) {
        newErrors[mult] = 'Must be a valid positive number'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setLoading(true)

    try {
      // Prepare data for submission
      const submitData = {
        key: formData.key || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, ''),
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        cartype: formData.cartype || null,
        base_price: parseFloat(formData.base_price),
        duration_minutes: parseInt(formData.duration_minutes),
        icon_name: formData.icon_name || null,
        is_active: formData.is_active,
        sedan_multiplier: parseFloat(formData.sedan_multiplier) || 1.00,
        suv_multiplier: parseFloat(formData.suv_multiplier) || 1.20,
        van_multiplier: parseFloat(formData.van_multiplier) || 1.40,
        truck_multiplier: parseFloat(formData.truck_multiplier) || 1.60,
        price: formData.price ? parseFloat(formData.price) : parseFloat(formData.base_price),
        image_url: formData.image_url || null,
        notes: formData.notes || null,
        inclusions: formData.inclusions || [],
        exclusions: formData.exclusions || []
      }

      console.log('Form data being submitted:', submitData)

      if (mode === 'create') {
        await createService(submitData)
        toast.success('Service created successfully!')
      } else {
        await updateService(service.id, submitData)
        toast.success('Service updated successfully!')
      }

      router.push('/dashboard/services')
      router.refresh()
    } catch (error) {
      console.error('Error saving service:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      
      // Handle specific error types
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        if (error?.details?.includes('Key (key)=')) {
          const keyMatch = error.details.match(/Key \(key\)=\(([^)]+)\)/)
          const duplicateKey = keyMatch ? keyMatch[1] : formData.key
          toast.error(`Service key "${duplicateKey}" already exists. Please use a different key.`, {
            duration: 5000
          })
          setErrors(prev => ({ ...prev, key: 'This key is already in use' }))
        } else {
          toast.error('A service with this key already exists. Please use a different key.')
        }
      } else {
        toast.error(error?.message || 'Failed to save service. Check console for details.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle image upload to Supabase Storage
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image')
      return
    }

    try {
      setUploadingImage(true)
      
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
 
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('icon-image')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

 
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('icon-image')
        .getPublicUrl(fileName)

 
      // Update form data
      setFormData(prev => ({ ...prev, image_url: publicUrl }))
      setImagePreview(publicUrl)
      
      toast.success('Image uploaded successfully!')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  // Remove uploaded image
  const handleRemoveImage = async () => {
    if (!formData.image_url) return

    try {
      // Extract filename from URL if it's from our storage
      if (formData.image_url.includes('icon-image')) {
        const fileName = formData.image_url.split('/').pop()
        await supabase.storage.from('icon-image').remove([fileName])
      }

      setFormData(prev => ({ ...prev, image_url: '' }))
      setImagePreview('')
      toast.success('Image removed')
    } catch (error) {
      console.error('Error removing image:', error)
      // Still clear the preview even if delete fails
      setFormData(prev => ({ ...prev, image_url: '' }))
      setImagePreview('')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {mode === 'create' ? 'Create New Service' : 'Edit Service'}
            </CardTitle>
            <CardDescription>
              {mode === 'create' 
                ? 'Add a new service to your platform' 
                : 'Update service information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Service Image Upload */}
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-32 w-32 rounded-lg">
                      <AvatarImage src={imagePreview} alt={formData.title} />
                      <AvatarFallback className="rounded-lg">
                        <ImageIcon className="h-12 w-12" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex gap-2">
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage || loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('image-upload')?.click()}
                        disabled={uploadingImage || loading}
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Image
                          </>
                        )}
                      </Button>
                      {imagePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveImage}
                          disabled={uploadingImage || loading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Upload a service image (max 5MB, JPG/PNG/WEBP)
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        Service Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="e.g., Premium Car Wash"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className={errors.title ? 'border-red-500' : ''}
                      />
                      {errors.title && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.title}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="key">Service Key</Label>
                      <Input
                        id="key"
                        placeholder="auto-generated-key"
                        value={formData.key}
                        onChange={(e) => handleChange('key', e.target.value)}
                        disabled={mode === 'edit'}
                        className={errors.key ? 'border-red-500' : ''}
                      />
                      {errors.key ? (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.key}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Auto-generated from title or enter a unique key
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="category"
                      placeholder="e.g., car-wash, cleaning, detailing"
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className={errors.category ? 'border-red-500' : ''}
                    />
                    {errors.category && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.category}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter the service category (free text)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cartype">
                      Car Type
                    </Label>
                    <Select
                      value={formData.cartype}
                      onValueChange={(value) => handleChange('cartype', value)}
                    >
                      <SelectTrigger id="cartype" className={errors.cartype ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select car type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="hatchback">Hatchback</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="motor plus 49 CC">Motor Plus 49 CC</SelectItem>
                        <SelectItem value="motor 49 CC">Motor 49 CC</SelectItem>
                        <SelectItem value="Moyen SUV">Moyen SUV</SelectItem>
                        <SelectItem value="Grand SUV">Grand SUV</SelectItem>
                        <SelectItem value="Berline">Berline</SelectItem>
                        <SelectItem value="Motorcycles">Motorcycles</SelectItem>
                        <SelectItem value="Citadine">Citadine</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.cartype && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.cartype}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Specify the vehicle type this service is designed for
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the service..."
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration_minutes">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Duration (minutes) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="duration_minutes"
                        type="number"
                        placeholder="60"
                        value={formData.duration_minutes}
                        onChange={(e) => handleChange('duration_minutes', e.target.value)}
                        className={errors.duration_minutes ? 'border-red-500' : ''}
                      />
                      {errors.duration_minutes && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.duration_minutes}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="icon_name">Icon Name</Label>
                      <Input
                        id="icon_name"
                        placeholder="e.g., car-wash"
                        value={formData.icon_name}
                        onChange={(e) => handleChange('icon_name', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_active">Active Status</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable or disable this service
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleChange('is_active', checked)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base_price">
                        <DollarSign className="h-4 w-4 inline mr-1" />
                        Base Price (MAD) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="base_price"
                        type="number"
                        step="0.01"
                        placeholder="100.00"
                        value={formData.base_price}
                        onChange={(e) => handleChange('base_price', e.target.value)}
                        className={errors.base_price ? 'border-red-500' : ''}
                      />
                      {errors.base_price && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.base_price}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price">Display Price (MAD)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="Same as base price"
                        value={formData.price}
                        onChange={(e) => handleChange('price', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use base price
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-3">Vehicle Type Multipliers</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Adjust pricing based on vehicle type
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sedan_multiplier">Sedan Multiplier</Label>
                        <Input
                          id="sedan_multiplier"
                          type="number"
                          step="0.01"
                          placeholder="1.00"
                          value={formData.sedan_multiplier}
                          onChange={(e) => handleChange('sedan_multiplier', e.target.value)}
                          className={errors.sedan_multiplier ? 'border-red-500' : ''}
                        />
                        {errors.sedan_multiplier && (
                          <p className="text-sm text-red-500">{errors.sedan_multiplier}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="suv_multiplier">SUV Multiplier</Label>
                        <Input
                          id="suv_multiplier"
                          type="number"
                          step="0.01"
                          placeholder="1.20"
                          value={formData.suv_multiplier}
                          onChange={(e) => handleChange('suv_multiplier', e.target.value)}
                          className={errors.suv_multiplier ? 'border-red-500' : ''}
                        />
                        {errors.suv_multiplier && (
                          <p className="text-sm text-red-500">{errors.suv_multiplier}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="van_multiplier">Van Multiplier</Label>
                        <Input
                          id="van_multiplier"
                          type="number"
                          step="0.01"
                          placeholder="1.40"
                          value={formData.van_multiplier}
                          onChange={(e) => handleChange('van_multiplier', e.target.value)}
                          className={errors.van_multiplier ? 'border-red-500' : ''}
                        />
                        {errors.van_multiplier && (
                          <p className="text-sm text-red-500">{errors.van_multiplier}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="truck_multiplier">Truck Multiplier</Label>
                        <Input
                          id="truck_multiplier"
                          type="number"
                          step="0.01"
                          placeholder="1.60"
                          value={formData.truck_multiplier}
                          onChange={(e) => handleChange('truck_multiplier', e.target.value)}
                          className={errors.truck_multiplier ? 'border-red-500' : ''}
                        />
                        {errors.truck_multiplier && (
                          <p className="text-sm text-red-500">{errors.truck_multiplier}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Price Preview</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Sedan: <span className="font-medium">{(parseFloat(formData.base_price || 0) * parseFloat(formData.sedan_multiplier || 1)).toFixed(2)} MAD</span></div>
                        <div>SUV: <span className="font-medium">{(parseFloat(formData.base_price || 0) * parseFloat(formData.suv_multiplier || 1)).toFixed(2)} MAD</span></div>
                        <div>Van: <span className="font-medium">{(parseFloat(formData.base_price || 0) * parseFloat(formData.van_multiplier || 1)).toFixed(2)} MAD</span></div>
                        <div>Truck: <span className="font-medium">{(parseFloat(formData.base_price || 0) * parseFloat(formData.truck_multiplier || 1)).toFixed(2)} MAD</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about the service..."
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Service Inclusions</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      What's included in this service
                    </p>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., Interior vacuum"
                        value={newInclusion}
                        onChange={(e) => setNewInclusion(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddInclusion()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleAddInclusion}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {formData.inclusions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {formData.inclusions.map((inclusion, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded-lg"
                          >
                            <span className="text-sm">{inclusion}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveInclusion(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Service Exclusions</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      What's not included in this service
                    </p>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., Engine cleaning"
                        value={newExclusion}
                        onChange={(e) => setNewExclusion(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddExclusion()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleAddExclusion}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {formData.exclusions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {formData.exclusions.map((exclusion, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded-lg"
                          >
                            <span className="text-sm">{exclusion}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveExclusion(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {mode === 'create' ? 'Create Service' : 'Update Service'}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  )
}
