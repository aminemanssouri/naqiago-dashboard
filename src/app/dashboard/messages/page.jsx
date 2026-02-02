"use client"

import { ChatInterface } from "@/components/chat/ChatInterface"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardPage } from "@/components/dashboard-page"

export default function MessagesPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      <DashboardPage
        title="Support Messages"
        description="Communicate directly with registered workers"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Messages', href: '/dashboard/messages' }
        ]}
      >
        <ChatInterface />
      </DashboardPage>
    </ProtectedRoute>
  )
}
