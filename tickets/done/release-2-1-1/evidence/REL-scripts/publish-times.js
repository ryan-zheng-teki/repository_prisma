// Prints the registry publish times of repository_prisma 2.0.0 and 2.1.0.
const https = require('node:https');
https.get('https://registry.npmjs.org/repository_prisma', (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    const time = JSON.parse(body).time;
    console.log(`# registry publish times: 2.1.0 ${time["2.1.0"]} | 2.1.1 ${time["2.1.1"]} | now ${new Date().toISOString()}`);
  });
});
