const fs = require('fs');
const path = require('path');

function walk(d) {
  let r = [];
  fs.readdirSync(d).forEach(f => {
    f = path.join(d, f);
    if (fs.statSync(f).isDirectory()) r = r.concat(walk(f));
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) r.push(f);
  });
  return r;
}

walk('./src').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let orig = c;
  
  // Replace: fontFamily: "Outfit, sans-serif" -> fontFamily: "'Outfit', sans-serif"
  c = c.replace(/fontFamily:\s*"Outfit,\s*sans-serif"/g, `fontFamily: "'Outfit', sans-serif"`);
  
  // Replace: fontFamily: "Outfit" -> fontFamily: "'Outfit', sans-serif"
  c = c.replace(/fontFamily:\s*"Outfit"/g, `fontFamily: "'Outfit', sans-serif"`);
  
  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed font in ' + f);
  }
});
