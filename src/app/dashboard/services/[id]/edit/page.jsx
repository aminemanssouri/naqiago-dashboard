"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { DashboardPage } from '@/components/dashboard-page'
import { ServiceForm } from '@/components/ServiceForm'
import { getService } from '@/services/services'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

export default function EditServicePage() {
  const params = useParams()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchService = async () => {
      try {
        setLoading(true)
        const data = await getService(params.id)
        
        if (data) {
          setService(data)
        } else {
          setError('Service not found')
        }
      } catch (err) {
        console.error('Error fetching service:', err)
        setError('Failed to load service data')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchService()
    }
  }, [params.id])

  return (
    <DashboardPage
      title="Edit Service"
      description="Update service information and settings"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Services", href: "/dashboard/services" },
        { label: service?.title || 'Edit', href: `/dashboard/services/${params.id}` },
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
      ) : service ? (
        <ServiceForm service={service} mode="edit" />
      ) : null}
    </DashboardPage>
  )
}
