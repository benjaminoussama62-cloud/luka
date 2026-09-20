import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { allowedSections, isAdminEmail } from "@/lib/admin/access";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ayeba · Back Office" };

export default async function AdminPage() {
  // Dedicated admin session only — a regular Ayeba login never suffices.
  const session = await getAdminSession();
  if (!session) redirect("/admin/connexion");

  return (
    <AdminConsole
      adminName={session.admin.name}
      adminEmail={session.admin.email}
      adminRole={session.admin.role}
      sections={allowedSections(session.admin, isAdminEmail(session.user.email))}
    />
  );
}
