/**
 * The payslip on the page as an A4 PDF. The slip is drawn as the browser shows
 * it (fonts, right-to-left and all) and placed on one page, so what is sent is
 * what was on the screen. The libraries are loaded only when a PDF is made.
 */
export async function payslipPdf(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);

  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 8;
  const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const maxHeight = pdf.internal.pageSize.getHeight() - margin * 2;
  // Fit the slip to the page, keeping its proportions.
  const ratio = canvas.height / canvas.width;
  const width = Math.min(maxWidth, maxHeight / ratio);
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (pdf.internal.pageSize.getWidth() - width) / 2, margin, width, width * ratio);
  return pdf.output('blob');
}
