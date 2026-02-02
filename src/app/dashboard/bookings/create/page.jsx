"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { BookingForm } from '@/components/BookingForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createBooking } from '@/services/bookings'
import { getBookingFormData } from '@/services/bookingHelpers'
import ProtectedRoute from '@/components/ProtectedRoute'
import { DashboardPage } from '@/components/dashboard-page'

export default function CreateBookingPage() {
  const router = useRouter()
  const { profile } = useAuth()
  
  // Form data
  const [formData, setFormData] = useState({
    customers: [],
    workers: [],
    services: [],
    addresses: []
  })
  
  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)

  // REMOVED THE AUTO-EXECUTING DEBUG CODE!
  // To debug, open console and manually run:
  // import('@/services/debugCustomers.js').then(m => m.debugCheckAllUsers())
  
  // Load form data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true)
        const data = await getBookingFormData(profile?.id, profile?.role)
        
        console.log('📊 Form data loaded:', {
          customers: data.customers?.length || 0,
          workers: data.workers?.length || 0,
          services: data.services?.length || 0,
          addresses: data.addresses?.length || 0
        })
        
        // Debug: Log if no customers found
        if (!data.customers || data.customers.length === 0) {
          console.warn('⚠️ No customers found in the database!')
          console.log('💡 To create test customers, run this in console:')
          console.log("import('@/services/debugCustomers.js').then(m => m.createTestCustomer('customer1@test.com', 'Test123!', 'John Doe'))")
        }
        
        setFormData(data)
      } catch (error) {
        console.error('❌ Error loading form data:', error)
        setAlert({
          type: 'error',
          message: 'Failed to load form data. Please refresh the page.'
        })
      } finally {
        setIsLoadingData(false)
      }
    }

    if (profile) {
      loadData()
    }
  }, [profile])

  // Handle form submission
  const handleSubmit = async (bookingData) => {
    console.log('📋 Submitting booking data:', bookingData)
    
    try {
      console.log('🔄 Setting isSubmitting to true...')
      setIsSubmitting(true)
      setAlert(null)
      
      console.log('🚀 About to call createBooking service...')
      const startTime = Date.now()
      
      // Add timeout to catch hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - took longer than 30 seconds')), 30000)
      })
      
      const bookingPromise = createBooking(bookingData)
      
      console.log('⏳ Waiting for booking creation (with 30s timeout)...')
      const result = await Promise.race([bookingPromise, timeoutPromise])
      
      const endTime = Date.now()
      console.log(`⏱️ Booking creation took ${endTime - startTime}ms`)
      console.log('✅ Booking created:', result)
      
      // Show success message
      setAlert({
        type: 'success',
        message: `Booking created successfully! Booking Number: ${result?.booking_number}`
      })

      // Redirect after a short delay to show success message
      setTimeout(() => {
        console.log('🔄 Redirecting to bookings page...')
        router.push('/dashboard/bookings')
      }, 2000)
      
    } catch (error) {
      console.error('❌ Error creating booking:', error)
      console.error('❌ Error type:', typeof error)
      console.error('❌ Error message:', error?.message)
      
      setAlert({
        type: 'error',
        message: error?.message || 'Failed to create booking. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
      console.log('🏁 Form submission complete, isSubmitting set to false')
    }
  }

  // Handle form cancellation
  const handleCancel = () => {
    router.push('/dashboard/bookings')
  }

  // Loading state
  if (isLoadingData) {
    return (
      <ProtectedRoute allowedRoles={['customer', 'admin', 'worker']}>
        <DashboardPage
          title="Create New Booking"
          description="Fill in the details to create a new booking"
          breadcrumb={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Bookings", href: "/dashboard/bookings" },
            { label: "Create" },
          ]}
        >
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading form data...</span>
          </div>
        </DashboardPage>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['customer', 'admin', 'worker']}>
      <DashboardPage
        title="Create New Booking"
        description="Fill in the details to create a new booking"
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bookings", href: "/dashboard/bookings" },
          { label: "Create" },
        ]}
      >
        {/* Alert Messages */}
        {alert && (
          <Alert className={alert.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {alert.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={alert.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {alert.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Booking Form */}
        <BookingForm
          mode="create"
          booking={null}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          customers={formData.customers}
          workers={formData.workers}
          services={formData.services}
          addresses={formData.addresses}
          isLoading={isSubmitting}
        />
      </DashboardPage>
    </ProtectedRoute>
  )
}