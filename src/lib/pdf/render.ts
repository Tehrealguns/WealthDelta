import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ResearchPDF } from './research-pdf';

export async function renderResearchPDF(
  reportText: string,
  date: string,
): Promise<Buffer> {
  const element = React.createElement(ResearchPDF, { reportText, date });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}
