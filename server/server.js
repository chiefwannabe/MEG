const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let reqPath;
  try {
    reqPath = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  // Handle /download/* route for native HTML file download
  if (reqPath.startsWith('/download/')) {
    const gameFile = reqPath.substring(10);
    const rawUrl = `https://raw.githubusercontent.com/chiefwannabe/Games/master/offline/${gameFile}`;
    https.get(rawUrl, (apiRes) => {
      if (apiRes.statusCode !== 200) {
        res.statusCode = apiRes.statusCode;
        res.end('Game file not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${gameFile}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      apiRes.pipe(res);
    }).on('error', () => {
      res.statusCode = 500;
      res.end('Failed to download game');
    });
    return;
  }

  // Redirect /play/* directly to the original GitHub repo file URL
  if (reqPath.startsWith('/play/')) {
    const gameFile = reqPath.substring(6);
    res.writeHead(302, {
      Location: `https://raw.githubusercontent.com/chiefwannabe/Games/master/offline/${gameFile}`
    });
    res.end();
    return;
  }

  // Handle vercel rewrites for /games SPA browser
  if (reqPath === '/games' || reqPath.startsWith('/games/')) {
    reqPath = '/src/pages/games/index.html';
  }

  // Handle /cloud route
  if (reqPath === '/cloud' || reqPath === '/cloud/') {
    reqPath = '/cloud/index.html';
  }


  // Fallback to index.html for directory routes or root
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, reqPath);

  // Security check (prevent path traversal)
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
