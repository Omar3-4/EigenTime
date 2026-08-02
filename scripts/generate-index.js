import fs from 'node:fs';
import path from 'node:path';

const publicDir = path.resolve(process.cwd(), '.output/public');
const assetsDir = path.join(publicDir, 'assets');

if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const jsFile = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
  const cssFile = files.find((f) => f.startsWith('styles-') && f.endsWith('.css'));

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EigenTime — Offline Focus System</title>
    ${cssFile ? `<link rel="stylesheet" href="./assets/${cssFile}">` : ''}
  </head>
  <body>
    <div id="root"></div>
    ${jsFile ? `<script type="module" src="./assets/${jsFile}"></script>` : ''}
  </body>
</html>`;

  fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);
  console.log('Successfully generated .output/public/index.html for desktop bundle!');
}
