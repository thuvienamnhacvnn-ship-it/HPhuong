import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Ornament } from "@/components/decor";

export const metadata = { title: "Anmeldung" };

export default async function AdminLogin() {
  if (await currentStaff()) redirect("/admin");
  return (
    <main className="admin-login">
      <div className="card card--pad stack" style={{ width: "min(100%, 420px)" }}>
        <div className="stack-sm" style={{ justifyItems: "center", textAlign: "center" }}>
          <img src="/media/logo-emblem-240.webp" alt="HPHUONG" width={96} height={110} style={{ objectFit: "contain" }} />
          <p className="eyebrow">Studio Verwaltung</p>
          <h1 className="h2">Anmelden</h1>
          <Ornament className="ornament--sm ornament--center" />
        </div>
        <AdminLoginForm />
        <p className="small muted" style={{ margin: 0 }}>Nur für Mitarbeitende. Zugänge vergibt die Inhaberin.</p>
      </div>
    </main>
  );
}
