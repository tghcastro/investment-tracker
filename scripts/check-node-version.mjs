#!/usr/bin/env node
const version = process.versions.node;
const [major, minor] = version.split('.').map(Number);

if (major !== 22) {
  console.error(`
Node.js ${version} detected. This project requires Node.js 22 (see .nvmrc).

Run:
  source ~/.nvm/nvm.sh && nvm install 22 && nvm use 22
  node -v   # should print v22.x.x

Then start the web app:
  npm run dev:web

Do not use bare "sudo npm run dev" — sudo resets PATH and often picks system Node 18.
For port 80, use: npm run dev:web:sudo
`);
  process.exit(1);
}

if (minor < 12) {
  console.error(`
Node.js ${version} is too old for Vite 7 (needs 22.12+).

Run: nvm install 22 && nvm use 22
`);
  process.exit(1);
}
