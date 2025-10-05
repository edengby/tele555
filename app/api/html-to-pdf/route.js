// Force Node runtime (Puppeteer needs Node, not Edge)
export const runtime = 'nodejs';
// In case you ever statically optimize pages, keep this dynamic
export const dynamic = 'force-dynamic';

import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import { NextResponse } from 'next/server';

// Optional: tighten PDF defaults here
const pdfOptions = {
  format: 'A4',
  printBackground: true,
  margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' } as const,
};

async function launchBrowser() {
  // chromium-min works in serverless; the pack URL avoids the “binary too large” issues
  const executablePath = await chromium.executablePath(
    'https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.tar'
  );

  return puppeteer.launch({
    args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
}

export async function POST(request: Request) {
  try {
    const { html } = await request.json();

    if (typeof html !== 'string' || html.trim().length === 0) {
      return NextResponse.json({ error: 'Missing "html" in request body' }, { status: 400 });
    }

    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf(pdfOptions);
    await browser.close();

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="output.pdf"',
        // (optional) avoids some proxy buffer issues
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Error generating PDF:', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
