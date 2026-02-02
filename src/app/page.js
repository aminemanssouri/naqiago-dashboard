"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, Shield, Users, Calendar, BarChart3, 
  Sparkles, Star, CheckCircle, ArrowRight, Zap,
  Clock, DollarSign, Award, Smartphone, Globe,
  HeartHandshake, TrendingUp, UserCheck, Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

export default function Home() {
  const { isAuthenticated, profile, loading } = useAuth()
  const router = useRouter()
  const [hoveredCard, setHoveredCard] = useState(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const redirectAttempted = useRef(false)

  useEffect(() => {
    if (!loading && isAuthenticated && profile && !redirectAttempted.current) {
      redirectAttempted.current = true
      setIsRedirecting(true)
      
      // Determine the target dashboard
      let targetPath = '/dashboard'
      if (profile.role === 'admin') {
        targetPath = '/dashboard'
      } else if (profile.role === 'worker') {
        targetPath = '/worker/dashboard'
      }

      // Set a fallback timeout in case router.push fails silently
      const redirectFallbackTimeout = setTimeout(() => {
        console.warn('⚠️ Router redirect taking too long, using window.location')
        window.location.href = targetPath
      }, 3000) // 3 second fallback

      // Attempt the redirect
      router.push(targetPath)
        .then(() => {
          clearTimeout(redirectFallbackTimeout)
        })
        .catch((error) => {
          console.error('❌ Router.push failed:', error)
          clearTimeout(redirectFallbackTimeout)
          // Force navigation on error
          window.location.href = targetPath
        })
      
      return () => clearTimeout(redirectFallbackTimeout)
    }
  }, [isAuthenticated, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  const features = [
    {
      icon: Users,
      title: "Smart Customer Management",
      description: "AI-powered customer insights with complete history tracking",
      color: "text-primary",
      bgColor: "bg-primary/10 dark:bg-primary/20"
    },
    {
      icon: Calendar,
      title: "Intelligent Booking System",
      description: "Real-time scheduling with automated conflict resolution",
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30"
    },
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description: "Deep insights with predictive analytics and custom reports",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30"
    },
    {
      icon: Shield,
      title: "Bank-Level Security",
      description: "256-bit encryption with multi-factor authentication",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30"
    }
  ]

  const stats = [
    { label: "Active Users", value: "50K+", icon: UserCheck },
    { label: "Bookings Processed", value: "2M+", icon: Calendar },
    { label: "Revenue Generated", value: "$100M+", icon: DollarSign },
    { label: "Customer Rating", value: "4.9★", icon: Star }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="relative container mx-auto px-4 py-6 z-10">
        <div className="flex items-center justify-between backdrop-blur-sm bg-white/50 dark:bg-gray-900/50 rounded-2xl px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Shield className="h-10 w-10 text-primary" />
              <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-700 bg-clip-text text-transparent">
                NaqiAgo
              </h1>
              <p className="text-xs text-muted-foreground">Professional Services Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
           
            <Button 
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-primary to-purple-700 hover:from-primary/90 hover:to-purple-700/90"
            >
               Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative container mx-auto px-4 py-16 z-10">
        {/* Announcement Badge */}
        <div className="text-center mb-8">
          <Badge className="px-4 py-1.5 text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300">
            <Zap className="mr-2 h-3 w-3" />
            New: Scheduling Now Available
          </Badge>
        </div>

        <div className="text-center mb-16">
          <h2 className="text-6xl sm:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
              Transform Your
            </span>
            <br />
            <span className="relative">
              <span className="text-gray-900 dark:text-white">Service Business</span>
              <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10">
                <path d="M0,5 Q150,0 300,5" stroke="#fed141" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            The most advanced platform for managing your service operations. 
            <span className="text-primary font-semibold"> Trusted by 50,000+ professionals</span> to 
            streamline bookings, optimize workflows, and scale their business.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
           
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {stats.map((stat, index) => (
            <Card 
              key={index}
              className="text-center backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-2 hover:border-primary/50 transition-all duration-300 hover:scale-105"
            >
              <CardHeader className="pb-2">
                <stat.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-700 bg-clip-text text-transparent">
                  {stat.value}
                </CardTitle>
                <CardDescription className="text-sm">{stat.label}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <Badge className="mb-4 px-3 py-1">Features</Badge>
            <h3 className="text-4xl font-bold mb-4">Everything You Need to Succeed</h3>
            <p className="text-lg text-muted-foreground">Powerful tools designed for modern service businesses</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className={cn(
                  "relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl",
                  "backdrop-blur-sm bg-white/80 dark:bg-gray-800/80",
                  hoveredCard === index && "ring-2 ring-primary ring-offset-2"
                )}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <CardHeader>
                  <div className={cn("p-3 rounded-xl w-fit mb-4", feature.bgColor)}>
                    <feature.icon className={cn("h-8 w-8", feature.color)} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                {hoveredCard === index && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Additional Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 mb-4">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Mobile First</h4>
            <p className="text-sm text-muted-foreground">Works perfectly on all devices</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
              <Globe className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Multi-Language</h4>
            <p className="text-sm text-muted-foreground">Support for 15+ languages</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <HeartHandshake className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="text-lg font-semibold mb-2">24/7 Support</h4>
            <p className="text-sm text-muted-foreground">Always here when you need us</p>
          </div>
        </div>

        {/* Call to Action */}
         
      </main>

      {/* Footer */}
      <footer className="relative container mx-auto px-4 py-12 mt-20 border-t z-10">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <h3 className="text-lg font-bold">NaqiAgo</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              The future of service management is here.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-primary cursor-pointer transition-colors">Features</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Pricing</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Security</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Updates</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-primary cursor-pointer transition-colors">About</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Blog</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Contact</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-primary cursor-pointer transition-colors">Help Center</li>
              <li className="hover:text-primary cursor-pointer transition-colors">API Docs</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Status</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Terms</li>
            </ul>
          </div>
        </div>
        
        <Separator className="mb-6" />
        
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>&copy; 2025 NaqiAgo. All rights reserved. Made with 💜 and ⚡</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Badge variant="outline" className="px-3 py-1">
              <Globe className="mr-1 h-3 w-3" />
              English
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <Shield className="mr-1 h-3 w-3" />
              SOC2 Certified
            </Badge>
          </div>
        </div>
      </footer>
    </div>
  );
}