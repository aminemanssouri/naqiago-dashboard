"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { DashboardPage } from '@/components/dashboard-page'
import { CustomerForm } from '@/components/CustomerForm'
import { getCustomer } from '@/services/customers'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

export default function EditCustomerPage() {
  const params = useParams()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true)
        const data = await getCustomer(params.id)
        
        if (data) {
          setCustomer(data)
        } else {
          setError('Customer not found')
        }
      } catch (err) {
        console.error('Error fetching customer:', err)
        setError('Failed to load customer data')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchCustomer()
    }
  }, [params.id])

  return (
    <DashboardPage
      title="Edit Customer"
      description="Update customer information and preferences"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Customers", href: "/dashboard/customers" },
        { label: customer?.full_name || 'Edit', href: `/dashboard/customers/${params.id}` },
        { label: "Edit" }
      ]}
    >
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : customer ? (
        <CustomerForm customer={customer} mode="edit" />
      ) : null}
    </DashboardPage>
  )
}