"use client"

import { useState, useEffect } from 'react'
import { Bell, Check, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardPage } from '@/components/dashboard-page'
import { FilterSection, FILTER_PRESETS } from '@/components/filter-section'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  deleteMultipleNotifications,
  deleteAllRead,
  subscribeToNotifications,
  unsubscribeFromNotifications
} from '@/services/notifications'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function NotificationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)

      const filters = {}
      if (filterType !== 'all') filters.type = filterType
      if (filterStatus === 'unread') filters.unread_only = true
      if (filterStatus === 'read') filters.read_only = true
      if (searchQuery) filters.search = searchQuery

      const result = await getNotifications({
        ...filters,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      })

      setNotifications(result.data)
      setTotalPages(Math.ceil(result.count / itemsPerPage))

      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle mark as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      toast.success('Marked as read')
    } catch (error) {
      console.error('Error marking as read:', error)
      toast.error('Failed to mark as read')
    }
  }

  // Handle mark selected as read
  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.length === 0) return

    try {
      await markMultipleAsRead(selectedIds)
      setNotifications(prev =>
        prev.map(n =>
          selectedIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      )

      const unreadSelected = notifications.filter(
        n => selectedIds.includes(n.id) && !n.is_read
      ).length
      setUnreadCount(prev => Math.max(0, prev - unreadSelected))

      setSelectedIds([])
      toast.success(`Marked ${selectedIds.length} notifications as read`)
    } catch (error) {
      console.error('Error marking as read:', error)
      toast.error('Failed to mark as read')
    }
  }

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Failed to mark all as read')
    }
  }

  // Handle delete
  const handleDelete = async (notificationId) => {
    setDeleteTarget(notificationId)
    setShowDeleteDialog(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    try {
      if (deleteTarget === 'selected') {
        await deleteMultipleNotifications(selectedIds)

        const unreadSelected = notifications.filter(
          n => selectedIds.includes(n.id) && !n.is_read
        ).length
        setUnreadCount(prev => Math.max(0, prev - unreadSelected))

        setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)))
        setSelectedIds([])
        toast.success(`Deleted ${selectedIds.length} notifications`)
      } else if (deleteTarget === 'all-read') {
        const result = await deleteAllRead()
        await fetchNotifications()
        toast.success(`Deleted ${result.deleted} read notifications`)
      } else {
        await deleteNotification(deleteTarget)

        const notification = notifications.find(n => n.id === deleteTarget)
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }

        setNotifications(prev => prev.filter(n => n.id !== deleteTarget))
        toast.success('Notification deleted')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
    } finally {
      setShowDeleteDialog(false)
      setDeleteTarget(null)
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id)
    }

    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(notifications.map(n => n.id))
    } else {
      setSelectedIds([])
    }
  }

  // Handle select one
  const handleSelectOne = (notificationId, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, notificationId])
    } else {
      setSelectedIds(prev => prev.filter(id => id !== notificationId))
    }
  }

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    const iconMap = {
      booking_update: '📅',
      payment: '💳',
      message: '💬',
      promotion: '🎉',
      system: '⚙️'
    }
    return iconMap[type] || '🔔'
  }

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  // Subscribe to real-time notifications
  useEffect(() => {
    if (user?.id) {
      const subscription = subscribeToNotifications(user.id, (newNotification) => {
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)

        toast.info(newNotification.title, {
          description: newNotification.message
        })
      })

      return () => {
        unsubscribeFromNotifications(subscription)
      }
    }
  }, [user])

  // Fetch on mount and filter change
  useEffect(() => {
    fetchNotifications()
  }, [currentPage, filterType, filterStatus, searchQuery])

  return (
    <DashboardPage
      title="Notifications"
      description="Manage your notifications and stay updated"
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Notifications", href: "/dashboard/notifications" }
      ]}
      action={
        <div className="flex gap-2">
          <Button onClick={fetchNotifications} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <FilterSection
          title="Filters"
          searchConfig={{
            placeholder: "Search notifications...",
            value: searchQuery,
            onChange: setSearchQuery
          }}
          filters={[
            {
              key: 'type',
              label: 'Type',
              placeholder: 'All Types',
              value: filterType,
              onChange: setFilterType,
              width: 'w-[180px]',
              options: [
                { value: 'all', label: 'All Types' },
                { value: 'booking', label: 'Booking' },
                { value: 'payment', label: 'Payment' },
                { value: 'message', label: 'Message' },
                { value: 'promotion', label: 'Promotion' },
                { value: 'system', label: 'System' },
                { value: 'reminder', label: 'Reminder' },
              ]
            },
            {
              key: 'status',
              label: 'Status',
              placeholder: 'All Status',
              value: filterStatus,
              onChange: setFilterStatus,
              width: 'w-[180px]',
              options: FILTER_PRESETS.readStatus
            }
          ]}
          onClearAll={() => {
            setSearchQuery('')
            setFilterType('all')
            setFilterStatus('all')
          }}
        />

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkSelectedAsRead}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark as read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDeleteTarget('selected')
                    setShowDeleteDialog(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                >
                  Clear selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Notifications</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget('all-read')
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete all read
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-72" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <p className="mt-2 text-muted-foreground">No notifications found</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length === notifications.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notification) => (
                      <TableRow
                        key={notification.id}
                        className={`cursor-pointer ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-950' : ''
                          }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(notification.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOne(notification.id, checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-2xl">
                            {getNotificationIcon(notification.type)}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {notification.title}
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {notification.message}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{notification.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(notification.created_at)}
                        </TableCell>
                        <TableCell>
                          {notification.is_read ? (
                            <Badge variant="secondary">Read</Badge>
                          ) : (
                            <Badge variant="default">Unread</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDelete(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget === 'selected'
                  ? `This will permanently delete ${selectedIds.length} selected notifications.`
                  : deleteTarget === 'all-read'
                    ? 'This will permanently delete all read notifications.'
                    : 'This will permanently delete this notification.'}
                {' '}This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardPage>
  )
}
