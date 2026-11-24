export interface ParsedBoletoInfo {
  barcode: string;
  value?: number;
}

/**
 * Extracts value from 44-digit Brazilian bank or utility (concessionária/energia) barcodes.
 */
export function parseBoletoBarcode(rawCode: string): ParsedBoletoInfo {
  const digits = rawCode.replace(/\D/g, '');

  // Utility / Concessionária (energia, água, gás, etc.) - 44 digits starting with 8
  if (digits.length === 44 && digits.startsWith('8')) {
    const valueIndicator = digits[2];
    if (valueIndicator === '6' || valueIndicator === '7') {
      const cents = parseInt(digits.slice(4, 15), 10);
      if (!Number.isNaN(cents) && cents > 0) {
        return { barcode: rawCode, value: cents / 100 };
      }
    }
  }

  // Bank boleto - 44 digits
  if (digits.length === 44 && !digits.startsWith('8')) {
    const cents = parseInt(digits.slice(9, 19), 10);
    if (!Number.isNaN(cents) && cents > 0) {
      return { barcode: rawCode, value: cents / 100 };
    }
  }

  return { barcode: rawCode };
}
