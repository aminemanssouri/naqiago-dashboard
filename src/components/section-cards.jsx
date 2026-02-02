import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards({ data = {} }) {
  const defaultData = {
    totalRevenue: { value: "$0", change: 0, trend: "up" },
    newCustomers: { value: 0, change: 0, trend: "up" },
    activeAccounts: { value: 0, change: 0, trend: "up" },
    growthRate: { value: "0%", change: 0, trend: "up" },
  }

  const mergedData = { ...defaultData, ...data }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {mergedData.totalRevenue.value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {mergedData.totalRevenue.trend === "up" ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {mergedData.totalRevenue.change > 0 ? "+" : ""}
              {mergedData.totalRevenue.change.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {mergedData.totalRevenue.trend === "up"
              ? "Trending up"
              : "Trending down"}{" "}
            this month
            {mergedData.totalRevenue.trend === "up" ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            Revenue for the last 30 days
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>New Customers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {mergedData.newCustomers.value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {mergedData.newCustomers.trend === "up" ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {mergedData.newCustomers.change > 0 ? "+" : ""}
              {mergedData.newCustomers.change.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {mergedData.newCustomers.trend === "up"
              ? "Growing"
              : "Declining"}{" "}
            this period
            {mergedData.newCustomers.trend === "up" ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            Customer acquisition this month
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Workers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {mergedData.activeAccounts.value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {mergedData.activeAccounts.trend === "up" ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {mergedData.activeAccounts.change > 0 ? "+" : ""}
              {mergedData.activeAccounts.change.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong workforce availability
            {mergedData.activeAccounts.trend === "up" ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">Workers currently active</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Conversion Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {mergedData.growthRate.value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {mergedData.growthRate.trend === "up" ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {mergedData.growthRate.change > 0 ? "+" : ""}
              {mergedData.growthRate.change.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {mergedData.growthRate.trend === "up"
              ? "Excellent"
              : "Needs improvement"}{" "}
            performance
            {mergedData.growthRate.trend === "up" ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">Booking completion rate</div>
        </CardFooter>
      </Card>
    </div>
  )
}
