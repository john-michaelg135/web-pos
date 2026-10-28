/**
 * Minimal .xlsx writer: one worksheet, typed cells (text, number, date), a few report
 * styles and column widths fitted to the content. Dependency-free; the workbook is
 * packed into an uncompressed (stored) zip, which Excel, LibreOffice and Sheets all read.
 */

export type CellStyle =
  | "text"
  | "title"
  | "section"
  | "header"
  | "label"
  | "money"
  | "count"
  | "percent"
  | "date"
  | "totalLabel"
  | "totalMoney"
  | "totalCount"
  | "totalPercent"
  | "note"
  | "meta";

/** `span` merges the cell across that many columns (its outline and fill cover the whole range). */
export type Cell = { v: string | number | Date | null; s?: CellStyle; span?: number } | string | number | null;
export type Row = Cell[];

// Index of each style in styles.xml cellXfs (order must match STYLES_XML below).
const XF: Record<CellStyle, number> = {
  text: 0,
  title: 1,
  section: 2,
  header: 3,
  label: 4,
  money: 5,
  count: 6,
  percent: 7,
  date: 8,
  totalLabel: 9,
  totalMoney: 10,
  totalCount: 11,
  totalPercent: 12,
  note: 13,
  meta: 14,
};

// Styles whose text shouldn't widen a column (titles, notes and header details run across empty cells).
const SPANNING: CellStyle[] = ["title", "section", "note", "meta"];

const BRAND = "FF5B2A86";

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3">
<numFmt numFmtId="164" formatCode="&quot;₱&quot;#,##0.00;(&quot;₱&quot;#,##0.00);&quot;₱&quot;0.00"/>
<numFmt numFmtId="165" formatCode="0.0&quot;%&quot;"/>
<numFmt numFmtId="166" formatCode="ddd, mmm d, yyyy"/>
</numFmts>
<fonts count="6">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><color rgb="${BRAND}"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><color rgb="${BRAND}"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FF52525B"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><color rgb="FF71717A"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF4F4F5"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3E8FF"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="4">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFD4D4D8"/></bottom><diagonal/></border>
<border><left/><right/><top style="thin"><color rgb="FF71717A"/></top><bottom style="double"><color rgb="FF71717A"/></bottom><diagonal/></border>
<border><left style="thin"><color rgb="FFD4D4D8"/></left><right style="thin"><color rgb="FFD4D4D8"/></right><top style="thin"><color rgb="FFD4D4D8"/></top><bottom style="thin"><color rgb="FFD4D4D8"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="15">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="4" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="3" fontId="4" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="165" fontId="4" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="3" xfId="0" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const colName = (i: number) => {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

/** Excel date serial (days since 1899-12-30), using the date's calendar day as written. */
const dateSerial = (d: Date) =>
  (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(1899, 11, 30)) / 86400000;

const normalize = (cell: Cell): { v: string | number | Date | null; s: CellStyle; span: number } => {
  if (cell === null || typeof cell !== "object" || cell instanceof Date) {
    const v = cell as string | number | Date | null;
    return { v, s: typeof v === "number" ? "count" : v instanceof Date ? "date" : "text", span: 1 };
  }
  return { v: cell.v, s: cell.s ?? (typeof cell.v === "number" ? "count" : "text"), span: Math.max(1, cell.span ?? 1) };
};

// Rough on-screen width of a cell in Excel character units.
const displayLength = (v: string | number | Date | null, s: CellStyle) => {
  if (v === null || v === "") return 0;
  if (v instanceof Date) return 17; // "Thu, Oct 23, 2026"
  if (typeof v === "number") {
    const money = s === "money" || s === "totalMoney";
    const text = money
      ? `₱${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${v < 0 ? "()" : ""}`
      : s.includes("ercent")
        ? `${v.toFixed(1)}%`
        : v.toLocaleString("en-US");
    return text.length;
  }
  return v.length * (s === "header" ? 1.1 : s === "label" || s.startsWith("total") ? 1.08 : 1);
};

function sheetXml(rows: Row[]) {
  const widths: number[] = [];
  const merges: string[] = [];
  const body = rows
    .map((row, r) => {
      let c = 0; // column cursor; a spanned cell advances it by its span
      const cells = row
        .map((raw) => {
          const { v, s, span } = normalize(raw);
          const col = c;
          c += span;
          const ref = `${colName(col)}${r + 1}`;
          // Cells covered by a merge still carry the style, so the outline runs the full width.
          const covered = Array.from({ length: span - 1 }, (_, k) => `<c r="${colName(col + k + 1)}${r + 1}" s="${XF[s]}"/>`).join("");
          if (span > 1) merges.push(`${ref}:${colName(col + span - 1)}${r + 1}`);
          if (span === 1 && !SPANNING.includes(s)) widths[col] = Math.max(widths[col] ?? 0, displayLength(v, s));
          let cell: string;
          if (v === null || v === "") cell = s === "text" && span === 1 ? "" : `<c r="${ref}" s="${XF[s]}"/>`;
          else if (v instanceof Date) cell = `<c r="${ref}" s="${XF[s]}"><v>${dateSerial(v)}</v></c>`;
          else if (typeof v === "number") cell = `<c r="${ref}" s="${XF[s]}"><v>${Number.isFinite(v) ? v : 0}</v></c>`;
          else cell = `<c r="${ref}" s="${XF[s]}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
          return cell + covered;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");

  const cols = widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(10, Math.ceil((w ?? 0) + 3)))}" customWidth="1"/>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="16"/>
${cols ? `<cols>${cols}</cols>` : ""}
<sheetData>${body}</sheetData>
${merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : ""}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

// ── Stored (uncompressed) zip ──

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (data: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zip(files: { name: string; content: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = enc.encode(file.name);
    const data = enc.encode(file.content);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    locals.push(local);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const out = new Uint8Array(offset + centralSize + end.length);
  let p = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}

/** Builds a one-sheet workbook. Sheet names are limited to 31 characters by Excel. */
export function buildXlsx(sheetName: string, rows: Row[]): Blob {
  const name = esc(sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
  const bytes = zip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: "xl/styles.xml", content: STYLES_XML },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml(rows) },
  ]);
  return new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
