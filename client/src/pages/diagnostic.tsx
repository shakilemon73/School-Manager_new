import React from 'react';
import { useSupabaseDirectAuth } from '@/hooks/use-supabase-direct-auth';
import { useQuery } from '@tanstack/react-query';

export default function DiagnosticPage() {
  const { user, loading: authLoading } = useSupabaseDirectAuth();
  
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/dashboard/stats?schoolId=1'],
    retry: 1,
  });

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Frontend Diagnostic Page</h1>
        
        <div className="space-y-6">
          {/* Authentication Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <div className="space-y-2">
              <p><strong>Auth Loading:</strong> {authLoading ? 'Yes' : 'No'}</p>
              <p><strong>User Authenticated:</strong> {user ? 'Yes' : 'No'}</p>
              <p><strong>User ID:</strong> {user?.id || 'Not available'}</p>
              <p><strong>User Email:</strong> {user?.email || 'Not available'}</p>
            </div>
          </div>

          {/* API Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">API Status</h2>
            <div className="space-y-2">
              <p><strong>Stats Loading:</strong> {statsLoading ? 'Yes' : 'No'}</p>
              <p><strong>Stats Error:</strong> {statsError ? JSON.stringify(statsError) : 'None'}</p>
              <p><strong>Dashboard Data:</strong> {dashboardStats ? JSON.stringify(dashboardStats) : 'Not loaded'}</p>
            </div>
          </div>

          {/* Component Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Component Test</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-100 p-4 rounded-lg">
                <h3 className="font-medium text-blue-800">Tailwind CSS</h3>
                <p className="text-blue-600">This should be styled with Tailwind</p>
              </div>
              <div className="bg-green-100 p-4 rounded-lg">
                <h3 className="font-medium text-green-800">Grid Layout</h3>
                <p className="text-green-600">Grid system working</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg">
                <h3 className="font-medium text-purple-800">Responsive Design</h3>
                <p className="text-purple-600">Mobile responsive test</p>
              </div>
            </div>
          </div>

          {/* React Query Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">React Query Test</h2>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                Reload Page
              </button>
              <button 
                onClick={() => console.log('Console test')} 
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors ml-2"
              >
                Test Console
              </button>
            </div>
          </div>

          {/* Environment Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Info</h2>
            <div className="space-y-2 text-sm">
              <p><strong>User Agent:</strong> {navigator.userAgent}</p>
              <p><strong>Window Width:</strong> {window.innerWidth}px</p>
              <p><strong>Window Height:</strong> {window.innerHeight}px</p>
              <p><strong>Current URL:</strong> {window.location.href}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}