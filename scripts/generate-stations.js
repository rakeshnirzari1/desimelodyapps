// Script to parse the radio-browser data and generate stations.ts
// This script extracts station data from the parsed Excel file

const fs = require('fs');
const path = require('path');

// Read the parsed document
const parsedData = fs.readFileSync(path.join(__dirname, '../tool-results/document--parse_document/20251106-005814-876307'), 'utf-8');

// Parse the markdown table
const lines = parsedData.split('\n');
const stations = [];
let id = 1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Skip header and separator lines
  if (line.startsWith('|Name|') || line.startsWith('|-|') || !line.startsWith('|')) {
    continue;
  }
  
  // Parse table row
  const cells = line.split('|').filter(cell => cell.trim() !== '');
  
  if (cells.length >= 10) {
    const name = cells[0].trim();
    const image = cells[1].replace(/<|>/g, '').trim();
    const type = cells[2].trim();
    const kbps = cells[3].trim();
    const votes = parseInt(cells[4].replace('Votes: ', '').trim()) || 0;
    const clicks = parseInt(cells[5].replace('Clicks: ', '').trim()) || 0;
    const location = cells[6].trim();
    const language = cells[7].trim();
    const link = cells[8].replace(/<|>/g, '').trim();
    const website = cells[9].replace(/<|>/g, '').trim();
    
    // Skip if essential data is missing
    if (!name || !link) continue;
    
    stations.push({
      id: id.toString(),
      name,
      image: image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200',
      type: type || 'MP3',
      kbps,
      votes,
      clicks,
      location: location || 'India',
      language: language || 'Hindi',
      link,
      website: website || 'https://www.radio-browser.info/'
    });
    
    id++;
  }
}

// Generate TypeScript file content
const tsContent = `import { RadioStation } from "@/types/station";

export const radioStations: RadioStation[] = ${JSON.stringify(stations, null, 2)};
`;

// Write to stations.ts
fs.writeFileSync(path.join(__dirname, '../src/data/stations.ts'), tsContent);

console.log(`Generated ${stations.length} stations`);
