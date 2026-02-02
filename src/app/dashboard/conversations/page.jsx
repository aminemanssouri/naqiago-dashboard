import Link from "next/link";

import { DashboardPage, DashboardPlaceholder } from "@/components/dashboard-page";
import { Button } from "@/components/ui/button";

export default function ConversationsPage() {
  return (
    <DashboardPage
      title="Conversations"
      description="Centralize customer and worker messaging to resolve issues faster."
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Conversations" },
      ]}
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/messages">View message log</Link>
        </Button>
      }
    >
      <DashboardPlaceholder
        heading='Load chats from the "conversations" table'
        description="Merge threads by booking and show the most recent activity at a glance."
      >
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Use Supabase row-level security to restrict visibility by user role when fetching data client-side.
          </li>
          <li>
            Join the related <code>messages</code> table to display the latest sender, snippet, and unread count.
          </li>
          <li>
            Add quick actions for escalating chats or opening the associated booking detail view.
          </li>
        </ul>
      </DashboardPlaceholder>
    </DashboardPage>
  );
}
