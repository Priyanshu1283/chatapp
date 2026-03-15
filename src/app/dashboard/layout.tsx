import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { SocketProvider } from "@/components/SocketProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }
  const hasUsername = !!(session.user as { username?: string }).username;
  if (!hasUsername) {
    redirect("/auth/set-username");
  }

  return (
    <SocketProvider>
      <div className="h-screen flex flex-col bg-surface">
        <Navbar />
        <main className="flex-1 flex min-h-0">{children}</main>
      </div>
    </SocketProvider>
  );
}
