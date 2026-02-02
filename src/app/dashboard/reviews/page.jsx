import Link from "next/link";

import { DashboardPage, DashboardPlaceholder } from "@/components/dashboard-page";
import { Button } from "@/components/ui/button";

export default function ReviewsPage() {
  return (
    <DashboardPage
      title="Reviews"
      description="Track service quality, punctuality, and customer sentiment for every completed booking."
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Reviews" },
      ]}
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/bookings">Open related bookings</Link>
        </Button>
      }
    >
      <DashboardPlaceholder
        heading='Use the "reviews" table'
        description="Summarize ratings, highlight trends, and escalate low scores."
      >
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Calculate averages for overall, service quality, punctuality, and communication.
          </li>
          <li>
            Link photos stored in the array column to provide visual proof.
          </li>
          <li>
            Display verification state and featured flags to manage marketing assets.
          </li>
        </ul>
      </DashboardPlaceholder>
    </DashboardPage>
  );
}
