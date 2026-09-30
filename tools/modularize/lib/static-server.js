/* Minimalny serwer statyczny do testow (bez zaleznosci).
   Opcje:
   - delayFor(urlPath) -> ms: opoznienie odpowiedzi dla pliku (wolna siec),
   - rewrite(urlPath) -> urlPath: podmiana pliku pod tym samym adresem
     (wersja modulowa serwowana jako /qryby.html),
   - slowHtml {chunk, pause}: HTML wysylany kawalkami z przerwami, tak jak
     duzy plik plynie przez slaba siec (parser robi wtedy przerwy). */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

function start(root, { port = 0, delayFor = () => 0, rewrite = (p) => p, slowHtml = null } = {}) {
  const server = http.createServer((req, res) => {
    const urlPath = rewrite(decodeURIComponent(req.url.split('?')[0]));
    const file = path.join(root, urlPath);
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      const send = () => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        const ext = path.extname(file);
        res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        if (slowHtml && ext === '.html' && data.length > slowHtml.chunk) {
          let off = 0;
          const pump = () => {
            if (off >= data.length) { res.end(); return; }
            res.write(data.subarray(off, off + slowHtml.chunk));
            off += slowHtml.chunk;
            setTimeout(pump, slowHtml.pause);
          };
          pump();
          return;
        }
        res.end(data);
      };
      const d = delayFor(urlPath) || 0;
      if (d > 0) setTimeout(send, d); else send();
    });
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

module.exports = { start };
