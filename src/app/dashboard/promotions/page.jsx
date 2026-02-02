import Link from "next/link";

import { DashboardPage, DashboardPlaceholder } from "@/components/dashboard-page";
import { Button } from "@/components/ui/button";

export default function PromotionsPage() {
  return (
    <DashboardPage
      title="Promotions"
      description="Control promo code lifecycle, usage limits, and campaign effectiveness."
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Promotions" },
      ]}
      actions={
        <Button size="sm" asChild>
          <Link href="https://app.supabase.com" target="_blank" rel="noopener noreferrer">
            Manage in Supabase
          </Link>
        </Button>
      }
    >
      <DashboardPlaceholder
        heading='Sync the "promotions" table'
        description="Highlight active offers, scheduled expirations, and performance metrics."
      >
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Display usage counts and limits to monitor redemptions.
          </li>
          <li>
            Filter by status where <code>is_active</code> is true and <code>valid_until</code> is in the future.
          </li>
          <li>
            Build a promotion detail view that aggregates related bookings and revenue uplift.
          </li>
        </ul>
      </DashboardPlaceholder>
    </DashboardPage>
  );
}
