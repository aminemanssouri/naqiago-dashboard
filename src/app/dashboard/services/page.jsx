"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage } from "@/components/dashboard-page";
import { FilterSection, FILTER_PRESETS } from "@/components/filter-section";
import { ServicesTable } from "@/components/services-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { getServices, getServiceStats, getServiceCategories } from "@/services/services";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export default function ServicesPage() {
  const router = useRouter();
  const { loading: authLoading, profile } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const isMounted = useRef(true);
  const lastFetchedProfileId = useRef(null);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    featured: "",
    minPrice: "",
    maxPrice: "",
    includes: [],
    excludes: [],
    sortBy: "created_at",
    sortOrder: "desc",
    page: 1,
    limit: 1000,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Fetch services - relies on global timeout in supabaseClient
  const fetchServices = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      setLoading(true);

      const response = await getServices(filters);

      if (isMounted.current && response && response.data) {
        setServices(response.data);
        setPagination(response.pagination);
      } else if (isMounted.current) {
        setServices([]);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      if (isMounted.current) {
        // Don't show toast for abort errors (user navigated away)
        if (error.name !== 'AbortError') {
          toast.error("Failed to load services. Please refresh the page.");
        }
        setServices([]);
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
      const data = await getServiceStats();
      if (isMounted.current) {
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      const data = await getServiceCategories();
      if (isMounted.current) {
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  // Fetch all services for includes/excludes
  const fetchAllServices = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      const response = await getServices({ limit: 1000, page: 1 });
      if (response && response.data && isMounted.current) {
        const uniqueServices = response.data.reduce((acc, s) => {
          const serviceId = s.id || s._id;
          if (!acc.find(item => item.value === serviceId)) {
            const label = s.key && s.key !== s.title
              ? `${s.title} (${s.key})`
              : s.title;

            acc.push({
              value: serviceId,
              label: label
            });
          }
          return acc;
        }, []);

        setAllServices(uniqueServices);
      }
    } catch (error) {
      console.error("Error fetching all services:", error);
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
    if (authLoading) return;

    if (!profile?.id) {
      setLoading(false);
      return;
    }

    fetchServices();
  }, [
    authLoading,
    profile?.id,
    filters.search,
    filters.category,
    filters.status,
    filters.featured,
    filters.minPrice,
    filters.maxPrice,
    JSON.stringify(filters.includes),
    JSON.stringify(filters.excludes),
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    filters.limit,
    fetchServices
  ]);

  // Fetch stats, categories, and all services once when auth is ready
  useEffect(() => {
    if (authLoading || !profile?.id) return;

    const shouldFetch = lastFetchedProfileId.current !== profile.id || !stats;
    if (shouldFetch) {
      fetchStats();
      fetchCategories();
      fetchAllServices();
      lastFetchedProfileId.current = profile.id;
    }
  }, [authLoading, profile?.id, stats, fetchStats, fetchCategories, fetchAllServices]);

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

  // Handle price filter
  const handlePriceFilter = (min, max) => {
    setFilters((prev) => ({
      ...prev,
      minPrice: min || null,
      maxPrice: max || null,
      page: 1,
    }));
  };

  return (
    <DashboardPage
      title="Services Management"
      description="Manage your service offerings and pricing"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Services" },
      ]}

    >
      <div className="space-y-6">
        {/* Filters */}
        <FilterSection
          title="Filter Services"
          description="Search and filter your service listings"
          searchConfig={{
            placeholder: "Search by title or description...",
            value: filters.search,
            onChange: handleSearch
          }}
          filters={[
            {
              key: 'category',
              label: 'Category',
              placeholder: 'All Categories',
              value: filters.category,
              onChange: (value) => handleFilterChange('category', value),
              width: 'w-[180px]',
              options: [
                { value: 'all', label: 'All Categories' },
                ...categories.map(cat => ({ value: cat, label: cat }))
              ]
            },
            {
              key: 'status',
              label: 'Status',
              placeholder: 'All Status',
              value: filters.status,
              onChange: (value) => handleFilterChange('status', value),
              options: FILTER_PRESETS.status.withDraft
            },
            {
              key: 'featured',
              label: 'Featured',
              placeholder: 'Featured',
              value: filters.featured,
              onChange: (value) => handleFilterChange('featured', value),
              options: FILTER_PRESETS.featured
            }
          ]}
          onClearAll={() => {
            setFilters(prev => ({
              ...prev,
              search: '',
              category: '',
              status: '',
              featured: '',
              minPrice: '',
              maxPrice: '',
              page: 1
            }))
          }}
        >
          {/* Price Range - Custom children */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Price:</span>
            <Input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange("minPrice", e.target.value)}
              className="w-24"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">MAD</span>
          </div>
        </FilterSection>

        <div className="flex justify-end">
          <Button onClick={() => router.push('/dashboard/services/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>

        {/* Services Table */}
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

          <ServicesTable
            services={services}
            pagination={pagination}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            onRefresh={fetchServices}
          />
        )}
      </div>
    </DashboardPage>
  );
}
