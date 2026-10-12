import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { BookOpen, BookA, GraduationCap, Bone, ClipboardCheck, LayoutDashboard, MessageCircleQuestion, NotebookPen, PawPrint, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

const nav = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/materiais", label: "Materiais", icon: BookOpen },
  { to: "/anotacoes", label: "Anotações", icon: NotebookPen },
  { to: "/dicionario", label: "Dicionário", icon: BookA },
  { to: "/estudo", label: "Plano e flashcards", icon: GraduationCap },
  { to: "/atlas", label: "Atlas anatómico", icon: Bone },
  { to: "/exames", label: "Exames simulados", icon: ClipboardCheck },
  { to: "/tutor", label: "Tutor IA", icon: MessageCircleQuestion },
] as const;

function Layout() {
  const isAtlas = useLocation().pathname === "/atlas";
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className={isAtlas ? "hidden" : "bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0"}>
        <div className="flex items-center gap-2 px-5 py-5">
          <PawPrint className="h-6 w-6 text-sidebar-primary" />
          <span className="font-display text-xl font-bold">VetEstudo</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
          <div
            className="flex shrink-0 cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm opacity-50"
            title="Em breve"
          >
            <Stethoscope className="h-4 w-4" /> Ficha do paciente <span className="text-xs">(em breve)</span>
          </div>
        </nav>
      </aside>
      <main className={isAtlas ? "min-w-0 flex-1" : "flex-1 px-5 py-8 md:px-10"}>
        <Outlet />
      </main>
    </div>
  );
}
