"use client"

import React, { useState, useEffect } from 'react'
import { DataTable } from '@/components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Plus, Filter, MoreHorizontal, Edit, Trash2, Eye, MapPin, Clock, DollarSign, Star, Users, Building, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'

const WORKER_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'available', label: 'Available', color: 'bg-green-500' },
  { value: 'busy', label: 'Busy', color: 'bg-yellow-500' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-500' }
]

const SORT_OPTIONS = [
  { value: 'business_name', label: 'Business Name' },
  { value: 'user.full_name', label: 'User Name' },
  { value: 'status', label: 'Status' },
  { value: 'hourly_rate', label: 'Hourly Rate' },
  { value: 'total_jobs_completed', label: 'Jobs Completed' },
  { value: 'created_at', label: 'Date Created' }
]

export default function WorkerTable({
  workers = [],
  pagination = {},
  isLoading = false,
  onSearch,
  onFilter,
  onSort,
  onPageChange,
  onDelete,
  onStatusChange
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('business_name')
  const [sortOrder, setSortOrder] = useState('asc')

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Handle filter changes
  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    // Pass empty string for 'all' to match existing backend logic
    onFilter?.({ status: status === 'all' ? '' : status })
  }

  // Handle sorting
  const handleSort = (field) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortBy(field)
    setSortOrder(newOrder)
    onSort?.({ sortBy: field, sortOrder: newOrder })
  }

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = WORKER_STATUSES.find(s => s.value === status)
    if (!statusConfig) return null

    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
        {statusConfig.label}
      </Badge>
    )
  }

  // Format specialties
  const formatSpecialties = (specialties) => {
    if (!specialties || specialties.length === 0) return 'None'
    if (specialties.length <= 2) return specialties.join(', ')
    return `${specialties.slice(0, 2).join(', ')} +${specialties.length - 2} more`
  }

  // Worker columns for DataTable
  const workerColumns = [
    {
      accessorKey: "user.full_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Worker
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const worker = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={worker.user?.avatar_url} />
              <AvatarFallback>
                {worker.user?.full_name?.charAt(0) || 'W'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{worker.user?.full_name}</div>
              <div className="text-sm text-gray-500">{worker.user?.email}</div>
              {worker.user?.is_verified && (
                <Badge variant="outline" className="text-xs">Verified</Badge>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "business_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Business
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const worker = row.original
        return (
          <div>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-400" />
              <span>{worker.business_name}</span>
            </div>
            {worker.service_radius_km && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <MapPin className="h-3 w-3" />
                {worker.service_radius_km}km radius
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const worker = row.original
        return (
          <div>
            {getStatusBadge(worker.status)}
            {worker.works_weekends && (
              <div className="text-xs text-gray-500 mt-1">Works weekends</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "hourly_rate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Rate
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const worker = row.original
        return (
          <div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span>{worker.hourly_rate ? `${worker.hourly_rate} MAD/h` : 'Not set'}</span>
            </div>
            {worker.commission_rate && (
              <div className="text-xs text-gray-500">{worker.commission_rate}% commission</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "experience_years",
      header: "Experience",
      cell: ({ row }) => {
        const worker = row.original
        return (
          <div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{worker.experience_years || 0} years</span>
            </div>
            {worker.start_time && worker.end_time && (
              <div className="text-xs text-gray-500">
                {worker.start_time} - {worker.end_time}
              </div>
            )}
          </div>
        )
      },
    },

    {
      accessorKey: "total_jobs_completed",
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-medium"
            >
              Jobs
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const worker = row.original
        return (
          <div className="text-center">
            <div className="font-medium">{worker.total_jobs_completed || 0}</div>

          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const worker = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <Link href={`/dashboard/workers/${worker.id}`}>
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              </Link>
              <Link href={`/dashboard/workers/${worker.id}/edit`}>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Link>

              {/* Status Change Options */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(worker)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Workers Management
          </CardTitle>
          <Link href="/dashboard/workers/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Worker
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search workers by name, business, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {WORKER_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <div className="flex items-center gap-2">
                    {status.color && <div className={`w-2 h-2 rounded-full ${status.color}`} />}
                    {status.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-')
            handleSort(field)
          }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <React.Fragment key={option.value}>
                  <SelectItem value={`${option.value}-asc`}>
                    {option.label} (A-Z)
                  </SelectItem>
                  <SelectItem value={`${option.value}-desc`}>
                    {option.label} (Z-A)
                  </SelectItem>
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Workers Table */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            data={workers}
            columns={workerColumns}
          />
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} workers
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === pagination.page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange?.(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}