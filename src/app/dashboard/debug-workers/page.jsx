"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { debugWorkerData, createTestWorkerProfile, makeUserWorker, autoCreateMissingWorkerProfiles } from '@/services/debugWorkers'

export default function WorkerDebugPage() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const runDebug = async () => {
    setLoading(true)
    const data = await debugWorkerData()
    setResults(data)
    setLoading(false)
  }

  const createTestWorker = async () => {
    try {
      // Use the admin user ID we saw in logs
      const adminId = 'dffef40e-3993-4393-a82b-dac8f54cd914'
      
      // First make sure they're a worker
      await makeUserWorker(adminId)
      
      // Then create worker profile
      await createTestWorkerProfile(adminId, 'Admin Worker')
      
      alert('✅ Test worker created! Refresh and try again.')
    } catch (error) {
      alert('❌ Error: ' + error.message)
    }
  }

  const autoFix = async () => {
    setLoading(true)
    try {
      const created = await autoCreateMissingWorkerProfiles()
      alert(`✅ Auto-fixed! Created ${created.length} worker profiles.`)
      
      // Refresh debug data
      const data = await debugWorkerData()
      setResults(data)
    } catch (error) {
      alert('❌ Auto-fix failed: ' + error.message)
      console.error('Auto-fix error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Worker Debug Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={runDebug} disabled={loading}>
              {loading ? 'Checking...' : '🔍 Debug Worker Data'}
            </Button>
            <Button onClick={autoFix} disabled={loading} variant="destructive">
              {loading ? 'Fixing...' : '🔧 Auto-Fix Missing Workers'}
            </Button>
            <Button onClick={createTestWorker} variant="outline">
              ➕ Create Test Worker
            </Button>
          </div>

          {results && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">👤 Profiles with role=worker:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(results.profiles, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold">👷 Worker Profiles:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(results.workerProfiles, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}