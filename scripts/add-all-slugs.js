// Run this script to add slugs to all stations
// Usage: node scripts/add-all-slugs.js

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
    .replace(/^-+|-+$/g, '')
    .trim();
};

const stationsPath = path.join(__dirname, '../src/data/stations.ts');
let content = fs.readFileSync(stationsPath, 'utf8');

// Match station objects and add slug after id
const stationRegex = /\{[\s\S]*?id:\s*"(\d+)",[\s\S]*?name:\s*"([^"]+)",[\s\S]*?\}/g;

let match;
const replacements = [];

// Find all stations
while ((match = stationRegex.exec(content)) !== null) {
  const fullMatch = match[0];
  const id = match[1];
  const name = match[2];
  const slug = generateSlug(name);
  
  // Check if slug already exists
  if (!fullMatch.includes('slug:')) {
    const updatedMatch = fullMatch.replace(
      `id: "${id}",`,
      `id: "${id}",\n    slug: "${slug}",`
    );
    replacements.push({ original: fullMatch, updated: updatedMatch });
  }
}

console.log(`Found ${replacements.length} stations to update`);

// Apply all replacements
replacements.forEach(({ original, updated }) => {
  content = content.replace(original, updated);
});

fs.writeFileSync(stationsPath, content);
console.log('✅ Slugs added to all stations!');
