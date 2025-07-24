import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  // Check if user is already logged in
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (session?.endpoint && session?.username && session?.password) {
    // User is logged in, redirect to tasks
    redirect("/tasks");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-semibold mb-2">tasks.mom</CardTitle>
          <CardDescription className="text-lg">
            Sync your CalDAV tasks across all devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600 leading-relaxed">
              While services like Fastmail don&apos;t provide dedicated task management, 
              they do support CalDAV task synchronization. This means you can use 
              Apple Tasks on your iPhone, sync through your CalDAV server, and 
              manage everything seamlessly on your PC with this web interface. 
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button asChild className="flex-1">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
