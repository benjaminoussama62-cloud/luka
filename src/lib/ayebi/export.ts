import type { AyebiArticle } from "./types";

function text(article: AyebiArticle) {
  return `${article.title}\n${article.subtitle}\n\n${article.summary}\n\n${(article.sections ?? [{ heading: "Article", paragraphs: article.body }]).map((section) => `${section.heading}\n${section.paragraphs.join("\n\n")}`).join("\n\n")}`;
}

function pdfEscape(value: string) {
  return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7e]/g, "?");
}

export function articlePdf(article: AyebiArticle) {
  const lines = text(article).split(/\r?\n/).flatMap((line) => {
    const chunks = line.match(/.{1,95}/g) || [""];
    return chunks;
  }).slice(0, 500);
  const stream = ["BT", "/F1 11 Tf", "50 790 Td", ...lines.flatMap((line) => [`(${pdfEscape(line)}) Tj`, "0 -15 Td"]), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream) + 1} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let output = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(output);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, "latin1");
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries: Array<{ name: string; data: Buffer }>) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0, 6);
    header.writeUInt16LE(0, 8); header.writeUInt16LE(0, 10); header.writeUInt16LE(0, 12);
    header.writeUInt32LE(crc32(entry.data), 14); header.writeUInt32LE(entry.data.length, 18); header.writeUInt32LE(entry.data.length, 22);
    header.writeUInt16LE(name.length, 26); header.writeUInt16LE(0, 28);
    local.push(header, name, entry.data);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0); record.writeUInt16LE(20, 4); record.writeUInt16LE(20, 6);
    record.writeUInt16LE(0, 8); record.writeUInt16LE(0, 10); record.writeUInt16LE(0, 12); record.writeUInt16LE(0, 14);
    record.writeUInt32LE(crc32(entry.data), 16); record.writeUInt32LE(entry.data.length, 20); record.writeUInt32LE(entry.data.length, 24);
    record.writeUInt16LE(name.length, 28); record.writeUInt16LE(0, 30); record.writeUInt16LE(0, 32); record.writeUInt16LE(0, 34); record.writeUInt16LE(0, 36); record.writeUInt32LE(0, 38); record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + entry.data.length;
  }
  const centralData = Buffer.concat(central);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralData.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralData, end]);
}

export function articleEpub(article: AyebiArticle) {
  const body = text(article).split("\n").map((line) => `<p>${line.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] || c))}</p>`).join("");
  const files = [
    { name: "mimetype", data: Buffer.from("application/epub+zip") },
    { name: "META-INF/container.xml", data: Buffer.from('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>') },
    { name: "OEBPS/content.xhtml", data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${article.title}</title></head><body><h1>${article.title}</h1>${body}</body></html>`) },
    { name: "OEBPS/content.opf", data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${article.slug}</dc:identifier><dc:title>${article.title}</dc:title><dc:language>fr</dc:language></metadata><manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="content"/></spine></package>`) },
  ];
  return zip(files);
}
