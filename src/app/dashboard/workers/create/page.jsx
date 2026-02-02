"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ProtectedRoute from '@/components/ProtectedRoute'
import { DashboardPage } from '@/components/dashboard-page'
import WorkerForm from '@/components/WorkerForm'
import { createWorker, createWorkerProfile, getAvailableUsersForWorkerProfiles } from '@/services/workers'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from '@/components/ui/skeleton'
import { UserPlus, Users } from 'lucide-react'

export default function CreateWorkerPage() {
  const router = useRouter()

  const [availableUsers, setAvailableUsers] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('new-user') // 'new-user' or 'existing-user'

  // Fetch available users (those without worker profiles)
  const fetchAvailableUsers = async () => {
    try {
      setIsLoading(true)
      const users = await getAvailableUsersForWorkerProfiles()
      setAvailableUsers(users)

      if (users.length === 0) {
        toast.info('All users already have worker profiles')
        setActiveTab('new-user') // Default to creating new user
      }
    } catch (error) {
      console.error('Error fetching available users:', error)
      toast.error('Failed to load available users')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle form submission for NEW USER (creates auth user + profile + worker_profile)
  const handleCreateNewWorker = async (workerData) => {
    try {
      setIsSubmitting(true)

      console.log('Creating complete new worker with data:', workerData)
      const newWorker = await createWorker(workerData)

      toast.success('Worker created successfully! They can now log in with their credentials.')
      console.log('Worker created:', newWorker)

      // Redirect to workers list after short delay
      setTimeout(() => {
        router.push('/dashboard/workers')
      }, 1500)
    } catch (error) {
      console.error('Error creating worker:', error)
      toast.error(error.message || 'Failed to create worker')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle form submission for EXISTING USER (creates worker_profile only)
  const handleCreateWorkerProfile = async (workerData) => {
    try {
      setIsSubmitting(true)

      console.log('Creating worker profile with data:', workerData)
      const newWorker = await createWorkerProfile(workerData)

      toast.success('Worker profile created successfully!')
      console.log('Worker profile created:', newWorker)

      // Redirect to workers list after short delay
      setTimeout(() => {
        router.push('/dashboard/workers')
      }, 1000)

    } catch (error) {
      console.error('Error creating worker profile:', error)

      // Handle specific error types
      if (error.message?.includes('duplicate key')) {
        toast.error('This user already has a worker profile')
      } else if (error.message?.includes('foreign key')) {
        toast.error('Selected user does not exist')
      } else {
        toast.error(error.message || 'Failed to create worker profile')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    router.push('/dashboard/workers')
  }

  // Load available users on component mount
  useEffect(() => {
    fetchAvailableUsers()
  }, [])

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <DashboardPage
          title="Create Worker"
          description="Create a new worker profile."
          breadcrumb={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Workers", href: "/dashboard/workers" },
            { label: "Create" },
          ]}
        >
          <div className="space-y-6">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96 mt-2" />
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
          </div>
        </DashboardPage>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      <DashboardPage
        title="Create Worker"
        description="Create a new worker with complete profile."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Workers", href: "/dashboard/workers" },
          { label: "Create" },
        ]}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="new-user" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              New Worker
            </TabsTrigger>
            <TabsTrigger value="existing-user" className="flex items-center gap-2" disabled={availableUsers.length === 0}>
              <Users className="h-4 w-4" />
              Existing User ({availableUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-user" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Worker Account</CardTitle>
                <CardDescription>
                  This will create a new user account, profile, and worker profile all at once.
                  Set a password that the worker can use to log in immediately.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkerForm
                  onSubmit={handleCreateNewWorker}
                  onCancel={handleCancel}
                  isSubmitting={isSubmitting}
                  mode="new-user" // New prop to indicate full user creation
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="existing-user" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Worker Profile for Existing User</CardTitle>
                <CardDescription>
                  Select an existing user and create a worker profile for them.
                  Only users without worker profiles are shown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availableUsers.length > 0 ? (
                  <WorkerForm
                    onSubmit={handleCreateWorkerProfile}
                    onCancel={handleCancel}
                    availableUsers={availableUsers}
                    isSubmitting={isSubmitting}
                    mode="existing-user" // Existing mode
                  />
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                        No Available Users
                      </h3>
                      <p className="text-yellow-700">
                        All users with worker role already have worker profiles.
                        Use the "New Worker" tab to create a completely new worker account.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardPage>
    </ProtectedRoute>
  )
}
