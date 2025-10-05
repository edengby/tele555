import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// IMPORTANT: direct asset, not the HTML page.
// Use the x64 pack that includes al2023 libs and brotli-compressed components.
const PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.x64.tar.br';

export async function POST(req) {
  try {
    const { html } = await req.json();

    // (Some builds benefit from disabling graphics on serverless)
    chromium.setGraphicsMode = false;

    const browser = await puppeteer.launch({
      args: puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
      executablePath: await chromium.executablePath(PACK_URL),
      headless: 'shell',
      defaultViewport: chromium.defaultViewport ?? { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setContent(html ?? '<div/>', { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });

    await browser.close();
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="output.pdf"',
      },
    });
  } catch (e) {
    console.error('Error generating PDF:', e);
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
