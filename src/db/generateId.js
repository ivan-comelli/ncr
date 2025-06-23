const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function addIdsToJsonFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    const fileContent = await fs.readFile(absolutePath, 'utf8');
    const data = JSON.parse(fileContent);

    data.forEach(obj => {
      if (!obj.id) obj.id = crypto.randomUUID();
    });

    await fs.writeFile(absolutePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Archivo modificado con IDs: ${absolutePath}`);
  } catch (error) {
    console.error(`Error en archivo ${filePath}:`, error);
  }
};

const files = [
  'bna3.json',
  'brm.json',
  'cpu.json',
  'fuentesUps.json',
  'gbru.json',
  'lectoras.json',
  'otros.json',
  'printers.json',
  's1.json',
  's2.json',
  'scpm.json',
  'sobres.json',
  'sru.json',
];

(async () => {
  for (const file of files) {
    // Construyo la ruta absoluta usando __dirname para apuntar a la carpeta del script
    const fullPath = path.resolve(__dirname, file);
    await addIdsToJsonFile(fullPath);
  }
})();
