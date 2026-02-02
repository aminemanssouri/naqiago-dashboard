"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Loader2, Plus, Calendar, MapPin, User, DollarSign, Clock,
  Edit, Trash2, Search, Filter, X, ChevronDown, CalendarDays,
  CheckCircle, XCircle, AlertCircle, Timer, ArrowUpDown, Eye, Download
} from 'lucide-react'
import { getBookings, deleteBooking } from '@/services/bookings'
import ProtectedRoute from '@/components/ProtectedRoute'
import { DashboardPage } from '@/components/dashboard-page'
import { BookingViewModal } from '@/components/BookingViewModal'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { toast } from 'sonner'
import { exportToCSV, EXPORT_COLUMNS } from '@/utils/export'

// Status options with icons and colors
const BOOKING_STATUSES = [
  { value: 'all', label: 'All Status', icon: null, color: '' },
  { value: 'pending', label: 'Pending', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50' },
  { value: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'text-blue-600 bg-blue-50' },
  { value: 'in_progress', label: 'In Progress', icon: Timer, color: 'text-purple-600 bg-purple-50' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50' }
]

// Sort options
const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'scheduled_date:desc', label: 'Latest Schedule' },
  { value: 'scheduled_date:asc', label: 'Earliest Schedule' },
  { value: 'total_price:desc', label: 'Highest Price' },
  { value: 'total_price:asc', label: 'Lowest Price' },
  { value: 'booking_number:asc', label: 'Booking Number' }
]

