import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, BookA, GraduationCap, Bone, ClipboardCheck, LayoutDashboard, MessageCircleQuestion, NotebookPen, Menu, Moon, Sun, X, ChevronRight, HeartPulse } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

const groups = [
  {
    title: "O teu espaço",
    links: [
      { to: "/painel", label: "Painel", icon: LayoutDashboard },
      { to: "/materiais", label: "Materiais e PDFs", icon: BookOpen },
      { to: "/anotacoes", label: "Caderno digital", icon: NotebookPen },
      { to: "/estudo", label: "Plano e flashcards", icon: GraduationCap },
    ],
  },
  {
    title: "Ferramentas de estudo",
    links: [
      { to: "/atlas", label: "Atlas anatómico", icon: Bone },
      { to: "/dicionario", label: "Dicionário", icon: BookA },
      { to: "/exames", label: "Exames simulados", icon: ClipboardCheck },
      { to: "/tutor", label: "Tutor IA", icon: MessageCircleQuestion },
    ],
  },
] as const;

function Layout() {
  const pathname = useLocation().pathname;
  const isAtlas = pathname === "/atlas" || pathname.startsWith("/atlas/");
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      if (window.localStorage.getItem("vetestudo-theme") === "light") setTheme("light");
    } catch { /* Storage is optional */ }
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  function toggleTheme() {
    setTheme(current => {
      const next = current === "dark" ? "light" : "dark";
      try { window.localStorage.setItem("vetestudo-theme", next); } catch { /* Optional */ }
      return next;
    });
  }

  // The anatomical atlas has its own full-width workspace and navigation.
  if (isAtlas) return <main className="min-w-0"><Outlet /></main>;

  return (
    <div className={(theme === "dark" ? "dark " : "") + "min-h-screen bg-background text-foreground"}>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-[#0a1b2f] px-4 py-3 text-white lg:hidden">
        <Link to="/painel" className="flex items-center gap-2">
          <BrandMark className="h-9 w-9 shrink-0" />
          <span className="text-lg font-extrabold tracking-tight">VetEstudo</span>
        </Link>
        <button type="button" onClick={() => setMenuOpen(v => !v)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} aria-controls="vetestudo-sidebar" className="rounded-lg p-2 hover:bg-white/10">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && <button type="button" className="fixed inset-0 z-40 bg-black/65 lg:hidden" aria-label="Fechar navegação" onClick={() => setMenuOpen(false)} />}
      <div className="lg:flex">
        <aside
          id="vetestudo-sidebar"
          className={"fixed inset-y-0 left-0 z-50 flex w-[270px] shrink-0 flex-col overflow-y-auto border-r border-[#213a55] bg-[#0a192c] text-slate-100 shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:translate-x-0 lg:shadow-none " + (menuOpen ? "translate-x-0" : "-translate-x-full")}
        >
          <div className="flex items-center justify-between border-b border-[#243b56] px-5 py-6">
            <Link to="/painel" onClick={() => setMenuOpen(false)} className="group flex min-w-0 items-center gap-3">
              <BrandMark className="h-12 w-12 shrink-0 rounded-2xl shadow-lg shadow-blue-500/10 transition group-hover:scale-105" />
              <span className="min-w-0">
                <span className="block text-xl font-extrabold tracking-tight">VetEstudo</span>
                <span className="block text-[11px] font-medium tracking-wide text-blue-300">O teu espaço de estudo</span>
              </span>
            </Link>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 lg:hidden"><X size={19} /></button>
          </div>

          <nav aria-label="Navegação principal" className="flex-1 space-y-7 px-3 py-6">
            {groups.map(group => (
              <div key={group.title}>
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">{group.title}</p>
                <div className="space-y-1">
                  {group.links.map(item => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className="group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                      activeProps={{ className: "bg-blue-600/20 text-white ring-1 ring-inset ring-blue-500/40" }}
                    >
                      <item.icon className="h-[19px] w-[19px] shrink-0 text-blue-300" strokeWidth={1.8} />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="space-y-3 border-t border-[#243b56] px-4 py-5">
            <div className="flex items-start gap-2 rounded-xl bg-blue-500/10 px-3 py-3 text-xs text-slate-300">
              <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
              <span>Estuda ao teu ritmo. O progresso local é guardado neste dispositivo.</span>
            </div>
            <button type="button" onClick={toggleTheme} className="flex w-full items-center justify-between rounded-xl border border-[#2e4864] px-3 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-white/10">
              <span className="flex items-center gap-2">{theme === "dark" ? <Moon size={16} /> : <Sun size={16} />} Aspeto {theme === "dark" ? "escuro" : "claro"}</span>
              <span className="text-blue-300">Alterar</span>
            </button>
          </div>
        </aside>
        <main id="conteudo-principal" className="min-w-0 flex-1 bg-background px-4 pb-12 pt-8 text-foreground sm:px-7 lg:px-10 lg:pt-10 xl:px-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
