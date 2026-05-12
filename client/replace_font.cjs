const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:\\\\GithubUploads\\\\gov_vision\\\\client\\\\src');
let changedCount = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('IBM Plex Sans')) {
    // Replace both the font name and standard fallbacks to ensure consistency
    const newContent = content.replace(/IBM Plex Sans/g, 'Outfit');
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Updated: ' + file);
    changedCount++;
  }
});
console.log('Done. Changed ' + changedCount + ' files.');
