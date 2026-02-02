"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Calendar, MapPin, User, DollarSign, Clock, Phone, Mail, 
  Car, Edit, Eye, CheckCircle, XCircle, AlertCircle, Timer,
  CreditCard, FileText, Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Status options with icons and colors
const BOOKING_STATUSES = [
  { value: 'pending', label: 'Pending', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { value: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'in_progress', label: 'In Progress', icon: Timer, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' }
]

export function BookingViewModal({ booking, children, onEdit }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  if (!booking) return null

  // Get status configuration
  const getStatusConfig = (status) => {
    return BOOKING_STATUSES.find(s => s.value === status) || { 
      value: status, 
      label: status, 
      icon: AlertCircle, 
      color: 'bg-gray-100 text-gray-800' 
    }
  }

  const statusConfig = getStatusConfig(booking.status)
  const StatusIcon = statusConfig.icon

  // Handle edit button click
  const handleEdit = (e) => {
    e.preventDefault() // Prevent any default action
    e.stopPropagation() // Stop event bubbling
    setOpen(false) // Close modal first
    
    // Use router.push for navigation
    if (onEdit) {
      onEdit(booking.id)
    } else {
      // Navigate to edit page
      router.push(`/dashboard/bookings/${booking.id}/edit`)
    }
  }

  // Handle close button click
  const handleClose = (e) => {
    if (e) {
      e.preventDefault() // Prevent any default action
      e.stopPropagation() // Stop event bubbling
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()} // Prevent closing on outside click if needed
        onInteractOutside={(e) => e.stopPropagation()} // Stop propagation when clicking outside
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Booking Details
              </DialogTitle>
              <DialogDescription className="text-lg mt-1">
                {booking.booking_number}
              </DialogDescription>
            </div>
            <Badge className={cn("flex items-center gap-2 text-sm px-3 py-1", statusConfig.color)}>
              <StatusIcon className="h-4 w-4" />
              {statusConfig.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-semibold">{booking.service?.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-semibold">{booking.service?.category || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Base Price</p>
                  <p className="font-semibold">{booking.service?.base_price?.toFixed(2) || '0.00'} MAD</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-semibold">{booking.service?.duration_minutes || 0} minutes</p>
                </div>
              </div>
              {booking.service?.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{booking.service.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule & Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">
                      {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-semibold">{booking.scheduled_time}</p>
                  </div>
                </div>
              </div>
              
              {booking.service_address_text && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Service Address</p>
                    <p className="font-semibold">{booking.service_address_text}</p>
                  </div>
                </div>
              )}

              {booking.service_address && (
                <div className="text-sm bg-muted p-3 rounded-lg">
                  <p className="font-medium">{booking.service_address.title}</p>
                  <p>{booking.service_address.address_line_1}</p>
                  {booking.service_address.address_line_2 && (
                    <p>{booking.service_address.address_line_2}</p>
                  )}
                  <p>{booking.service_address.city}, {booking.service_address.state}</p>
                  <p>{booking.service_address.country}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          {booking.customer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  {booking.customer.avatar_url ? (
                    <img 
                      src={booking.customer.avatar_url} 
                      alt={booking.customer.full_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-lg">{booking.customer.full_name}</p>
                    <p className="text-muted-foreground">{booking.customer.email}</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.customer.email}</span>
                  </div>
                  {booking.customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{booking.customer.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Worker Information */}
          {booking.worker && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Worker Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-lg">{booking.worker.business_name}</p>
                    {booking.worker.user && (
                      <p className="text-muted-foreground">{booking.worker.user.full_name}</p>
                    )}
                  </div>
                  
                  {booking.worker.user && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{booking.worker.user.email}</span>
                      </div>
                      {booking.worker.user.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{booking.worker.user.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vehicle Information */}
          {booking.vehicle_type && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-semibold">{booking.vehicle_type}</p>
                  </div>
                  {booking.vehicle_make && (
                    <div>
                      <p className="text-sm text-muted-foreground">Make</p>
                      <p className="font-semibold">{booking.vehicle_make}</p>
                    </div>
                  )}
                  {booking.vehicle_model && (
                    <div>
                      <p className="text-sm text-muted-foreground">Model</p>
                      <p className="font-semibold">{booking.vehicle_model}</p>
                    </div>
                  )}
                  {booking.vehicle_year && (
                    <div>
                      <p className="text-sm text-muted-foreground">Year</p>
                      <p className="font-semibold">{booking.vehicle_year}</p>
                    </div>
                  )}
                  {booking.license_plate && (
                    <div>
                      <p className="text-sm text-muted-foreground">License Plate</p>
                      <p className="font-semibold">{booking.license_plate}</p>
                    </div>
                  )}
                  {booking.vehicle_color && (
                    <div>
                      <p className="text-sm text-muted-foreground">Color</p>
                      <p className="font-semibold">{booking.vehicle_color}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing & Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pricing & Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {booking.base_price && (
                    <div>
                      <p className="text-sm text-muted-foreground">Base Price</p>
                      <p className="font-semibold">{booking.base_price.toFixed(2)} MAD</p>
                    </div>
                  )}
                  {booking.additional_services_price && (
                    <div>
                      <p className="text-sm text-muted-foreground">Additional Services</p>
                      <p className="font-semibold">{booking.additional_services_price.toFixed(2)} MAD</p>
                    </div>
                  )}
                  {booking.discount_amount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Discount</p>
                      <p className="font-semibold text-green-600">-{booking.discount_amount.toFixed(2)} MAD</p>
                    </div>
                  )}
                  {booking.tax_amount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tax</p>
                      <p className="font-semibold">{booking.tax_amount.toFixed(2)} MAD</p>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold">Total Amount</p>
                  <p className="text-2xl font-bold text-primary">
                    {booking.total_price?.toFixed(2) || '0.00'} MAD
                  </p>
                </div>

                {booking.payment_status && (
                  <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                    <span className="text-sm text-muted-foreground">Payment Status</span>
                    <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {booking.payment_status}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Special Instructions */}
          {booking.special_instructions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Special Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{booking.special_instructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Booking Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Booking Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm font-medium">
                    {new Date(booking.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm font-medium">
                    {new Date(booking.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button"
              onClick={handleEdit}
              className="flex-1"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Booking
            </Button>
            <Button 
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}