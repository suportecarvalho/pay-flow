export interface ParsedBoletoInfo {
  barcode: string;
  value?: number;
  dueDate?: string; // DD/MM/YY
}

function formatFebrabanFactor(factor: number): string | undefined {
  if (!Number.isFinite(factor) || factor < 1000) return undefined;
  // FEBRABAN rollover: from 2025-02-22, factor reset to 1000.
  const baseDate = new Date(Date.UTC(2025, 1, 22));
  const target = new Date(baseDate.getTime() + (factor - 1000) * 86400000);
  const dd = String(target.getUTCDate()).padStart(2, '0');
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(target.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * Extracts value (and due date for bank boletos) from 44-digit barcodes
 * or 47/48-digit linhas digitáveis.
 */
export function parseBoletoBarcode(rawCode: string): ParsedBoletoInfo {
  const digits = rawCode.replace(/\D/g, '');

  // Utility / Concessionária (energia, água, gás) - 44-digit barcode starting with 8
  if (digits.length === 44 && digits.startsWith('8')) {
    const valueIndicator = digits[2];
    if (valueIndicator === '6' || valueIndicator === '7') {
      const cents = parseInt(digits.slice(4, 15), 10);
      if (!Number.isNaN(cents) && cents > 0) {
        return { barcode: rawCode, value: cents / 100 };
      }
    }
    return { barcode: rawCode };
  }

  // Utility / Concessionária - 48-digit linha digitável starting with 8
  if (digits.length === 48 && digits.startsWith('8')) {
    // Strip the 4 check digits (positions 11, 23, 35, 47) to reconstruct 44-digit barcode
    const barcode44 =
      digits.slice(0, 11) +
      digits.slice(12, 23) +
      digits.slice(24, 35) +
      digits.slice(36, 47);
    return parseBoletoBarcode(barcode44);
  }

  // Bank boleto - 44-digit barcode
  if (digits.length === 44 && !digits.startsWith('8')) {
    const factor = parseInt(digits.slice(5, 9), 10);
    const cents = parseInt(digits.slice(9, 19), 10);
    return {
      barcode: rawCode,
      value: !Number.isNaN(cents) && cents > 0 ? cents / 100 : undefined,
      dueDate: formatFebrabanFactor(factor),
    };
  }

  // Bank boleto - 47-digit linha digitável
  if (digits.length === 47 && !digits.startsWith('8')) {
    const factor = parseInt(digits.slice(33, 37), 10);
    const cents = parseInt(digits.slice(37, 47), 10);
    return {
      barcode: rawCode,
      value: !Number.isNaN(cents) && cents > 0 ? cents / 100 : undefined,
      dueDate: formatFebrabanFactor(factor),
    };
  }

  return { barcode: rawCode };
}

export function isValidBoletoLength(rawCode: string): boolean {
  const len = rawCode.replace(/\D/g, '').length;
  return len === 44 || len === 47 || len === 48;
}

function calcMod10(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    const prod = parseInt(digits[i], 10) * weight;
    sum += prod > 9 ? Math.floor(prod / 10) + (prod % 10) : prod;
    weight = weight === 2 ? 1 : 2;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

function calcBankMod11(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 0 || remainder === 1 || remainder === 10 || remainder === 11) {
    return 1;
  }
  return remainder;
}

function calcUtilityMod11(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  if (remainder === 0 || remainder === 1) return 0;
  if (remainder === 10) return 1;
  return 11 - remainder;
}

/**
 * Verifies FEBRABAN check digit on 44-digit bank and utility (concessionária) barcodes.
 * Returns true for valid checksums so corrupted ITF reads are rejected.
 */
export function isValidFebrabanBarcode(rawCode: string): boolean {
  const digits = rawCode.replace(/\D/g, '');
  if (digits.length !== 44) return false;

  if (digits.startsWith('8')) {
    const indicator = digits[2];
    const checkDigit = parseInt(digits[3], 10);
    const body = digits.slice(0, 3) + digits.slice(4);
    if (indicator === '6' || indicator === '8') {
      return calcMod10(body) === checkDigit;
    }
    if (indicator === '7' || indicator === '9') {
      return calcUtilityMod11(body) === checkDigit;
    }
    return false;
  }

  const checkDigit = parseInt(digits[4], 10);
  const body = digits.slice(0, 4) + digits.slice(5);
  return calcBankMod11(body) === checkDigit;
}

/**
 * Returns true when a DD/MM/YY or DD/MM/YYYY due date is strictly before today.
 */
export function isBoletoOverdue(dueDate: string): boolean {
  const parts = dueDate.trim().split('/');
  if (parts.length !== 3) return false;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return false;
  }

  if (parts[2].length === 2) {
    year += 2000;
  }

  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due.getTime() < today.getTime();
}

/**
 * Advances a DD/MM/YY or DD/MM/YYYY due date by 1 month,
 * clamping to the last day of the target month when necessary.
 */
export function getNextMonthDueDate(dueDate: string): string {
  const parts = dueDate.trim().split('/');
  if (parts.length !== 3) return dueDate;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  const isTwoDigitYear = parts[2].length === 2;

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return dueDate;
  }

  if (isTwoDigitYear) {
    year += 2000;
  }

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfNextMonth);

  const dd = String(clampedDay).padStart(2, '0');
  const mm = String(nextMonth).padStart(2, '0');
  const yy = isTwoDigitYear ? String(nextYear).slice(-2) : String(nextYear);

  return `${dd}/${mm}/${yy}`;
}

export function getBoletoMonthYear(
  dueDate: string
): { month: number; year: number } | null {
  const parts = dueDate.trim().split('/');
  if (parts.length !== 3) return null;

  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12) {
    return null;
  }

  if (parts[2].length === 2) {
    year += 2000;
  }

  return { month, year };
}
