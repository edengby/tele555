// app/api/html-to-pdf/route.js
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

// Ensure Node.js runtime (not Edge) and allow longer runs on Pro
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;           // adjust per your plan/needs
export const preferredRegion = 'iad1';    // optional, close to your logs

// Latest pack URL for your chosen Chromium version (example: v129)
const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.tar';

export async function POST(request) {
  try {
    const { html } = await request.json();

    // Optional knobs (read README for details)
    chromium.setGraphicsMode = false; // keeps WebGL off; default is false
    // await chromium.font('https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf'); // if you need emoji

    const executablePath = await chromium.executablePath(CHROMIUM_PACK_URL);

    const browser = await puppeteer.launch({
      // per @sparticuz/chromium README: use defaultArgs and headless:'shell'
      args: puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
      defaultViewport: chromium.defaultViewport ?? { width: 1280, height: 800 },
      executablePath,
      headless: 'shell',
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setContent(html ?? '<div />', { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }, // <-- no "as const" here
    });

    await browser.close();

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="output.pdf"',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
