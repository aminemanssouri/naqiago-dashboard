"use client"

import { useState, useEffect } from "react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu"
import { getPayments, refundPayment, updatePayment } from "@/services/payments"
import { Eye, Download, RefreshCw, MoreHorizontal, ArrowUpDown, Loader2, CheckCircle2, XCircle, Clock, Ban, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ViewPaymentModal } from "@/components/viewPaymentModal"
import { exportToCSV, EXPORT_COLUMNS } from "@/utils/export"

const getPaymentStatusColor = (status) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
    processing: "bg-blue-100 text-blue-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export function PaymentsTable() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const result = await getPayments({ limit: 100 })
      console.log('Payments result:', result)
      setPayments(result.data || [])
    } catch (error) {
      console.error("Error loading payments:", error)
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        details: error?.details
      })
      toast.error(error?.message || "Failed to load payments")
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (paymentId) => {
    try {
      await refundPayment(paymentId)
      toast.success("Payment refunded successfully")
      loadPayments() // Reload payments
    } catch (error) {
      toast.error(error.message || "Failed to refund payment")
    }
  }

  const handleStatusUpdate = async (paymentId, newStatus) => {
    try {
      await updatePayment(paymentId, { status: newStatus })
      toast.success(`Payment status updated to ${newStatus}`)
      loadPayments() // Reload payments
    } catch (error) {
      toast.error(error.message || "Failed to update payment status")
    }
  }

  // Handle CSV export
  const handleExport = () => {
    if (!payments || payments.length === 0) {
      toast.error("No payments to export")
      return
    }
    const success = exportToCSV(payments, EXPORT_COLUMNS.payments, 'payments')
    if (success) {
      toast.success(`Exported ${payments.length} payments to CSV`)
    }
  }

  const columns = [
    {
      accessorKey: "gateway_transaction_id",
      header: "Transaction ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs">
          {row.getValue("gateway_transaction_id") || `PAY-${row.original.id?.slice(0, 8)}`}
        </div>
      ),
    },
    {
      accessorKey: "booking_id",
      header: "Booking",
      cell: ({ row }) => {
        const booking = row.original.booking
        return (
          <div>
            <div className="font-medium">
              {booking?.booking_number || `#${row.original.booking_id?.slice(0, 8)}`}
            </div>
            {booking?.scheduled_date && (
              <div className="text-xs text-muted-foreground">
                {format(new Date(booking.scheduled_date), "MMM dd, yyyy")}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const customer = row.original.customer
        return customer ? (
          <div>
            <div className="font-medium">{customer.full_name}</div>
            <div className="text-xs text-muted-foreground">{customer.email}</div>
          </div>
        ) : (
          <div className="text-muted-foreground">No customer data</div>
        )
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.currency || 'MAD'} {parseFloat(row.getValue("amount")).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => {
        const method = row.getValue("payment_method")
        const icons = {
          cash: "💵",
          card: "💳",
          transfer: "🏦",
          online: "🌐"
        }
        return (
          <Badge variant="outline">
            {icons[method] || ""} {method}
          </Badge>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") || 'pending'
        return (
          <Badge className={getPaymentStatusColor(status)}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "worker_earnings",
      header: "Earnings",
      cell: ({ row }) => {
        const earnings = row.getValue("worker_earnings")
        const fee = row.original.platform_fee || 0
        return (
          <div>
            <div className="text-green-600 font-medium">
              {row.original.currency || 'MAD'} {parseFloat(earnings).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              Fee: {row.original.currency || 'MAD'} {parseFloat(fee).toFixed(2)}
            </div>
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
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return (
          <div className="text-sm">
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
        const payment = row.original
        const currentStatus = payment.status || 'pending'

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
              <ViewPaymentModal payment={payment} onRefund={handleRefund}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              </ViewPaymentModal>

              <DropdownMenuItem onClick={() => console.log("Download receipt:", payment.id)}>
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Status
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => handleStatusUpdate(payment.id, 'pending')}
                      disabled={currentStatus === 'pending'}
                    >
                      <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                      Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusUpdate(payment.id, 'completed')}
                      disabled={currentStatus === 'completed'}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                      Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusUpdate(payment.id, 'failed')}
                      disabled={currentStatus === 'failed'}
                    >
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      Failed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusUpdate(payment.id, 'refunded')}
                      disabled={currentStatus === 'refunded'}
                    >
                      <RotateCcw className="mr-2 h-4 w-4 text-gray-600" />
                      Refunded
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusUpdate(payment.id, 'cancelled')}
                      disabled={currentStatus === 'cancelled'}
                    >
                      <Ban className="mr-2 h-4 w-4 text-gray-600" />
                      Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {(payment.status === 'completed' || payment.payment_status === 'completed') && (
                <DropdownMenuItem onClick={() => handleRefund(payment.id)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Process Refund
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <DataTable
        data={payments}
        columns={columns}
      />
    </div>
  )
}
