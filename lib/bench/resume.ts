import type { ResumeKind } from './contract';

/** Trusts the bytes, not the browser's declared type or file name. */
export function detectResumeKind(buffer: Buffer): ResumeKind | null {
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  // DOCX is a zip whose parts include word/document.xml.
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (isZip && buffer.includes(Buffer.from('word/'))) return 'docx';
  return null;
}
