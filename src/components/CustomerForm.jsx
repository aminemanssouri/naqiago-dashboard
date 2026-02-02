"use client"

import { useState, useEffect } from 'react'
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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { 
  User, Mail, Phone, MapPin, Calendar, Shield, 
  Languages, Award, Save, Loader2, Camera,
  AlertCircle, CheckCircle
} from 'lucide-react'
import { createCustomer, updateCustomer } from '@/services/customers'

export function CustomerForm({ customer, mode = 'create' }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(customer?.avatar_url || '')
  
  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    full_name: customer?.full_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    avatar_url: customer?.avatar_url || '',
    
    // Address
    address: customer?.address || '',
    city: customer?.city || '',
    country: customer?.country || 'Morocco',
    
    // Settings
    status: customer?.status || 'active',
    language_preference: customer?.language_preference || 'en',
    notification_preferences: customer?.notification_preferences || {
      email: true,
      sms: false,
      push: true
    },
    
    // Verification & Security
    is_verified: customer?.is_verified || false,
    phone_verified: customer?.phone_verified || false,
    
    // Loyalty
    loyalty_points: customer?.loyalty_points || 0,
    
    // Password (only for new customers)
    password: '',
    confirmPassword: ''
  })

  // Form validation errors
  const [errors, setErrors] = useState({})

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }

  // Handle notification preferences
  const handleNotificationChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [type]: value
      }
    }))
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    // Required fields
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid phone format'
    }

    // Password validation for new customers
    if (mode === 'create') {
      if (!formData.password) {
        newErrors.password = 'Password is required for new customers'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

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
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        avatar_url: formData.avatar_url,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        status: formData.status,
        language_preference: formData.language_preference,
        notification_preferences: formData.notification_preferences,
        is_verified: formData.is_verified,
        phone_verified: formData.phone_verified,
        loyalty_points: parseInt(formData.loyalty_points) || 0
      }

      if (mode === 'create') {
        // Add password for new customer
        submitData.password = formData.password
        await createCustomer(submitData)
        toast.success('Customer created successfully!')
      } else {
        await updateCustomer(customer.id, submitData)
        toast.success('Customer updated successfully!')
      }

      router.push('/dashboard/customers')
      router.refresh()
    } catch (error) {
      console.error('Error saving customer:', error)
      toast.error(error.message || 'Failed to save customer')
    } finally {
      setLoading(false)
    }
  }

  // Handle avatar upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
        // In production, you'd upload to storage and get URL
        handleChange('avatar_url', reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="contact">Contact & Address</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="security">Security & Loyalty</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Customer's personal information and avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback>
                    {formData.full_name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Profile Picture</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('avatar').click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                    {avatarPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAvatarPreview('')
                          handleChange('avatar_url', '')
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="John Doe"
                    className={`pl-10 ${errors.full_name ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.full_name && (
                  <p className="text-sm text-red-500">{errors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="john@example.com"
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    disabled={mode === 'edit'}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
                {mode === 'edit' && (
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed after account creation
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+212 600 000 000"
                    className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Password (only for create mode) */}
              {mode === 'create' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="••••••••"
                      className={errors.password ? 'border-red-500' : ''}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-500">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      placeholder="••••••••"
                      className={errors.confirmPassword ? 'border-red-500' : ''}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact & Address Tab */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact & Address</CardTitle>
              <CardDescription>
                Customer's address and location details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="123 Main Street, Apartment 4B"
                    className="pl-10 min-h-[80px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Casablanca"
                  />
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => handleChange('country', value)}
                  >
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morocco">Morocco</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Spain">Spain</SelectItem>
                      <SelectItem value="USA">United States</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Language, status, and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Account Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                          Active
                        </div>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-gray-500 rounded-full mr-2" />
                          Inactive
                        </div>
                      </SelectItem>
                      <SelectItem value="suspended">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                          Suspended
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label htmlFor="language">
                    <Languages className="inline h-4 w-4 mr-1" />
                    Language Preference
                  </Label>
                  <Select
                    value={formData.language_preference}
                    onValueChange={(value) => handleChange('language_preference', value)}
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Notification Preferences */}
              <div className="space-y-4">
                <Label>Notification Preferences</Label>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notif" className="text-base">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive booking updates via email
                      </p>
                    </div>
                    <Switch
                      id="email-notif"
                      checked={formData.notification_preferences.email}
                      onCheckedChange={(value) => handleNotificationChange('email', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-notif" className="text-base">
                        SMS Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get text messages for important updates
                      </p>
                    </div>
                    <Switch
                      id="sms-notif"
                      checked={formData.notification_preferences.sms}
                      onCheckedChange={(value) => handleNotificationChange('sms', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notif" className="text-base">
                        Push Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        In-app notifications for real-time updates
                      </p>
                    </div>
                    <Switch
                      id="push-notif"
                      checked={formData.notification_preferences.push}
                      onCheckedChange={(value) => handleNotificationChange('push', value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security & Loyalty Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security & Verification</CardTitle>
              <CardDescription>
                Account verification and security status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* Email Verification */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Verification
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Customer's email verification status
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.is_verified}
                      onCheckedChange={(value) => handleChange('is_verified', value)}
                    />
                    {formData.is_verified ? (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Phone Verification */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Phone Verification
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Phone number verification status
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.phone_verified}
                      onCheckedChange={(value) => handleChange('phone_verified', value)}
                    />
                    {formData.phone_verified ? (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Loyalty Points */}
              <div className="space-y-4">
                <Label className="text-base flex items-center">
                  <Award className="h-4 w-4 mr-2" />
                  Loyalty Program
                </Label>
                
                <div className="space-y-2">
                  <Label htmlFor="loyalty_points">Loyalty Points</Label>
                  <Input
                    id="loyalty_points"
                    type="number"
                    min="0"
                    value={formData.loyalty_points}
                    onChange={(e) => handleChange('loyalty_points', e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-sm text-muted-foreground">
                    Points earned from completed bookings and referrals
                  </p>
                </div>

                {mode === 'edit' && customer && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">Account Information</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Member Since:</span>
                        <p className="font-medium">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Updated:</span>
                        <p className="font-medium">
                          {new Date(customer.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Bookings:</span>
                        <p className="font-medium">{customer.total_bookings || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Spent:</span>
                        <p className="font-medium">
                          {customer.total_spent ? `${customer.total_spent} MAD` : '0 MAD'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <Card>
        <CardFooter className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <div className="flex space-x-2">
            {mode === 'edit' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                disabled={loading}
              >
                View Profile
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Create Customer' : 'Save Changes'}
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}