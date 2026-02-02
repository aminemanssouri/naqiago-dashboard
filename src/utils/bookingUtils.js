 
export const getDefaultBookingForm = (userProfile = null) => {
  const defaultForm = {
    booking_number: '',
    customer_id: '',
    worker_id: '',
    service_id: '',
    status: 'pending',
    scheduled_date: '',
    scheduled_time: '',
    estimated_duration: 60,
    service_address_id: '',
    service_address_text: '',
    vehicle_type: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',
    base_price: 0,
    additional_charges: 0,
    discount_amount: 0,
    special_instructions: '',
    customer_notes: '',
    worker_notes: ''
  }

  // Auto-fill based on user role
  if (userProfile) {
    if (userProfile.role === 'customer') {
      defaultForm.customer_id = userProfile.id
    } else if (userProfile.role === 'worker') {
      defaultForm.worker_id = userProfile.id
    }
  }

  return defaultForm
}

// Vehicle type multipliers for pricing
export const VEHICLE_MULTIPLIERS = {
  sedan: 1.0,
  suv: 1.2,
  van: 1.4,
  truck: 1.6
}

// Booking status options with styling
export const BOOKING_STATUSES = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    description: 'Booking submitted, awaiting confirmation'
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    description: 'Booking confirmed by worker'
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    description: 'Service currently being performed'
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    description: 'Service completed successfully'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    description: 'Booking cancelled'
  }
}

// Calculate total price including vehicle multiplier
export const calculateBookingPrice = (basePrice, vehicleType, additionalCharges = 0, discountAmount = 0) => {
  const multiplier = VEHICLE_MULTIPLIERS[vehicleType] || 1.0
  const adjustedBasePrice = basePrice * multiplier
  const total = adjustedBasePrice + parseFloat(additionalCharges) - parseFloat(discountAmount)
  return Math.max(0, total) // Ensure price is not negative
}

