import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const stationsPath = path.join(__dirname, '../src/data/stations.ts');
let content = fs.readFileSync(stationsPath, 'utf8');

// Add slug after id in each station object
content = content.replace(/(\{\s*\n\s*id:\s*"[^"]+",\s*\n\s*name:\s*"([^"]+)")/g, (match, p1, name) => {
  const slug = generateSlug(name);
  return match.replace(/name:\s*"([^"]+)"/, `slug: "${slug}",\n    name: "$1"`);
});

fs.writeFileSync(stationsPath, content);
console.log('✅ Slugs added to all stations!');
