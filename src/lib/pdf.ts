// Browser-only: extracts plain text from a PDF file.
export async function extractPdfText(file: File, onProgress?: (p: number) => void) {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map((it: any) => ("str" in it ? it.str : "")).join(" "));
    onProgress?.(i / doc.numPages);
  }
  return pages.join("\n\n");
}
