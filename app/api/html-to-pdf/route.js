// app/api/html-to-pdf/route.js
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { html } = await req.json();

    // Ensure Sparticuz extracts binaries/libs and give us the path
    const exePath = await chromium.executablePath();

    // Build a lib path that includes where Sparticuz drops NSS/NSPR for AL2023
    const al2023Dir = '/tmp/chromium-pack/al2023';
    const chromiumDir = '/tmp/chromium';
    const libPath = [al2023Dir, chromiumDir, process.env.LD_LIBRARY_PATH]
        .filter(Boolean)
        .join(':');

    // (Optional) sanity check so logs will prove the files are there
    const nsprOk = fs.existsSync(`${al2023Dir}/libnspr4.so`);

    // Keep graphics off in serverless
    chromium.setGraphicsMode = false;

    const browser = await puppeteer.launch({
      args: puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
      executablePath: exePath,
      headless: 'shell',
      defaultViewport: chromium.defaultViewport ?? { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,

      // IMPORTANT: ensure the Chromium child sees the libs
      env: {
        ...process.env,
        LD_LIBRARY_PATH: libPath,
      },
    });

    const page = await browser.newPage();
    await page.setContent(html ?? '<div/>', { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });

    await browser.close();

    // Optional: log once to confirm libs were present
    if (!nsprOk) console.error('Warning: libnspr4.so not found at', al2023Dir);

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
