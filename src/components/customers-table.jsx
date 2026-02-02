"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ViewCustomerModal } from "@/components/ViewCustomerModal"
import { Mail, Phone, Eye, Calendar, MoreHorizontal, ArrowUpDown, Edit, UserPlus, Columns3, BarChart3 } from "lucide-react"

const customerColumns = [
  {
    accessorKey: "full_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    size: 200,
    cell: ({ row }) => {
      const customer = row.original
      return (
        <div className="space-y-1">
          <div className="font-medium">{customer.full_name}</div>
          <div className="md:hidden space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 text-blue-500" />
              {customer.email}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 text-green-500" />
              {customer.phone}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    size: 250,
    cell: ({ row }) => (
      <div className="hidden md:block text-sm">{row.getValue("email")}</div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    size: 150,
    cell: ({ row }) => (
      <div className="hidden md:block text-sm">{row.getValue("phone")}</div>
    ),
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
    size: 120,
    cell: ({ row }) => {
      const status = row.getValue("status")
      return (
        <Badge
          variant={
            status === "active"
              ? "default"
              : status === "inactive"
                ? "secondary"
                : "destructive"
          }
        >
          {status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "language_preference",
    header: "Language",
    size: 120,
    cell: ({ row }) => {
      const lang = row.getValue("language_preference")
      const langMap = {
        en: "English",
        fr: "Français",
        ar: "العربية",
      }
      return (
        <div className="hidden lg:block text-sm">
          {langMap[lang] || lang}
        </div>
      )
    },
  },
  {
    accessorKey: "loyalty_points",
    header: ({ column }) => {
      return (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Points
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    size: 100,
    cell: ({ row }) => {
      const points = row.getValue("loyalty_points")
      return (
        <div className="hidden lg:block text-center font-medium text-sm">
          {points}
        </div>
      )
    },
  },
  {
    accessorKey: "is_verified",
    header: "Verified",
    size: 120,
    cell: ({ row }) => {
      const verified = row.getValue("is_verified")
      return (
        <Badge variant={verified ? "default" : "secondary"}>
          {verified ? "Verified" : "Pending"}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const verified = row.getValue(id)
      return value === "all" || (value === "verified" && verified) || (value === "pending" && !verified)
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
          Joined
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
      const customer = row.original
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
            <ViewCustomerModal
              customer={customer}
              onEdit={(customerId) => console.log("Edit customer:", customerId)}
            >
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
            </ViewCustomerModal>

            <DropdownMenuItem onClick={() => console.log("Edit customer:", customer.id)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Delete customer:", customer.id)}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export function CustomersTable({ customers = [], loading = false }) {
  const router = useRouter()
  const [columnVisibility, setColumnVisibility] = useState({
    email: true,
    phone: true,
    language_preference: true,
    loyalty_points: true,
    is_verified: true,
    created_at: true,
  })

  const handleEdit = (customerId) => {
    router.push(`/dashboard/customers/${customerId}/edit`)
  }

  const handleViewAnalytics = (customerId) => {
    router.push(`/dashboard/customers/${customerId}/analytics`)
  }

  const handleDelete = (customerId) => {
    // This will be handled by parent component or add delete logic here
    console.log("Delete customer:", customerId)
  }

  // Update the columns to use the handlers
  const columnsWithHandlers = customerColumns.map(col => {
    if (col.id === 'actions') {
      return {
        ...col,
        cell: ({ row }) => {
          const customer = row.original
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
                <ViewCustomerModal
                  customer={customer}
                  onEdit={handleEdit}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                </ViewCustomerModal>
                <DropdownMenuItem onClick={() => handleViewAnalytics(customer.id)}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleEdit(customer.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(customer.id)}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      }
    }
    return col
  })

  // Filter columns based on visibility
  const visibleColumns = columnsWithHandlers.map(col => {
    if (col.accessorKey && columnVisibility[col.accessorKey] === false) {
      return { ...col, cell: () => null, header: () => null }
    }
    return col
  })

  return (
    <DataTable
      data={customers}
      columns={visibleColumns}
    />
  )
}