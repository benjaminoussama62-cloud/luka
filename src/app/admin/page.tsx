import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getAdminByUserId, isAdminEmail } from "@/lib/admin/auth";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ayeba · Back Office" };

export default async function AdminPage() {
  const user = await getSessionFromCookies();
  if (!user) redirect("/ayebi/connexion?redirect=/admin");

  const admin = getAdminByUserId(user.id);
  if (!admin && !isAdminEmail(user.email)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="ayeba-panel max-w-md p-8 text-center">
          <p className="ayeba-kicker ayeba-kicker-accent mb-2">Accès refusé</p>
          <h1 className="text-xl font-semibold">Zone réservée</h1>
          <p className="mt-2 text-sm opacity-70">
            Ce compte n&apos;a pas les droits d&apos;administration Ayeba.
          </p>
        </div>
      </main>
    );
  }

  return (
    <AdminConsole
      adminName={admin?.name ?? user.name}
      adminEmail={admin?.email ?? user.email}
      adminRole={admin?.role ?? "super_admin"}
    />
  );
}
