/* eslint-disable @typescript-eslint/no-var-requires */
// utility for command line to print the parsed config
const fs = require('fs');
const cp = require('child_process');

if (fs.existsSync('./out/lib/config.js'))
  console.log(
    cp
      .execSync(
        `node -e "console.log(require('./out/lib/config.js').config.opts.git.local)"`,
        { encoding: 'utf-8' },
      )
      .trim() + '/dist',
  );
else
  console.log(
    cp
      .execSync(
        `npx ts-node -e "console.log(require('./lib/config.ts').config.opts.git.local)"`,
        { encoding: 'utf-8' },
      )
      .trim() + '/dist',
  );
