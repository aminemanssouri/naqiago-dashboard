"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  FileText,
  Package
} from "lucide-react"
import { toast } from "sonner"
import { getCustomer, getCustomerBookings, getCustomerPayments } from "@/services/customers"
import { BookingViewModal } from "@/components/BookingViewModal"

export default function CustomerAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState(null)
  const [analytics, setAnalytics] = useState({
    bookings: [],
    payments: [],
    stats: {
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      totalSpent: 0,
      averageBookingValue: 0,
      lastBookingDate: null
    }
  })

  useEffect(() => {
    fetchCustomerAnalytics()
  }, [customerId])

  const fetchCustomerAnalytics = async () => {
    try {
      setLoading(true)
      
      // Fetch real data from database
      const [customerData, bookingsResponse, paymentsResponse] = await Promise.all([
        getCustomer(customerId),
        getCustomerBookings(customerId, { limit: 1000 }), // Get all bookings
        getCustomerPayments(customerId, { limit: 1000 }) // Get all payments
      ])

      const bookingsData = bookingsResponse.data || []
      const paymentsData = paymentsResponse.data || []

      // Calculate stats
      const completedBookings = bookingsData.filter(b => b.status === 'completed').length
      const cancelledBookings = bookingsData.filter(b => b.status === 'cancelled').length
      
      const totalSpent = paymentsData
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

      const averageBookingValue = completedBookings > 0 ? totalSpent / completedBookings : 0

      // Get last booking date
      const sortedBookings = [...bookingsData].sort((a, b) => 
        new Date(b.scheduled_date) - new Date(a.scheduled_date)
      )
      const lastBookingDate = sortedBookings[0]?.scheduled_date || null

      setCustomer(customerData)
      setAnalytics({
        bookings: bookingsData,
        payments: paymentsData,
        stats: {
          totalBookings: bookingsData.length,
          completedBookings,
          cancelledBookings,
          totalSpent,
          averageBookingValue,
          lastBookingDate
        }
      })
    } catch (error) {
      console.error("Error fetching customer analytics:", error)
      toast.error("Failed to load customer analytics")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      completed: "default",
      pending: "secondary",
      cancelled: "destructive",
      active: "default"
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  const getPaymentMethodLabel = (method) => {
    const methods = {
      credit_card: "Credit Card",
      cash: "Cash",
      mobile_money: "Mobile Money",
      bank_transfer: "Bank Transfer"
    }
    return methods[method] || method
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  // Check if customer has any analytics data
  const hasAnalytics = analytics.bookings.length > 0 || analytics.payments.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/customers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Analytics</h1>
            <p className="text-muted-foreground">
              Detailed analytics for {customer?.full_name}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{customer?.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{customer?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{customer?.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Loyalty Points</p>
              <p className="font-medium">{customer?.loyalty_points} pts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Analytics Message */}
      {!hasAnalytics && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Analytics Available</h3>
            <p className="text-muted-foreground text-center max-w-md">
              This customer doesn't have any bookings or payments yet. 
              Analytics will appear once they start using the service.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards - Only show if has analytics */}
      {hasAnalytics && (
        <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.stats.completedBookings} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.stats.totalSpent} MAD</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Booking Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.stats.averageBookingValue.toFixed(0)} MAD
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per completed booking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.stats.totalBookings > 0 
                ? Math.round((analytics.stats.completedBookings / analytics.stats.totalBookings) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.stats.cancelledBookings} cancelled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed data */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings" className="gap-2">
            <Package className="h-4 w-4" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking History</CardTitle>
              <CardDescription>
                All bookings made by this customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No bookings found
                  </p>
                ) : (
                  analytics.bookings.map(booking => (
                    <BookingViewModal 
                      key={booking.id} 
                      booking={booking}
                      onEdit={(bookingId) => router.push(`/dashboard/bookings/${bookingId}/edit`)}
                    >
                    <div className="flex items-center justify-between border-b pb-4 last:border-0 cursor-pointer hover:bg-muted/50 rounded-lg p-3 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {booking.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : booking.status === 'cancelled' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{booking.service?.title || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.vehicle_make} {booking.vehicle_model} {booking.vehicle_year ? `(${booking.vehicle_year})` : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })} at {booking.scheduled_time}
                          </p>
                          {booking.booking_number && (
                            <p className="text-xs text-muted-foreground">#{booking.booking_number}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{parseFloat(booking.total_price).toFixed(2)} MAD</p>
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>
                    </BookingViewModal>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                All payments processed for this customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No payments found
                  </p>
                ) : (
                  analytics.payments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex items-start gap-4">
                        <CreditCard className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{getPaymentMethodLabel(payment.payment_method)}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.booking?.booking_number ? `Booking: ${payment.booking.booking_number}` : 'N/A'}
                          </p>
                          {payment.booking?.service?.title && (
                            <p className="text-sm text-muted-foreground">{payment.booking.service.title}</p>
                          )}
                          {payment.gateway_reference && (
                            <p className="text-xs text-muted-foreground">Ref: {payment.gateway_reference}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{parseFloat(payment.amount).toFixed(2)} MAD</p>
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Reports</CardTitle>
              <CardDescription>
                Detailed reports and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Service Preferences */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Most Used Services
                  </h3>
                  <div className="space-y-2">
                    {analytics.bookings
                      .filter(b => b.status === 'completed')
                      .reduce((acc, booking) => {
                        const serviceTitle = booking.service?.title || 'Unknown Service'
                        const existing = acc.find(item => item.service === serviceTitle)
                        if (existing) {
                          existing.count++
                          existing.total += parseFloat(booking.total_price || 0)
                        } else {
                          acc.push({ 
                            service: serviceTitle, 
                            count: 1, 
                            total: parseFloat(booking.total_price || 0) 
                          })
                        }
                        return acc
                      }, [])
                      .sort((a, b) => b.count - a.count)
                      .map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{item.service}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.count} booking{item.count > 1 ? 's' : ''}
                            </p>
                          </div>
                          <p className="font-bold">{item.total.toFixed(2)} MAD</p>
                        </div>
                      ))}
                    {analytics.bookings.filter(b => b.status === 'completed').length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No completed bookings yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Booking Trends */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Booking Trends
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Last Booking</p>
                      <p className="text-lg font-bold">
                        {analytics.stats.lastBookingDate 
                          ? new Date(analytics.stats.lastBookingDate).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Cancellation Rate</p>
                      <p className="text-lg font-bold">
                        {analytics.stats.totalBookings > 0
                          ? Math.round((analytics.stats.cancelledBookings / analytics.stats.totalBookings) * 100)
                          : 0}%
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-lg font-bold">{analytics.stats.totalSpent} MAD</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  )
}
