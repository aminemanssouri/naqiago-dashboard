/**
 * Export Utilities
 * Functions for exporting data to CSV format
 */

/**
 * Format a value for CSV export
 * @param {any} value - The value to format
 * @param {string} type - Optional type hint ('date', 'currency', 'boolean')
 * @returns {string} Formatted value
 */
export function formatValue(value, type = null) {
    if (value === null || value === undefined) {
        return ''
    }

    // Handle type-specific formatting
    if (type === 'date' || value instanceof Date) {
        const date = value instanceof Date ? value : new Date(value)
        if (isNaN(date.getTime())) return String(value)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (type === 'currency') {
        const num = parseFloat(value)
        if (isNaN(num)) return String(value)
        return num.toFixed(2)
    }

    if (type === 'boolean' || typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
    }

    // Handle objects and arrays
    if (typeof value === 'object') {
        return JSON.stringify(value)
    }

    return String(value)
}

/**
 * Get a nested property value from an object using dot notation
 * @param {Object} obj - The object to get the value from
 * @param {string} path - The path to the property (e.g., 'customer.full_name')
 * @returns {any} The value at the path
 */
export function getNestedValue(obj, path) {
    if (!obj || !path) return undefined

    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 * @param {string} value - The value to escape
 * @returns {string} Escaped value
 */
function escapeCSV(value) {
    const str = String(value)
    // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

/**
 * Convert data array to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions [{ key: 'field.path', label: 'Header', type: 'date' }]
 * @returns {string} CSV string
 */
export function convertToCSV(data, columns) {
    if (!data || data.length === 0) {
        return ''
    }

    // Create header row
    const headers = columns.map(col => escapeCSV(col.label))

    // Create data rows
    const rows = data.map(item => {
        return columns.map(col => {
            const value = getNestedValue(item, col.key)
            const formatted = formatValue(value, col.type)
            return escapeCSV(formatted)
        }).join(',')
    })

    // Combine headers and rows
    return [headers.join(','), ...rows].join('\n')
}

/**
 * Trigger a file download in the browser
 * @param {string} content - The file content
 * @param {string} filename - The filename (without extension)
 * @param {string} mimeType - The MIME type
 */
export function downloadFile(content, filename, mimeType = 'text/csv') {
    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + content], { type: `${mimeType};charset=utf-8` })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename

    // Trigger download
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * Export data to CSV file
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions [{ key: 'field.path', label: 'Header', type: 'date' }]
 * @param {string} filenamePrefix - Prefix for the filename (date will be appended)
 * @returns {boolean} True if export was successful
 */
export function exportToCSV(data, columns, filenamePrefix = 'export') {
    if (!data || data.length === 0) {
        return false
    }

    const csv = convertToCSV(data, columns)
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const filename = `${filenamePrefix}_${date}.csv`

    downloadFile(csv, filename)
    return true
}

// Pre-defined column configurations for common exports
export const EXPORT_COLUMNS = {
    customers: [
        { key: 'full_name', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status' },
        { key: 'language_preference', label: 'Language' },
        { key: 'loyalty_points', label: 'Loyalty Points' },
        { key: 'is_verified', label: 'Verified', type: 'boolean' },
        { key: 'created_at', label: 'Created At', type: 'date' },
    ],

    bookings: [
        { key: 'booking_number', label: 'Booking Number' },
        { key: 'customer.full_name', label: 'Customer' },
        { key: 'customer.email', label: 'Customer Email' },
        { key: 'service.title', label: 'Service' },
        { key: 'scheduled_date', label: 'Date', type: 'date' },
        { key: 'scheduled_time', label: 'Time' },
        { key: 'status', label: 'Status' },
        { key: 'vehicle_type', label: 'Vehicle Type' },
        { key: 'vehicle_make', label: 'Vehicle Make' },
        { key: 'vehicle_model', label: 'Vehicle Model' },
        { key: 'service_address_text', label: 'Address' },
        { key: 'total_price', label: 'Total Price (MAD)', type: 'currency' },
        { key: 'created_at', label: 'Created At', type: 'date' },
    ],

    payments: [
        { key: 'id', label: 'Payment ID' },
        { key: 'booking.booking_number', label: 'Booking Number' },
        { key: 'customer.full_name', label: 'Customer' },
        { key: 'customer.email', label: 'Customer Email' },
        { key: 'amount', label: 'Amount', type: 'currency' },
        { key: 'currency', label: 'Currency' },
        { key: 'payment_method', label: 'Payment Method' },
        { key: 'status', label: 'Status' },
        { key: 'worker_earnings', label: 'Worker Earnings', type: 'currency' },
        { key: 'platform_fee', label: 'Platform Fee', type: 'currency' },
        { key: 'processed_at', label: 'Processed At', type: 'date' },
        { key: 'created_at', label: 'Created At', type: 'date' },
    ],
}
