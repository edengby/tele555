import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const runtime = 'nodejs';        // not Edge
export const dynamic = 'force-dynamic';
export const maxDuration = 60;          // adjust to your plan

export async function POST(req) {
  try {
    const { html } = await req.json();

    // Make sure the loader sees the extracted libs
    // Sparticuz sets this internally, but we also ensure it explicitly:
    const libDirs = [
      process.env.LD_LIBRARY_PATH,
      '/tmp/chromium',                  // chromium extracts here
      '/tmp/chromium-pack/al2023',      // NSS/NSPR live here
    ].filter(Boolean);
    process.env.LD_LIBRARY_PATH = libDirs.join(':');

    // Optional: keep graphics off in serverless
    chromium.setGraphicsMode = false;

    const browser = await puppeteer.launch({
      // Headless 'shell' is recommended by Sparticuz for serverless
      args: puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
      executablePath: await chromium.executablePath(), // **NO URL here**
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
