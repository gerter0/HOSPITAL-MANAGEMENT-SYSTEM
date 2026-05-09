const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/login',
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:3002',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type'
  }
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:');
  console.log('  Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
  console.log('  Access-Control-Allow-Methods:', res.headers['access-control-allow-methods']);
  console.log('  Access-Control-Allow-Headers:', res.headers['access-control-allow-headers']);
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
