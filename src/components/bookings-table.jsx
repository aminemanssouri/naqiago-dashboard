"use client"

import { DataTable, createSelectColumn, createSortableHeader, createActionsColumn, createCommonActions } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { dummyBookings, getCustomerName, getServiceTitle, getStatusColor } from "@/lib/dummy-data"
import { Calendar, User, MapPin, Eye, CheckCircle, XCircle } from "lucide-react"

const bookingColumns = [
  createSelectColumn(),
  {
    accessorKey: "id",
    header: createSortableHeader("Booking ID"),
    cell: ({ row }) => {
      const booking = row.original
      return (
        <div className="space-y-1">
          <div className="font-mono text-sm">{booking.id}</div>
          {/* Mobile: Show additional info */}
          <div className="md:hidden space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3 text-blue-500" />
              {getCustomerName(booking.customer_id)}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 text-green-500" />
              {new Date(booking.date).toLocaleDateString()} at {booking.time}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "customer_name",
    header: createSortableHeader("Customer"),
    cell: ({ row }) => {
      const booking = row.original
      return (
        <div className="hidden md:block font-medium">
          {getCustomerName(booking.customer_id)}
        </div>
      )
    },
  },
  {
    accessorKey: "service_name",
    header: createSortableHeader("Service"),
    cell: ({ row }) => {
      const booking = row.original
      return (
        <div className="hidden lg:block text-sm">
          {getServiceTitle(booking.service_id)}
        </div>
      )
    },
  },
  {
    accessorKey: "date",
    header: createSortableHeader("Date"),
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"))
      return (
        <div className="hidden md:block text-sm">
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
    accessorKey: "time",
    header: "Time",
    cell: ({ row }) => (
      <div className="hidden md:block text-sm">{row.getValue("time")}</div>
    ),
  },
  {
    accessorKey: "status",
    header: createSortableHeader("Status"),
    cell: ({ row }) => {
      const status = row.getValue("status")
      return (
        <Badge
          variant={
            status === "confirmed" || status === "completed"
              ? "default"
              : status === "pending"
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
    accessorKey: "total_amount",
    header: createSortableHeader("Amount"),
    cell: ({ row }) => {
      const amount = row.getValue("total_amount")
      return (
        <div className="hidden lg:block text-right font-medium text-sm">
          {amount} MAD
        </div>
      )
    },
  },
  createActionsColumn((booking) => [
    <DropdownMenuItem key="view" onClick={() => console.log("View booking:", booking.id)}>
      <Eye className="h-4 w-4 mr-2" />
      View Details
    </DropdownMenuItem>,
    <DropdownMenuItem key="confirm" onClick={() => console.log("Confirm booking:", booking.id)}>
      <CheckCircle className="h-4 w-4 mr-2" />
      Confirm Booking
    </DropdownMenuItem>,
    <DropdownMenuItem 
      key="cancel" 
      className="text-destructive focus:text-destructive"
      onClick={() => console.log("Cancel booking:", booking.id)}
    >
      <XCircle className="h-4 w-4 mr-2" />
      Cancel Booking
    </DropdownMenuItem>,
  ]),
]

export function BookingsTable({ loading = false }) {
  const filters = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "confirmed", label: "Confirmed" },
        { value: "pending", label: "Pending" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
  ]

  return (
    <DataTable
      columns={bookingColumns}
      data={dummyBookings}
      title="Booking Management"
      description="Manage customer bookings and appointments"
      searchPlaceholder="Search bookings by customer name or booking ID..."
      filters={filters}
      loading={loading}
      onExport={() => console.log("Export bookings")}
      onAdd={() => console.log("Add new booking")}
    />
  )
}