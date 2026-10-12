// Browser-only extraction: plain text used by search, summaries and study questions.
// Scanned/image-only PDFs still upload successfully, but require OCR to become searchable.
export async function extractPdfText(file: File, onProgress?: (p: number) => void): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  const MAX_TEXT = 500_000;
  let chars = 0;
  const pages: string[] = [];
  try {
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
      const remaining = Math.max(0, MAX_TEXT - chars);
      if (remaining && text) {
        const cropped = text.slice(0, remaining);
        pages.push(cropped);
        chars += cropped.length;
      }
      onProgress?.(i / document.numPages);
      page.cleanup();
      if (chars >= MAX_TEXT) break;
    }
    onProgress?.(1);
    return pages.join("\n\n");
  } finally {
    await document.destroy();
  }
}
