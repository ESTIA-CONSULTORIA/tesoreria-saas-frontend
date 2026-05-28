import MainLayout from "../../core/layout/MainLayout";

export default function DashboardPage() {
  return (
    <MainLayout>
      <div>
        <h2 className="text-3xl font-bold mb-2">
          Dashboard
        </h2>

        <p className="text-slate-400 mb-6">
          Bienvenido a Tesorería SaaS
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-slate-900 p-6">
            Empresas
          </div>

          <div className="rounded-xl bg-slate-900 p-6">
            Sucursales
          </div>

          <div className="rounded-xl bg-slate-900 p-6">
            Usuarios
          </div>
        </div>
      </div>
    </MainLayout>
  );
}