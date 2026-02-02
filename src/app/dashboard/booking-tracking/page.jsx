import Link from "next/link";

import { DashboardPage, DashboardPlaceholder } from "@/components/dashboard-page";
import { Button } from "@/components/ui/button";

export default function BookingTrackingPage() {
  return (
    <DashboardPage
      title="Booking tracking"
      description="Follow on-site progress, worker location updates, and completion ETAs in real time."
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Booking tracking" },
      ]}
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/bookings">View bookings</Link>
        </Button>
      }
    >
      <DashboardPlaceholder
        heading='Wire data from the "booking_tracking" table'
        description="Visualize worker assignments, last-known coordinates, and status transitions."
      >
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Render a geo or timeline visualization by reading <code>location</code> and <code>status</code> columns.
          </li>
          <li>
            Highlight stalled jobs by comparing <code>estimated_completion</code> with live data from Supabase.
          </li>
          <li>
            Surface worker contact details using the <code>worker_profiles</code> relationship.
          </li>
        </ul>
      </DashboardPlaceholder>
    </DashboardPage>
  );
}
