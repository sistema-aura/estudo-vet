import { describe, expect, it } from "vitest";
import { belongsToModule, catalogueModuleForName, formatFileSize, moduleSubject, normalizePdfName } from "./materials";

const modules = [
  { id: 1, name: "Módulo 1", documents: [{ filename: "ATVP#2_MOD_01_UD_01.pdf", unit: "01", theme: "Tema 1" }] },
  { id: 2, name: "Módulo 2", documents: [{ filename: "ATVP#2_MOD_02_UD_01.pdf", unit: "01", theme: "Tema 1" }] },
];
describe("Organização dos PDFs", () => {
  it("compara nomes independentemente da extensão, símbolos e maiúsculas", () => {
    expect(normalizePdfName("ATVP#2_MOD_01_UD_01.PDF")).toBe("atvp2mod01ud01");
    expect(catalogueModuleForName("ATVP#2_MOD_02_UD_01.pdf", modules)).toBe(2);
  });
  it("respeita o módulo real do catálogo mesmo com metadados antigos", () => {
    const doc = { id: "a", title: "ATVP#2_MOD_01_UD_01", subject: "Geral", created_at: "" };
    expect(belongsToModule(doc, modules[0]!, modules)).toBe(true);
    expect(belongsToModule(doc, modules[1]!, modules)).toBe(false);
  });
  it("permite PDFs adicionais organizados manualmente", () => {
    const doc = { id: "a", title: "As minhas notas de patologia", subject: moduleSubject(2), created_at: "" };
    expect(belongsToModule(doc, modules[1]!, modules)).toBe(true);
  });
  it("formata tamanhos de forma legível", () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2,0 MB");
  });
});
