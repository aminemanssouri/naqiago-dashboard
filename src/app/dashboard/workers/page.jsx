"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ProtectedRoute from '@/components/ProtectedRoute'
import { DashboardPage } from '@/components/dashboard-page'
import WorkerTable from '@/components/WorkerTable'
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
import { getWorkersWithPagination, deleteWorkerProfile, updateWorkerStatus, deactivateWorkerProfile } from '@/services/workers'

export default function WorkersPage() {
  const router = useRouter()

  const [workers, setWorkers] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    sortBy: 'business_name',
    sortOrder: 'asc'
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [workerToDelete, setWorkerToDelete] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  // Fetch workers data
  const fetchWorkers = async () => {
    try {
      setIsLoading(true)

      const result = await getWorkersWithPagination({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        status: filters.status,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      })

      setWorkers(result.data)
      setPagination(result.pagination)
      console.log(result.data)
    } catch (error) {
      toast.error('Failed to load workers')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search
  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  // Handle filter
  const handleFilter = (filterData) => {
    setFilters(prev => ({ ...prev, ...filterData }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  // Handle sort
  const handleSort = (sortData) => {
    setFilters(prev => ({ ...prev, ...sortData }))
  }

  // Handle page change
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }))
  }

  // Handle delete with options
  const handleDelete = async (worker) => {
    try {
      await deleteWorkerProfile(worker.id)
      toast.success('Worker profile deleted successfully')
      fetchWorkers()
      setDeleteDialogOpen(false)
      setWorkerToDelete(null)
      setDeleteError(null)
    } catch (error) {
      console.error('Error deleting worker:', error)

      // Check if it's a constraint error
      if (error.message.includes('bookings')) {
        setDeleteError({
          message: 'This worker has associated bookings',
          options: ['deactivate', 'reassign']
        })
      } else if (error.message.includes('payments')) {
        setDeleteError({
          message: 'This worker has payment records',
          options: ['deactivate']
        })
      } else {
        toast.error(error.message || 'Failed to delete worker profile')
        setDeleteDialogOpen(false)
      }
    }
  }

  // Handle deactivate
  const handleDeactivate = async () => {
    try {
      await deactivateWorkerProfile(workerToDelete.id)
      toast.success('Worker profile deactivated successfully')
      fetchWorkers()
      setDeleteDialogOpen(false)
      setWorkerToDelete(null)
      setDeleteError(null)
    } catch (error) {
      console.error('Error deactivating worker:', error)
      toast.error('Failed to deactivate worker profile')
    }
  }

  // Handle status change
  const handleStatusChange = async (workerId, newStatus) => {
    try {
      await updateWorkerStatus(workerId, newStatus)
      toast.success(`Worker status updated to ${newStatus}`)

      // Update the worker in the local state
      setWorkers(prev => prev.map(worker =>
        worker.id === workerId
          ? { ...worker, status: newStatus }
          : worker
      ))
    } catch (error) {
      console.error('Error updating worker status:', error)
      toast.error('Failed to update worker status')
    }
  }

  // Fetch workers when filters or pagination change
  useEffect(() => {
    fetchWorkers()
  }, [
    filters.search,
    filters.status,
    filters.sortBy,
    filters.sortOrder,
    pagination.page
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsLoading(false);
    };
  }, []);

  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      <DashboardPage
        title="Workers"
        description="Manage your service workers, their profiles, and availability status."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Workers" },
        ]}
      >
        <WorkerTable
          workers={workers}
          pagination={pagination}
          isLoading={isLoading}
          onSearch={handleSearch}
          onFilter={handleFilter}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onDelete={(worker) => {
            setWorkerToDelete(worker)
            setDeleteDialogOpen(true)
          }}
          onStatusChange={handleStatusChange}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteError ? 'Cannot Delete Worker' : 'Confirm Delete'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteError ? (
                  <div className="space-y-3">
                    <p className="text-red-600 font-medium">{deleteError.message}</p>
                    <p>Would you like to:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {deleteError.options.includes('deactivate') && (
                        <li>Deactivate the worker profile (recommended)</li>
                      )}
                      {deleteError.options.includes('reassign') && (
                        <li>Reassign bookings to another worker</li>
                      )}
                      <li>Cancel and manually handle the related records</li>
                    </ul>
                  </div>
                ) : (
                  <p>
                    Are you sure you want to delete the worker profile for{' '}
                    <span className="font-semibold">{workerToDelete?.business_name}</span>?
                    This action cannot be undone.
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {deleteError ? (
                <AlertDialogAction
                  onClick={handleDeactivate}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Deactivate Instead
                </AlertDialogAction>
              ) : (
                <AlertDialogAction
                  onClick={() => handleDelete(workerToDelete)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardPage>
    </ProtectedRoute>
  )
}
