"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardPage } from "@/components/dashboard-page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, RefreshCw, Calendar, User, Car, Clock } from 'lucide-react'
import { getBookingsWithLocations } from '@/services/map'
import { cn } from '@/lib/utils'

// Google Maps API key - loaded from environment variable
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

// Status colors for markers
const STATUS_COLORS = {
    pending: '#F59E0B',     // Yellow
    confirmed: '#3B82F6',   // Blue  
    in_progress: '#8B5CF6', // Purple
    completed: '#10B981',   // Green
    cancelled: '#EF4444'    // Red
}

export default function MapPage() {
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const markersRef = useRef([])
    const infoWindowRef = useRef(null)

    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [statusFilter, setStatusFilter] = useState('all')
    const [refreshing, setRefreshing] = useState(false)

    // Load Google Maps script - prevent duplicate loading
    useEffect(() => {
        // If Google Maps is already loaded, just set the state
        if (window.google?.maps) {
            setMapLoaded(true)
            return
        }

        // Check if script is already being loaded or exists
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
        if (existingScript) {
            // Script exists, wait for it to load
            if (window.google?.maps) {
                setMapLoaded(true)
            } else {
                existingScript.addEventListener('load', () => setMapLoaded(true))
            }
            return
        }

        // Create and load new script
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
        script.async = true
        script.defer = true
        script.id = 'google-maps-script'
        script.onload = () => setMapLoaded(true)
        script.onerror = () => console.error('Failed to load Google Maps')
        document.head.appendChild(script)

        // No cleanup - we want the script to persist
    }, [])

    // Fetch bookings with location data
    const fetchBookings = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getBookingsWithLocations({ status: statusFilter === 'all' ? null : statusFilter })
            setBookings(data || [])
        } catch (error) {
            console.error('Error fetching bookings:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [statusFilter])

    useEffect(() => {
        fetchBookings()
    }, [fetchBookings])

    // Initialize map when Google Maps is loaded
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return

        // Default center: Morocco (Casablanca area)
        const defaultCenter = { lat: 33.5731, lng: -7.5898 }

        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 10,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ],
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true
        })

        infoWindowRef.current = new window.google.maps.InfoWindow()
    }, [mapLoaded])

    // Update markers when bookings change
    useEffect(() => {
        if (!mapInstanceRef.current || !bookings.length) return

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null))
        markersRef.current = []

        const bounds = new window.google.maps.LatLngBounds()

        bookings.forEach(booking => {
            // Try to get coordinates from address or service_location
            const lat = booking.address?.latitude || booking.service_location?.lat
            const lng = booking.address?.longitude || booking.service_location?.lng

            if (!lat || !lng) return

            const position = { lat: parseFloat(lat), lng: parseFloat(lng) }
            bounds.extend(position)

            // Create custom marker
            const marker = new window.google.maps.Marker({
                position,
                map: mapInstanceRef.current,
                title: booking.booking_number,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: STATUS_COLORS[booking.status] || '#6B7280',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 10
                }
            })

            // Add click listener for info window
            marker.addListener('click', () => {
                const content = `
          <div style="padding: 8px; min-width: 200px; font-family: system-ui, sans-serif;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">
              ${booking.booking_number}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              <strong>Customer:</strong> ${booking.customer?.full_name || 'N/A'}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              <strong>Service:</strong> ${booking.service?.title || 'N/A'}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              <strong>Vehicle:</strong> ${booking.vehicle_make || ''} ${booking.vehicle_model || ''} (${booking.vehicle_type || 'N/A'})
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              <strong>Date:</strong> ${booking.scheduled_date} at ${booking.scheduled_time}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
              <strong>Address:</strong> ${booking.service_address_text || 'N/A'}
            </div>
            <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background: ${STATUS_COLORS[booking.status]}20; color: ${STATUS_COLORS[booking.status]};">
              ${booking.status?.toUpperCase()}
            </div>
          </div>
        `
                infoWindowRef.current.setContent(content)
                infoWindowRef.current.open(mapInstanceRef.current, marker)
            })

            markersRef.current.push(marker)
        })

        // Fit map to show all markers
        if (markersRef.current.length > 0) {
            mapInstanceRef.current.fitBounds(bounds)
            // Don't zoom in too much
            const listener = window.google.maps.event.addListener(mapInstanceRef.current, 'idle', () => {
                if (mapInstanceRef.current.getZoom() > 15) {
                    mapInstanceRef.current.setZoom(15)
                }
                window.google.maps.event.removeListener(listener)
            })
        }
    }, [bookings, mapLoaded])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchBookings()
    }

    // Count bookings by status
    const statusCounts = bookings.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1
        return acc
    }, {})

    return (
        <DashboardPage
            title="Booking Locations"
            description="View all booking locations on the map"
            breadcrumb={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Map", href: "/dashboard/map" }
            ]}
            action={
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                    Refresh
                </Button>
            }
        >
            <div className="space-y-4">
                {/* Stats Bar */}
                <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {bookings.length} locations
                        </Badge>
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <Badge
                                key={status}
                                variant="secondary"
                                style={{
                                    backgroundColor: `${STATUS_COLORS[status]}20`,
                                    color: STATUS_COLORS[status]
                                }}
                            >
                                {status}: {count}
                            </Badge>
                        ))}
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Bookings</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Map Container */}
                <Card className="overflow-hidden">
                    <CardContent className="p-0">
                        {loading && !mapLoaded ? (
                            <Skeleton className="w-full h-[600px]" />
                        ) : (
                            <div
                                ref={mapRef}
                                className="w-full h-[600px] bg-muted"
                                style={{ minHeight: '600px' }}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Legend */}
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">Legend</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(STATUS_COLORS).map(([status, color]) => (
                                <div key={status} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full border border-white shadow"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardPage>
    )
}
