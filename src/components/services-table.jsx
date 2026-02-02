"use client"

import { useRouter } from 'next/navigation'
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  Eye, 
  Edit, 
  Trash, 
  Copy,
  DollarSign,
  Package,
  ToggleLeft,
  ToggleRight
} from "lucide-react"
import { deleteService, toggleServiceStatus, duplicateService } from '@/services/services'
import { toast } from 'sonner'
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
import { useState } from 'react'

export function ServicesTable({ services = [], loading = false, onRefresh }) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const handleDelete = async () => {
    if (!serviceToDelete) return
    
    try {
      setDeleteLoading(true)
      await deleteService(serviceToDelete.id)
      toast.success('Service deleted successfully')
      setDeleteDialogOpen(false)
      setServiceToDelete(null)
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Failed to delete service')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleToggleStatus = async (service) => {
    try {
      setActionLoading(prev => ({ ...prev, [service.id]: true }))
      await toggleServiceStatus(service.id)
      toast.success(`Service ${service.status === 'active' ? 'deactivated' : 'activated'} successfully`)
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error toggling service status:', error)
      toast.error('Failed to update service status')
    } finally {
      setActionLoading(prev => ({ ...prev, [service.id]: false }))
    }
  }

  const handleDuplicate = async (service) => {
    try {
      setActionLoading(prev => ({ ...prev, [service.id]: true }))
      await duplicateService(service.id)
      toast.success('Service duplicated successfully')
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error duplicating service:', error)
      toast.error('Failed to duplicate service')
    } finally {
      setActionLoading(prev => ({ ...prev, [service.id]: false }))
    }
  }

  const serviceColumns = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Service
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      size: 250,
      cell: ({ row }) => {
        const service = row.original
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={service.image_url} alt={service.title} />
              <AvatarFallback>
                <Package className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="font-medium">{service.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {service.description}
              </div>
              <div className="md:hidden space-y-1">
                <Badge variant="outline" className="text-xs">
                  {service.category}
                </Badge>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Category
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      size: 150,
      cell: ({ row }) => {
        const category = row.getValue("category")
        return (
          <div className="hidden md:block">
            <Badge variant="outline">{category}</Badge>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "base_price",
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-medium"
            >
               Price
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      size: 120,
      cell: ({ row }) => {
        const price = row.getValue("base_price")
        const discountPrice = row.original.discount_price
        return (
          <div className="text-center font-medium">
            {discountPrice ? (
              <div className="space-y-1">
                <div className="text-sm line-through text-muted-foreground">
                  {price} MAD
                </div>
                <div className="text-green-600">
                  {discountPrice} MAD
                </div>
              </div>
            ) : (
              <div>{price} MAD</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-medium"
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      size: 120,
      cell: ({ row }) => {
        const isActive = row.getValue("is_active")
        return (
          <div className="flex justify-center">
            <Badge
              variant={isActive ? "default" : "secondary"}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "cartype",
      header: "Car Type",
      size: 120,
      cell: ({ row }) => {
        const cartype = row.getValue("cartype")
        return (
          <div className="hidden lg:block">
            {cartype ? (
              <Badge variant="secondary">{cartype}</Badge>
            ) : (
              <span className="text-muted-foreground text-sm">N/A</span>
            )}
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      size: 100,
      cell: ({ row }) => {
        const duration = row.getValue("duration")
        return (
          <div className="hidden xl:block text-sm text-muted-foreground">
            {duration ? `${duration} min` : "N/A"}
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      size: 150,
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return (
          <div className="hidden xl:block text-sm">
            {date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const service = row.original
        const isLoading = actionLoading[service.id]
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
                disabled={isLoading}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => router.push(`/dashboard/services/${service.id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setServiceToDelete(service)
                  setDeleteDialogOpen(true)
                }}
                className="text-destructive"
                disabled={isLoading}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        data={services}
        columns={serviceColumns}
      />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{serviceToDelete?.title}"? 
              This action cannot be undone. The service and its associated image will be removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
