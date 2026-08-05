import fs from 'fs';

// Read the original file
const originalFilePath = 'd:/coffee-ecommrce/src/lib/data.ts';
let code = fs.readFileSync(originalFilePath, 'utf8');

// We are going to use regex to inject the new fields into each product block 
// since parsing/stringifying the entire TS file with custom exports is tricky without a full AST parser like ts-morph.
// However, given the structure is very consistent, regex string manipulation works perfectly here.

let newCode = code;

// 1. Update Coffee and Tea stats to include complexity and finish, and add a serve object
const itemsAdditionsTable = {
  1: { complexity: 4, finish: 5, serve: { vessel: "French Press", grind: "Coarse", temp: "95°C", time: "4:00 Min" } },
  2: { complexity: 5, finish: 4, serve: { vessel: "Pour Over (V60)", grind: "Medium-Fine", temp: "92°C", time: "3:00 Min" } },
  3: { complexity: 3, finish: 3, serve: { vessel: "Aeropress", grind: "Medium", temp: "90°C", time: "2:00 Min" } },
  4: { complexity: 4, finish: 4, serve: { vessel: "Pour Over (Chemex)", grind: "Medium-Coarse", temp: "93°C", time: "4:30 Min" } },
  5: { complexity: 2, finish: 5, serve: { vessel: "French Press", grind: "Coarse", temp: "96°C", time: "5:00 Min" } },
  6: { complexity: 5, finish: 4, serve: { vessel: "Pour Over (V60)", grind: "Medium-Fine", temp: "91°C", time: "2:45 Min" } },
  7: { complexity: 4, finish: 3, serve: { vessel: "Moka Pot", grind: "Fine", temp: "Boiling", time: "1:30 Min" } },
  8: { complexity: 2, finish: 3, serve: { vessel: "Espresso", grind: "Very Fine", temp: "93°C", time: "30 Sec" } },
  9: { complexity: 3, finish: 5, serve: { vessel: "Espresso", grind: "Very Fine", temp: "94°C", time: "28 Sec" } },
  10: { complexity: 5, finish: 4, serve: { vessel: "Gaiwan", grind: "Whole Leaf", temp: "85°C", time: "45 Sec" } },
  11: { complexity: 4, finish: 5, serve: { vessel: "Chawan (Bowl)", grind: "Powder", temp: "80°C", time: "1:30 Min" } },
  12: { complexity: 3, finish: 3, serve: { vessel: "Glass Teapot", grind: "Whole Leaf", temp: "75°C", time: "3:00 Min" } },
  13: { complexity: 4, finish: 5, serve: { vessel: "N/A", grind: "Whole", temp: "Room Temp", time: "Ready" } },
  14: { complexity: 3, finish: 4, serve: { vessel: "N/A", grind: "Whole", temp: "Room Temp", time: "Ready" } },
  15: { complexity: 4, finish: 4, serve: { vessel: "N/A", grind: "Whole", temp: "Room Temp", time: "Ready" } },
  16: { complexity: 4, finish: 3, serve: { vessel: "Grinder/Zester", grind: "Freshly Ground", temp: "N/A", time: "Instant" } },
  17: { complexity: 3, finish: 4, serve: { vessel: "Pepper Mill", grind: "Fresh Coarse", temp: "N/A", time: "Instant" } },
  18: { complexity: 5, finish: 5, serve: { vessel: "Mortar & Pestle", grind: "Lightly Crushed", temp: "Warm Liquid", time: "5-10 Min Steep" } },
};

// Regex to find the stats block for each product and append complexity and finish
// Example existing: stats: { acidity: 2, body: 5, sweetness: 3 }
for (const [id, data] of Object.entries(itemsAdditionsTable)) {
  // We use a regex to uniquely identify the product block by its ID, then replace its stats line.
  // This regex looks for `id: <X>,` then anything up to `stats: { ... }`
  const regex = new RegExp(`(id:\\s*${id},\\s*[\\s\\S]*?)stats:\\s*{([^}]+)}(\\s*)`, 'g');
  
  newCode = newCode.replace(regex, (match, p1, p2, p3) => {
    // p2 contains the inner stats like: ` acidity: 2, body: 5, sweetness: 3 `
    const newStats = `stats: {${p2}, complexity: ${data.complexity}, finish: ${data.finish} },\n    serve: ${JSON.stringify(data.serve)}`;
    return `${p1}${newStats}${p3}`;
  });
}

// Write the modified content back
fs.writeFileSync(originalFilePath, newCode, 'utf8');
console.log("Successfully updated data.ts with expanded stats and serve info.");
