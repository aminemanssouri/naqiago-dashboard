"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard-page";
import { FilterSection, FILTER_PRESETS } from "@/components/filter-section";
import { CustomersTable } from "@/components/customers-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Download } from "lucide-react";
import { getCustomers, getCustomerStats } from "@/services/customers";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCSV, EXPORT_COLUMNS } from "@/utils/export";
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession } from "@/services/supabaseClient";

export default function CustomersPage() {
  const router = useRouter();
  const { loading: authLoading, profile } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const isMounted = useRef(true);
  const [statsFetched, setStatsFetched] = useState(false); // Resets on every mount
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    is_verified: "",
    sortBy: "created_at",
    sortOrder: "desc",
    page: 1,
    limit: 10000,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Fetch customers - relies on global timeout in supabaseClient
  const fetchCustomers = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      setLoading(true);
      
      // Ensure session is fresh before fetching
      await ensureSession();

      const response = await getCustomers(filters);

      if (isMounted.current && response && response.data) {
        setCustomers(response.data);
        setPagination(response.pagination);
      } else if (isMounted.current) {
        setCustomers([]);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      if (isMounted.current) {
        if (error.name !== 'AbortError') {
          toast.error("Failed to load customers");
        }
        setCustomers([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      const data = await getCustomerStats();
      if (isMounted.current) {
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      setLoading(false);
    };
  }, []);

  // Main data fetching effect - waits for auth to complete
  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      return;
    }

    // Don't fetch if no profile (user not authenticated)
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    // Fetch customers when filters change or on initial load
    fetchCustomers();
  }, [
    authLoading,
    profile?.id,
    filters.search,
    filters.status,
    filters.is_verified,
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    filters.limit,
    fetchCustomers
  ]);

  // Fetch stats once when auth is ready
  useEffect(() => {
    if (authLoading || !profile?.id) return;

    if (!statsFetched) {
      fetchStats();
      setStatsFetched(true);
    }
  }, [authLoading, profile?.id, statsFetched, fetchStats]);

  // Handle search
  const handleSearch = (value) => {
    setFilters((prev) => ({
      ...prev,
      search: value,
      page: 1,
    }));
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  // Handle CSV export
  const handleExport = () => {
    if (!customers || customers.length === 0) {
      toast.error("No customers to export");
      return;
    }
    const success = exportToCSV(customers, EXPORT_COLUMNS.customers, 'customers');
    if (success) {
      toast.success(`Exported ${customers.length} customers to CSV`);
    }
  };

  return (
    <DashboardPage
      title="Customers Management"
      description="View and manage all your customers"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Customers" },
      ]}

    >
      <div className="space-y-6">
        {/* Filters */}
        <FilterSection
          title="Filter Customers"
          description="Search and filter your customer list"
          searchConfig={{
            placeholder: "Search by name, email, or phone...",
            value: filters.search,
            onChange: handleSearch
          }}
          filters={[
            {
              key: 'status',
              label: 'Status',
              placeholder: 'All Status',
              value: filters.status,
              onChange: (value) => handleFilterChange('status', value),
              options: FILTER_PRESETS.status.withSuspended
            },
            {
              key: 'is_verified',
              label: 'Verification',
              placeholder: 'Verification',
              value: filters.is_verified,
              onChange: (value) => handleFilterChange('is_verified', value),
              options: FILTER_PRESETS.verification
            }
          ]}
          onClearAll={() => {
            setFilters(prev => ({
              ...prev,
              search: '',
              status: '',
              is_verified: '',
              page: 1
            }))
          }}
        />

        {/* Customers Table */}
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => router.push('/dashboard/customers/create')}>
                <UserPlus className="h-4 w-4 mr-2" />
                New Customer
              </Button>
            </div>
            <CustomersTable
              customers={customers}
              pagination={pagination}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
              onRefresh={fetchCustomers} // Add this to refresh after delete
            />
          </>
        )}
      </div>
    </DashboardPage>
  );
}
