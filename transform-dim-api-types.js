#!node
import fs from 'node:fs';

// Generate an export for each TS file in `shapes`.
fs.readdir('./api/shapes/', (err, files) => {
  for (const file of files) {
    const match = /(.*?)\.ts/.exec(file);
    if (match && !file.endsWith('index.ts')) {
      process.stdout.write(`export * from './${match[1]}.js';\n`);
    }
  }
});
