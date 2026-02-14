"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { DashboardPage } from '@/components/dashboard-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  User,
  Building,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Calendar,
  Phone,
  Mail,
  Edit,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { getWorkerById, updateWorkerStatus } from '@/services/workers'

const WORKER_STATUSES = [
  { value: 'available', label: 'Available', color: 'bg-green-500', icon: CheckCircle },
  { value: 'busy', label: 'Busy', color: 'bg-yellow-500', icon: Clock },
  { value: 'offline', label: 'Offline', color: 'bg-gray-500', icon: XCircle }
]

export default function WorkerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const workerId = params.id

  const [worker, setWorker] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Fetch worker data
  const fetchWorker = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const workerData = await getWorkerById(workerId)
      setWorker(workerData)
    } catch (error) {
      console.error('Error fetching worker:', error)
      setError(error.message || 'Failed to load worker profile')
      toast.error('Failed to load worker profile')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle status update
  const handleStatusUpdate = async (newStatus) => {
    try {
      setIsUpdatingStatus(true)

      await updateWorkerStatus(workerId, newStatus)
      setWorker(prev => ({ ...prev, status: newStatus }))

      toast.success(`Worker status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update worker status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Get status configuration
  const getStatusConfig = (status) => {
    return WORKER_STATUSES.find(s => s.value === status) || WORKER_STATUSES[2]
  }

  // Format specialties
  const formatSpecialties = (specialties) => {
    if (!specialties || specialties.length === 0) return 'No specialties listed'
    return specialties
  }

  // Load worker data on component mount
  useEffect(() => {
    if (workerId) {
      fetchWorker()
    }
  }, [workerId])

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <DashboardPage
          title="Worker Details"
          description="View worker profile information and statistics."
          breadcrumb={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Workers", href: "/dashboard/workers" },
            { label: "Details" },
          ]}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="text-center space-y-2">
                        <Skeleton className="h-8 w-12 mx-auto" />
                        <Skeleton className="h-3 w-20 mx-auto" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DashboardPage>
      </ProtectedRoute>
    )
  }

  if (error || !worker) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <DashboardPage
          title="Worker Details"
          description="View worker profile information and statistics."
          breadcrumb={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Workers", href: "/dashboard/workers" },
            { label: "Details" },
          ]}
        >
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Error Loading Worker
              </h3>
              <p className="text-red-700 mb-4">
                {error || 'Worker profile not found'}
              </p>
              <Link href="/dashboard/workers">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Workers
                </Button>
              </Link>
            </div>
          </div>
        </DashboardPage>
      </ProtectedRoute>
    )
  }

  const statusConfig = getStatusConfig(worker.status)
  const StatusIcon = statusConfig.icon

  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      <DashboardPage
        title={worker.business_name || worker.user?.full_name || 'Worker Profile'}
        description="View and manage worker profile information."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Workers", href: "/dashboard/workers" },
          { label: "Details" },
        ]}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <div className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
                    {statusConfig.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={worker.user?.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {worker.user?.full_name?.charAt(0) || 'W'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{worker.user?.full_name}</h3>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building className="h-4 w-4" />
                      <span>{worker.business_name}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {worker.user?.email}
                      </div>
                      {worker.user?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {worker.user.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {worker.bio && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Bio</h4>
                      <p className="text-gray-600">{worker.bio}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {worker.experience_years || 0}
                    </div>
                    <div className="text-sm text-gray-500">Years Experience</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {worker.total_jobs_completed || 0}
                    </div>
                    <div className="text-sm text-gray-500">Jobs Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {worker.user?.worker_rating ? worker.user.worker_rating.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-sm text-gray-500">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {worker.user?.worker_review_count || 0}
                    </div>
                    <div className="text-sm text-gray-500">Reviews</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Specialties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Specialties
                </CardTitle>
              </CardHeader>
              <CardContent>
                {worker.specialties && worker.specialties.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formatSpecialties(worker.specialties).map((specialty, index) => (
                      <Badge key={index} variant="outline">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No specialties listed</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon className="h-5 w-5" />
                  Status Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {WORKER_STATUSES.map((status) => {
                  const Icon = status.icon
                  return (
                    <Button
                      key={status.value}
                      variant={worker.status === status.value ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleStatusUpdate(status.value)}
                      disabled={isUpdatingStatus || worker.status === status.value}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status.color}`} />
                        <Icon className="h-4 w-4" />
                        {status.label}
                      </div>
                    </Button>
                  )
                })}
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Hourly Rate:</span>
                  <span className="font-semibold">
                    {worker.hourly_rate ? `${worker.hourly_rate} MAD/h` : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Commission:</span>
                  <span className="font-semibold">{worker.commission_rate || 15}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Radius:</span>
                  <span className="font-semibold">
                    <MapPin className="inline h-3 w-3 mr-1" />
                    {worker.service_radius_km || 10} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Works Weekends:</span>
                  <span className="font-semibold">
                    {worker.works_weekends ? 'Yes' : 'No'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Working Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Working Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Time:</span>
                    <span className="font-semibold">{worker.start_time || '08:00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">End Time:</span>
                    <span className="font-semibold">{worker.end_time || '18:00'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Verified:</span>
                  <Badge variant={worker.user?.is_verified ? "default" : "secondary"}>
                    {worker.user?.is_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={worker.user?.status === 'active' ? "default" : "secondary"}>
                    {worker.user?.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Joined:</span>
                  <span className="text-sm">
                    {worker.created_at ? new Date(worker.created_at).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardPage>
    </ProtectedRoute>
  )
}