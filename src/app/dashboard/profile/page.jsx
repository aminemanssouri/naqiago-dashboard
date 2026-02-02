"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardPage } from '@/components/dashboard-page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Mail, Phone, MapPin, Globe, Clock, Camera, Loader2, CheckCircle2, AlertCircle, Upload, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/services/supabaseClient'
import { updateAdminProfile } from '@/services/profiles'

export default function AdminProfilePage() {
  return (
    <ProtectedRoute allowedRoles={['admin']} redirectTo="/login">
      <AdminProfileContent />
    </ProtectedRoute>
  )
}

function AdminProfileContent() {
  const { profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    language_preference: 'en',
    timezone: 'Africa/Casablanca',
    avatar_url: ''
  })

  const [initialData, setInitialData] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Load profile data
  useEffect(() => {
    if (profile) {
      const data = {
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        gender: profile.gender || '',
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
        language_preference: profile.language_preference || 'en',
        timezone: profile.timezone || 'Africa/Casablanca',
        avatar_url: profile.avatar_url || ''
      }
      setFormData(data)
      setInitialData(data)
      setLoading(false)
    }
  }, [profile])

  // Check for changes
  useEffect(() => {
    if (initialData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(initialData)
      setHasChanges(changed)
    }
  }, [formData, initialData])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image')
      return
    }

    try {
      setAvatarLoading(true)
      
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      console.log('📤 Uploading avatar:', fileName)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatar-image')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        throw error
      }

      console.log('✅ Upload successful:', data)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatar-image')
        .getPublicUrl(fileName)

      console.log('🔗 Public URL:', publicUrl)

      // Update form data
      setFormData(prev => ({
        ...prev,
        avatar_url: publicUrl
      }))

      // Save avatar to database immediately
      try {
        console.log('💾 Saving avatar to database...', { profileId: profile.id, publicUrl })
        const updatedProfile = await updateAdminProfile(profile.id, {
          avatar_url: publicUrl
        })
        console.log('📊 Updated profile response:', updatedProfile)

        // Refresh the profile in auth context
        if (refreshProfile) {
          console.log('🔄 Calling refreshProfile...')
          const refreshedProfile = await refreshProfile()
          console.log('📊 Refreshed profile:', refreshedProfile)
        } else {
          console.warn('⚠️ refreshProfile is not available!')
        }

        console.log('✅ Avatar saved to database')
        toast.success('✅ Avatar uploaded and saved successfully!')
      } catch (saveError) {
        console.error('❌ Error saving avatar to database:', saveError)
        toast.error('Avatar uploaded but failed to save to profile')
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast.error(error.message || 'Failed to upload avatar')
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Validate required fields
      if (!formData.full_name || formData.full_name.trim() === '') {
        toast.error('Full name is required')
        return
      }

      // Prepare data for update
      const updateData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone?.trim() || null,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        language_preference: formData.language_preference || 'en',
        timezone: formData.timezone || 'Africa/Casablanca',
        avatar_url: formData.avatar_url || null
      }

      console.log('📝 Updating profile with data:', updateData)

      // Call the dedicated admin profile update service
      const updatedProfile = await updateAdminProfile(profile.id, updateData)

 
      // Refresh the profile in auth context
      if (refreshProfile) {
        await refreshProfile()
      }

      toast.success('Profile updated successfully!')
      setInitialData(formData)
      setHasChanges(false)
    } catch (error) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData(initialData || {})
    setHasChanges(false)
  }

  const handleRemoveAvatar = async () => {
    if (!formData.avatar_url) return

    try {
      // Extract filename from URL if it's from our storage
      if (formData.avatar_url.includes('avatar-image')) {
        const fileName = formData.avatar_url.split('/').pop()
        await supabase.storage.from('avatar-image').remove([fileName])
      }

      setFormData(prev => ({ ...prev, avatar_url: '' }))
      toast.success('Avatar removed successfully!')
    } catch (error) {
      console.error('Error removing avatar:', error)
      toast.error('Failed to remove avatar from storage')
      // Still clear the preview even if delete fails
      setFormData(prev => ({ ...prev, avatar_url: '' }))
    }
  }

  if (!profile) {
    return (
      <DashboardPage
        title="Admin Profile"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Profile' }
        ]}
      >
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-32 w-32 rounded-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage
      title="Admin Profile"
      description="Manage your admin account settings"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Profile' }
      ]}
    >
      <div className="space-y-6 max-w-6xl">
        {/* Top Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Role & Status Info - Spans 2 columns */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Admin Account
              </CardTitle>
              <CardDescription>Full system access and administrative privileges</CardDescription>
            </CardHeader>
          </Card>

          {/* Account Info - Top Right */}
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="text-base">Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Account Type</p>
                  <p className="font-medium capitalize">Administrator</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <p className="font-medium capitalize flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    {profile.status || 'active'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email Address</p>
                  <p className="font-medium flex items-center gap-2 break-all">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    {profile.email}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Member Since</p>
                  <p className="font-medium">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Upload a professional avatar for your admin account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32 rounded-lg">
                  <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                  <AvatarFallback className="rounded-lg text-2xl">
                    {formData.full_name?.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex gap-2">
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={avatarLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={avatarLoading}
                  >
                    {avatarLoading ? (
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
                  {formData.avatar_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={avatarLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Upload a professional image (max 5MB, JPG/PNG/WEBP)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your admin profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-6">
              <TabsList>
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender || 'not-specified'} onValueChange={(value) => handleSelectChange('gender', value === 'not-specified' ? '' : value)}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not-specified">Not specified</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      name="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                  <p className="text-xs text-muted-foreground">Format: +212 123 456 789</p>
                </div>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language_preference" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Language Preference
                    </Label>
                    <Select 
                      value={formData.language_preference} 
                      onValueChange={(value) => handleSelectChange('language_preference', value)}
                    >
                      <SelectTrigger id="language_preference">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Timezone
                    </Label>
                    <Select 
                      value={formData.timezone} 
                      onValueChange={(value) => handleSelectChange('timezone', value)}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Casablanca">Africa/Casablanca (GMT+1)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                        <SelectItem value="Europe/Paris">Europe/Paris (GMT+1)</SelectItem>
                        <SelectItem value="Europe/Madrid">Europe/Madrid (GMT+1)</SelectItem>
                        <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your timezone is used for scheduling and displaying timestamps throughout the platform.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={!hasChanges || saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </DashboardPage>
  )
}
