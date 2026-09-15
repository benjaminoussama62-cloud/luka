import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth-server";
import { isAllowed } from "@/lib/admin";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionFromCookies();
  if (!user) redirect("/?auth=login");
  if (!isAllowed(user, "support")) redirect("/");
  return <AdminConsole role={user.role} email={user.email} />;
}
