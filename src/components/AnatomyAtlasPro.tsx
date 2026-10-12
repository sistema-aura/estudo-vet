import { useEffect, useMemo, useState } from "react";
import { BookOpen, CircleHelp, ExternalLink, EyeOff, Heart, Layers, Maximize2, Menu, NotebookPen, PawPrint, RotateCcw, Search, Stethoscope, X, ZoomIn, ZoomOut } from "lucide-react";

type Structure = { name: string; system: string; description: string; dog?: string; cat?: string };
type Clinical = { location: string; function: string; clinical: string };
type Species = "Cão" | "Gato";
type Plate = {
  id: string; species: Species; system: string; title: string; file: string;
  author: string; license: string; licenseUrl: string; context: string;
  structures: string[]; focus?: string; kind: "Prancha histórica" | "Ilustração científica" | "Preparação anatómica" | "Fotografia";
};
const museum = "Museu de Anatomia Veterinária FMVZ-USP / Wagner Souza e Silva";
const ccsa = "https://creativecommons.org/licenses/by-sa/4.0/";
const pd = "https://creativecommons.org/publicdomain/mark/1.0/";
const allPlates: Plate[] = [
  { id: "dog-overview", species: "Cão", system: "Visão geral", title: "Cão · prancha anatómica de referência", file: "Dog_anatomy_lateral_skeleton_view_(full).jpg", author: "Wilhelm Ellenberger e Hermann Baum / Hermann Dittrich", license: "Domínio público", licenseUrl: pd, kind: "Prancha histórica", context: "Prancha histórica de elevada resolução do esqueleto canino; serve de ponto de partida para explorar os sistemas disponíveis na galeria. Não mostra órgãos internos.", structures: ["Crânio","Coluna vertebral","Costelas","Escápula","Úmero","Rádio","Pélvis","Fémur","Tíbia"] },
  { id: "cat-overview", species: "Gato", system: "Visão geral", title: "Gato · anatomia geral em português", file: "Scheme_cat_anatomy-pt.svg", author: "Surachit / Persian Poet Gal; versão portuguesa corrigida por Sturm", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", kind: "Ilustração científica", context: "Diagrama de anatomia interna felina com legendas portuguesas, apropriado para orientação geral. Não representa todas as estruturas nem as proporções individuais.", structures: ["Coração","Pulmões","Fígado","Estômago","Intestino delgado","Intestino grosso","Rim","Bexiga urinária"] },
  { id: "dog-skeleton", species: "Cão", system: "Esquelético", title: "Esqueleto canino · vista lateral", file: "Dog_anatomy_lateral_skeleton_view_(full).jpg", author: "Wilhelm Ellenberger e Hermann Baum / Hermann Dittrich", license: "Domínio público", licenseUrl: pd, kind: "Prancha histórica", context: "Gravura anatómica histórica de alta resolução. As várias regiões ósseas são representadas em conjunto.", structures: ["Crânio", "Coluna vertebral", "Costelas", "Escápula", "Úmero", "Rádio", "Pélvis", "Fémur", "Tíbia"] },
  { id: "dog-skeleton-labels", species: "Cão", system: "Esquelético", title: "Esqueleto do cão · guia numerado", file: "Skeleton_of_a_dog_diagram.svg", author: "Przemek Maksim", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", kind: "Ilustração científica", context: "Mapa numerado dos ossos e regiões vertebrais do cão, a consultar com as respetivas legendas no original.", structures: ["Crânio","Coluna vertebral","Costelas","Escápula","Úmero","Rádio","Pélvis","Fémur","Tíbia"] },
  { id: "dog-head", species: "Cão", system: "Muscular", title: "Cabeça · anatomia muscular", file: "Dog_anatomy_head.jpg", author: "Hermann Dittrich / Ellenberger e Baum", license: "Domínio público", licenseUrl: pd, kind: "Prancha histórica", context: "Ilustração clássica da anatomia superficial e profunda da cabeça; inclui músculos da mastigação.", structures: ["Músculo masséter", "Crânio", "Olho", "Ouvido externo"] },
  { id: "dog-forelimb", species: "Cão", system: "Muscular", title: "Membro torácico · músculos laterais", file: "202410_Muscles_of_canine_right_forelimb_lateral.svg", author: "DataBase Center for Life Science (TogoPicture)", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", kind: "Ilustração científica", context: "Ilustração do membro torácico direito canino em vista lateral. Não representa a musculatura de todo o corpo.", structures: ["Úmero", "Rádio"] },
  { id: "dog-brain", species: "Cão", system: "Nervoso", title: "Encéfalo e globos oculares · dissecação", file: "Dog_brain_and_eyeballs.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Peça fixada em formalina do encéfalo com estruturas oculares associadas.", structures: ["Encéfalo", "Cerebelo", "Olho"] },
  { id: "dog-heart", species: "Cão", system: "Cardiovascular", title: "Coração canino · preparação anatómica", file: "Dog_heart.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Preparação do coração clarificada pela técnica de Spalteholz. A aparência não reproduz um órgão fresco.", structures: ["Coração"], focus: "Coração" },
  { id: "dog-lungs", species: "Cão", system: "Respiratório", title: "Pulmões e traqueia · vista caudodorsal", file: "Lungs_and_trachea_of_canid.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Preparação por glicerinação da traqueia e dos pulmões caninos; vista caudodorsal.", structures: ["Pulmões", "Traqueia"] },
  { id: "dog-lungvessels", species: "Cão", system: "Respiratório", title: "Vascularização pulmonar · corrosão", file: "Dog_lungs.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Molde de vasos pulmonares por injeção e corrosão. Não representa a superfície exterior do pulmão.", structures: ["Pulmões"], focus: "Pulmões" },
  { id: "dog-digestive", species: "Cão", system: "Digestivo", title: "Aparelho digestivo do cão", file: "Dog_digestive_tract.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Peça conservada em formalina. A disposição ex vivo difere da situação normal no animal vivo.", structures: ["Estômago", "Intestino delgado", "Intestino grosso", "Esófago"] },
  { id: "dog-kidneys", species: "Cão", system: "Urinário", title: "Rins caninos · peça anatómica", file: "Dog_kidney--_FMVZ_USP-11.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Preparação com fixação em formalina; permite estudar a forma externa dos rins.", structures: ["Rim"], focus: "Rim" },
  { id: "dog-uterus", species: "Cão", system: "Reprodutor", title: "Útero da cadela · peça anatómica", file: "Uterus_of_a_dog.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Útero de cadela preparado por glicerinação; visualização de cornos uterinos, corpo e estruturas associadas.", structures: ["Útero"], focus: "Útero" },
  { id: "dog-endocrine", species: "Cão", system: "Endócrino", title: "Principais glândulas endócrinas do cão", file: "Anatomy_and_physiology_of_animals_Main_endocrine_organs_of_the_body-int.svg", author: "Д.Ильин", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", kind: "Ilustração científica", context: "Mapa didático da distribuição de glândulas endócrinas caninas; representação geral, não uma dissecação.", structures: ["Hipófise","Tiroide","Glândula suprarrenal"] },
  { id: "dog-spleen", species: "Cão", system: "Linfático", title: "Baço canino · peça anatómica", file: "Dog_spleen.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Baço canino fixado em formalina; integra o sistema imunitário e está associado à circulação sanguínea.", structures: ["Baço"], focus: "Baço" },
  { id: "dog-eye", species: "Cão", system: "Órgãos dos sentidos", title: "Encéfalo e olhos · dissecação", file: "Dog_brain_and_eyeballs.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Preparação anatómica que permite estudar a relação entre estruturas oculares e encéfalo.", structures: ["Olho", "Encéfalo"] },
  { id: "cat-skeleton", species: "Gato", system: "Esquelético", title: "Esqueleto felino · preparação de museu", file: "Cat_skeleton.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Esqueleto de gato doméstico preparado por maceração óssea; vista geral.", structures: ["Crânio", "Coluna vertebral", "Costelas", "Escápula", "Úmero", "Rádio", "Pélvis", "Fémur", "Tíbia"] },
  { id: "cat-skeleton-numbers", species: "Gato", system: "Esquelético", title: "Esqueleto felino · mapa numerado", file: "Skeleton_diagram_of_a_cat.svg", author: "Przemek Maksim", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", kind: "Ilustração científica", context: "Diagrama numerado do esqueleto de gato para identificação de segmentos da coluna e ossos dos membros.", structures: ["Crânio","Coluna vertebral","Costelas","Escápula","Úmero","Rádio","Pélvis","Fémur","Tíbia"] },
  { id: "cat-muscles", species: "Gato", system: "Muscular", title: "Musculatura superficial do gato", file: "Superficial_muscles_of_a_cat.jpg", author: "R. E. Holding / The Book of the Cat (1903)", license: "Domínio público", licenseUrl: pd, kind: "Prancha histórica", context: "Ilustração histórica dos músculos superficiais felinos; consultar nomenclatura anatómica veterinária atual para correspondência de termos.", structures: ["Músculo masséter", "Músculo trapézio", "Músculo grande dorsal", "Músculo bíceps femoral", "Músculo gastrocnémio"] },
  { id: "cat-skull", species: "Gato", system: "Esquelético", title: "Crânio felino · preparação osteológica", file: "Cat_skull._Felis_catus_01.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Peça de crânio felino preparada por maceração óssea, permitindo a observação da morfologia óssea externa.", structures: ["Crânio"], focus: "Crânio" },
  { id: "cat-heart", species: "Gato", system: "Cardiovascular", title: "Coração felino · preparação anatómica", file: "Cat_heart_01.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Coração de gato clarificado pela técnica de Spalteholz, com injeção de gelatina.", structures: ["Coração"], focus: "Coração" },
  { id: "cat-heart-alt", species: "Gato", system: "Cardiovascular", title: "Coração felino · outra vista", file: "Cat_heart_02.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Segunda preparação de coração de gato para comparar a morfologia externa.", structures: ["Coração"], focus: "Coração" },
  { id: "cat-intestine", species: "Gato", system: "Digestivo", title: "Intestino delgado felino · preparação", file: "Cat_small_intestine.jpg", author: museum, license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Preparação anatómica", context: "Peça de intestino delgado de gato conservada em formalina.", structures: ["Intestino delgado"], focus: "Intestino delgado" },
  { id: "cat-eye", species: "Gato", system: "Órgãos dos sentidos", title: "Olho felino · estrutura interna", file: "Cat_eye_(HY).svg", author: "Լիլիթ-Գ-5 / WikiGraphers (Hetq Media Factory)", license: "CC BY-SA 4.0", licenseUrl: ccsa, kind: "Ilustração científica", context: "Esquema de um olho felino com legendas originais em arménio; usar em conjunto com a ficha em português.", structures: ["Olho"], focus: "Olho" },
];
const tone: Record<string, string> = {
  "Esquelético": "🦴", "Muscular": "💪", "Nervoso": "🧠", "Cardiovascular": "🫀",
  "Respiratório": "🫁", "Digestivo": "🫃", "Urinário": "🫘", "Reprodutor": "⚕️",
  "Endócrino": "⚗️", "Linfático": "🧬", "Tegumentar": "🖐️", "Órgãos dos sentidos": "👁️",
};
type Rich = { subtitle: string; sections: { label: string; value: string }[] };
const richProfiles: Record<string, Rich> = {
  "Coração": { subtitle: "Cor · coração com quatro câmaras", sections: [
    { label: "Localização", value: "Mediastino médio, no interior do saco pericárdico, entre os pulmões." },
    { label: "Anatomia", value: "Aurículas e ventrículos direitos e esquerdos, septos, valvas atrioventriculares e semilunares; artérias coronárias." },
    { label: "Vascularização", value: "Artérias coronárias originadas na aorta ascendente; drenagem venosa cardíaca sobretudo para o seio coronário." },
    { label: "Inervação", value: "Sistema nervoso autónomo, por fibras simpáticas e parassimpáticas, com automatismo intrínseco do tecido nodal." },
    { label: "Função", value: "O coração direito impulsiona sangue para a circulação pulmonar; o esquerdo impulsiona para a circulação sistémica." },
    { label: "Relevância clínica", value: "Auscultação, ecocardiografia, eletrocardiografia e radiografias apoiam a investigação de cardiopatias." },
  ] },
  "Músculo bíceps femoral": { subtitle: "Musculus biceps femoris · região caudolateral da coxa", sections: [
    { label: "Origem", value: "Principalmente tuberosidade isquiática, com contribuição relacionada com o ligamento sacrotuberoso no cão." },
    { label: "Inserção", value: "Fáscias da coxa e da perna, região da patela e margem cranial da tíbia; contribui também para o tendão calcâneo comum." },
    { label: "Inervação", value: "Nervo ciático, com ramos motores para o grupo caudal da coxa." },
    { label: "Ação", value: "Extensão da anca e movimentos do joelho dependentes da posição do membro; participa na extensão do tarso via tendão calcâneo comum." },
    { label: "Relevância clínica", value: "Importante no exame locomotor e na abordagem cirúrgica da região femoral caudal." },
  ] },
  "Rim": { subtitle: "Ren · rim de carnívoros domésticos", sections: [
    { label: "Localização", value: "Retroperitoneal e dorsal no abdómen; o rim direito é habitualmente mais cranial e menos móvel." },
    { label: "Estrutura", value: "Cápsula fibrosa, córtex, medula com pirâmide renal e pelve renal; o rim de cão e gato é externamente liso." },
    { label: "Irrigação", value: "Artéria renal da aorta abdominal; retorno venoso pelas veias renais para a veia cava caudal." },
    { label: "Função", value: "Filtração glomerular, regulação eletrolítica e ácido-base, concentração urinária e funções endócrinas." },
    { label: "Relevância clínica", value: "Urinálise, creatinina, SDMA, pressão arterial e ecografia contribuem para avaliação renal." },
  ] },
  "Pulmões": { subtitle: "Pulmones · órgãos respiratórios", sections: [
    { label: "Localização", value: "Cavidades pleurais direita e esquerda, separadas pelo mediastino." },
    { label: "Organização", value: "Pulmão esquerdo com lobo cranial subdividido e lobo caudal; pulmão direito com lobos cranial, médio, caudal e acessório." },
    { label: "Vascularização", value: "Artérias e veias pulmonares para as trocas gasosas; vascularização brônquica para nutrição tecidular." },
    { label: "Função", value: "Ventilação e difusão de oxigénio e dióxido de carbono entre alvéolos e capilares." },
    { label: "Relevância clínica", value: "Auscultação, padrão respiratório, radiografia e ultrassonografia torácica integram a avaliação clínica." },
  ] },
  "Músculo masséter": { subtitle: "Musculus masseter · musculatura da mastigação", sections: [
    { label: "Origem", value: "Arco zigomático e estruturas associadas." },
    { label: "Inserção", value: "Face lateral da mandíbula, sobretudo fossa massetérica." },
    { label: "Inervação", value: "Nervo massetérico, ramo motor do nervo mandibular (V3, nervo trigémio)." },
    { label: "Função", value: "Eleva a mandíbula durante a mastigação." },
    { label: "Relevância clínica", value: "Palpação e inspeção ajudam na avaliação de atrofia, dor ou miosite dos músculos mastigatórios." },
  ] },
  "Baço": { subtitle: "Lien · órgão linfático e hematológico", sections: [
    { label: "Localização", value: "Abdómen, associado à grande curvatura do estômago por meio do ligamento gastroesplénico." },
    { label: "Função", value: "Vigilância imunitária, remoção de eritrócitos alterados e armazenamento sanguíneo variável." },
    { label: "Relevância clínica", value: "Massas esplénicas, hemorragia intra-abdominal e alterações da dimensão podem exigir avaliação ecográfica." },
  ] },
  "Intestino delgado": { subtitle: "Intestinum tenue · duodeno, jejuno e íleo", sections: [
    { label: "Partes", value: "Duodeno, jejuno e íleo; as vilosidades e microvilosidades ampliam a superfície absortiva." },
    { label: "Função", value: "Digestão química, absorção de nutrientes e transporte do quimo." },
    { label: "Vascularização", value: "Ramos das artérias celíaca e mesentérica cranial, conforme o segmento intestinal." },
    { label: "Relevância clínica", value: "Corpos estranhos, enterites, obstruções e enteropatias crónicas podem afetar esta região." },
  ] },
  "Fígado": { subtitle: "Hepar · órgão metabólico e glandular", sections: [
    { label: "Localização", value: "Abdómen cranial, caudal ao diafragma, com diferentes lobos que envolvem a região gástrica." },
    { label: "Vascularização", value: "Recebe sangue pela veia porta e artéria hepática; drena por veias hepáticas para a veia cava caudal." },
    { label: "Função", value: "Metabolismo de nutrientes, síntese de proteínas plasmáticas, armazenamento energético, produção e secreção de bílis." },
    { label: "Relevância clínica", value: "Alterações de enzimas hepáticas e avaliação ecográfica devem ser interpretadas em contexto clínico." },
  ] },
  "Estômago": { subtitle: "Gaster · segmento dilatado do tubo digestivo", sections: [
    { label: "Localização", value: "Abdómen cranial, com maior parte à esquerda, entre esófago e duodeno." },
    { label: "Anatomia", value: "Cárdia, fundo, corpo e região pilórica, com curvaturas maior e menor e pregas da mucosa." },
    { label: "Função", value: "Armazena, mistura e acidifica o conteúdo alimentar, iniciando sobretudo a digestão proteica." },
    { label: "Relevância clínica", value: "Vómito e obstrução são apresentações relevantes; dilatação-vólvulo gástrico é emergência no cão." },
  ] },
  "Traqueia": { subtitle: "Trachea · via aérea condutora", sections: [
    { label: "Localização", value: "Estende-se desde a cartilagem cricóide da laringe até à carina, onde se divide nos brônquios principais." },
    { label: "Anatomia", value: "Anéis cartilagíneos incompletos dorsalmente, unidos pelo músculo traqueal e tecido conjuntivo." },
    { label: "Função", value: "Condução de ar e depuração mucociliar de partículas inaladas." },
    { label: "Relevância clínica", value: "Estenose, colapso traqueal e doenças inflamatórias podem causar tosse e dificuldade respiratória." },
  ] },
  "Útero": { subtitle: "Uterus · órgão reprodutor feminino", sections: [
    { label: "Localização", value: "No abdómen e na cavidade pélvica, entre a região sublombar e a bexiga, conforme o estado reprodutivo." },
    { label: "Anatomia", value: "Útero bicórneo com dois cornos relativamente longos, corpo curto e colo uterino." },
    { label: "Vascularização", value: "Irrigação por ramos uterinos associados à artéria vaginal e à artéria ovárica." },
    { label: "Função", value: "Receção dos embriões, placentação, manutenção da gestação e contrações no parto." },
    { label: "Relevância clínica", value: "A piómetra é uma emergência frequente em fêmeas inteiras; não se deve confundir útero normal com patologia." },
  ] },
  "Crânio": { subtitle: "Cranium · ossos do neurocrânio e viscerocrânio", sections: [
    { label: "Anatomia", value: "Inclui ossos que protegem o encéfalo e constituem as cavidades nasais, orbitárias e a face." },
    { label: "Função", value: "Proteção do encéfalo e dos órgãos dos sentidos; sustentação de dentes e inserção da musculatura mastigatória." },
    { label: "Relevância clínica", value: "Trauma craniano, doença dentária e conformações braquicefálicas exigem avaliação anatómica específica." },
  ] },
  "Coluna vertebral": { subtitle: "Columna vertebralis · esqueleto axial", sections: [
    { label: "Anatomia", value: "Nos cães e gatos, tipicamente 7 vértebras cervicais, 13 torácicas, 7 lombares e 3 sacrais fusionadas; número de caudais variável." },
    { label: "Função", value: "Protege a medula espinal, suporta o tronco e permite movimentos controlados." },
    { label: "Relevância clínica", value: "A localização segmentar das lesões e a interpretação radiográfica são essenciais em neurologia e ortopedia." },
  ] },
  "Tiroide": { subtitle: "Glandula thyroidea · sistema endócrino", sections: [
    { label: "Localização", value: "Dois lobos, geralmente situados junto à traqueia cervical cranial, nas proximidades da laringe." },
    { label: "Vascularização", value: "Irrigação tiroideia, incluindo ramos provenientes de artérias regionais cervicais." },
    { label: "Função", value: "Produção de T4 e T3, hormonas envolvidas no metabolismo e termogénese." },
    { label: "Relevância clínica", value: "Hipotiroidismo adquirido é particularmente relevante no cão; hipertiroidismo é comum no gato geriátrico." },
  ] },
  "Cerebelo": { subtitle: "Cerebellum · divisão do encéfalo", sections: [
    { label: "Localização", value: "Porção caudal da cavidade craniana, dorsal ao tronco encefálico." },
    { label: "Função", value: "Coordenação motora, precisão e aprendizagem dos movimentos, equilíbrio e ajuste do tónus." },
    { label: "Relevância clínica", value: "Disfunção cerebelosa pode causar ataxia, hipermetria e tremor de intenção." },
  ] },
  "Músculo trapézio": { subtitle: "Musculus trapezius · região cervical e torácica dorsal", sections: [
    { label: "Origem", value: "Rafe mediana dorsal e ligamento supraespinhoso nas regiões cervical e torácica." },
    { label: "Inserção", value: "Espinha da escápula." },
    { label: "Inervação", value: "Nervo acessório (XI), com contribuições cervicais." },
    { label: "Função", value: "Elevação e rotação da escápula, participando na movimentação do membro torácico." },
    { label: "Relevância clínica", value: "Importante para a identificação de planos musculares em dissecação e na avaliação de atrofia regional." },
  ] },
  "Músculo gastrocnémio": { subtitle: "Musculus gastrocnemius · região caudal da perna", sections: [
    { label: "Origem", value: "Cabeças medial e lateral na região supracondilar do fémur." },
    { label: "Inserção", value: "Tuber calcanei através do tendão calcâneo comum." },
    { label: "Inervação", value: "Nervo tibial, ramo do nervo ciático." },
    { label: "Função", value: "Extensão do tarso e contribuição para a flexão do joelho." },
    { label: "Relevância clínica", value: "Lesões do mecanismo calcâneo comum comprometem o apoio e a extensão do tarso." },
  ] },
};
const tabs = ["Visão geral", "Anatomia", "Função", "Clínica"] as const;
function imageUrl(file: string, width = 1200) {
  return "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=" + width;
}
function fileUrl(file: string) { return "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(file); }
function AtlasImage({ plate, selected, studyMode, onSelect, zoom }: {
  plate: Plate; selected: string | null; studyMode: boolean; onSelect: (name: string) => void; zoom: number;
}) {
  const [failedFile, setFailedFile] = useState("");
  const failed = failedFile === plate.file;
  return <div className="relative flex min-h-[340px] flex-col items-center justify-center overflow-auto rounded-2xl border border-[#263b54] bg-[#050e18] lg:min-h-[460px]">
    {failed ? <div className="space-y-3 p-8 text-center text-slate-300">
      <p>Não foi possível apresentar esta prancha aqui.</p>
      <a className="text-sky-300 underline" href={fileUrl(plate.file)} target="_blank" rel="noopener noreferrer">Abrir a imagem original no Wikimedia Commons</a>
    </div> : <div className="relative mx-auto flex max-w-none items-center justify-center" style={{ width: (zoom * 100) + "%" }}>
      <img key={plate.file} onError={() => setFailedFile(plate.file)} src={imageUrl(plate.file)} alt={plate.title} className="block max-h-[535px] w-full object-contain" loading="eager" referrerPolicy="no-referrer" />
      {plate.focus && !studyMode && <button type="button" onClick={() => onSelect(plate.focus!)}
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border-2 border-white bg-blue-600/90 px-3 py-2 text-xs font-semibold text-white shadow-[0_0_0_5px_rgba(37,99,235,.22)] transition hover:scale-105 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        title={"Explorar " + plate.focus} aria-label={"Abrir ficha anatómica de " + plate.focus}>
        <span className="h-2 w-2 rounded-full bg-white" /> {selected === plate.focus ? "✓ " : ""}{plate.focus}
      </button>}
    </div>}
    <div className="absolute bottom-3 left-3 flex max-w-[80%] flex-wrap items-center gap-2">
      <span className="rounded-md border border-white/20 bg-[#0c1726]/90 px-2 py-1 text-[11px] text-slate-100">{plate.kind}</span>
      <span className="rounded-md border border-white/20 bg-[#0c1726]/90 px-2 py-1 text-[11px] text-slate-100">{plate.species}</span>
    </div>
    <a href={fileUrl(plate.file)} target="_blank" rel="noopener noreferrer" title="Abrir original" className="absolute right-3 top-3 rounded-lg border border-white/20 bg-[#0c1726]/90 p-2 text-slate-200 hover:text-white"><ExternalLink size={16} /></a>
  </div>;
}
export function AnatomyAtlasPro({ systems, structures, clinical }: {
  systems: readonly string[]; structures: Structure[]; clinical: Record<string, Clinical>;
}) {
  const [species, setSpecies] = useState<Species>("Cão");
  const [system, setSystem] = useState("Muscular");
  const [plateId, setPlateId] = useState("dog-head");
  const [selected, setSelected] = useState<string | null>("Músculo masséter");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number]>("Visão geral");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [studyMode, setStudyMode] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [zoom, setZoom] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [compare, setCompare] = useState(false);
  useEffect(() => {
    try { setFavorites(JSON.parse(window.localStorage.getItem("vetestudo-atlas-favorites") || "[]")); } catch { /* Optional browser storage */ }
  }, []);
  const library = useMemo(() => allPlates.filter(p => p.species === species), [species]);
  const shelf = library.filter(p => p.system === system);
  const active = library.find(p => p.id === plateId && p.system === system) || shelf[0];
  const filtered = structures.filter(s => (system === "Visão geral" || s.system === system) && (!favoriteOnly || favorites.includes(s.name)) && s.name.toLocaleLowerCase("pt-PT").includes(query.trim().toLocaleLowerCase("pt-PT")));
  const allMatches = query.trim() ? structures.filter(s => s.name.toLocaleLowerCase("pt-PT").includes(query.trim().toLocaleLowerCase("pt-PT"))).slice(0, 12) : [];
  const current = structures.find(s => s.name === selected && s.system === system);
  const quizPool = structures.filter(s => s.system === system);
  const challenge = quizPool.length ? quizPool[questionIndex % quizPool.length] : undefined;
  const profile = current ? richProfiles[current.name] : undefined;
  const noteKey = current ? species + ":" + current.name : "";
  function switchSystem(next: string) {
    setSystem(next); setSelected(null); setQuestionIndex(0); setFeedback(""); setZoom(1);
    const first = allPlates.find(p => p.species === species && p.system === next);
    setPlateId(first?.id || "");
    setMenuOpen(false);
  }
  function switchSpecies(next: Species) {
    setSpecies(next); setZoom(1); setFeedback("");
    const first = allPlates.find(p => p.species === next && p.system === system);
    setPlateId(first?.id || allPlates.find(p => p.species === next)?.id || "");
  }
  function choose(name: string) {
    const match = structures.find(s => s.name === name);
    if (!match) return;
    if (testMode && challenge) {
      const correct = challenge.name === match.name;
      setScore(old => ({ right: old.right + Number(correct), total: old.total + 1 }));
      setFeedback(correct ? "Correto! " + match.name : "Ainda não. Resposta: " + challenge.name);
      setQuestionIndex(i => i + 1);
    }
    setSystem(match.system); setSelected(match.name); setTab("Visão geral");
    const relevant = allPlates.find(p => p.species === species && p.structures.includes(match.name) && p.system === match.system);
    if (relevant) setPlateId(relevant.id);
  }
  function toggleFavorite(name: string) {
    setFavorites(old => {
      const next = old.includes(name) ? old.filter(n => n !== name) : [...old, name];
      try { window.localStorage.setItem("vetestudo-atlas-favorites", JSON.stringify(next)); } catch {}
      return next;
    });
  }
  function updateNote(value: string) {
    setNotes(old => {
      const next = { ...old, [noteKey]: value };
      try { window.localStorage.setItem("vetestudo-atlas-notes", JSON.stringify(next)); } catch {}
      return next;
    });
  }
  // The notes panel reads existing browser notes on first user interaction, avoiding an SSR hydration mismatch.
  function openNotes() {
    if (!notesLoaded) { try { setNotes(JSON.parse(window.localStorage.getItem("vetestudo-atlas-notes") || "{}")); } catch {} setNotesLoaded(true); }
    setShowNotes(v => !v);
  }
  const card = "rounded-2xl border border-[#24384e] bg-[#0d1d2c]";
  const navButton = (active: boolean) => "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition " + (active ? "bg-[#3077ed] font-semibold text-white shadow-[0_0_18px_rgba(48,119,237,.2)]" : "text-slate-300 hover:bg-[#1a3149] hover:text-white");
  return <div className={"font-sans text-slate-100 " + (fullScreen ? "fixed inset-0 z-[60] overflow-y-auto" : "min-h-[92vh] rounded-xl") + " bg-[#07121e]"} style={{ colorScheme: "dark" }}>
    <div className="flex min-h-[92vh] flex-col lg:flex-row">
      <aside className={(menuOpen ? "block " : "hidden ") + "w-full shrink-0 border-r border-[#23384d] bg-[#0d1b2c] lg:sticky lg:top-0 lg:block lg:h-screen lg:w-[230px] lg:overflow-y-auto"}>
        <div className="flex items-center justify-between border-b border-[#2d4259] px-4 py-4">
          <div className="flex items-center gap-2"><PawPrint className="h-9 w-9 fill-blue-300 text-blue-300" /><div><div className="text-xl font-extrabold tracking-tight">VetEstudo</div><div className="text-xs text-sky-300">Atlas Interativo de Anatomia</div></div></div>
          <button className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={20}/></button>
        </div>
        <div className="space-y-4 p-3">
          <div className="grid grid-cols-2 gap-2">{(["Cão", "Gato"] as const).map(s => <button key={s} className={"rounded-lg border px-3 py-3 text-sm font-semibold " + (species === s ? "border-blue-400 bg-[#193858] text-white" : "border-[#32465c] text-slate-300")} onClick={() => switchSpecies(s)}><span className="mr-1 text-xl">{s === "Cão" ? "🐕" : "🐈"}</span>{s}</button>)}</div>
          <nav aria-label="Sistemas anatómicos"><button className={navButton(system === "Visão geral")} onClick={() => { switchSystem("Visão geral"); }}><Layers size={17}/> Visão geral</button>
            {systems.map(s => <button key={s} onClick={() => switchSystem(s)} className={navButton(system === s)}><span className="w-5 text-center text-lg" aria-hidden="true">{tone[s] || "◇"}</span><span className="flex-1">Sistema {s.toLocaleLowerCase("pt-PT")}</span>{allPlates.some(p => p.system === s && p.species === species) && <span className="h-1.5 w-1.5 rounded-full bg-sky-300" title="Imagem disponível"/>}</button>)}
          </nav>
          <div className="border-t border-[#2b4156] pt-3"><p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Ferramentas de estudo</p>
            <button onClick={() => setFavoriteOnly(v => !v)} className={navButton(favoriteOnly)}><Heart size={16}/> Favoritos</button>
            <button onClick={openNotes} className={navButton(showNotes)}><NotebookPen size={16}/> Notas pessoais</button>
            <button onClick={() => setCompare(v => !v)} className={navButton(compare)}><Layers size={16}/> Comparação cão/gato</button>
            <button onClick={() => { setStudyMode(v => !v); setTestMode(false); }} className={navButton(studyMode)}><EyeOff size={16}/> Modo de estudo</button>
            <button onClick={() => { setTestMode(v => !v); setStudyMode(false); setFeedback(""); setScore({right:0,total:0});setQuestionIndex(0); }} className={navButton(testMode)}><CircleHelp size={16}/> Modo de teste</button>
          </div>
          <div className="border-t border-[#2b4156] pt-3"><a href="/painel" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sky-300 hover:bg-[#1a3149]">← Voltar ao VetEstudo</a></div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-[#203448] bg-[#081522]/95 px-3 py-2 backdrop-blur-md sm:px-5">
          <button onClick={() => setMenuOpen(v => !v)} aria-label="Abrir menu" className="rounded-lg p-2 text-slate-300 hover:bg-[#21364a] lg:hidden"><Menu size={19}/></button><a href="/painel" className="hidden text-xs text-sky-300 hover:underline sm:inline lg:hidden">← Painel</a>
          <div className="relative min-w-[180px] flex-1 sm:max-w-[560px]"><Search size={17} className="pointer-events-none absolute left-3 top-2.5 text-slate-400"/><Input aria-label="Pesquisar estrutura anatómica" value={query} onChange={e => setQuery(e.target.value)} placeholder="Procurar estrutura (ex.: coração, masséter, rim…)" className="h-9 border-[#32485f] bg-[#192839] pl-9 text-slate-100 placeholder:text-slate-400"/>
            {allMatches.length > 0 && <div className="absolute left-0 right-0 top-11 z-30 max-h-72 overflow-y-auto rounded-xl border border-[#34506b] bg-[#142639] p-2 shadow-2xl">{allMatches.map(s => <button key={s.name} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[#23517b]" onClick={() => { choose(s.name); setQuery(""); }}>{s.name}<span className="text-xs text-slate-400">{s.system}</span></button>)}</div>}
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2"><button onClick={() => setFavoriteOnly(v => !v)} title="Filtrar favoritos" className={"rounded-lg p-2 hover:bg-[#20364a] " + (favoriteOnly ? "text-amber-400" : "text-slate-300")}><Heart size={18}/></button><button onClick={openNotes} title="Notas" className="rounded-lg p-2 text-slate-300 hover:bg-[#20364a]"><NotebookPen size={18}/></button><button onClick={() => setFullScreen(v => !v)} title={fullScreen ? "Sair do ecrã expandido" : "Expandir o Atlas"} className="rounded-lg p-2 text-slate-300 hover:bg-[#20364a]"><Maximize2 size={18}/></button></div>
        </header>
        <div className="space-y-4 p-3 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-sky-400">Atlas anatómico · {species}</p><h1 className="mt-1 text-2xl font-bold tracking-tight">{tone[system] || "🐾"} {system}</h1><p className="mt-1 text-xs text-slate-400">Pranchas reais com proveniência identificada · fichas de estudo interativas</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-[#365574] px-3 py-1 text-xs text-sky-200">{library.length} imagens da espécie</span><span className="rounded-full border border-[#365574] px-3 py-1 text-xs text-slate-300">{structures.filter(s => s.system === system).length} estruturas</span></div></div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
            <section className="min-w-0 space-y-3">
              {active ? <>
                <div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><h2 className="text-lg font-bold">{active.title}</h2><p className="text-xs text-slate-400">{active.kind} · {active.license}</p></div><div className="flex items-center gap-1"><button title="Reduzir" onClick={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))} className="rounded-lg border border-[#35506c] p-2"><ZoomOut size={16}/></button><span className="min-w-11 text-center text-xs">{Math.round(zoom*100)}%</span><button title="Ampliar" onClick={() => setZoom(z => Math.min(2.5, +(z + 0.25).toFixed(2)))} className="rounded-lg border border-[#35506c] p-2"><ZoomIn size={16}/></button><button title="Repor zoom" onClick={() => setZoom(1)} className="rounded-lg border border-[#35506c] p-2"><RotateCcw size={16}/></button></div></div>
                <AtlasImage key={active.id} plate={active} zoom={zoom} selected={selected} studyMode={studyMode} onSelect={choose} />
                <div className="flex items-start gap-2 rounded-xl border border-[#28445e] bg-[#102337] px-3 py-3 text-sm text-slate-300"><BookOpen size={16} className="mt-0.5 shrink-0 text-sky-300"/><div><p>{active.context}</p><p className="mt-1 text-xs text-slate-400">Autor: {active.author} · <a className="text-sky-300 underline" href={fileUrl(active.file)} target="_blank" rel="noopener noreferrer">Fonte original</a> · <a className="text-sky-300 underline" href={active.licenseUrl} target="_blank" rel="noopener noreferrer">Licença {active.license}</a></p></div></div>
              </> : <div className={card + " flex min-h-[425px] flex-col items-center justify-center gap-3 p-10 text-center"}><Layers size={42} className="text-sky-400"/><h2 className="text-xl font-bold">Prancha em preparação</h2><p className="max-w-md text-sm text-slate-400">Ainda não existe uma imagem científica verificada de {system.toLocaleLowerCase("pt-PT")} para {species.toLocaleLowerCase("pt-PT")} nesta biblioteca. As fichas das estruturas continuam disponíveis à direita.</p><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500" onClick={() => { const first = library[0]; if (first) switchSystem(first.system); }}>Explorar imagens disponíveis</button></div>}
              <div className={card + " space-y-3 p-3"}>
                <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Estruturas · {system}</h3><span className="text-xs text-slate-400">{filtered.length} resultados</span></div>
                <div className="flex flex-wrap gap-2">{filtered.map(s => <button key={s.name} onClick={() => choose(s.name)} className={"rounded-lg border px-3 py-2 text-xs font-medium transition " + (selected === s.name ? "border-blue-400 bg-blue-600 text-white" : "border-[#2c455b] bg-[#15283b] text-slate-200 hover:border-sky-400")}><span className="mr-1 text-sky-300">●</span>{s.name}</button>)}{filtered.length === 0 && <span className="text-sm text-slate-400">Não há resultados com os filtros atuais.</span>}</div>
              </div>
            </section>
            <aside className={card + " h-fit space-y-4 p-4 xl:sticky xl:top-20"}>
              {testMode && challenge && <div className="rounded-xl border border-blue-500/50 bg-blue-500/10 p-3"><p className="text-xs font-bold uppercase tracking-wide text-sky-300">Modo de teste</p><p className="mt-1 text-sm">Identifica: <strong>{challenge.name}</strong></p><p className="mt-1 text-xs text-slate-300">Acertos: {score.right}/{score.total}</p>{feedback && <p role="status" className="mt-2 text-xs text-amber-200">{feedback}</p>}</div>}
              {current ? <>
                <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-sky-400">{current.system} · {species}</p><h2 className="mt-1 text-xl font-bold">{current.name}</h2><p className="mt-1 text-xs italic text-slate-400">{profile?.subtitle || "Anatomia veterinária comparada"}</p></div><button title="Guardar nos favoritos" aria-label="Guardar nos favoritos" onClick={() => toggleFavorite(current.name)} className={"p-2 " + (favorites.includes(current.name) ? "text-amber-400" : "text-slate-500")}><Heart size={20} fill={favorites.includes(current.name) ? "currentColor" : "none"}/></button></div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-2">{tabs.map(t => <button key={t} onClick={() => setTab(t)} className={"rounded-lg border px-2 py-2 text-xs font-medium " + (tab === t ? "border-blue-500 bg-blue-600 text-white" : "border-[#31485c] bg-[#0b1a2a] text-slate-300 hover:border-blue-500")}>{t}</button>)}</div>
                {tab === "Visão geral" && <div className="space-y-3 text-sm leading-relaxed text-slate-200"><p>{current.description}</p>{clinical[current.name]?.location && <p><strong className="text-white">Localização:</strong> {clinical[current.name].location}</p>}{(species === "Cão" ? current.dog : current.cat) && <p className="rounded-lg border border-sky-900 bg-sky-950/50 p-3"><strong className="text-sky-300">Particularidades no {species.toLocaleLowerCase("pt-PT")}:</strong> {species === "Cão" ? current.dog : current.cat}</p>}</div>}
                {tab !== "Visão geral" && <div className="space-y-2">{(profile?.sections || []).filter(s => tab === "Anatomia" ? !["Função","Ação","Relevância clínica"].includes(s.label) : tab === "Função" ? ["Função","Ação"].includes(s.label) : s.label === "Relevância clínica").map(section => <div key={section.label} className="grid grid-cols-[88px_1fr] gap-2 rounded-lg border border-[#294158] bg-[#0a1928] p-3 text-xs leading-relaxed"><strong className="text-sky-300">{section.label}</strong><span className="text-slate-200">{section.value}</span></div>)}{(!profile || !profile.sections.some(s => tab === "Anatomia" ? !["Função","Ação","Relevância clínica"].includes(s.label) : tab === "Função" ? ["Função","Ação"].includes(s.label) : s.label === "Relevância clínica")) && <p className="rounded-lg border border-[#32495e] p-3 text-sm leading-relaxed text-slate-300">{tab === "Função" ? clinical[current.name]?.function || current.description : tab === "Clínica" ? clinical[current.name]?.clinical || "Esta parte da ficha está em revisão científica." : clinical[current.name]?.location || "Origem, inserção, relações e vascularização em revisão científica."}</p>}</div>}
                {compare && <div className="space-y-2 rounded-xl border border-sky-700/40 bg-[#112d42] p-3"><h3 className="text-sm font-bold text-sky-300">Comparação cão / gato</h3><div className="space-y-2 text-xs leading-relaxed"><p><strong className="text-white">Cão: </strong>{current.dog || "Não há diferença específica documentada nesta ficha."}</p><p><strong className="text-white">Gato: </strong>{current.cat || "Não há diferença específica documentada nesta ficha."}</p></div></div>}
                {!profile && <p className="border-t border-[#263d52] pt-3 text-xs text-amber-200">Ficha introdutória. Detalhes ainda não sujeitos a revisão anatómica especializada.</p>}
                {showNotes && <div className="space-y-2 border-t border-[#29445a] pt-3"><label htmlFor="atlas-structure-notes" className="text-sm font-bold">As minhas notas</label><textarea id="atlas-structure-notes" value={notes[noteKey] || ""} onChange={e => updateNote(e.target.value)} className="min-h-28 w-full resize-y rounded-lg border border-[#35506b] bg-[#091725] p-3 text-sm text-white" placeholder="Regista aqui apontamentos pessoais…"/><p className="text-xs text-slate-400">Guardadas apenas neste navegador.</p></div>}
                {active && active.structures.includes(current.name) && <div className="flex gap-2 border-t border-[#29445a] pt-3">{shelf.filter(p => p.structures.includes(current.name)).slice(0,3).map(p => <button key={p.id} onClick={() => setPlateId(p.id)} title={p.title} className={"w-24 overflow-hidden rounded-lg border text-left " + (active.id === p.id ? "border-blue-400" : "border-[#35506b]")}><img src={imageUrl(p.file,300)} alt="" loading="lazy" className="h-16 w-full object-cover"/><span className="block truncate px-1.5 py-1 text-[10px]">{p.title}</span></button>)}</div>}
              </> : <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><Stethoscope className="text-sky-400" size={28}/><h2 className="text-lg font-bold">Ficha anatómica</h2><p className="text-sm text-slate-400">Seleciona uma estrutura na imagem ou na lista para consultar a anatomia, a função e a importância clínica.</p></div>}
            </aside>
          </div>
          {shelf.length > 0 && <section className="space-y-3 border-t border-[#243950] pt-4"><div className="flex items-center justify-between"><h2 className="font-bold">Biblioteca de imagens · {system}</h2><span className="text-xs text-slate-400">{shelf.length} pranchas</span></div><div className="flex gap-3 overflow-x-auto pb-2">{shelf.map(p => <button key={p.id} onClick={() => { setPlateId(p.id); setZoom(1); }} className={"w-36 shrink-0 overflow-hidden rounded-xl border text-left transition hover:border-blue-400 " + (active?.id === p.id ? "border-blue-400 bg-[#193653]" : "border-[#2c465d] bg-[#102235]")}><img src={imageUrl(p.file,300)} loading="lazy" alt="" className="h-24 w-full bg-[#07121e] object-contain"/><span className="block line-clamp-2 min-h-10 px-2 py-2 text-xs">{p.title}</span></button>)}</div></section>}
          <section className="space-y-3 border-t border-[#243950] pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Explorar outros sistemas</h2><span className="text-xs text-slate-400">Clica num sistema para abrir a galeria</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">{systems.map(s => { const thumb=library.find(p=>p.system===s);return <button key={s} onClick={() => switchSystem(s)} className={"overflow-hidden rounded-xl border text-left transition hover:border-blue-400 " + (system===s?"border-blue-400 bg-[#193653]":"border-[#2b4259] bg-[#0e2032]")}><div className="relative h-28 bg-[#081523]">{thumb ? <img className="h-full w-full object-contain" src={imageUrl(thumb.file,300)} loading="lazy" alt="" /> : <div className="flex h-full items-center justify-center text-4xl opacity-60">{tone[s]||"◇"}</div>}{!thumb && <span className="absolute bottom-1 right-1 rounded bg-[#12283d] px-1.5 py-0.5 text-[10px] text-slate-300">Sem prancha</span>}</div><span className="block px-2 py-2 text-xs font-medium">{s}</span></button>})}</div></section>
          <footer className="border-t border-[#263a4c] pt-3 text-xs leading-relaxed text-slate-400">Atlas de estudo em desenvolvimento. As imagens são provenientes de acervos com identificação de autores e licenças; algumas são peças fixadas ou ilustrações históricas. As zonas clicáveis só são exibidas em imagens de órgãos isolados, sem simular segmentação anatómica verificada. As fichas são educativas e não servem para diagnóstico. Nomenclatura a conferir com a Nomina Anatomica Veterinaria (WAVA). <span className="mt-2 block">Referências de consulta: <a href="https://www.wava-amav.org/wava-documents.html" target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">WAVA · Nomina Anatomica Veterinaria</a> · <a href="https://www.merckvetmanual.com/" target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">Manual Veterinário MSD/Merck</a>.</span></footer>
        </div>
      </main>
    </div>
  </div>;
}
