import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';

import { utf8ToBase64 } from './base64';

const FILE_NAME = 'akhorkhel-class-progress';

/** Opens the share sheet with the CSV (UTF-8 with BOM) as a file. Cancelling is not an error. */
export async function shareCsv(csv: string): Promise<void> {
  await Share.open({
    url: `data:text/csv;base64,${utf8ToBase64(csv)}`,
    type: 'text/csv',
    filename: FILE_NAME,
    failOnCancel: false,
  });
}

/** Renders the HTML report to a PDF on the device, then opens the share sheet. */
export async function sharePdf(html: string): Promise<void> {
  // A4 landscape in points: wide tables stay readable.
  const { filePath } = await generatePDF({ html, fileName: FILE_NAME, width: 842, height: 595 });
  await Share.open({
    url: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
    type: 'application/pdf',
    filename: FILE_NAME,
    failOnCancel: false,
  });
}
