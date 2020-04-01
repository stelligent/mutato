/* eslint-disable @typescript-eslint/no-var-requires */
// utility for command line to print the cdk app
const fs = require('fs');

if (fs.existsSync('./out/bin/mutato.js'))
  console.log('node ./out/bin/mutato.js');
else console.log('npx ts-node ./bin/mutato.ts');
