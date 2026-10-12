import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/atlas")({
  head: () => ({ meta: [{ title: "Atlas de anatomia — VetEstudo" }] }),
  component: Atlas,
});

type System = "Esquelético" | "Muscular" | "Nervoso" | "Digestivo" | "Respiratório" | "Cardiovascular" | "Urinário" | "Reprodutor" | "Endócrino" | "Linfático" | "Tegumentar" | "Órgãos dos sentidos";
type Structure = { name: string; system: System; x: number; y: number; description: string; dog?: string; cat?: string };
const systems: System[] = ["Esquelético", "Muscular", "Nervoso", "Digestivo", "Respiratório", "Cardiovascular", "Urinário", "Reprodutor", "Endócrino", "Linfático", "Tegumentar", "Órgãos dos sentidos"];
const structures: Structure[] = [
  { name: "Ovário", system: "Reprodutor", x: 371, y: 213, description: "Gónada feminina responsável pela produção de ovócitos e pela secreção de hormonas sexuais.", dog: "Na cadela, os ovários situam-se na região sublombar, caudais aos rins.", cat: "Na gata, os ovários são relativamente pequenos e encontram-se caudais aos rins." },
  { name: "Útero", system: "Reprodutor", x: 390, y: 240, description: "Órgão tubular com dois cornos uterinos, corpo e colo; recebe os embriões e sustenta a gestação.", dog: "A cadela apresenta útero bicórneo com cornos longos.", cat: "A gata apresenta útero bicórneo; os cornos são relativamente longos." },
  { name: "Testículo", system: "Reprodutor", x: 420, y: 280, description: "Gónada masculina com túbulos seminíferos; produz espermatozoides e testosterona.", dog: "No cão, o escroto situa-se entre os membros pélvicos.", cat: "No gato, o escroto situa-se caudalmente ao pénis, na região perineal." },
  { name: "Hipófise", system: "Endócrino", x: 96, y: 122, description: "Glândula endócrina na base do encéfalo; participa na regulação do crescimento, reprodução, metabolismo e equilíbrio hídrico." },
  { name: "Tiroide", system: "Endócrino", x: 153, y: 132, description: "Glândula endócrina cervical, junto à traqueia; produz hormonas que regulam o metabolismo.", dog: "No cão, o hipotiroidismo é uma endocrinopatia relevante.", cat: "No gato, o hipertiroidismo é uma endocrinopatia frequente em animais idosos." },
  { name: "Glândula suprarrenal", system: "Endócrino", x: 347, y: 155, description: "Glândula endócrina próxima do polo cranial de cada rim; córtex e medula produzem hormonas distintas." },
  { name: "Baço", system: "Linfático", x: 330, y: 212, description: "Órgão linfático abdominal relacionado com filtragem sanguínea, resposta imunitária e reserva celular." },
  { name: "Linfonodo mandibular", system: "Linfático", x: 111, y: 146, description: "Linfonodo superficial que participa na drenagem linfática de regiões da cabeça." },
  { name: "Linfonodo poplíteo", system: "Linfático", x: 403, y: 242, description: "Linfonodo palpável na região caudal do joelho, importante na avaliação clínica." },
  { name: "Pele", system: "Tegumentar", x: 267, y: 104, description: "Órgão de revestimento composto por epiderme, derme e hipoderme; atua como barreira e participa na termorregulação." },
  { name: "Glândula mamária", system: "Tegumentar", x: 310, y: 196, description: "Estrutura glandular cutânea especializada na produção de leite durante a lactação.", dog: "A cadela apresenta habitualmente cinco pares de glândulas mamárias.", cat: "A gata apresenta habitualmente quatro pares de glândulas mamárias." },
  { name: "Unha", system: "Tegumentar", x: 126, y: 295, description: "Estrutura queratinizada associada à falange distal, importante para proteção, tração e comportamento.", dog: "No cão, as unhas não são normalmente retráteis.", cat: "No gato, a maioria das unhas dos dedos é retrátil em repouso." },
  { name: "Olho", system: "Órgãos dos sentidos", x: 83, y: 119, description: "Órgão visual que inclui córnea, cristalino, retina e estruturas anexas; converte luz em sinais nervosos." },
  { name: "Ouvido externo", system: "Órgãos dos sentidos", x: 77, y: 95, description: "Pavilhão auricular e canal auditivo externo, responsáveis por captar e conduzir ondas sonoras." },
  { name: "Órgão vomeronasal", system: "Órgãos dos sentidos", x: 68, y: 130, description: "Estrutura quimiossensorial associada à perceção de determinados sinais químicos." },
  { name: "Úmero", system: "Esquelético", x: 157, y: 212, description: "Osso longo do braço entre a articulação do ombro e a do cotovelo." },
  { name: "Rádio", system: "Esquelético", x: 135, y: 261, description: "Osso do antebraço que participa nas articulações do cotovelo e do carpo." },
  { name: "Tíbia", system: "Esquelético", x: 410, y: 261, description: "Osso longo da perna, principal suporte de carga entre joelho e tarso." },
  { name: "Pâncreas", system: "Digestivo", x: 342, y: 205, description: "Glândula com função exócrina digestiva e função endócrina de regulação da glicemia." },
  { name: "Veia cava caudal", system: "Cardiovascular", x: 329, y: 149, description: "Grande veia que conduz sangue da metade caudal do corpo para a aurícula direita." },
  { name: "Laringe", system: "Respiratório", x: 116, y: 129, description: "Estrutura cartilagínea entre a faringe e a traqueia; protege a via aérea e participa na fonação." },
  { name: "Uretra", system: "Urinário", x: 429, y: 262, description: "Canal de condução da urina desde a bexiga até ao exterior; apresenta diferenças anatómicas entre sexos." },
  { name: "Cerebelo", system: "Nervoso", x: 103, y: 111, description: "Parte do encéfalo essencial para coordenação motora, equilíbrio e precisão dos movimentos." },
  { name: "Encéfalo", system: "Nervoso", x: 86, y: 116, description: "Integra informação sensorial, coordena movimentos e regula funções vitais. Inclui cérebro, cerebelo e tronco encefálico." },
  { name: "Medula espinal", system: "Nervoso", x: 257, y: 120, description: "Transmite impulsos entre o encéfalo e o corpo; integra reflexos espinais." },
  { name: "Nervo ciático", system: "Nervoso", x: 380, y: 226, description: "Nervo periférico importante na inervação do membro pélvico." },
  { name: "Músculo masséter", system: "Muscular", x: 94, y: 139, description: "Músculo mastigatório responsável por elevar a mandíbula." },
  { name: "Músculo trapézio", system: "Muscular", x: 181, y: 118, description: "Músculo superficial relacionado com os movimentos da escápula." },
  { name: "Músculo grande dorsal", system: "Muscular", x: 298, y: 157, description: "Participa na retração do membro torácico e na flexão do ombro." },
  { name: "Músculo bíceps femoral", system: "Muscular", x: 399, y: 217, description: "Músculo da região caudolateral da coxa, envolvido nos movimentos da anca e do joelho." },
  { name: "Músculo gastrocnémio", system: "Muscular", x: 412, y: 266, description: "Músculo da região caudal da perna que participa na extensão do tarso." },
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
  "Reprodutor": "#be185d", "Endócrino": "#0f766e", "Linfático": "#65a30d", "Tegumentar": "#b45309", "Órgãos dos sentidos": "#4f46e5",
  "Esquelético": "#a16207", "Muscular": "#ea580c", "Nervoso": "#9333ea", "Digestivo": "#15803d", "Respiratório": "#0284c7",
  "Cardiovascular": "#dc2626", "Urinário": "#7c3aed",
};
const clinical: Record<string, { location: string; function: string; clinical: string }> = {
  "Coração": { location: "Mediastino médio, entre os pulmões, com eixo dirigido ventrocaudalmente.", function: "Mantém a circulação pulmonar e sistémica através das quatro câmaras e das válvulas cardíacas.", clinical: "A auscultação, a ecocardiografia e a radiografia torácica ajudam a avaliar alterações cardíacas." },
  "Rim": { location: "Região retroperitoneal dorsal do abdómen; o rim direito encontra-se geralmente mais cranial.", function: "Filtra o plasma, regula a homeostase hidroeletrolítica e participa no equilíbrio ácido-base.", clinical: "A função renal é avaliada com análises sanguíneas, urinálise e, quando indicado, ecografia." },
  "Fígado": { location: "Abdómen cranial, imediatamente caudal ao diafragma.", function: "Metabolismo energético, síntese proteica, produção de bílis e biotransformação de substâncias.", clinical: "Alterações hepáticas podem exigir bioquímica sérica, ecografia e exames complementares." },
  "Traqueia": { location: "Estende-se da laringe até à bifurcação traqueal no tórax.", function: "Conduz o ar e contribui para a depuração mucociliar.", clinical: "A avaliação da via aérea é importante em tosse, dispneia e suspeita de colapso traqueal." },
  "Pulmões": { location: "Cavidades pleurais direita e esquerda, envolvendo o mediastino.", function: "Trocas de oxigénio e dióxido de carbono na membrana alvéolo-capilar.", clinical: "A frequência e o esforço respiratórios são parâmetros essenciais na triagem." },
  "Estômago": { location: "Abdómen cranial, predominantemente à esquerda, caudal ao fígado.", function: "Reservatório alimentar, mistura do conteúdo e início da digestão proteica.", clinical: "A dilatação-vólvulo gástrico é uma emergência particularmente importante em cães predispostos." },
  "Baço": { location: "Abdómen esquerdo, relacionado com a grande curvatura do estômago.", function: "Filtra sangue, participa na imunidade e no processamento de células sanguíneas.", clinical: "A avaliação ecográfica pode ser relevante perante massas, anemia ou hemorragia abdominal." },
  "Tiroide": { location: "Região cervical ventral, com lobos junto à porção cranial da traqueia.", function: "Produz tiroxina e triiodotironina, hormonas reguladoras do metabolismo.", clinical: "O hipotiroidismo é relevante no cão; o hipertiroidismo é comum no gato geriátrico." },
  "Pâncreas": { location: "Abdómen cranial, associado ao duodeno e ao estômago.", function: "Secreta enzimas digestivas e hormonas como insulina e glucagina.", clinical: "A pancreatite pode apresentar sinais inespecíficos; a avaliação exige integração clínica e laboratorial." },
  "Medula espinal": { location: "Interior do canal vertebral, envolvida pelas meninges.", function: "Conduz vias motoras e sensitivas e integra arcos reflexos.", clinical: "A localização neuroanatómica é essencial no exame neurológico de paresia e ataxia." },
};
const anatomicalPlates = {
  "Cão": [
    { title: "Esqueleto — prancha anatómica", file: "Dog_anatomy_lateral_skeleton_view_(full).jpg", source: "https://commons.wikimedia.org/wiki/File:Dog_anatomy_lateral_skeleton_view_(full).jpg", credit: "Ellenberger e Baum / Hermann Dittrich · domínio público", system: "Esquelético" },
    { title: "Anatomia craniana", file: "Dog_anatomy_head.jpg", source: "https://commons.wikimedia.org/wiki/File:Dog_anatomy_head.jpg", credit: "Hermann Dittrich / Ellenberger e Baum · obra histórica", system: "Esquelético" },
    { title: "Vista anterior", file: "Dog_anatomy_anterior_view.jpg", source: "https://commons.wikimedia.org/wiki/File:Dog_anatomy_anterior_view.jpg", credit: "Hermann Dittrich / Ellenberger e Baum · obra histórica", system: "Muscular" },
    { title: "Anatomia do membro", file: "Ellenberger_Leisering_Dog.jpg", source: "https://commons.wikimedia.org/wiki/File:Ellenberger_Leisering_Dog.jpg", credit: "Ellenberger e Leisering · 1908, domínio público nos EUA", system: "Esquelético" },
  ],
  "Gato": [
    { title: "Esqueleto — fotografia de museu", file: "Cat_skeleton.jpg", source: "https://commons.wikimedia.org/wiki/File:Cat_skeleton.jpg", credit: "Museu de Anatomia Veterinária FMVZ USP / Wagner Souza e Silva · CC BY-SA 4.0", system: "Esquelético" },
    { title: "Comparação óssea cão / gato", file: "The_skeletal_structure_of_a_cat_and_a_dog,_Wellcome_L0034200.jpg", source: "https://commons.wikimedia.org/wiki/File:The_skeletal_structure_of_a_cat_and_a_dog,_Wellcome_L0034200.jpg", credit: "Wellcome Collection · CC BY 4.0", system: "Esquelético" },
  ],
} as const;
function Atlas() {
  const [species, setSpecies] = useState<"Cão" | "Gato">("Cão");
  const [system, setSystem] = useState<System>("Esquelético");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quiz, setQuiz] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [favorites, setFavorites] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("vetestudo-atlas-favorites") || "[]"); } catch { return []; } });
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem("vetestudo-atlas-notes") || "{}"); } catch { return {}; } });
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [detailsTab, setDetailsTab] = useState<"Resumo" | "Função" | "Clínica">("Resumo");
  const [studyMode, setStudyMode] = useState(false);
  const [view, setView] = useState<"Pranchas reais" | "Esquema interativo">("Pranchas reais");
  const [plateIndex, setPlateIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [target, setTarget] = useState(0);
  const visible = useMemo(() => structures.filter(s => s.system === system && s.name.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT").trim()) && (!onlyFavorites || favorites.includes(s.name))), [system, search, favorites, onlyFavorites]);
  const current = visible.find(s => s.name === selected);
  const challenge = structures.filter(s => s.system === system)[target % structures.filter(s => s.system === system).length];
  function saveNote(name: string, value: string) { setNotes(old => { const next = { ...old, [species + ":" + name]: value }; try { localStorage.setItem("vetestudo-atlas-notes", JSON.stringify(next)); } catch {} return next; }); }
  function toggleFavorite(name: string) { setFavorites(old => { const next = old.includes(name) ? old.filter(x => x !== name) : [...old, name]; try { localStorage.setItem("vetestudo-atlas-favorites", JSON.stringify(next)); } catch {} return next; }); }
  function choose(s: Structure) {
    setDetailsTab("Resumo");
    if (quiz) {
      setScore(v => ({ correct: v.correct + Number(s.name === challenge.name), total: v.total + 1 }));
      setQuizFeedback(s.name === challenge.name ? "Correto! Muito bem." : "Ainda não. A resposta correta era: " + challenge.name);
      setSelected(s.name);
      setTarget(v => v + 1);
    } else setSelected(s.name);
  }
  function changeSystem(s: System) { setSystem(s); setSelected(null); setTarget(0); setQuizFeedback(null); setScore({ correct: 0, total: 0 }); }
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><h1 className="text-3xl font-bold">Atlas interativo de anatomia</h1><p className="mt-1 text-sm text-muted-foreground">Explora estruturas anatómicas de cães e gatos. Ilustrações separadas de cão e gato, sistemas por camadas e exercícios de identificação. Representação esquemática, não à escala.</p></div>
    <div className="flex flex-wrap items-center gap-2">
      {(["Cão", "Gato"] as const).map(s => <Button key={s} size="sm" variant={species === s ? "default" : "outline"} onClick={() => { setSpecies(s); setSelected(null); setPlateIndex(0); setImageFailed(false); }}>{s}</Button>)}
      <span className="mx-2 h-6 border-l" />
      {systems.map(s => <Button key={s} size="sm" variant={system === s ? "default" : "outline"} onClick={() => changeSystem(s)}>{s}</Button>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
      <section className="min-w-0 space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Vista lateral · {species}</h2>
          <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(1, +(z - .25).toFixed(2)))} disabled={zoom === 1}>−</Button>
          <span className="text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(2, +(z + .25).toFixed(2)))} disabled={zoom === 2}>+</Button>
          <Button size="sm" variant="outline" onClick={() => setShowLabels(v => !v)}>{showLabels ? "Ocultar legendas" : "Mostrar legendas"}</Button>
          <Button size="sm" variant={studyMode ? "default" : "outline"} onClick={() => { setStudyMode(v => !v); setQuiz(false); setSelected(null); }}>Modo de estudo</Button>
          <Button size="sm" variant={quiz ? "default" : "outline"} onClick={() => { setQuiz(v => !v); setScore({ correct: 0, total: 0 }); setTarget(0); setSelected(null); }}>{quiz ? "Terminar exercício" : "Praticar identificação"}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["Pranchas reais", "Esquema interativo"] as const).map(v => <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>{v}</Button>)}
        </div>
        {view === "Pranchas reais" && <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Pranchas anatómicas documentadas, com autoria e licença. Nesta fase, a coleção inclui principalmente imagens históricas do esqueleto e de regiões anatómicas, não pranchas modernas de todos os sistemas. Os pontos interativos estão no separador «Esquema interativo» e não estão sobrepostos às fotografias.</p>
          <div className="flex flex-wrap gap-2">{anatomicalPlates[species].map((plate, i) => <Button key={plate.file} size="sm" variant={plateIndex === i ? "default" : "outline"} onClick={() => { setPlateIndex(i); setImageFailed(false); }}>{plate.title}</Button>)}</div>
          <div className="overflow-auto rounded-xl border bg-white p-2">
            {imageFailed ? <div className="p-8 text-center text-sm">Não foi possível carregar esta imagem. <a className="underline" href={anatomicalPlates[species][plateIndex].source} target="_blank" rel="noopener noreferrer">Abrir original no Wikimedia Commons</a>.</div> : <img onError={() => setImageFailed(true)} src={"https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(anatomicalPlates[species][plateIndex].file)} alt={anatomicalPlates[species][plateIndex].title + " de " + species} className="mx-auto max-h-[620px] w-auto max-w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />}
          </div>
          <p className="text-sm font-medium">{anatomicalPlates[species][plateIndex].title}</p>
          <p className="text-xs text-muted-foreground">Fonte: {anatomicalPlates[species][plateIndex].credit}. <a href={anatomicalPlates[species][plateIndex].source} target="_blank" rel="noopener noreferrer" className="underline">Ver original e licença no Wikimedia Commons</a>.</p>
        </div>}
        {view === "Esquema interativo" && <>
        {quiz && <div className="rounded-lg bg-muted p-3 text-sm"><strong>Encontra: {challenge.name}</strong><span className="ml-3">Acertos: {score.correct}/{score.total}</span>{quizFeedback && <p className="mt-2">{quizFeedback}</p>}</div>}
        <div className="overflow-auto rounded-xl bg-slate-50"><svg style={{ width: (zoom * 100) + "%", maxWidth: "none" }} viewBox="0 0 540 350" role="img" aria-label={`Esquema anatómico lateral de ${species.toLowerCase()} com pontos interativos`} className="w-full rounded-xl bg-slate-50">
          <defs>
            <linearGradient id="coat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={species === "Cão" ? "#e6b87e" : "#c5d1d9"}/><stop offset="1" stopColor={species === "Cão" ? "#b78353" : "#8d9fae"}/></linearGradient>
            <linearGradient id="organ" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fda4af"/><stop offset="1" stopColor="#e11d48"/></linearGradient>
          </defs>
          <path d="M75 302 H512" stroke="#cbd5e1" strokeWidth="2"/>
          {species === "Cão" ? <>
            <path d="M437 137 Q476 124 493 88 Q504 68 505 56" stroke="#986c45" strokeWidth="17" strokeLinecap="round" fill="none"/>
            <path d="M119 125 Q153 90 224 102 Q316 95 393 115 Q437 118 450 149 Q451 171 427 188 L430 287 Q426 301 408 300 L395 199 L374 198 L361 294 Q354 304 338 296 L341 189 Q259 214 190 188 L186 292 Q181 303 164 299 L156 186 L144 183 L130 294 Q125 305 107 297 L114 170 Q101 163 92 149 L54 153 Q36 150 32 135 L53 123 L62 99 L81 92 L94 106 L103 93 Z" fill="url(#coat)" stroke="#78533d" strokeWidth="3" strokeLinejoin="round"/>
            <path d="M61 101 L69 73 Q80 78 88 100" fill="#8d6143" stroke="#78533d" strokeWidth="3"/>
            <path d="M35 137 Q53 147 75 140" fill="none" stroke="#78533d" strokeWidth="2"/>
            <ellipse cx="83" cy="119" rx="4" ry="5" fill="#292524"/><circle cx="35" cy="132" r="5" fill="#292524"/>
            <path d="M148 111 Q187 104 202 130" fill="none" stroke="#fff7ed" strokeWidth="4" opacity=".55"/>
          </> : <>
            <path d="M429 134 Q470 119 478 91 Q490 52 510 60 Q530 69 511 83" stroke="#8798a6" strokeWidth="15" strokeLinecap="round" fill="none"/>
            <path d="M117 128 Q156 101 234 112 Q323 109 399 126 Q432 128 444 153 L428 182 L421 288 Q413 299 398 294 L391 193 L371 194 L362 290 Q352 302 340 294 L342 187 Q263 207 191 185 L183 290 Q176 302 163 295 L157 183 L144 183 L132 290 Q124 302 111 295 L116 174 Q102 163 94 153 L64 151 Q47 148 46 132 L61 120 L59 84 L82 105 L101 80 L109 116 Z" fill="url(#coat)" stroke="#64748b" strokeWidth="3" strokeLinejoin="round"/>
            <path d="M59 85 L80 105 L102 82 L103 126 L63 125 Z" fill="#b6c3cd" stroke="#64748b" strokeWidth="2"/>
            <path d="M49 142 Q61 147 74 140" fill="none" stroke="#64748b" strokeWidth="2"/>
            <ellipse cx="88" cy="127" rx="4" ry="5" fill="#1e293b"/><path d="M47 133 L56 132 L52 139 Z" fill="#475569"/>
            <path d="M51 141 L30 137 M53 144 L29 146 M53 147 L33 155" stroke="#64748b" strokeWidth="1.4"/>
            <path d="M105 139 Q139 126 167 140 M203 115 Q240 127 265 118 M297 118 Q327 130 352 124" fill="none" stroke="#718096" strokeWidth="5" opacity=".4"/>
          </>}
          {system === "Esquelético" && <g fill="none" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" opacity=".95">
            <path d="M79 124 L122 128 L163 119 L208 118 L252 118 L298 121 L345 127 L395 140"/>
            <path d="M185 124 Q178 149 197 174 M198 124 Q196 158 220 181 M211 124 Q216 162 241 187 M225 124 Q237 166 259 189 M239 124 Q253 164 277 187 M254 124 Q273 165 292 181"/>
            <path d="M175 126 L154 175 L121 282 M395 151 L375 202 L350 283 M395 154 L411 202 L417 282"/>
            <path d="M72 116 Q88 96 101 117 L98 140 L72 142 Z"/>
          </g>}
          {system === "Muscular" && <g fill="#f97316" stroke="#9a3412" strokeWidth="2" opacity=".8">
            <path d="M122 143 Q164 107 200 127 L180 169 L139 171 Z"/>
            <path d="M198 130 Q272 112 339 139 L335 181 Q260 192 193 172 Z"/>
            <path d="M373 153 Q423 162 420 204 L402 249 L382 204 Z"/>
            <path d="M405 217 Q426 231 422 277 L409 286 L402 248 Z"/>
            <path d="M83 131 Q102 125 109 143 L91 150 Z"/>
          </g>}
          {system === "Nervoso" && <g fill="none" stroke="#a855f7" strokeLinecap="round">
            <ellipse cx="87" cy="117" rx="19" ry="11" fill="#d8b4fe" strokeWidth="2"/>
            <path d="M106 119 Q170 111 238 121 T397 141" strokeWidth="6"/>
            <path d="M173 119 L155 173 L125 267 M218 120 L187 178 L174 267 M361 135 L383 208 L413 277" strokeWidth="3"/>
          </g>}
          {system === "Respiratório" && <g opacity=".86">
            <path d="M99 135 Q137 139 183 153" stroke="#0ea5e9" strokeWidth="9" strokeLinecap="round" fill="none"/>
            <path d="M193 147 Q224 136 249 156 Q267 184 253 204 Q226 215 196 196 Q180 171 193 147" fill="#7dd3fc" stroke="#0284c7" strokeWidth="2"/>
            <path d="M258 153 Q284 145 300 171 Q312 193 290 207 L259 199 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="2"/>
            <path d="M305 144 Q296 180 309 211" fill="none" stroke="#0f766e" strokeWidth="5"/>
          </g>}
          {system === "Cardiovascular" && <g>
            <path d="M219 181 C202 161 189 188 219 213 C251 190 235 162 219 181 Z" fill="url(#organ)" stroke="#be123c" strokeWidth="2"/>
            <path d="M222 176 Q226 142 254 142 L333 141" fill="none" stroke="#dc2626" strokeWidth="7" strokeLinecap="round"/>
            <path d="M221 208 Q237 224 274 226" fill="none" stroke="#2563eb" strokeWidth="5"/>
          </g>}
          {system === "Digestivo" && <g opacity=".9">
            <path d="M102 144 Q173 153 258 169 L299 182" fill="none" stroke="#b45309" strokeWidth="5"/>
            <path d="M290 151 Q319 143 343 162 L331 191 L298 183 Z" fill="#92400e" stroke="#78350f" strokeWidth="2"/>
            <path d="M313 196 Q335 181 347 202 Q351 225 327 228 Q307 220 313 196" fill="#fda4af" stroke="#be123c" strokeWidth="2"/>
            <path d="M343 227 Q357 212 370 232 T397 238 T380 261 T351 253 T389 266" fill="none" stroke="#f97316" strokeWidth="11" strokeLinecap="round"/>
          </g>}
          {system === "Urinário" && <g>
            <path d="M345 155 Q326 164 333 184 Q348 194 358 177 Q365 158 345 155" fill="#a78bfa" stroke="#6d28d9" strokeWidth="2"/>
            <path d="M359 181 Q376 206 398 244" fill="none" stroke="#8b5cf6" strokeWidth="4"/>
            <ellipse cx="410" cy="250" rx="17" ry="13" fill="#c4b5fd" stroke="#6d28d9" strokeWidth="2"/>
          </g>}
          {visible.map(s => <g key={s.name} onClick={() => choose(s)} className="cursor-pointer" role="button" aria-label={s.name} tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(s); } }}>
            <circle cx={s.x} cy={s.y} r={selected === s.name ? 13 : 10} fill={palette[system]} stroke="white" strokeWidth="3" opacity={selected === s.name ? 1 : 0.85}/>
            <circle cx={s.x} cy={s.y} r="17" fill="transparent"/>
            {showLabels && !quiz && !studyMode && <text x={s.x + 13} y={s.y - 12} fontSize="10" fontWeight="600" fill="#0f172a" stroke="#f8fafc" strokeWidth="3" paintOrder="stroke">{s.name}</text>}
          </g>)}
        </svg></div>
        <p className="text-xs text-muted-foreground">Os pontos de sistemas sem camada desenhada são apenas marcadores de referência e não indicam localização anatómica exata. Toca num ponto para consultar a estrutura. As posições são aproximadas e destinam-se à aprendizagem inicial.</p></>}
      </section>
      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Estruturas · {system} <span className="text-xs font-normal text-muted-foreground">({visible.length})</span></h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyFavorites} onChange={e => setOnlyFavorites(e.target.checked)} /> Apenas favoritas ({favorites.length})</label>
        <Input placeholder="Pesquisar estrutura…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="max-h-64 space-y-1 overflow-auto">{visible.map(s => <button key={s.name} onClick={() => choose(s)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${selected === s.name ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{s.name}</button>)}</div>
        {current && <div className="space-y-3 rounded-xl border p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-lg font-bold">{current.name}</h3><Button size="sm" variant="outline" onClick={() => toggleFavorite(current.name)}>{favorites.includes(current.name) ? "★ Guardada" : "☆ Guardar"}</Button></div><div className="flex flex-wrap gap-2">{(["Resumo", "Função", "Clínica"] as const).map(tab => <Button key={tab} size="sm" variant={detailsTab === tab ? "default" : "outline"} onClick={() => setDetailsTab(tab)}>{tab}</Button>)}</div><p className="text-sm leading-relaxed">{detailsTab === "Resumo" ? current.description : detailsTab === "Função" ? clinical[current.name]?.function || current.description : clinical[current.name]?.clinical || "Informação clínica específica ainda em preparação; consulta bibliografia veterinária para aprofundar."}</p>{detailsTab === "Resumo" && clinical[current.name]?.location && <p className="text-sm"><strong>Localização:</strong> {clinical[current.name].location}</p>}{!clinical[current.name] && <p className="text-xs text-muted-foreground">Ficha em expansão: os detalhes ainda não foram integralmente revistos.</p> }{(species === "Cão" ? current.dog : current.cat) && <p className="text-sm text-muted-foreground">{species === "Cão" ? current.dog : current.cat}</p>}<label className="block text-sm font-medium">As minhas notas<textarea className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3 text-sm" placeholder="Escreve aqui apontamentos sobre esta estrutura…" value={notes[species + ":" + current.name] || ""} onChange={e => saveNote(current.name, e.target.value)} /></label><p className="text-xs text-muted-foreground">Notas guardadas neste navegador.</p></div>}
        {!current && <p className="text-sm text-muted-foreground">Seleciona uma estrutura no esquema ou na lista para veres a explicação.</p>}
      </section>
    </div>
    <p className="text-xs text-muted-foreground">Conteúdo introdutório de anatomia comparada. A nomenclatura deve ser conferida com a Nomina Anatomica Veterinaria (WAVA); os desenhos e pontos não são imagens anatómicas validadas nem servem para diagnóstico.</p>
  </div>;
}
