const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'Html_files');
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath);
}
const files = fs.readdirSync(dirPath).filter(f => f !== 'files.json');
fs.writeFileSync(path.join(dirPath, 'files.json'), JSON.stringify(files));
console.log(`Generated files.json with ${files.length} files in Html_files.`);
