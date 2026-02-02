"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, X, Filter, Calendar } from 'lucide-react'

/**
 * FilterSection - A reusable filter component for dashboard pages
 * 
 * @param {Object} props
 * @param {string} props.title - Title of the filter section (optional)
 * @param {string} props.description - Description text (optional)
 * @param {Object} props.searchConfig - Search input configuration
 * @param {string} props.searchConfig.placeholder - Search placeholder text
 * @param {string} props.searchConfig.value - Current search value
 * @param {function} props.searchConfig.onChange - Search change handler
 * @param {Array} props.filters - Array of filter configurations
 * @param {Object} props.dateRangeConfig - Date range filter configuration
 * @param {string} props.dateRangeConfig.fromValue - From date value
 * @param {string} props.dateRangeConfig.toValue - To date value
 * @param {function} props.dateRangeConfig.onFromChange - From date change handler
 * @param {function} props.dateRangeConfig.onToChange - To date change handler
 * @param {string} props.dateRangeConfig.fromLabel - Optional label for from date
 * @param {string} props.dateRangeConfig.toLabel - Optional label for to date
 * @param {function} props.onClearAll - Clear all filters handler (optional)
 * @param {React.ReactNode} props.children - Additional custom filter elements
 * 
 * Filter configuration object:
 * {
 *   key: string,           // Unique filter key
 *   label: string,         // Display label
 *   placeholder: string,   // Placeholder text
 *   value: string,         // Current value
 *   onChange: function,    // Change handler (receives value)
 *   options: Array<{value: string, label: string, icon?: Component}>,
 *   width: string,         // Optional width class (e.g., "w-[180px]")
 * }
 */
export function FilterSection({
    title,
    description,
    searchConfig,
    filters = [],
    dateRangeConfig,
    onClearAll,
    children,
    className = "",
}) {
    // Check if any filters are active (not 'all' or empty)
    const hasActiveFilters = filters.some(f => f.value && f.value !== 'all' && f.value !== '') ||
        (searchConfig?.value && searchConfig.value !== '') ||
        (dateRangeConfig?.fromValue && dateRangeConfig.fromValue !== '') ||
        (dateRangeConfig?.toValue && dateRangeConfig.toValue !== '')

    return (
        <Card className={className}>
            {(title || description) && (
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-muted-foreground" />
                            {title && <CardTitle>{title}</CardTitle>}
                        </div>
                        {hasActiveFilters && onClearAll && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClearAll}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear All
                            </Button>
                        )}
                    </div>
                    {description && (
                        <CardDescription>{description}</CardDescription>
                    )}
                </CardHeader>
            )}
            <CardContent className={title || description ? "" : "pt-6"}>
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Search Input */}
                    {searchConfig && (
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={searchConfig.placeholder || "Search..."}
                                    value={searchConfig.value}
                                    onChange={(e) => searchConfig.onChange(e.target.value)}
                                    className="pl-9 w-full"
                                />
                                {searchConfig.value && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                        onClick={() => searchConfig.onChange('')}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Dynamic Filters */}
                    {filters.map((filter) => (
                        <Select
                            key={filter.key}
                            value={filter.value || 'all'}
                            onValueChange={(value) => filter.onChange(value === 'all' ? '' : value)}
                        >
                            <SelectTrigger className={filter.width || "w-[150px]"}>
                                <SelectValue placeholder={filter.placeholder || filter.label} />
                            </SelectTrigger>
                            <SelectContent>
                                {filter.options.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            {option.icon && <option.icon className="h-4 w-4" />}
                                            {option.color && (
                                                <div className={`w-2 h-2 rounded-full ${option.color}`} />
                                            )}
                                            {option.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ))}

                    {/* Date Range Filter */}
                    {dateRangeConfig && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <Input
                                type="date"
                                value={dateRangeConfig.fromValue || ''}
                                onChange={(e) => dateRangeConfig.onFromChange(e.target.value)}
                                className="w-[140px]"
                                title={dateRangeConfig.fromLabel || "From date"}
                            />
                            <span className="text-muted-foreground text-sm">to</span>
                            <Input
                                type="date"
                                value={dateRangeConfig.toValue || ''}
                                onChange={(e) => dateRangeConfig.onToChange(e.target.value)}
                                className="w-[140px]"
                                title={dateRangeConfig.toLabel || "To date"}
                            />
                        </div>
                    )}

                    {/* Additional custom elements */}
                    {children}
                </div>
            </CardContent>
        </Card>
    )
}

/**
 * Common filter option presets for reuse across pages
 */
export const FILTER_PRESETS = {
    status: {
        default: [
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
        ],
        withSuspended: [
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'suspended', label: 'Suspended' },
        ],
        withDraft: [
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'draft', label: 'Draft' },
        ],
        booking: [
            { value: 'all', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
        ],
    },
    verification: [
        { value: 'all', label: 'All' },
        { value: 'verified', label: 'Verified' },
        { value: 'unverified', label: 'Unverified' },
    ],
    readStatus: [
        { value: 'all', label: 'All Status' },
        { value: 'unread', label: 'Unread' },
        { value: 'read', label: 'Read' },
    ],
    featured: [
        { value: 'all', label: 'All' },
        { value: 'featured', label: 'Featured' },
        { value: 'not-featured', label: 'Not Featured' },
    ],
    paymentStatus: [
        { value: 'all', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'paid', label: 'Paid' },
        { value: 'partial', label: 'Partial' },
        { value: 'refunded', label: 'Refunded' },
        { value: 'failed', label: 'Failed' },
    ],
}

export default FilterSection

