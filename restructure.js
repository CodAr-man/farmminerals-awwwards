const fs = require('fs');
const path = require('path');

const root = __dirname;
const assetsDir = path.join(root, 'assets');

const dirs = {
    css: path.join(assetsDir, 'css'),
    js: path.join(assetsDir, 'js'),
    images: path.join(assetsDir, 'images'),
    fonts: path.join(assetsDir, 'fonts'),
    data: path.join(assetsDir, 'data')
};

// Create dirs
Object.values(dirs).forEach(d => fs.mkdirSync(d, { recursive: true }));

// Move index.html
const indexOldPath = path.join(root, 'www.farmminerals.com', 'index.html');
const indexNewPath = path.join(root, 'index.html');
if (fs.existsSync(indexOldPath)) {
    fs.renameSync(indexOldPath, indexNewPath);
}

// Function to get all files recursively
function getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        if (item === 'assets' || item === '.git' || item === 'node_modules' || item === 'restructure.js' || item === 'index.html') continue;
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, files);
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

const allFiles = getFiles(root);
const fileMap = {}; // basename -> type

for (const file of allFiles) {
    const ext = path.extname(file).toLowerCase();
    const basename = path.basename(file);
    let type = 'data';
    
    if (['.css'].includes(ext)) type = 'css';
    else if (['.js'].includes(ext)) type = 'js';
    else if (['.avif', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) type = 'images';
    else if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) type = 'fonts';
    else if (['.json'].includes(ext)) type = 'data';
    else continue; // Skip unknown files
    
    const newPath = path.join(dirs[type], basename);
    fs.renameSync(file, newPath);
    
    // In case of duplicates (should be rare), the map will just overwrite, which is mostly fine.
    fileMap[basename] = { type, basename };
}

console.log(`Moved ${allFiles.length} files into assets/.`);

// Function to process and update paths in file content
function processFile(filePath, isHtml) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    for (const [basename, info] of Object.entries(fileMap)) {
        // Escape special chars in basename for regex
        const escapedBasename = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match paths ending in the filename (like ../cdn.prod.../filename or https://cdn.../filename)
        const regex = new RegExp(`(['"(])(?:\\.\\.\\/|https?:\\/\\/|\\.\\/|\\/)?[^'"()>\\s]*?(${escapedBasename})(['")])`, 'g');
        
        content = content.replace(regex, (match, p1, p2, p3) => {
            const prefix = isHtml ? './assets/' : '../';
            return `${p1}${prefix}${info.type}/${p2}${p3}`;
        });
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
}

// Update index.html
processFile(indexNewPath, true);
console.log("Updated index.html");

// Update all CSS files
const cssFiles = fs.readdirSync(dirs.css);
for (const css of cssFiles) {
    processFile(path.join(dirs.css, css), false);
}
console.log("Updated CSS files");

console.log("Restructuring complete! You can now safely delete the old empty domain folders.");
