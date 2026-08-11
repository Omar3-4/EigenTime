const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace `{ foo: string }` with `{ readonly foo: string }` if it's in a Props interface/type
  // This is a naive replacement just for demonstration to clear S6759.
  content = content.replace(/(interface\s+\w*Props\s*\{)([^}]*)(\})/g, (match, p1, p2, p3) => {
    let newP2 = p2.replace(/(\n\s*)(?!readonly\b)([\w]+)(\??\s*:)/g, '$1readonly $2$3');
    return p1 + newP2 + p3;
  });

  content = content.replace(/(type\s+\w*Props\s*=\s*\{)([^}]*)(\})/g, (match, p1, p2, p3) => {
    let newP2 = p2.replace(/(\n\s*)(?!readonly\b)([\w]+)(\??\s*:)/g, '$1readonly $2$3');
    return p1 + newP2 + p3;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed S6759 in', file);
  }
});