// Format booking data for display
export const formatBookingForDisplay = (booking) => {
  if (!booking) return null

  const formattedDate = new Date(booking.scheduled_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const formattedTime = booking.scheduled_time
    ? new Date(`2000-01-01T${booking.scheduled_time}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : ''

  return {
    ...booking,
    formatted_date: formattedDate,
    formatted_time: formattedTime,
    total_price: calculateBookingPrice(
      booking.base_price,
      booking.vehicle_type,
      booking.additional_charges,
      booking.discount_amount
    ),
    status_info: BOOKING_STATUSES[booking.status] || BOOKING_STATUSES.pending,
    vehicle_info: [booking.vehicle_year, booking.vehicle_make, booking.vehicle_model]
      .filter(Boolean)
      .join(' ') || 'Vehicle details not provided'
  }
}

// Validate required fields based on user role
export const getRequiredFields = (userRole) => {
  const baseRequired = [
    'service_id',
    'scheduled_date',
    'scheduled_time',
    'service_address_text',
    'vehicle_type',
    'base_price'
  ]

  // Add customer_id if user is admin or worker
  if (userRole === 'admin' || userRole === 'worker') {
    baseRequired.push('customer_id')
  }

  return baseRequired
}

// Generate field error messages
export const getFieldErrorMessage = (fieldName, value, userRole) => {
  switch (fieldName) {
    case 'customer_id':
      return !value ? 'Please select a customer' : ''
    case 'service_id':
      return !value ? 'Please select a service' : ''
    case 'scheduled_date':
      if (!value) return 'Please select a date'
      if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
        return 'Date cannot be in the past'
      }
      return ''
    case 'scheduled_time':
      return !value ? 'Please select a time' : ''
    case 'service_address_text':
      if (!value) return 'Service address is required'
      if (value.length < 10) return 'Please provide a complete address (minimum 10 characters)'
      return ''
    case 'vehicle_type':
      return !value ? 'Please select a vehicle type' : ''
    case 'base_price':
      if (!value || parseFloat(value) <= 0) return 'Base price must be greater than 0'
      return ''
    case 'estimated_duration':
      if (value && (isNaN(value) || parseInt(value) < 15)) {
        return 'Duration must be at least 15 minutes'
      }
      return ''
    case 'vehicle_year':
      if (value && (isNaN(value) || value < 1990 || value > new Date().getFullYear() + 1)) {
        return 'Please enter a valid vehicle year'
      }
      return ''
    case 'additional_charges':
      if (value && (isNaN(value) || parseFloat(value) < 0)) {
        return 'Additional charges must be a positive number'
      }
      return ''
    case 'discount_amount':
      if (value && (isNaN(value) || parseFloat(value) < 0)) {
        return 'Discount amount must be a positive number'
      }
      return ''
    default:
      return ''
  }
}

// Check if booking can be edited based on status and user role
export const canEditBooking = (booking, userRole, userId) => {
  if (!booking) return false

  // Admins can edit any booking
  if (userRole === 'admin') return true

  // Completed or cancelled bookings generally cannot be edited
  if (['completed', 'cancelled'].includes(booking.status)) {
    return false
  }

  // Customers can edit their own pending bookings
  if (userRole === 'customer' && booking.customer_id === userId) {
    return booking.status === 'pending'
  }

  // Workers can edit bookings assigned to them
  if (userRole === 'worker' && booking.worker_id === userId) {
    return ['pending', 'confirmed', 'in_progress'].includes(booking.status)
  }

  return false
}

// Check if booking can be cancelled
export const canCancelBooking = (booking, userRole, userId) => {
  if (!booking) return false

  // Cannot cancel completed bookings
  if (['completed', 'cancelled'].includes(booking.status)) {
    return false
  }

  // Check can_cancel flag from database
  if (booking.can_cancel === false) {
    return false
  }

  // Admins can cancel any booking
  if (userRole === 'admin') return true

  // Customers can cancel their own bookings
  if (userRole === 'customer' && booking.customer_id === userId) {
    return true
  }

  // Workers can cancel bookings assigned to them
  if (userRole === 'worker' && booking.worker_id === userId) {
    return true
  }

  return false
}

// Get available status transitions based on current status and user role
export const getAvailableStatusTransitions = (currentStatus, userRole) => {
  const transitions = {
    pending: {
      admin: ['confirmed', 'cancelled'],
      worker: ['confirmed', 'cancelled'],
      customer: ['cancelled']
    },
    confirmed: {
      admin: ['in_progress', 'cancelled'],
      worker: ['in_progress', 'cancelled'],
      customer: []
    },
    in_progress: {
      admin: ['completed', 'cancelled'],
      worker: ['completed'],
      customer: []
    },
    completed: {
      admin: [],
      worker: [],
      customer: []
    },
    cancelled: {
      admin: [],
      worker: [],
      customer: []
    }
  }

  return transitions[currentStatus]?.[userRole] || []
}

// Format form data for API submission
export const prepareBookingDataForAPI = (formData) => {
  // Remove empty strings and convert to appropriate types
  const cleanData = {}

  Object.entries(formData).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) {
      cleanData[key] = null
    } else if (['estimated_duration', 'vehicle_year'].includes(key)) {
      cleanData[key] = value ? parseInt(value) : null
    } else if (['base_price', 'additional_charges', 'discount_amount'].includes(key)) {
      cleanData[key] = value ? parseFloat(value) : 0
    } else {
      cleanData[key] = value
    }
  })

  // Calculate total price
  cleanData.total_price = calculateBookingPrice(
    cleanData.base_price,
    cleanData.vehicle_type,
    cleanData.additional_charges,
    cleanData.discount_amount
  )

  return cleanData
}

// Parse booking data from API for form
export const prepareBookingDataForForm = (apiData) => {
  if (!apiData) return getDefaultBookingForm()

  const formData = { ...apiData }

  // Convert null values to empty strings for form inputs
  Object.keys(formData).forEach(key => {
    if (formData[key] === null || formData[key] === undefined) {
      formData[key] = ''
    }
  })

  return formData
}

const bookingUtils = {
  getDefaultBookingForm,
  VEHICLE_MULTIPLIERS,
  BOOKING_STATUSES,
  calculateBookingPrice,
  formatBookingForDisplay,
  getRequiredFields,
  getFieldErrorMessage,
  canEditBooking,
  canCancelBooking,
  getAvailableStatusTransitions,
  prepareBookingDataForAPI,
  prepareBookingDataForForm
}

export default bookingUtils