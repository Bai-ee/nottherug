import { LEAD_DISPLAY_FIELDS, formatLeadFieldValue, type LeadDisplayField, type LeadRecord } from './contract';

/**
 * Leading characters that spreadsheet software (Excel, Sheets, LibreOffice)
 * treats as the start of a formula. Prefixing the cell with a single quote
 * neutralizes execution while leaving the visible text unchanged — Excel
 * hides a leading apostrophe used as a text-format marker, so "+1 347…"
 * still reads as "+1 347…", it just can no longer run as a formula.
 */
const FORMULA_TRIGGER_CHARS = new Set(['=', '+', '-', '@', '\t', '\r']);

export function neutralizeFormulaInjection(value: string): string {
  if (value.length === 0) return value;
  return FORMULA_TRIGGER_CHARS.has(value[0]) ? `'${value}` : value;
}

export function csvCell(raw: unknown): string {
  const value = raw === undefined || raw === null ? '' : String(raw);
  const neutralized = neutralizeFormulaInjection(value);
  return /[",\r\n]/.test(neutralized) ? `"${neutralized.replace(/"/g, '""')}"` : neutralized;
}

export function leadsToCsv(
  leads: LeadRecord[],
  columns: LeadDisplayField[] = LEAD_DISPLAY_FIELDS
): string {
  const header = columns.map((c) => csvCell(c.label)).join(',');
  const rows = leads.map((lead) => columns.map((col) => csvCell(formatLeadFieldValue(lead, col))).join(','));
  return [header, ...rows].join('\r\n');
}
