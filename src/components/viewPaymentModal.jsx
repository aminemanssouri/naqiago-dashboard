"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { 
  Loader2, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  CreditCard, 
  Download, 
  RefreshCw 
} from "lucide-react"
import { getPayment } from "@/services/payments"
import { toast } from "sonner"

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

export function ViewPaymentModal({ payment, children, onRefund }) {
  const [open, setOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleOpenChange = async (isOpen) => {
    setOpen(isOpen)
    
    if (isOpen && payment) {
      try {
        setLoading(true)
        const fullPayment = await getPayment(payment.id)
        setSelectedPayment(fullPayment)
      } catch (error) {
        toast.error("Failed to load payment details")
        setOpen(false)
      } finally {
        setLoading(false)
      }
    } else {
      setSelectedPayment(null)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setSelectedPayment(null)
  }

  const handleRefund = () => {
    if (onRefund && selectedPayment) {
      onRefund(selectedPayment.id)
      handleClose()
    }
  }

  if (!payment) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>
            View complete information about this payment transaction
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : selectedPayment ? (
          <div className="space-y-6">
            {/* Payment Status Banner */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <Badge className={`${getPaymentStatusColor(selectedPayment.status || selectedPayment.payment_status)} mt-1`}>
                  {selectedPayment.status || selectedPayment.payment_status}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: selectedPayment.currency || "MAD",
                  }).format(selectedPayment.amount)}
                </p>
              </div>
            </div>

            {/* Payment Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Payment Information
                  </h3>
                  <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Payment ID</p>
                      <p className="font-mono text-sm">{selectedPayment.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction ID</p>
                      <p className="font-mono text-sm">
                        {selectedPayment.gateway_transaction_id || selectedPayment.transaction_id || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Method</p>
                      <Badge className="mt-1">
                        <CreditCard className="mr-1 h-3 w-3" />
                        {selectedPayment.payment_method}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created At</p>
                      <p className="text-sm flex items-center mt-1">
                        <Calendar className="mr-2 h-3 w-3" />
                        {new Date(selectedPayment.created_at).toLocaleString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {selectedPayment.processed_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">Processed At</p>
                        <p className="text-sm flex items-center mt-1">
                          <Calendar className="mr-2 h-3 w-3" />
                          {new Date(selectedPayment.processed_at).toLocaleString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Information */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Booking Information
                  </h3>
                  <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Booking ID</p>
                      <p className="font-mono text-sm">
                        {selectedPayment.booking_id ? selectedPayment.booking_id.slice(0, 16) + '...' : 'N/A'}
                      </p>
                    </div>
                    {selectedPayment.booking?.booking_number && (
                      <div>
                        <p className="text-xs text-muted-foreground">Booking Number</p>
                        <p className="font-medium text-sm">{selectedPayment.booking.booking_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Customer Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <div className="font-medium">
                        {selectedPayment.customer?.full_name || 'Unknown'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="font-medium">
                        {selectedPayment.customer?.email || 'No email'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <div className="font-medium">
                        {selectedPayment.customer?.phone || 'No phone'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Breakdown */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Financial Breakdown
                  </h3>
                  <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: selectedPayment.currency || "MAD",
                        }).format(selectedPayment.amount)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Platform Fee</p>
                      <p className="text-sm font-medium">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: selectedPayment.currency || "MAD",
                        }).format(selectedPayment.platform_fee || 0)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Worker Earnings</p>
                      <p className="text-sm font-medium text-green-600">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: selectedPayment.currency || "MAD",
                        }).format(selectedPayment.worker_earnings || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </Button>
              {(selectedPayment.status === 'completed' || selectedPayment.payment_status === 'completed') && (
                <Button 
                  variant="destructive"
                  onClick={handleRefund}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Process Refund
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No payment data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
