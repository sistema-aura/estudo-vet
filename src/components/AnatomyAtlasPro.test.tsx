import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnatomyAtlasPro } from "./AnatomyAtlasPro";

const structures = [
  { name: "Músculo masséter", system: "Muscular", description: "Músculo responsável por elevar a mandíbula." },
  { name: "Coração", system: "Cardiovascular", description: "Órgão muscular que impulsiona o sangue." },
];
const systems = ["Muscular", "Cardiovascular"];

describe("Atlas anatómico profissional", () => {
  it("renderiza sem aceder ao navegador durante SSR", () => {
    const html = renderToStaticMarkup(<AnatomyAtlasPro systems={systems} structures={structures} clinical={{}} />);
    expect(html).toContain("VetEstudo");
    expect(html).toContain("Atlas Interativo de Anatomia");
    expect(html).toContain("Músculo masséter");
  });

  it("apresenta a prancha da espécie correta com ligação a uma fonte identificada", () => {
    const html = renderToStaticMarkup(<AnatomyAtlasPro systems={systems} structures={structures} clinical={{}} />);
    expect(html).toContain("Dog_anatomy_head.jpg");
    expect(html).toContain("commons.wikimedia.org");
    expect(html).toContain("Domínio público");
  });

  it("mostra a ficha de estudo inicial sem exigir dados clínicos adicionais", () => {
    const html = renderToStaticMarkup(<AnatomyAtlasPro systems={systems} structures={structures} clinical={{}} />);
    expect(html).toContain("Músculo responsável por elevar a mandíbula.");
    expect(html).toContain("Visão geral");
    expect(html).toContain("Importância clínica");
  });
});
