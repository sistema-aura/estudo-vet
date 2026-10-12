export const MAX_PDF_SIZE = 80 * 1024 * 1024;

export type CatalogueModule = {
  id: number;
  name: string;
  documents: readonly { filename: string; unit: string; theme: string }[];
};

export type MaterialListItem = {
  id: string;
  title: string;
  subject: string;
  created_at: string;
};

/** Match uploads against the real filename, rather than a user-visible title. */
export function normalizePdfName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\.pdf$/i, "").toLocaleLowerCase("pt-PT").replace(/[^a-z0-9]/g, "");
}

export function catalogueModuleForName(name: string, modules: readonly CatalogueModule[]): number | null {
  const key = normalizePdfName(name);
  return modules.find(module => module.documents.some(doc => normalizePdfName(doc.filename) === key))?.id ?? null;
}

export function moduleSubject(id: number | null): string {
  return id === null ? "Geral" : "Módulo " + id;
}

export function belongsToModule(material: MaterialListItem, module: CatalogueModule, modules: readonly CatalogueModule[]): boolean {
  const catalogMatch = catalogueModuleForName(material.title, modules);
  // If a file is catalogued, its canonical assignment takes precedence over stale subject metadata.
  return catalogMatch === module.id || (catalogMatch === null && material.subject === moduleSubject(module.id));
}

export function isCatalogued(material: MaterialListItem, modules: readonly CatalogueModule[]): boolean {
  return catalogueModuleForName(material.title, modules) !== null;
}

export async function assertPdfFile(file: File): Promise<void> {
  if (!/\.pdf$/i.test(file.name)) throw new Error("O ficheiro tem de ter a extensão .pdf.");
  if (file.size === 0) throw new Error("O PDF está vazio.");
  if (file.size > MAX_PDF_SIZE) throw new Error("O PDF excede o limite de 80 MB. Reduz o tamanho antes de carregar.");
  const magic = new TextDecoder("ascii").decode(await file.slice(0, 5).arrayBuffer());
  if (magic !== "%PDF-") throw new Error("O ficheiro não parece ser um PDF válido.");
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
}
