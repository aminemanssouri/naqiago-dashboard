"use client"

import { DashboardPage } from '@/components/dashboard-page'
import { CustomerForm } from '@/components/CustomerForm'

export default function CreateCustomerPage() {
  return (
    <DashboardPage
      title="Add New Customer"
      description="Create a new customer account"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Customers", href: "/dashboard/customers" },
        { label: "New Customer" }
      ]}
    >
      <CustomerForm mode="create" />
    </DashboardPage>
  )
}