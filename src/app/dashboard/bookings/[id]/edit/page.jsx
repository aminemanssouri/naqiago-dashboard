"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { BookingForm } from '@/components/BookingForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { updateBooking, getBooking } from '@/services/bookings'
import { getBookingFormData } from '@/services/bookingHelpers'
import ProtectedRoute from '@/components/ProtectedRoute'
import { DashboardPage } from '@/components/dashboard-page'

export default function EditBookingPage() {
  const router = useRouter()
  const params = useParams()
  const { profile } = useAuth()
  const bookingId = params.id

  // Form data
  const [formData, setFormData] = useState({
    customers: [],
    workers: [],
    services: [],
    addresses: []
  })

  // Booking data
  const [booking, setBooking] = useState(null)

  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)

  // Load form data and booking
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true)

        // Load form data and booking in parallel
        const [formDataResult, bookingResult] = await Promise.all([
          getBookingFormData(profile?.id, profile?.role),
          getBooking(bookingId)
        ])

        setFormData(formDataResult)
        setBooking(bookingResult)

      } catch (error) {
        console.error('Error loading data:', error)
        setAlert({
          type: 'error',
          message: 'Failed to load booking data. Please try again.'
        })
      } finally {
        setIsLoadingData(false)
      }
    }

    if (profile && bookingId) {
      loadData()
    }
  }, [profile, bookingId])

  // Handle form submission
  const handleSubmit = async (bookingData) => {
    try {
      setIsSubmitting(true)
      setAlert(null)

      const result = await updateBooking(bookingId, bookingData)

      setAlert({
        type: 'success',
        message: `Booking ${result.booking_number} updated successfully!`
      })

      // Stay on the edit page - no redirect

    } catch (error) {
      console.error('Error updating booking:', error)
      setAlert({
        type: 'error',
        message: error.message || 'Failed to update booking. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle form cancellation
  const handleCancel = () => {
    router.push('/dashboard/bookings')
  }

  if (isLoadingData) {
    return (
      <ProtectedRoute allowedRoles={['customer', 'admin', 'worker']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading booking data...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!booking) {
    return (
      <ProtectedRoute allowedRoles={['customer', 'admin', 'worker']}>
        <div className="container mx-auto py-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Booking not found or you don't have permission to edit it.
            </AlertDescription>
          </Alert>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['customer', 'admin', 'worker']}>
      <DashboardPage
        title="Edit Booking"
        description={`Update booking details for ${booking.booking_number}`}
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bookings", href: "/dashboard/bookings" },
          { label: "Edit" },
          { label: booking.booking_number },

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
          mode="edit"
          booking={booking}
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