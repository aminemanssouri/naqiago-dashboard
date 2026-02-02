import Link from "next/link";

import { DashboardPage, DashboardPlaceholder } from "@/components/dashboard-page";
import { Button } from "@/components/ui/button";

export default function CustomerAddressesPage() {
  return (
    <DashboardPage
      title="Customer addresses"
      description="Keep delivery and service locations accurate, with support for defaults and geo coordinates."
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Customers", href: "/dashboard/customers" },
        { label: "Addresses" },
      ]}
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/customers">Back to customers</Link>
        </Button>
      }
    >
      <DashboardPlaceholder
        heading='Map the "addresses" table'
        description="Display saved locations, geocode them, and flag incomplete records."
      >
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Show validation status and <code>is_default</code> badges for each entry.
          </li>
          <li>
            Integrate a map preview using <code>latitude</code> and <code>longitude</code> to verify coverage.
          </li>
          <li>
            Offer quick edits that update Supabase via mutations with optimistic UI.
          </li>
        </ul>
      </DashboardPlaceholder>
    </DashboardPage>
  );
}
