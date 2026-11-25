import { scanImageData } from '@undecaf/zbar-wasm';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { isValidBoletoLength, isValidFebrabanBarcode } from './boletoParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function findLinhaDigitavelInText(text: string): string | null {
  // Match 47-digit bank linha digitável: 5.5 5.6 5.6 1 14
  const bankMatch = text.match(
    /\d{5}[.\s]?\d{5}\s+\d{5}[.\s]?\d{6}\s+\d{5}[.\s]?\d{6}\s+\d\s+\d{14}/
  );
  if (bankMatch) return bankMatch[0].replace(/\s+/g, ' ').trim();

  // Match 48-digit utility linha digitável: 11-1 11-1 11-1 11-1 (with optional check digits)
  const utilityMatch = text.match(
    /8\d{10}[-\s]?\d\s+\d{11}[-\s]?\d\s+\d{11}[-\s]?\d\s+\d{11}[-\s]?\d/
  );
  if (utilityMatch) return utilityMatch[0].replace(/\s+/g, ' ').trim();

  // Fallback: any contiguous or spaced 44/47/48-digit sequence
  const compactMatches = text.match(/(?:\d[\s.-]?){44,48}/g);
  if (compactMatches) {
    for (const candidate of compactMatches) {
      const digits = candidate.replace(/\D/g, '');
      if (
        digits.length === 44 ||
        digits.length === 47 ||
        digits.length === 48
      ) {
        return digits;
      }
    }
  }

  return null;
}

export async function extractBarcodeFromPdf(file: File): Promise<string | null> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  // 1. Try fast & exact text extraction on first 2 pages
  const maxPages = Math.min(pdf.numPages, 2);
  for (let p = 1; p <= maxPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');

    const found = findLinhaDigitavelInText(pageText);
    if (found) return found;
  }

  // 2. Fallback: render page 1 at high resolution and scan with ZBar WASM
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const symbols = await scanImageData(imageData);
  const match =
    symbols.find((s) => isValidFebrabanBarcode(s.decode())) ??
    symbols.find((s) => isValidBoletoLength(s.decode())) ??
    symbols[0];

  return match ? match.decode().trim() : null;
}
