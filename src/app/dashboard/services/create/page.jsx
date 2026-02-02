"use client"

import { DashboardPage } from '@/components/dashboard-page'
import { ServiceForm } from '@/components/ServiceForm'

export default function CreateServicePage() {
  return (
    <DashboardPage
      title="Add New Service"
      description="Create a new service offering"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Services", href: "/dashboard/services" },
        { label: "New Service" }
      ]}
    >
      <ServiceForm mode="create" />
    </DashboardPage>
  )
}
