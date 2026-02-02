import Link from "next/link";

import { DashboardPage, DashboardPlaceholder } from "@/components/dashboard-page";
import { Button } from "@/components/ui/button";

export default function ActivityLogsPage() {
  return (
    <DashboardPage
      title="Activity logs"
      description="Inspect every significant action captured across the platform for compliance and debugging."
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Activity logs" },
      ]}
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link href="https://supabase.com/docs/guides/platform/logs" target="_blank" rel="noopener noreferrer">
            View logging docs
          </Link>
        </Button>
      }
    >
      <DashboardPlaceholder
        heading='Query the "activity_logs" table'
        description="Provide search, filtering, and export tooling for compliance investigations."
      >
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Display action summaries alongside the actor and affected entities.
          </li>
          <li>
            Visualize request origin data using <code>ip_address</code> and parsed <code>user_agent</code>.
          </li>
          <li>
            Offer CSV export backed by Supabase SQL or storage functions.
          </li>
        </ul>
      </DashboardPlaceholder>
    </DashboardPage>
  );
}
