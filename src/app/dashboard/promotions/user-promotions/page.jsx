import Link from "next/link";

import { DashboardPage, DashboardPlaceholder } from "@/components/dashboard-page";
import { Button } from "@/components/ui/button";

export default function UserPromotionsPage() {
  return (
    <DashboardPage
      title="User promotions"
      description="Review which customers redeemed each promotion and the bookings they influenced."
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Promotions", href: "/dashboard/promotions" },
        { label: "User promotions" },
      ]}
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/promotions">Back to promotions</Link>
        </Button>
      }
    >
      <DashboardPlaceholder
        heading='Inspect the "user_promotions" table'
        description="Connect promo redemptions with booking outcomes and customer lifetime value."
      >
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Show the linked booking and timestamp for each redemption using <code>used_at</code>.
          </li>
          <li>
            Blend in customer info from <code>profiles</code> to target re-engagement campaigns.
          </li>
          <li>
            Flag overuse scenarios when counts exceed <code>per_user_limit</code>.
          </li>
        </ul>
      </DashboardPlaceholder>
    </DashboardPage>
  );
}
