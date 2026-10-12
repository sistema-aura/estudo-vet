import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PdfReader } from "./PdfReader";

describe("Leitor de PDFs", () => {
  it("apresenta controlos acessíveis sem aceder ao navegador durante SSR", () => {
    const markup = renderToStaticMarkup(<PdfReader url="https://example.com/example.pdf" materialId="material-1" />);
    expect(markup).toContain("Pesquisar");
    expect(markup).toContain("Página");
    expect(markup).toContain("Caneta");
    expect(markup).toContain("Sublinhar");
    expect(markup).toContain("Importar");
    expect(markup).toContain("A preparar o PDF");
  });

  it("distingue exportar marcações do PDF original", () => {
    const markup = renderToStaticMarkup(<PdfReader url="https://example.com/example.pdf" materialId="material-2" />);
    expect(markup).toContain("Exportar marcações");
    expect(markup).toContain("não modifica o PDF original");
  });
});
