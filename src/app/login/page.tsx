"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [endpoint, setEndpoint] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const router = useRouter();

  // Set page title and check if user is already logged in
  useEffect(() => {
    document.title = "Login - Tasks";
    
    const checkExistingSession = async () => {
      try {
        // Try to fetch calendars to see if we have a valid session
        const response = await fetch('/api/calendars');
        if (response.ok) {
          // User is already logged in, redirect to tasks
          router.push('/tasks');
          return;
        }
      } catch (error) {
        // Session check failed, user needs to login
        console.log('No existing session found: ' + error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ endpoint, username, password }),
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      // Login successful, redirect to tasks
      router.push("/tasks");
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading spinner while checking existing session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">Checking session...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Tasks</CardTitle>
          <CardDescription>Connect to your CalDAV server to sync your tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="endpoint">CalDAV URL</Label>
              <Input
                id="endpoint"
                type="url"
                placeholder="https://caldav.fastmail.com"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your@email.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
