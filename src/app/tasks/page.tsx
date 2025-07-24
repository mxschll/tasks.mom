import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { redirect } from "next/navigation";
import AsyncTasksWrapper from "@/components/async-tasks-wrapper";

export default async function TasksPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session?.endpoint || !session?.username || !session?.password) {
    redirect("/login");
  }

  // Page loads instantly - all data fetching happens client-side with loading states
  return <AsyncTasksWrapper />;
}
