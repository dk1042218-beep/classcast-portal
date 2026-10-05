/**
 * Minimal single-page PDF writer for seeded lecture handouts.
 * Output is pure ASCII with a correct xref table, so browsers open and
 * download it like any other PDF. A padding object keeps file sizes in the
 * range students expect from a scanned handout.
 */

const HEADER = "Vidyanagar Institute of Computer Sciences - Department of Computer Science";

function sanitize(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, "-");
}

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** ASCII-only bytes so the PDF stays byte-length identical to its text. */
function asciiBytes(text: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

function wrap(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) current = word;
    else if (current.length + 1 + word.length <= width) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

export function buildHandoutPdf(
  title: string,
  lines: string[],
  minBytes = 16_000,
): Uint8Array<ArrayBuffer> {
  const ops: string[] = [];
  ops.push(`BT /F2 15 Tf 56 758 Td (${escape(sanitize(title))}) Tj ET`);
  ops.push(`BT /F1 9 Tf 56 740 Td (${escape(HEADER)}) Tj ET`);
  ops.push("0.4 w 56 732 m 556 732 l S");

  let y = 710;
  for (const line of lines) {
    for (const chunk of wrap(`- ${sanitize(line)}`, 90)) {
      if (y < 90) break;
      ops.push(`BT /F1 10 Tf 56 ${y} Td (${escape(chunk)}) Tj ET`);
      y -= 17;
    }
  }
  ops.push(
    "BT /F1 8 Tf 56 56 Td (" +
      escape("Issued through ClassCast. Queries: Course Office, Room M2.") +
      ") Tj ET",
  );

  const content = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
      "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  // Padding object so the handout downloads with a believable size.
  const reserve = 260;
  const missing = minBytes - (pdf.length + reserve);
  if (missing > 0) {
    offsets.push(pdf.length);
    pdf += `7 0 obj\n(${" ".repeat(missing)})\nendobj\n`;
  }

  const size = offsets.length + 1;
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const encoded = asciiBytes(pdf);
  if (encoded.length < minBytes) {
    const joined = new Uint8Array(minBytes);
    joined.set(encoded, 0);
    joined.fill(0x20, encoded.length);
    return joined;
  }
  return encoded;
}
