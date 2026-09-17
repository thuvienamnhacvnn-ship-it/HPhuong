import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { currentStaff } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

/** Every admin page requires a staff session; role checks happen per page and per API call. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await currentStaff();
  if (!user) redirect("/admin/login");
  return (
    <div className="shell admin">
      <AdminNav role={user.role} name={user.name} theme={(await cookies()).get("hp-theme")?.value === "dark" ? "dark" : "light"} />
      <div className="main">
        <main id="inhalt" className="content admin-content">{children}</main>
      </div>
    </div>
  );
}
