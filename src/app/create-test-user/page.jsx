"use client"

import { useState } from 'react'
import { signUp } from '@/services/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function CreateTestUser() {
  const [formData, setFormData] = useState({
    email: 'test@example.com',
    password: 'TestPassword123!',
    full_name: 'Test User',
    role: 'customer'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      const result = await signUp(formData.email, formData.password, {
        full_name: formData.full_name,
        role: formData.role
      })

      setResult({
        success: true,
        message: 'User created successfully!',
        data: result
      })
    } catch (error) {
      setResult({
        success: false,
        message: 'Error creating user',
        error: error.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testUsers = [
    {
      email: 'customer@test.com',
      password: 'TestPassword123!',
      full_name: 'Test Customer',
      role: 'customer'
    },
    {
      email: 'worker@test.com',
      password: 'TestPassword123!',
      full_name: 'Test Worker',
      role: 'worker'
    },
    {
      email: 'admin@test.com',
      password: 'TestPassword123!',
      full_name: 'Test Admin',
      role: 'admin'
    }
  ]

  const createTestUser = async (userData) => {
    setIsLoading(true)
    setResult(null)

    try {
      const result = await signUp(userData.email, userData.password, {
        full_name: userData.full_name,
        role: userData.role
      })

      setResult({
        success: true,
        message: `${userData.role} user created successfully!`,
        data: result
      })
    } catch (error) {
      setResult({
        success: false,
        message: `Error creating ${userData.role} user`,
        error: error.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-2xl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create Test Users</h1>
        <p className="text-muted-foreground">
          Create test users for different roles to test the login system
        </p>
      </div>

      {/* Quick Test Users */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Users</CardTitle>
          <CardDescription>
            Create pre-configured test users for each role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testUsers.map((user) => (
              <div key={user.role} className="border rounded-lg p-4 space-y-2">
                <h3 className="font-medium capitalize">{user.role} User</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Button
                  size="sm"
                  onClick={() => createTestUser(user)}
                  disabled={isLoading}
                  className="w-full"
                >
                  Create {user.role}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom User Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Custom User</CardTitle>
          <CardDescription>
            Create a user with custom details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="customer">Customer</option>
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating User...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
            <strong>{result.message}</strong>
            {result.error && (
              <div className="mt-2 text-sm">{result.error}</div>
            )}
            {result.data && (
              <div className="mt-2">
                <details className="text-sm">
                  <summary className="cursor-pointer">View Details</summary>
                  <pre className="mt-2 bg-white p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Login Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>After Creating Users</CardTitle>
          <CardDescription>
            Instructions for testing the login system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Test Login Steps:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Create a test user using the forms above</li>
              <li>Go to the login page at <code>/login</code></li>
              <li>Use the email and password you created</li>
              <li>Check if the login works and role is detected</li>
              <li>Visit <code>/role-test</code> to verify role functionality</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Default Test Credentials:</h4>
            <div className="bg-gray-100 p-3 rounded-lg text-sm font-mono space-y-1">
              <div><strong>Customer:</strong> customer@test.com / TestPassword123!</div>
              <div><strong>Worker:</strong> worker@test.com / TestPassword123!</div>
              <div><strong>Admin:</strong> admin@test.com / TestPassword123!</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}