"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  User, Mail, Phone, MapPin, Calendar, Clock, Shield,
  Car, DollarSign, Save, Loader2, AlertCircle, CheckCircle,
  Package, Wrench, CreditCard, FileText, X, Plus,
  CalendarIcon,
  UserIcon,
  CheckCircle2,
  ClockIcon,
  MapPinIcon,
  CreditCardIcon,
  CarIcon
} from 'lucide-react'
import { createBooking, updateBooking } from '@/services/bookings'
import { getCustomers } from '@/services/customers'
import { getWorkers } from '@/services/workers'
import { getServices } from '@/services/services'
import { format } from 'date-fns'
import { getCarBrands, getCarModels, getCarBrandLogoUrl, getCarModelImageUrl } from '@/services/vehicles'
import { useAuth } from '@/contexts/AuthContext'

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedan', multiplier: 1.0 },
  { value: 'suv', label: 'SUV', multiplier: 1.2 },
  { value: 'van', label: 'Van', multiplier: 1.4 },
  { value: 'truck', label: 'Truck', multiplier: 1.6 }
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', description: 'Pay with cash on service completion' },
  { value: 'card', label: 'Credit/Debit Card', description: 'Pay with credit or debit card' },
  { value: 'mobile_money', label: 'Mobile Money', description: 'Pay using mobile money service' },
  { value: 'bank_transfer', label: 'Bank Transfer', description: 'Direct bank transfer' },
  { value: 'wallet', label: 'Digital Wallet', description: 'Pay with digital wallet' }
]

const BOOKING_STATUS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-orange-100 text-orange-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
]

const PAYMENT_STATUS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800', icon: '✅' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800', icon: '❌' },
  { value: 'refunded', label: 'Refunded', color: 'bg-gray-100 text-gray-800', icon: '🔄' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '🚫' }
]

