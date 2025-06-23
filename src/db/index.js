const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const outputFile = path.join(__dirname, 'output.json');

function mergeAllJson() {
  const mergedData = [];

  const files = fs.readdirSync(dataDir);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(dataDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        mergedData.push(...(Array.isArray(json) ? json : [json]));
      } catch (error) {
        console.error(`Error leyendo o parseando ${file}:`, error.message);
      }
    }
  }

  try {
    fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2), 'utf-8');
    console.log(`Todos los JSON fueron combinados en ${outputFile}`);
  } catch (error) {
    console.error('Error escribiendo el archivo final:', error.message);
  }
}

mergeAllJson();