export default function BookingsListPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()

  // Bookings state
  const [bookings, setBookings] = useState([])
  const [selectedBookings, setSelectedBookings] = useState([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState(null)
  const [dataFetched, setDataFetched] = useState(false) // Resets on every mount

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('created_at:desc')
  const [showFilters, setShowFilters] = useState(true)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bookingToDelete, setBookingToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // SIMPLIFIED loadBookings function
  const loadBookings = async (showLoadingState = false) => {
    console.log('📚 loadBookings called:', { showLoadingState, authLoading, profileId: profile?.id })

    try {
      // Don't fetch if auth is still loading
      if (authLoading) {
        console.log('📚 Skipping - auth still loading')
        return
      }

      // Don't fetch without profile
      if (!profile?.id) {
        console.log('📚 Skipping - no profile ID')
        setIsInitialLoading(false)
        setIsSearching(false)
        return
      }

      // Set loading state
      if (showLoadingState) {
        console.log('📚 Setting isInitialLoading = true')
        setIsInitialLoading(true)
      } else {
        setIsSearching(true)
      }

      const queryParams = {
        search: debouncedSearchQuery,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        date_from: dateFrom,
        date_to: dateTo,
        sort: sortBy,
      }

      console.log('📚 Calling getBookings API...')
      const response = await getBookings(queryParams)
      console.log('📚 API response received:', { dataLength: response?.data?.length, pagination: response?.pagination })

      // FIX: Extract the data array from the response object
      const bookingsData = response?.data || []
      const pagination = response?.pagination || null

      setBookings(bookingsData) // Set only the data array
      // If you have pagination state, set it here
      // setPagination(pagination)

      setError(null)
      console.log('📚 Bookings loaded successfully:', bookingsData.length, 'records')
    } catch (err) {
      console.error('❌ Failed to load bookings:', err)
      console.error('❌ Error details:', err.message, err.stack)
      setError('Failed to load bookings. Please try again.')
      setBookings([]) // Set empty array on error
      toast({
        title: "Error",
        description: "Failed to load bookings. Please try again.",
        variant: "destructive",
      })
    } finally {
      console.log('📚 Setting loading states to false')
      setIsInitialLoading(false)
      setIsSearching(false)
    }
  }

  // Single useEffect for initial load
  useEffect(() => {
    // Only run when auth is ready AND we have a profile
    if (!authLoading && profile?.id) {
      // Check if we've already fetched in this mount
      if (!dataFetched) {
        console.log('📚 Bookings: Auth ready, loading bookings...')
        loadBookings(true)
        setDataFetched(true)
      }
    } else if (!authLoading && !profile?.id) {
      console.log('📚 Bookings: Auth ready but no profile, stopping loader')
      setIsInitialLoading(false)
    }
  }, [authLoading, profile?.id, dataFetched]) // Add dataFetched to dependencies

  // Separate useEffect for filter changes
  useEffect(() => {
    // Skip initial render AND skip if profile is not loaded
    if (isInitialLoading || !profile?.id) return

    if (!authLoading) {
      console.log('📚 Bookings: Filters changed, reloading...')
      loadBookings(false) // Don't show full loading state for filter changes
    }
  }, [debouncedSearchQuery, selectedStatus, dateFrom, dateTo, sortBy])

  // Handle delete booking - open confirmation dialog
  const handleDelete = (booking) => {
    setBookingToDelete(booking)
    setDeleteDialogOpen(true)
  }

  // Confirm delete booking
  const confirmDelete = async () => {
    if (!bookingToDelete) return

    setIsDeleting(true)
    try {
      await deleteBooking(bookingToDelete.id)
      setBookings(bookings.filter(booking => booking.id !== bookingToDelete.id))
      toast.success('Booking deleted successfully!')
      setDeleteDialogOpen(false)
      setBookingToDelete(null)
    } catch (error) {
      console.error('Error deleting booking:', error)
      toast.error('Failed to delete booking. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedStatus('all')
    setDateFrom('')
    setDateTo('')
    setSortBy('created_at:desc')
  }

  // Handle CSV export
  const handleExport = () => {
    if (!bookings || bookings.length === 0) {
      toast.error("No bookings to export")
      return
    }
    const success = exportToCSV(bookings, EXPORT_COLUMNS.bookings, 'bookings')
    if (success) {
      toast.success(`Exported ${bookings.length} bookings to CSV`)
    }
  }

  // Status badge color
  const getStatusColor = (status) => {
    const statusConfig = BOOKING_STATUSES.find(s => s.value === status)
    return statusConfig?.color || 'bg-gray-100 text-gray-800'
  }

  // Get status icon
  const getStatusIcon = (status) => {
    const statusConfig = BOOKING_STATUSES.find(s => s.value === status)
    const Icon = statusConfig?.icon
    return Icon ? <Icon className="h-3 w-3" /> : null
  }

  if (isInitialLoading) {
    return (
      <DashboardPage
        title="Bookings Management"
        description="Manage and track all your car wash bookings"
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bookings" },
        ]}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading bookings...</span>
            </div>
          </CardContent>
        </Card>
      </DashboardPage>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['customer', 'admin', 'worker', 'manager']}>
      <DashboardPage
        title="📅 Booking Management"
        description="View, search, and manage all your service bookings in one place"
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bookings" },
        ]}

      >
        {/* Alert Messages */}
        {error && (
          <Alert className={cn(
            "mb-6",
            error.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
          )}>
            <AlertDescription className={error.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {error}
            </AlertDescription>
          </Alert>
        )}


        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <CardTitle>Search & Filter Bookings</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
                <ChevronDown className={cn(
                  "ml-2 h-4 w-4 transition-transform",
                  showFilters && "rotate-180"
                )} />
              </Button>
            </div>
          </CardHeader>



          {showFilters && (
            <>
              <Separator />
              <CardContent className="pt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm">Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOOKING_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              {status.icon && <status.icon className="h-4 w-4" />}
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date From */}
                  <div className="space-y-2">
                    <Label htmlFor="date-from" className="text-sm">From Date</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Date To */}
                  <div className="space-y-2">
                    <Label htmlFor="date-to" className="text-sm">To Date</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Sort */}
                  <div className="space-y-2">
                    <Label htmlFor="sort" className="text-sm">Sort by</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear All Filters
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
        {/* Search Bar - Always visible */}
        <div className="mb-6 flex items-center gap-4 justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings by number, address, or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => router.push('/dashboard/bookings/create')}>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Bookings Grid with overlay loading */}
        <div className="relative">
          {/* Loading overlay */}
          {isSearching && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center min-h-[300px]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Updating results...</span>
              </div>
            </div>
          )}

          {/* Bookings Grid */}
          {!Array.isArray(bookings) || bookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedStatus !== 'all' || dateFrom || dateTo
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first booking'}
                </p>
                {(searchQuery || selectedStatus !== 'all' || dateFrom || dateTo) ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => router.push('/dashboard/bookings/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Booking
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {bookings.map((booking) => (
                <Card
                  key={booking.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                  onClick={() => router.push(`/dashboard/bookings/${booking.id}/edit`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{booking.booking_number}</CardTitle>
                      <Badge className={cn("flex items-center gap-1", getStatusColor(booking.status))}>
                        {getStatusIcon(booking.status)}
                        {booking.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription>
                      {booking.service?.title || 'Service'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Date and Time */}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                      {new Date(booking.scheduled_date).toLocaleDateString()} at {booking.scheduled_time}
                    </div>

                    {/* Location */}
                    {booking.service_address_text && (
                      <div className="flex items-start text-sm text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{booking.service_address_text}</span>
                      </div>
                    )}

                    {/* Customer */}
                    {booking.customer && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <User className="mr-2 h-4 w-4 flex-shrink-0" />
                        {booking.customer.full_name || booking.customer.email}
                      </div>
                    )}

                    {/* Vehicle Info */}
                    {booking.vehicle_type && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                        {booking.vehicle_type} {booking.vehicle_make && `- ${booking.vehicle_make}`}
                      </div>
                    )}

                    <Separator />

                    {/* Total Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm font-semibold">
                        <DollarSign className="mr-1 h-4 w-4" />
                        {booking.total_price?.toFixed(2) || '0.00'} MAD
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <BookingViewModal
                        booking={booking}
                        onEdit={(id) => router.push(`/dashboard/bookings/${id}/edit`)}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </BookingViewModal>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/bookings/${booking.id}/edit`)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {(profile?.role === 'admin' || profile?.role === 'manager' || booking.customer_id === profile?.id) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(booking)
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardPage>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete booking <span className="font-semibold">#{bookingToDelete?.booking_number}</span>?
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                Customer: {bookingToDelete?.customer?.full_name || 'N/A'}
              </span>
              <span className="text-sm text-muted-foreground">
                Service: {bookingToDelete?.service?.name || 'N/A'}
              </span>
              <br />
              <span className="font-medium text-red-600 mt-2 block">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  )
}