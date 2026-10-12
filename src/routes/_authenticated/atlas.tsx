import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/atlas")({
  head: () => ({ meta: [{ title: "Atlas de anatomia — VetEstudo" }] }),
  component: Atlas,
});

type System = "Esquelético" | "Digestivo" | "Respiratório" | "Cardiovascular" | "Urinário";
type Structure = { name: string; system: System; x: number; y: number; description: string; dog?: string; cat?: string };
const systems: System[] = ["Esquelético", "Digestivo", "Respiratório", "Cardiovascular", "Urinário"];
const structures: Structure[] = [
  { name: "Crânio", system: "Esquelético", x: 95, y: 106, description: "Conjunto de ossos que protege o encéfalo e sustenta estruturas da face." },
  { name: "Coluna vertebral", system: "Esquelético", x: 285, y: 112, description: "Formada por vértebras cervicais, torácicas, lombares, sacrais e caudais. Protege a medula espinal." },
  { name: "Costelas", system: "Esquelético", x: 225, y: 160, description: "Formam a caixa torácica, protegendo o coração e os pulmões." },
  { name: "Escápula", system: "Esquelético", x: 177, y: 135, description: "Osso plano que participa na ligação muscular do membro torácico ao tronco." },
  { name: "Pélvis", system: "Esquelético", x: 395, y: 151, description: "Conjunto ósseo que suporta os membros pélvicos e protege órgãos da cavidade pélvica." },
  { name: "Fémur", system: "Esquelético", x: 411, y: 233, description: "Osso longo da coxa, articulado com a pélvis e a tíbia." },
  { name: "Traqueia", system: "Respiratório", x: 137, y: 124, description: "Conduz o ar da laringe aos brônquios; apresenta anéis cartilagíneos." },
  { name: "Pulmões", system: "Respiratório", x: 245, y: 184, description: "Órgãos responsáveis pelas trocas gasosas entre o ar e o sangue.", dog: "No cão, o pulmão direito possui quatro lobos e o esquerdo dois lobos principais.", cat: "No gato, a organização lobar é semelhante à do cão." },
  { name: "Diafragma", system: "Respiratório", x: 301, y: 209, description: "Músculo que separa as cavidades torácica e abdominal e é essencial na inspiração." },
  { name: "Coração", system: "Cardiovascular", x: 219, y: 198, description: "Órgão muscular com quatro câmaras que impulsiona o sangue através da circulação pulmonar e sistémica." },
  { name: "Aorta", system: "Cardiovascular", x: 248, y: 149, description: "Principal artéria sistémica; transporta sangue oxigenado a partir do ventrículo esquerdo." },
  { name: "Esófago", system: "Digestivo", x: 155, y: 155, description: "Tubo muscular que transporta o alimento da faringe ao estômago." },
  { name: "Estômago", system: "Digestivo", x: 326, y: 202, description: "Órgão responsável pelo armazenamento e início da digestão química dos alimentos." },
  { name: "Fígado", system: "Digestivo", x: 310, y: 164, description: "Participa no metabolismo, desintoxicação e produção de bílis." },
  { name: "Intestino delgado", system: "Digestivo", x: 362, y: 244, description: "Principal local de digestão enzimática e absorção de nutrientes." },
  { name: "Intestino grosso", system: "Digestivo", x: 404, y: 219, description: "Absorve água e eletrólitos e participa na formação das fezes." },
  { name: "Rim", system: "Urinário", x: 351, y: 174, description: "Filtra o sangue, regula água e eletrólitos e produz urina." },
  { name: "Ureter", system: "Urinário", x: 379, y: 204, description: "Conduz a urina dos rins até à bexiga." },
  { name: "Bexiga urinária", system: "Urinário", x: 411, y: 253, description: "Armazena a urina antes da micção." },
];
const palette: Record<System, string> = {
  "Esquelético": "#a16207", "Digestivo": "#15803d", "Respiratório": "#0284c7",
  "Cardiovascular": "#dc2626", "Urinário": "#7c3aed",
};
function Atlas() {
  const [species, setSpecies] = useState<"Cão" | "Gato">("Cão");
  const [system, setSystem] = useState<System>("Esquelético");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quiz, setQuiz] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [target, setTarget] = useState(0);
  const visible = useMemo(() => structures.filter(s => s.system === system && s.name.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT").trim())), [system, search]);
  const current = visible.find(s => s.name === selected);
  const challenge = structures.filter(s => s.system === system)[target % structures.filter(s => s.system === system).length];
  function choose(s: Structure) {
    if (quiz) {
      setScore(v => ({ correct: v.correct + Number(s.name === challenge.name), total: v.total + 1 }));
      setSelected(s.name);
      setTarget(v => v + 1);
    } else setSelected(s.name);
  }
  function changeSystem(s: System) { setSystem(s); setSelected(null); setTarget(0); setScore({ correct: 0, total: 0 }); }
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><h1 className="text-3xl font-bold">Atlas interativo de anatomia</h1><p className="mt-1 text-sm text-muted-foreground">Explora estruturas anatómicas de cães e gatos. Esquema educativo simplificado, não à escala.</p></div>
    <div className="flex flex-wrap items-center gap-2">
      {(["Cão", "Gato"] as const).map(s => <Button key={s} size="sm" variant={species === s ? "default" : "outline"} onClick={() => setSpecies(s)}>{s}</Button>)}
      <span className="mx-2 h-6 border-l" />
      {systems.map(s => <Button key={s} size="sm" variant={system === s ? "default" : "outline"} onClick={() => changeSystem(s)}>{s}</Button>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
      <section className="min-w-0 space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Vista lateral · {species}</h2>
          <Button size="sm" variant={quiz ? "default" : "outline"} onClick={() => { setQuiz(v => !v); setScore({ correct: 0, total: 0 }); setTarget(0); setSelected(null); }}>{quiz ? "Terminar exercício" : "Praticar identificação"}</Button>
        </div>
        {quiz && <div className="rounded-lg bg-muted p-3 text-sm"><strong>Encontra: {challenge.name}</strong><span className="ml-3">Acertos: {score.correct}/{score.total}</span></div>}
        <svg viewBox="0 0 540 350" role="img" aria-label={`Esquema anatómico lateral de ${species.toLowerCase()} com pontos interativos`} className="w-full rounded-xl bg-slate-50">
          <path d="M118 121 Q165 90 224 99 Q320 98 396 112 Q440 113 459 143 L467 171 Q453 196 434 192 L426 296 L406 296 L396 191 L378 193 L363 294 L344 294 L341 190 Q265 219 194 191 L183 297 L163 297 L158 184 L146 180 L132 298 L113 298 L118 174 Q97 164 85 147 L53 147 Q38 138 45 121 L65 105 L69 82 L85 97 L100 83 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="3"/>
          <path d="M456 135 Q502 125 507 89" fill="none" stroke="#64748b" strokeWidth="12" strokeLinecap="round"/>
          <path d="M70 128 Q110 112 165 122 Q265 120 396 133" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 6"/>
          {visible.map(s => <g key={s.name} onClick={() => choose(s)} className="cursor-pointer" role="button" aria-label={s.name} tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(s); } }}>
            <circle cx={s.x} cy={s.y} r={selected === s.name ? 13 : 10} fill={palette[system]} stroke="white" strokeWidth="3" opacity={selected === s.name ? 1 : 0.85}/>
            <circle cx={s.x} cy={s.y} r="17" fill="transparent"/>
          </g>)}
        </svg>
        <p className="text-xs text-muted-foreground">Toca num ponto para consultar a estrutura. As posições são aproximadas e destinam-se à aprendizagem inicial.</p>
      </section>
      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Estruturas · {system}</h2>
        <Input placeholder="Pesquisar estrutura…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="max-h-64 space-y-1 overflow-auto">{visible.map(s => <button key={s.name} onClick={() => choose(s)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${selected === s.name ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{s.name}</button>)}</div>
        {current && <div className="space-y-2 rounded-xl border p-4"><h3 className="text-lg font-bold">{current.name}</h3><p className="text-sm">{current.description}</p>{(species === "Cão" ? current.dog : current.cat) && <p className="text-sm text-muted-foreground">{species === "Cão" ? current.dog : current.cat}</p>}</div>}
        {!current && <p className="text-sm text-muted-foreground">Seleciona uma estrutura no esquema ou na lista para veres a explicação.</p>}
      </section>
    </div>
    <p className="text-xs text-muted-foreground">Este atlas é uma primeira versão esquemática. Não substitui imagens anatómicas reais, atlas de referência ou avaliação clínica.</p>
  </div>;
}
