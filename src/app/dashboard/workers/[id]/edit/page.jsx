"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import ProtectedRoute from '@/components/ProtectedRoute'
import { DashboardPage } from '@/components/dashboard-page'
import WorkerForm from '@/components/WorkerForm'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getWorkerById, updateWorkerProfile } from '@/services/workers'

export default function EditWorkerPage() {
  const router = useRouter()
  const params = useParams()
  const workerId = params.id

  const [worker, setWorker] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch worker data
  const fetchWorker = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('Fetching worker with ID:', workerId)
      const workerData = await getWorkerById(workerId)

      console.log('Worker data loaded:', workerData)
      setWorker(workerData)
    } catch (error) {
      console.error('Error fetching worker:', error)
      setError(error.message || 'Failed to load worker profile')
      toast.error('Failed to load worker profile')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (updates) => {
    try {
      setIsSubmitting(true)

      console.log('Updating worker profile with data:', updates)
      const updatedWorker = await updateWorkerProfile(workerId, updates)

      toast.success('Worker profile updated successfully!')
      console.log('Worker profile updated:', updatedWorker)

      // Redirect to workers list after short delay
      setTimeout(() => {
        router.push('/dashboard/workers')
      }, 1000)

    } catch (error) {
      console.error('Error updating worker profile:', error)
      toast.error(error.message || 'Failed to update worker profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    router.push('/dashboard/workers')
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
          title="Edit Worker Profile"
          description="Edit worker profile details and settings."
          breadcrumb={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Workers", href: "/dashboard/workers" },
            { label: "Edit" },
          ]}
        >
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <div className="flex gap-4 pt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </CardContent>
          </Card>
        </DashboardPage>
      </ProtectedRoute>
    )
  }

  if (error || !worker) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <DashboardPage
          title="Edit Worker Profile"
          description="Edit worker profile details and settings."
          breadcrumb={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Workers", href: "/dashboard/workers" },
            { label: "Edit" },
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
              <button
                onClick={() => router.push('/dashboard/workers')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Back to Workers
              </button>
            </div>
          </div>
        </DashboardPage>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      <DashboardPage
        title={`Edit ${worker.business_name || worker.user?.full_name || 'Worker'}`}
        description="Edit worker profile details and settings."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Workers", href: "/dashboard/workers" },
          { label: "Edit" },
        ]}
      >
        <WorkerForm
          worker={worker}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          isEditMode={true}
        />
      </DashboardPage>
    </ProtectedRoute>
  )
}