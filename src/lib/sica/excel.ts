/** Loaded on demand in the browser; uploaded data never leaves the device. */
async function libro() {
  const { default: ExcelJS } = await import("exceljs");
  return new ExcelJS.Workbook();
}

export async function leerExcel(file: File): Promise<string[][]> {
  const wb = await libro();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("El libro no tiene hojas.");
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values: string[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      const cell = row.getCell(c);
      if (cell.type === 6) throw new Error(`No se admiten fórmulas en ${cell.address}; pegue sus valores como texto.`);
      values.push(cell.text);
    }
    rows.push(values);
  });
  return rows;
}

export async function descargarExcel(nombre: string, cols: string[], rows: (string | number)[][]) {
  const wb = await libro();
  wb.creator = "SICA — Prototipo ficticio";
  const sheet = wb.addWorksheet("SICA", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = cols.map((header) => ({ header, width: Math.min(40, Math.max(16, header.length + 3)) }));
  sheet.addRows(rows);
  sheet.eachRow((row, i) => {
    row.font = { name: "Arial", size: 10, bold: i === 1 };
    row.alignment = { vertical: "top", wrapText: true };
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  sheet.pageSetup = { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.headerFooter = { oddHeader: "&CSICA · DATOS FICTICIOS", oddFooter: "&CPágina &P de &N" };
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${nombre}.xlsx`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}