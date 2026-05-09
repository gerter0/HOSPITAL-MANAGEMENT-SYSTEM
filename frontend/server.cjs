const http = require('http');
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'text/plain';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Not found or directory - serve index.html for SPA routing
      fs.readFile(path.join(distPath, 'index.html'), (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        }
      });
    } else {
      // File exists - serve it
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    }
  });
});

server.listen(4173, '127.0.0.1', () => {
  console.log('✅ Frontend ready at http://localhost:4173');
  console.log('✅ API: http://localhost:5001/api/v1');
  console.log('✅ Serving from:', distPath);
});