export function BookingForm({
  booking = null,
  onSubmit,
  onCancel,
  customers = [],
  workers = [],
  services = [],
  addresses = [],
  isLoading = false,
  mode = 'create' // 'create' or 'edit'
}) {
  const { profile, isAdmin, isWorker } = useAuth()

  // Form state - Ensure all fields have default values
  const [formData, setFormData] = useState({
    // Basic booking info
    booking_number: '',
    customer_id: '',
    worker_id: '',
    service_id: '',
    status: 'pending',

    // Schedule - ACTUAL database fields
    scheduled_date: '',
    scheduled_time: '',
    estimated_duration: 60,

    // Address - ACTUAL database fields
    service_address_id: '',
    service_location: null, // USER-DEFINED type (point/geometry)
    service_address_text: '',

    // Vehicle info - ACTUAL database fields
    vehicle_type: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',

    // Pricing - ACTUAL database fields
    base_price: 0,
    additional_charges: 0,
    discount_amount: 0,

    // Notes - ACTUAL database fields
    special_instructions: '',
    customer_notes: '',
    worker_notes: '',

    // Booking control - ACTUAL database fields
    can_cancel: true,
    can_reschedule: true,
    can_rate: false,

    // Payment information (for creating payment record, NOT saved to bookings table)
    payment_method: 'cash',
    payment_status: 'pending',
    platform_fee_percentage: 15,
    platform_fee: 0,
    worker_earnings: 0
  })

  // Validation refs
  const validationRefs = useRef({
    customer_id: null,
    worker_id: null,
    service_id: null,
    scheduled_date: null,
    scheduled_time: null,
    service_address_text: null,
    vehicle_type: null,
    base_price: null
  })

  // Validation errors
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [calculatedPrice, setCalculatedPrice] = useState(0)

  // Car brands and models state
  const [carBrands, setCarBrands] = useState([])
  const [carModels, setCarModels] = useState([])
  const [selectedBrandId, setSelectedBrandId] = useState(null)
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [brandsError, setBrandsError] = useState(null)
  const [modelsError, setModelsError] = useState(null)

  // Add state to track which fields have been touched/interacted with
  const [touchedFields, setTouchedFields] = useState({})

  // Initialize form data when booking prop changes
  useEffect(() => {
    if (booking && mode === 'edit') {
      setFormData({
        booking_number: booking.booking_number || '',
        customer_id: booking.customer_id || '',
        worker_id: booking.worker_id || '',
        service_id: booking.service_id || '',
        status: booking.status || 'pending',
        scheduled_date: booking.scheduled_date || '',
        scheduled_time: booking.scheduled_time || '',
        estimated_duration: booking.estimated_duration || 60,
        service_address_id: booking.service_address_id || '',
        service_location: booking.service_location || null,
        service_address_text: booking.service_address_text || '',
        vehicle_type: booking.vehicle_type || '',
        vehicle_make: booking.vehicle_make || '',
        vehicle_model: booking.vehicle_model || '',
        vehicle_year: booking.vehicle_year || '',
        vehicle_color: booking.vehicle_color || '',
        license_plate: booking.license_plate || '',
        base_price: booking.base_price || 0,
        additional_charges: booking.additional_charges || 0,
        discount_amount: booking.discount_amount || 0,
        special_instructions: booking.special_instructions || '',
        customer_notes: booking.customer_notes || '',
        worker_notes: booking.worker_notes || '',
        can_cancel: booking.can_cancel !== undefined ? booking.can_cancel : true,
        can_reschedule: booking.can_reschedule !== undefined ? booking.can_reschedule : true,
        can_rate: booking.can_rate !== undefined ? booking.can_rate : false,
        // Payment info from payment record (if exists)
        payment_method: booking.payment?.payment_method || 'cash',
        payment_status: booking.payment?.status || 'pending',
        platform_fee_percentage: booking.payment?.platform_fee && booking.total_price ?
          ((booking.payment.platform_fee / booking.total_price) * 100).toFixed(1) : 15,
        platform_fee: booking.payment?.platform_fee || 0,
        worker_earnings: booking.payment?.worker_earnings || 0
      })



      // Set the selected brand ID if vehicle_make exists
      if (booking.vehicle_make && carBrands.length > 0) {
        const brand = carBrands.find(b => b.car_brand_name === booking.vehicle_make)
        if (brand) {
          setSelectedBrandId(brand.id)
        }
      }

      // Clear validation errors and touched fields when loading edit mode
      setErrors({})
      setTouchedFields({})
    } else if (mode === 'create') {
      // Auto-fill customer if user is customer
      if (!isAdmin && !isWorker && profile?.id) {
        setFormData(prev => ({
          ...prev,
          customer_id: profile.id
        }))
      }
      // Auto-fill worker if user is worker
      if (isWorker && profile?.id) {
        setFormData(prev => ({
          ...prev,
          worker_id: profile.id
        }))
      }

      // Clear touched fields for create mode
      setTouchedFields({})
    }
  }, [booking, mode, profile, isAdmin, isWorker, carBrands])

  // Fetch car brands on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      setLoadingBrands(true)
      setBrandsError(null)

      try {
        const brands = await getCarBrands()
        setCarBrands(brands)
      } catch (error) {
        console.error('Failed to load car brands:', error)
        setBrandsError('Failed to load car brands. Please try again.')
      } finally {
        setLoadingBrands(false)
      }
    }

    fetchBrands()
  }, [])

  // Fetch car models when brand is selected
  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedBrandId) {
        setCarModels([])
        return
      }

      setLoadingModels(true)
      setModelsError(null)

      try {
        const models = await getCarModels(selectedBrandId)
        setCarModels(models)
      } catch (error) {
        console.error('Failed to load car models:', error)
        setModelsError('Failed to load car models. Please try again.')
        setCarModels([])
      } finally {
        setLoadingModels(false)
      }
    }

    fetchModels()
  }, [selectedBrandId])

  // Calculate pricing when service or vehicle changes
  useEffect(() => {
    if (selectedService && selectedVehicle) {
      const basePrice = selectedService.base_price || 0
      const multiplier = selectedVehicle.multiplier || 1
      const calculatedBase = basePrice * multiplier

      setCalculatedPrice(calculatedBase)
      setFormData(prev => ({
        ...prev,
        base_price: calculatedBase
      }))
    }
  }, [selectedService, selectedVehicle])

  // Validation function using refs
  const validateField = (fieldName, value, forceValidation = false) => {
    const ref = validationRefs.current[fieldName]

    let isValid = true
    let errorMessage = ''

    switch (fieldName) {
      case 'customer_id':
        isValid = !!value
        errorMessage = 'Please select a customer'
        break
      case 'worker_id':
        isValid = isAdmin ? !!value : true // Only required for admins
        errorMessage = 'Please select a worker'
        break
      case 'service_id':
        isValid = !!value
        errorMessage = 'Please select a service'
        break
      case 'scheduled_date':
        isValid = !!value && new Date(value) >= new Date().setHours(0, 0, 0, 0)
        errorMessage = isValid ? '' : 'Please select a valid future date'
        break
      case 'scheduled_time':
        isValid = !!value
        errorMessage = 'Please select a time'
        break
      case 'service_address_text':
        isValid = !!value && value.length >= 10
        errorMessage = isValid ? '' : 'Please provide a complete address (min 10 characters)'
        break
      case 'vehicle_type':
        isValid = !!value
        errorMessage = 'Please select a vehicle type'
        break
      case 'base_price':
        isValid = value > 0
        errorMessage = 'Base price must be greater than 0'
        break
      default:
        isValid = true
    }

    // Only update field styling if field has been touched or validation is forced
    if (ref && (touchedFields[fieldName] || forceValidation)) {
      if (isValid) {
        ref.classList.remove('border-red-500')
        ref.classList.add('border-green-500')
      } else {
        ref.classList.remove('border-green-500')
        ref.classList.add('border-red-500')
      }
    }

    // Update errors state only if field has been touched or validation is forced
    if (touchedFields[fieldName] || forceValidation) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: isValid ? null : errorMessage
      }))
    }

    return isValid
  }

  // Handle input changes - Ensure value is never undefined
  const handleChange = (fieldName, value) => {
    // Ensure value is never undefined
    const safeValue = value !== undefined ? value : ''

    setFormData(prev => ({
      ...prev,
      [fieldName]: safeValue
    }))

    // Mark field as touched
    setTouchedFields(prev => ({
      ...prev,
      [fieldName]: true
    }))

    // Validate field (will now show visual feedback since field is touched)
    validateField(fieldName, safeValue)

    // Handle special field logic
    if (fieldName === 'service_id') {
      const service = services.find(s => s.id === safeValue)
      setSelectedService(service)
    }

    if (fieldName === 'vehicle_type') {
      const vehicle = VEHICLE_TYPES.find(v => v.value === safeValue)
      setSelectedVehicle(vehicle)
    }

    if (fieldName === 'service_address_id') {
      const address = addresses.find(a => a.id === safeValue)
      if (address) {
        setFormData(prev => ({
          ...prev,
          service_address_text: `${address.address_line_1}, ${address.city}, ${address.country}`
        }))
      }
    }
  }

  // Calculate pricing breakdown
  const totalPrice = parseFloat(formData.base_price || 0) +
    parseFloat(formData.additional_charges || 0) -
    parseFloat(formData.discount_amount || 0)

  const platformFee = (totalPrice * parseFloat(formData.platform_fee_percentage || 15)) / 100
  const workerEarnings = totalPrice - platformFee

  // Update payment calculations when price changes
  useEffect(() => {
    const newPlatformFee = (totalPrice * parseFloat(formData.platform_fee_percentage || 15)) / 100
    const newWorkerEarnings = totalPrice - newPlatformFee

    setFormData(prev => ({
      ...prev,
      platform_fee: newPlatformFee,
      worker_earnings: newWorkerEarnings
    }))
  }, [totalPrice, formData.platform_fee_percentage])

  // Validate entire form (force validation for all fields)
  const validateForm = () => {
    const requiredFields = ['customer_id', 'service_id', 'scheduled_date', 'scheduled_time', 'service_address_text', 'vehicle_type', 'base_price']

    // Add worker_id as required for admins
    if (isAdmin) {
      requiredFields.push('worker_id')
    }

    let isFormValid = true

    // Mark all required fields as touched to show validation
    const newTouchedFields = {}
    requiredFields.forEach(field => {
      newTouchedFields[field] = true
    })
    setTouchedFields(prev => ({
      ...prev,
      ...newTouchedFields
    }))

    requiredFields.forEach(field => {
      const isValid = validateField(field, formData[field], true) // Force validation
      if (!isValid) {
        isFormValid = false
      }
    })

    return isFormValid
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()



    if (!validateForm()) {
      toast.error('Form validation failed')
      return
    }

    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        total_price: totalPrice,
        estimated_duration: parseInt(formData.estimated_duration),
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        base_price: parseFloat(formData.base_price),
        additional_charges: parseFloat(formData.additional_charges || 0),
        discount_amount: parseFloat(formData.discount_amount || 0)
      }


      const submitStartTime = Date.now()

      await onSubmit(submitData)

      const submitEndTime = Date.now()

      toast.success('Form submission successful')
    } catch (error) {
      toast.error('Form submission error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Set selected brand ID when car brands are loaded and we have a vehicle_make
  useEffect(() => {
    if (mode === 'edit' && formData.vehicle_make && carBrands.length > 0 && !selectedBrandId) {
      const brand = carBrands.find(b => b.car_brand_name === formData.vehicle_make)
      if (brand) {
        setSelectedBrandId(brand.id)
      }
    }
  }, [carBrands, formData.vehicle_make, mode, selectedBrandId])

  // Only show errors for touched fields
  const getFieldError = (fieldName) => {
    return touchedFields[fieldName] ? errors[fieldName] : null
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {mode === 'edit' ? 'Edit Booking' : 'Create New Booking'}
            </CardTitle>
            <CardDescription>
              {mode === 'edit'
                ? `Update booking details for ${booking?.booking_number}`
                : 'Fill in the details to create a new booking'
              }
            </CardDescription>
          </div>
          {mode === 'edit' && booking?.status && (
            <Badge className={cn(
              "px-3 py-1",
              BOOKING_STATUS.find(s => s.value === booking.status)?.color
            )}>
              {BOOKING_STATUS.find(s => s.value === booking.status)?.label}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer & Service Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customer_id" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Customer *
              </Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => handleChange('customer_id', value)}
                disabled={!isAdmin && mode === 'edit'}
              >
                <SelectTrigger
                  ref={el => validationRefs.current.customer_id = el}
                  className="w-full"
                >
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.full_name} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getFieldError('customer_id') && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {getFieldError('customer_id')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="worker_id" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Worker {isAdmin ? '*' : ''}
              </Label>
              <Select
                value={formData.worker_id}
                onValueChange={(value) => handleChange('worker_id', value)}
                disabled={isWorker && !isAdmin}
              >
                <SelectTrigger
                  ref={el => validationRefs.current.worker_id = el}
                  className="w-full"
                >
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.user?.full_name || worker.business_name}
                      {worker.hourly_rate && ` - ${worker.hourly_rate} MAD/hr`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getFieldError('worker_id') && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {getFieldError('worker_id')}
                </p>
              )}
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service_id" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Service *
              </Label>
              <Select
                value={formData.service_id}
                onValueChange={(value) => handleChange('service_id', value)}
              >
                <SelectTrigger
                  ref={el => validationRefs.current.service_id = el}
                  className="w-full"
                >
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.title} - {service.base_price} MAD
                      {service.duration_minutes && ` (${service.duration_minutes} min)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getFieldError('service_id') && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {getFieldError('service_id')}
                </p>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">Date *</Label>
                <Input
                  ref={el => validationRefs.current.scheduled_date = el}
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => handleChange('scheduled_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {getFieldError('scheduled_date') && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldError('scheduled_date')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_time">Time *</Label>
                <Input
                  ref={el => validationRefs.current.scheduled_time = el}
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => handleChange('scheduled_time', e.target.value)}
                />
                {getFieldError('scheduled_time') && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldError('scheduled_time')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_duration">Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.estimated_duration || 60}
                  onChange={(e) => handleChange('estimated_duration', e.target.value)}
                  min="15"
                  step="15"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPinIcon className="h-5 w-5" />
              Service Address
            </h3>

            {addresses.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="service_address_id">Saved Addresses</Label>
                <Select
                  value={formData.service_address_id}
                  onValueChange={(value) => handleChange('service_address_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a saved address" />
                  </SelectTrigger>
                  <SelectContent>
                    {addresses.map((address) => (
                      <SelectItem key={address.id} value={address.id}>
                        {address.title} - {address.address_line_1}, {address.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="service_address_text">Service Address *</Label>
              <Textarea
                ref={el => validationRefs.current.service_address_text = el}
                value={formData.service_address_text}
                onChange={(e) => handleChange('service_address_text', e.target.value)}
                placeholder="Enter the complete service address..."
                rows={3}
              />
              {getFieldError('service_address_text') && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {getFieldError('service_address_text')}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Vehicle Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CarIcon className="h-5 w-5" />
              Vehicle Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) => handleChange('vehicle_type', value)}
                >
                  <SelectTrigger ref={el => validationRefs.current.vehicle_type = el}>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} ({type.multiplier}x price)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError('vehicle_type') && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldError('vehicle_type')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_plate">License Plate</Label>
                <Input
                  value={formData.license_plate || ''}
                  onChange={(e) => handleChange('license_plate', e.target.value)}
                  placeholder="e.g., ABC-1234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_make">Make</Label>
                <Select
                  value={formData.vehicle_make}
                  onValueChange={(value) => {
                    // Find the selected brand
                    const selectedBrand = carBrands.find(b => b.car_brand_name === value)
                    setSelectedBrandId(selectedBrand?.id || null)
                    handleChange('vehicle_make', value)
                    // Reset model when brand changes
                    handleChange('vehicle_model', '')
                  }}
                  disabled={loadingBrands}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingBrands ? "Loading brands..." : "Select car make"} />
                  </SelectTrigger>
                  <SelectContent>
                    {brandsError ? (
                      <div className="p-2 text-sm text-red-600">{brandsError}</div>
                    ) : carBrands.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No brands available</div>
                    ) : (
                      carBrands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.car_brand_name}>
                          <div className="flex items-center gap-2">
                            {brand.car_brand_image && (
                              <img
                                src={getCarBrandLogoUrl(brand.car_brand_image)}
                                alt={brand.car_brand_name}
                                className="w-5 h-5 object-contain"
                              />
                            )}
                            <span>{brand.car_brand_name}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {brandsError && (
                  <p className="text-xs text-red-600">{brandsError}</p>
                )}
              </div>

              {/* Vehicle Model */}
              <div className="space-y-2">
                <Label htmlFor="vehicle_model">Model</Label>
                <Select
                  value={formData.vehicle_model}
                  onValueChange={(value) => handleChange('vehicle_model', value)}
                  disabled={!selectedBrandId || loadingModels}
                >
                  <SelectTrigger id="vehicle_model">
                    <SelectValue placeholder={
                      !selectedBrandId
                        ? "Select make first"
                        : loadingModels
                          ? "Loading models..."
                          : "Select model"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {carModels.length > 0 ? (
                      carModels
                        .sort((a, b) => a.model_name.localeCompare(b.model_name))
                        .map((model, index) => (
                          <SelectItem
                            key={`${model.id}-${model.model_name}-${index}`}
                            value={model.model_name}
                          >
                            <div className="flex items-center gap-2">
                              {model.car_image && (
                                <img
                                  src={getCarModelImageUrl(model.car_image)}
                                  alt={model.model_name}
                                  className="w-8 h-6 object-contain"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                  }}
                                />
                              )}
                              <span>{model.model_name}</span>
                            </div>
                          </SelectItem>
                        ))
                    ) : selectedBrandId && !loadingModels ? (
                      <SelectItem value="no-models" disabled>
                        <span className="text-muted-foreground">No models available</span>
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                {errors.vehicle_model && (
                  <p className="text-sm text-red-500">{errors.vehicle_model}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_year">Year</Label>
                <Input
                  type="number"
                  value={formData.vehicle_year || ''}
                  onChange={(e) => handleChange('vehicle_year', e.target.value)}
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  placeholder="e.g., 2020"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_color">Color</Label>
                <Input
                  value={formData.vehicle_color || ''}
                  onChange={(e) => handleChange('vehicle_color', e.target.value)}
                  placeholder="e.g., White"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Pricing
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price (MAD) *</Label>
                <Input
                  ref={el => validationRefs.current.base_price = el}
                  type="number"
                  step="0.01"
                  value={formData.base_price || 0}
                  onChange={(e) => handleChange('base_price', e.target.value)}
                />
                {getFieldError('base_price') && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldError('base_price')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional_charges">Additional Charges (MAD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.additional_charges || 0}
                  onChange={(e) => handleChange('additional_charges', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_amount">Discount (MAD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discount_amount || 0}
                  onChange={(e) => handleChange('discount_amount', e.target.value)}
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Price:</span>
                <span className="text-green-600">{totalPrice.toFixed(2)} MAD</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Payment Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleChange('payment_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">

                          <div>
                            <div className="font-medium">{method.label}</div>

                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status *</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(value) => handleChange('payment_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <span>{status.icon}</span>
                          <span>{status.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current payment status
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Platform Fee Percentage */}
              <div className="space-y-2">
                <Label htmlFor="platform_fee_percentage">Platform Fee (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.platform_fee_percentage || 15}
                  onChange={(e) => handleChange('platform_fee_percentage', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Platform commission percentage (default: 15%)
                </p>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">Payment Breakdown</h4>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Service Total:</span>
                    <span className="font-medium">{totalPrice.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Platform Fee ({formData.platform_fee_percentage}%):</span>
                    <span className="font-medium">-{platformFee.toFixed(2)} MAD</span>
                  </div>
                </div>

                <div className="space-y-2 border-l pl-4">
                  <div className="flex justify-between text-green-600">
                    <span>Worker Earnings:</span>
                    <span className="font-semibold">{workerEarnings.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Customer Pays:</span>
                    <span className="font-semibold">{totalPrice.toFixed(2)} MAD</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Info */}
              {formData.payment_method && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border">
                  <div className="flex items-center gap-2">

                    <div>
                      <div className="font-medium">
                        {PAYMENT_METHODS.find(m => m.value === formData.payment_method)?.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {PAYMENT_METHODS.find(m => m.value === formData.payment_method)?.description}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notes & Instructions</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  value={formData.special_instructions || ''}
                  onChange={(e) => handleChange('special_instructions', e.target.value)}
                  placeholder="Any special instructions for the service..."
                  rows={3}
                />
              </div>

              {!isWorker && (
                <div className="space-y-2">
                  <Label htmlFor="customer_notes">Customer Notes</Label>
                  <Textarea
                    value={formData.customer_notes || ''}
                    onChange={(e) => handleChange('customer_notes', e.target.value)}
                    placeholder="Additional notes from customer..."
                    rows={2}
                  />
                </div>
              )}

              {(isAdmin || isWorker) && (
                <div className="space-y-2">
                  <Label htmlFor="worker_notes">Worker Notes</Label>
                  <Textarea
                    value={formData.worker_notes || ''}
                    onChange={(e) => handleChange('worker_notes', e.target.value)}
                    placeholder="Internal notes for workers..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Status (Edit mode only) */}
          {mode === 'edit' && (isAdmin || isWorker) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Booking Status</h3>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="sm:order-2"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {mode === 'edit' ? 'Update Booking' : 'Create Booking'}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isLoading}
              className="sm:order-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}