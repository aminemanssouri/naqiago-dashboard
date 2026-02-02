"use client"

import * as React from "react"
import { useEffect } from "react"
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  CreditCard, 
  Bell,
  HelpCircle,
  UserCircle 
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"

export function UserProfileDropdown() {
  const router = useRouter()
  const { user, profile, signOut } = useAuth()

  // Debug logging
  useEffect(() => {
    
  }, [user, profile])

  // Get user initials from full name
  const getInitials = (name) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Format role for display
  const getRoleDisplay = (role) => {
    if (!role) return "User"
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  const handleSignOut = async () => {
    try {
      // Redirect first for instant feedback
      router.push("/login")
      
      // Then sign out in the background
      await signOut()
      
      toast.success("Logged out successfully")
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to log out")
    }
  }

  const handleProfileClick = () => {
    router.push("/dashboard/profile")
  }

  const handleSettingsClick = () => {
    router.push("/dashboard/settings")
  }

  const handleNotificationsClick = () => {
    router.push("/dashboard/notifications")
  }

  // Use real user data
  const userName = profile?.full_name || user?.email?.split("@")[0] || "User"
  const userEmail = user?.email || ""
  const userAvatar = profile?.avatar_url || ""
  const userRole = getRoleDisplay(profile?.role)
  const userInitials = getInitials(userName)

  // Add cache buster to avatar URL to force refresh - use profile.updated_at or avatar_url as cache key
  const avatarUrl = React.useMemo(() => {
    if (!userAvatar) return ""
    // Use the avatar URL itself as cache buster to only reload when URL actually changes
    const timestamp = profile?.updated_at ? new Date(profile.updated_at).getTime() : Date.now()
    return `${userAvatar}?t=${timestamp}`
  }, [userAvatar, profile?.updated_at])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={avatarUrl} 
              alt={userName}
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={avatarUrl} 
                  alt={userName}
                  key={avatarUrl} // Force re-render when avatar changes
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail}
                  </p>
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {userRole}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
         
          <DropdownMenuItem onClick={handleNotificationsClick} className="cursor-pointer">
            <Bell className="mr-2 h-4 w-4" />
            <span>Notification</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
       
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}