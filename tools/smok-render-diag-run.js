'use strict';
/* Diagnoza renderu Smoka w prawdziwym czasie (workflow smok-render-diag).

   Wczesniej Chrome dostawal --virtual-time-budget=10000 i --dump-dom.
   Wirtualny czas kaze przeliczyc kazda klatke gry (60 na sekunde), wiec
   na wolnym runnerze GitHuba 10 s gry trwalo od 80 s do ponad 5 minut
   i job padal na limicie. Tu strona chodzi w prawdziwym czasie: wolna
   maszyna po prostu rysuje mniej klatek, a sonda (tools/smok-render-diag.py)
   i tak odpala sie po 6 s.

   Diagnoza jest offline: kazdy host poza 127.0.0.1 od razu nie istnieje,
   wiec gra nie czeka na Supabase.

   Uzycie: CHROME=/sciezka/do/chrome node tools/smok-render-diag-run.js <url>
   Wypisuje DOM strony, gdy pojawi sie <pre id="smok-render-diag">. */
let pw;
try { pw = require('playwright-core'); } catch (e) { pw = require('playwright'); }

(async () => {
  const url = process.argv[2];
  if (!url) throw new Error('brak adresu strony diagnostycznej');
  const browser = await pw.chromium.launch({
    executablePath: process.env.CHROME || undefined,
    args: ['--no-sandbox', '--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1']
  });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector('#smok-render-diag', { state: 'attached', timeout: 180000 });
  process.stdout.write(await page.content());
  await browser.close();
})().catch((e) => {
  console.error('SMOK_DIAG_RUN_FAILED', e && e.message);
  process.exit(1);
});
