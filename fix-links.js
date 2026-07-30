const fs = require('fs');
const glob = require('glob'); // Not available by default, I will use recursive readdir

const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
      callback(dirPath);
    }
  });
}

function processFiles() {
  const dirs = ['./app', './components'];
  dirs.forEach(dir => {
    walkDir(dir, (filePath) => {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // Replace /history/${id} with /history/detail?sessionId=${id}
      // Note: Some might be `/history/${session.id}` or similar. 
      // Regex: \/history\/\$\{([^}]+)\}
      content = content.replace(/\/history\/\$\{([^}]+)\}/g, '/history/detail?sessionId=${$1}');
      
      // Replace /workout/${id}/preview with /workout/preview?dayId=${id}
      content = content.replace(/\/workout\/\$\{([^}]+)\}\/preview/g, '/workout/preview?dayId=${$1}');

      // Replace /workout/${id} with /workout/session?dayId=${id}
      content = content.replace(/\/workout\/\$\{([^}]+)\}(?![\/\w])/g, '/workout/session?dayId=${$1}');

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    });
  });
}

processFiles();
