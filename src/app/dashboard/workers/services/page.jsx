import Link from "next/link";

import { DashboardPage, DashboardPlaceholder } from "@/components/dashboard-page";
import { Button } from "@/components/ui/button";

export default function WorkerServicesPage() {
  return (
    <DashboardPage
      title="Worker services"
      description="Manage which workers deliver which services, custom pricing, and availability toggles."
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Workers", href: "/dashboard/workers" },
        { label: "Services" },
      ]}
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/workers">Back to workers</Link>
        </Button>
      }
    >
      <DashboardPlaceholder
        heading='Reference the "worker_services" table'
        description="Define each worker's offerings and override pricing when needed."
      >
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Display relationships between workers and services, including custom price overrides.
          </li>
          <li>
            Show whether an offering is active, and allow toggling <code>is_active</code> quickly.
          </li>
          <li>
            Provide call-to-action buttons to adjust availability or contact the worker.
          </li>
        </ul>
      </DashboardPlaceholder>
    </DashboardPage>
  );
}
