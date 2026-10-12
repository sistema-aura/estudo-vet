import { createFileRoute, Link } from "@tanstack/react-router";
import { BookA, BookOpen, Brain, NotebookPen, PawPrint, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VetEstudo — Estuda auxiliar de veterinária com IA" },
      { name: "description", content: "Organiza os teus PDFs, faz anotações, gera resumos e perguntas com IA e consulta o teu dicionário veterinário." },
      { property: "og:title", content: "VetEstudo — Estuda auxiliar de veterinária com IA" },
      { property: "og:description", content: "PDFs organizados, resumos, perguntas e dicionário — tudo num só sítio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: BookOpen, t: "Materiais organizados", d: "Carrega os PDFs do campus e organiza-os por disciplina." },
  { icon: Brain, t: "Resumos e perguntas com IA", d: "A IA lê o PDF e cria resumos e testes de escolha múltipla." },
  { icon: NotebookPen, t: "Anotações", d: "Escreve notas soltas ou ligadas a cada material." },
  { icon: BookA, t: "Dicionário", d: "Guarda termos difíceis e pesquisa-os num instante." },
  { icon: Stethoscope, t: "Ficha do paciente", d: "Em breve: pratica fichas clínicas e identificação de patologias." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-primary">
          <PawPrint className="h-6 w-6" />
          <span className="font-display text-xl font-bold">VetEstudo</span>
        </div>
        <Button asChild variant="outline"><Link to="/auth">Entrar</Link></Button>
      </header>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:pt-20">
        <p className="mb-4 inline-block rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
          Para estudantes de auxiliar de veterinária
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          O teu caderno de estudo, <span className="text-primary">com um tutor sempre ao lado.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Junta os PDFs do curso, tira dúvidas, gera resumos e testa-te com perguntas feitas a partir da tua própria matéria.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg"><Link to="/auth">Começar a estudar</Link></Button>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.t} className="rounded-2xl border bg-card p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-lg font-bold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
