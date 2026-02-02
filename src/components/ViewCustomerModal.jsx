"use client"

import { useState } from 'react'
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  ShoppingBag,
  DollarSign,
  Clock,
  Edit,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { format } from 'date-fns'

export function ViewCustomerModal({ customer, children, onEdit }) {
  const [open, setOpen] = useState(false)

  if (!customer) return null

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
      case 'inactive':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700'
      case 'suspended':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />
      case 'inactive':
        return <XCircle className="h-4 w-4" />
      case 'suspended':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const handleEdit = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)
    if (onEdit) {
      onEdit(customer.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Customer Details</DialogTitle>
          <DialogDescription>
            View complete information about this customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section with Avatar and Basic Info */}
          <div className="flex items-start gap-6 p-6 bg-muted/50 dark:bg-muted/20 rounded-lg">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={customer.avatar_url} alt={customer.full_name} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 dark:bg-primary/20 text-primary">
                {customer.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{customer.full_name}</h3>
                  <p className="text-muted-foreground">{customer.email}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`flex items-center gap-1 ${getStatusColor(customer.status)}`}
                >
                  {getStatusIcon(customer.status)}
                  {customer.status || 'Unknown'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.created_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {format(new Date(customer.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {customer.is_verified && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span>Verified</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p className="text-2xl font-bold">{customer.total_bookings || 0}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">{customer.total_spent || 0} MAD</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Rating</p>
                    <p className="text-2xl font-bold">{customer.average_rating?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Booking</p>
                    <p className="text-sm font-medium">
                      {customer.last_booking_date 
                        ? format(new Date(customer.last_booking_date), 'MMM dd')
                        : 'Never'}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500 dark:text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 dark:bg-muted/20 rounded-md">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customer.email || 'Not provided'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 dark:bg-muted/20 rounded-md">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customer.phone || 'Not provided'}</span>
                </div>
              </div>

              {customer.address && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <div className="flex items-start gap-2 p-3 bg-muted/50 dark:bg-muted/20 rounded-md">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{customer.address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Account Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Account Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 dark:bg-muted/20 rounded-md">
                  <Badge 
                    variant="outline" 
                    className={`flex items-center gap-1 ${getStatusColor(customer.status)}`}
                  >
                    {getStatusIcon(customer.status)}
                    {customer.status || 'Unknown'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 dark:bg-muted/20 rounded-md">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {customer.created_at 
                      ? format(new Date(customer.created_at), 'MMMM dd, yyyy')
                      : 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email Verified</label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 dark:bg-muted/20 rounded-md">
                  {customer.is_verified ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-600 dark:text-green-400">Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400">Not Verified</span>
                    </>
                  )}
                </div>
              </div>

              {customer.last_login_at && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 dark:bg-muted/20 rounded-md">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(customer.last_login_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          {customer.notes && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Additional Notes</h4>
                <div className="p-4 bg-muted/50 dark:bg-muted/20 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Customer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
