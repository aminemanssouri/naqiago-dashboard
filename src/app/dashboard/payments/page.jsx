import { DashboardPage } from "@/components/dashboard-page";
import { PaymentsTable } from "@/components/payments-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentsPage() {
  return (
    <DashboardPage
      title="Payments"
      description="Monitor cash flow and payment status at a glance."
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Payments" },
      ]}
    > <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Track all transactions, filter by status, and manage refunds seamlessly.
          </p>

          <PaymentsTable />
        </CardContent>
      </Card>
       
    </DashboardPage>
  );
}
