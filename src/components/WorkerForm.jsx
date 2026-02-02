"use client"

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Building, Clock, DollarSign, MapPin, Star, Calendar } from 'lucide-react'
import { toast } from 'sonner'
const WORKER_STATUSES = [
  { value: 'available', label: 'Available', color: 'bg-green-500' },
  { value: 'busy', label: 'Busy', color: 'bg-yellow-500' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-500' }
]

const SPECIALTIES_OPTIONS = [
  'Interior Cleaning',
  'Exterior Washing',
  'Engine Cleaning',
  'Detailing',
  'Wax & Polish',
  'Tire Care',
  'Upholstery Cleaning',
  'Paint Correction'
]

export default function WorkerForm({
  worker = null, // For edit mode
  availableUsers = [], // Users without worker profiles (for existing-user mode)
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEditMode = false,
  mode = 'existing-user' // 'new-user' or 'existing-user'
}) {
  // Form refs for validation
  const businessNameRef = useRef()
  const hourlyRateRef = useRef()
  const serviceRadiusRef = useRef()
  const experienceYearsRef = useRef()
  const commissionRateRef = useRef()
  const startTimeRef = useRef()
  const endTimeRef = useRef()

  // Form state
  const [formData, setFormData] = useState({
    // Fields for new-user mode
    full_name: worker?.user?.full_name || '',
    email: worker?.user?.email || '',
    phone: worker?.user?.phone || '',
    password: '', // Password field for new users
    
    // Fields for existing-user mode
    user_id: worker?.user_id || '',
    
    // Worker profile fields (common to both modes)
    business_name: worker?.business_name || '',
    bio: worker?.bio || '',
    experience_years: worker?.experience_years || '',
    specialties: worker?.specialties || [],
    service_radius_km: worker?.service_radius_km || 10,
    status: worker?.status || 'available',
    hourly_rate: worker?.hourly_rate || '',
    commission_rate: worker?.commission_rate || 15.00,
    works_weekends: worker?.works_weekends !== undefined ? worker.works_weekends : true,
    start_time: worker?.start_time || '08:00',
    end_time: worker?.end_time || '18:00'
  })

  const [errors, setErrors] = useState({})
  const [selectedSpecialties, setSelectedSpecialties] = useState(worker?.specialties || [])

  // Handle form field changes
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

  // Handle specialty toggle
  const toggleSpecialty = (specialty) => {
    const updated = selectedSpecialties.includes(specialty)
      ? selectedSpecialties.filter(s => s !== specialty)
      : [...selectedSpecialties, specialty]
    
    setSelectedSpecialties(updated)
    handleChange('specialties', updated)
  }

  // Validation function
  const validateForm = () => {
    const newErrors = {}

    // Validate based on mode
    if (mode === 'new-user') {
      // For new user creation, validate email, full_name, etc.
      if (!formData.full_name?.trim()) {
        newErrors.full_name = 'Full name is required'
      }
      
      if (!formData.email?.trim()) {
        newErrors.email = 'Email is required'
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid'
      }
      
      if (!formData.password?.trim()) {
        newErrors.password = 'Password is required'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      }
    } else if (mode === 'existing-user' && !isEditMode) {
      // For existing user, validate user selection
      if (!formData.user_id) {
        newErrors.user_id = 'Please select a user'
      }
    }

    // Common validations
    if (!formData.business_name?.trim()) {
      newErrors.business_name = 'Business name is required'
      businessNameRef.current?.focus()
    }

    if (!formData.status) {
      newErrors.status = 'Status is required'
    }

    // Numeric validations
    if (formData.hourly_rate && (isNaN(formData.hourly_rate) || parseFloat(formData.hourly_rate) < 0)) {
      newErrors.hourly_rate = 'Hourly rate must be a positive number'
      hourlyRateRef.current?.focus()
    }

    if (formData.service_radius_km && (isNaN(formData.service_radius_km) || parseInt(formData.service_radius_km) < 1)) {
      newErrors.service_radius_km = 'Service radius must be at least 1 km'
      serviceRadiusRef.current?.focus()
    }

    if (formData.experience_years && (isNaN(formData.experience_years) || parseInt(formData.experience_years) < 0)) {
      newErrors.experience_years = 'Experience years must be a positive number'
      experienceYearsRef.current?.focus()
    }

    if (formData.commission_rate && (isNaN(formData.commission_rate) || parseFloat(formData.commission_rate) < 0 || parseFloat(formData.commission_rate) > 100)) {
      newErrors.commission_rate = 'Commission rate must be between 0 and 100'
      commissionRateRef.current?.focus()
    }

    // Time validation
    if (formData.start_time >= formData.end_time) {
      newErrors.start_time = 'Start time must be before end time'
      startTimeRef.current?.focus()
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          {isEditMode ? 'Edit Worker Profile' : 'Create Worker Profile'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New User Fields (for new-user mode) */}
          {mode === 'new-user' && !isEditMode && (
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <User className="h-5 w-5" />
                User Account Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="e.g., John Doe"
                  />
                  {errors.full_name && (
                    <p className="text-sm text-red-500">{errors.full_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g., john@example.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="e.g., +212 600 000 000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Enter password (min. 6 characters)"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  💡 The worker will be able to log in with this email and password immediately.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* User Selection (only for existing-user mode) */}
          {mode === 'existing-user' && !isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="user_id">
                Select User <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.user_id}
                onValueChange={(value) => handleChange('user_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user to create worker profile" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{user.full_name}</span>
                        <span className="text-sm text-muted-foreground">({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.user_id && (
                <p className="text-sm text-red-500">{errors.user_id}</p>
              )}
            </div>
          )}

          {/* Current User Info (for edit mode) */}
          {isEditMode && worker?.user && (
            <Alert>
              <User className="h-4 w-4" />
              <AlertDescription>
                Editing profile for: <strong>{worker.user.full_name}</strong> ({worker.user.email})
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">
                Business Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="business_name"
                ref={businessNameRef}
                value={formData.business_name}
                onChange={(e) => handleChange('business_name', e.target.value)}
                placeholder="e.g., John's Auto Detailing"
              />
              {errors.business_name && (
                <p className="text-sm text-red-500">{errors.business_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {WORKER_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status.color}`} />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-500">{errors.status}</p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Brief description of services and experience..."
              rows={3}
            />
          </div>

          {/* Experience and Rates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experience_years">Experience (Years)</Label>
              <Input
                id="experience_years"
                ref={experienceYearsRef}
                type="number"
                min="0"
                value={formData.experience_years}
                onChange={(e) => handleChange('experience_years', e.target.value)}
                placeholder="0"
              />
              {errors.experience_years && (
                <p className="text-sm text-red-500">{errors.experience_years}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">
                <DollarSign className="inline h-4 w-4" />
                Hourly Rate (MAD)
              </Label>
              <Input
                id="hourly_rate"
                ref={hourlyRateRef}
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => handleChange('hourly_rate', e.target.value)}
                placeholder="150.00"
              />
              {errors.hourly_rate && (
                <p className="text-sm text-red-500">{errors.hourly_rate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commission_rate">Commission Rate (%)</Label>
              <Input
                id="commission_rate"
                ref={commissionRateRef}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.commission_rate}
                onChange={(e) => handleChange('commission_rate', e.target.value)}
                placeholder="15.00"
              />
              {errors.commission_rate && (
                <p className="text-sm text-red-500">{errors.commission_rate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_radius_km">
                <MapPin className="inline h-4 w-4" />
                Service Radius (km)
              </Label>
              <Input
                id="service_radius_km"
                ref={serviceRadiusRef}
                type="number"
                min="1"
                value={formData.service_radius_km}
                onChange={(e) => handleChange('service_radius_km', e.target.value)}
                placeholder="10"
              />
              {errors.service_radius_km && (
                <p className="text-sm text-red-500">{errors.service_radius_km}</p>
              )}
            </div>
          </div>

          {/* Working Hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Working Hours</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="works_weekends"
                  checked={formData.works_weekends}
                  onCheckedChange={(checked) => handleChange('works_weekends', checked)}
                />
                <Label htmlFor="works_weekends">Works Weekends</Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">
                  <Clock className="inline h-4 w-4" />
                  Start Time
                </Label>
                <Input
                  id="start_time"
                  ref={startTimeRef}
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                />
                {errors.start_time && (
                  <p className="text-sm text-red-500">{errors.start_time}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">
                  <Clock className="inline h-4 w-4" />
                  End Time
                </Label>
                <Input
                  id="end_time"
                  ref={endTimeRef}
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              <Star className="inline h-4 w-4" />
              Specialties
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {SPECIALTIES_OPTIONS.map((specialty) => (
                <div
                  key={specialty}
                  className={`p-2 border rounded cursor-pointer transition-colors ${
                    selectedSpecialties.includes(specialty)
                      ? 'bg-primary/10 dark:bg-primary/20 border-primary dark:border-primary'
                      : 'bg-muted hover:bg-muted/80 border-border'
                  }`}
                  onClick={() => toggleSpecialty(specialty)}
                >
                  <span className="text-sm">{specialty}</span>
                </div>
              ))}
            </div>
            {selectedSpecialties.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedSpecialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary">
                    {specialty}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Worker' : 'Create Worker')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}