import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookA, BookOpen, Bone, Brain, ClipboardCheck, GraduationCap, NotebookPen, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VetEstudo — A tua plataforma de estudo veterinário" },
      { name: "description", content: "Organiza PDFs, estuda com flashcards, explora o atlas anatómico de cão e gato e treina com exames simulados." },
      { property: "og:title", content: "VetEstudo — A tua plataforma de estudo veterinário" },
      { property: "og:description", content: "Materiais, flashcards, tutor IA, atlas anatómico e exames num único espaço de estudo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: BookOpen, title: "Materiais organizados", description: "PDFs separados pelos módulos do curso, sempre fáceis de encontrar.", to: "/materiais" },
  { icon: GraduationCap, title: "Flashcards e plano", description: "Define objetivos, cria cartões e revê com repetição espaçada.", to: "/estudo" },
  { icon: Bone, title: "Atlas anatómico", description: "Explora imagens e estruturas de anatomia de cão e gato.", to: "/atlas" },
  { icon: ClipboardCheck, title: "Exames simulados", description: "Treina com perguntas de escolha múltipla e acompanha resultados.", to: "/exames" },
  { icon: NotebookPen, title: "Caderno digital", description: "Escreve e desenha apontamentos no teu próprio caderno.", to: "/anotacoes" },
  { icon: BookA, title: "Dicionário veterinário", description: "Pesquisa termos e constrói o teu glossário de estudo.", to: "/dicionario" },
] as const;

function Landing() {
  return (
    <div className="min-h-screen bg-[#f5f8fd] text-[#12243b]">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="VetEstudo, página inicial"><BrandMark className="h-10 w-10" /><span className="text-xl font-extrabold tracking-tight">VetEstudo</span></Link>
        <Link to="/painel" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cad7e8] bg-white px-4 py-2 text-sm font-semibold text-[#15417a] transition hover:border-blue-400 hover:shadow-sm">Entrar <ArrowRight size={16}/></Link>
      </header>
      <main>
        <section className="relative mx-auto max-w-7xl px-5 pb-12 pt-7 sm:px-8 sm:pt-12">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#153f7d] via-[#0c2c54] to-[#07182c] px-6 py-14 text-white shadow-2xl shadow-blue-900/10 sm:px-12 sm:py-20">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 h-[400px] w-[400px] rounded-full border-[60px] border-sky-400/10"/>
            <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-8 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl"/>
            <div className="relative max-w-3xl">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100"><Sparkles size={14}/> Para estudantes de veterinária</span>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">Estuda com mais organização, foco e confiança.</h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-blue-100/90 sm:text-lg">Os teus materiais, o caderno, os flashcards, o Atlas anatómico e os exames num só lugar — com um tutor IA para ajudar a esclarecer dúvidas.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/painel" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-[#133d70] transition hover:bg-blue-50">Começar a estudar <ArrowRight size={17}/></Link>
                <Link to="/atlas" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20">Explorar o Atlas <Bone size={17}/></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl space-y-5 px-5 pb-20 sm:px-8" aria-labelledby="ferramentas">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">A tua plataforma</p><h2 id="ferramentas" className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Tudo o que precisas para aprender</h2></div><Link to="/painel" className="text-sm font-semibold text-blue-700 hover:underline">Abrir painel →</Link></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(f => <Link key={f.to} to={f.to} className="group rounded-2xl border border-[#dce5f1] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ebf3ff] text-[#236cda]"><f.icon size={24} strokeWidth={1.9}/></span><h3 className="mt-5 text-lg font-bold">{f.title}</h3><p className="mt-2 text-sm leading-relaxed text-[#617186]">{f.description}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-blue-700">Explorar <ArrowRight size={14} className="transition group-hover:translate-x-1"/></span></Link>)}</div>
          <p className="text-center text-xs text-[#65768d]">Algumas ferramentas guardam o progresso apenas no dispositivo utilizado. O conteúdo educativo não substitui formação prática ou aconselhamento veterinário.</p>
        </section>
      </main>
    </div>
  );
}
