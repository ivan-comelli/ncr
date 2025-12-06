import React, { useState } from 'react';
import Papa from 'papaparse';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileArrowUp } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@table-library/react-table-library/theme';
import { DEFAULT_OPTIONS, getTheme } from '@table-library/react-table-library/material-ui';
import "./style.css"; 
const UploadFiles = ({previewFile, previewDetail, askCSR, possibleName, submit}) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const materialTheme = getTheme(DEFAULT_OPTIONS);
  const theme = useTheme(materialTheme);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const formatDataInventoryToModelDB = (data, defaultCSR) => {
    // Filtrar valores nulos dentro de un array y agregar ceros a la izquierda si es necesario
    const cleanArray = (arr) => arr
        .filter((item) => item !== null && item !== undefined && item !== 'undefined')
        .map((item) => {
            // Convertir a string, completar con ceros si tiene menos de 10 dígitos
            const str = String(item).trim();
            return str.length < 10 ? str.padStart(10, '0') : str;
        });

    // Recorrer un objeto y eliminar propiedades con valores nulos o no definidos
    const cleanObject = (obj) => {
        let cleanedObj = Object.fromEntries(
            Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined && !Number.isNaN(value) && value !== 'undefined')
        );
        if (Object.keys(cleanedObj).length === 2 && cleanedObj.name && cleanedObj.csr) {
            delete cleanedObj.name;
            delete cleanedObj.csr;
        }
        if (Object.keys(cleanedObj).length === 1 && (cleanedObj.name || cleanedObj.csr)) {
          delete cleanedObj.name;
          delete cleanedObj.csr;
        }
        return cleanedObj;
    };

    // Formatear y limpiar datos
    const formattedData = {
        partNumber: String(
          data["Part Nbr"] ?? data["Part#"] ?? data["partNumber"] ?? ''
        ).padStart(10, '0'),
        description: data["Description"],
        reWork: (() => {
          switch(data['RW']) {
            case 'Y': return true;
            case 'N': return false;
            default: return undefined;
          }
        })(),
        cost: data["Cost"],
        technician: cleanObject({
            csr: data["CSR"] || defaultCSR && defaultCSR.csr,
            onHand: Number(data["OnHand"]),
            ppk: Number(data["Maximum Qty"]) || Number(data["PPK"]),
            name: data["Name"] || defaultCSR && defaultCSR.name,
            createdAt: data["As Of Date"] || data["Issue Date"],
        }),
        type: (() => {
          if(Object.keys(data).includes('Maximum Qty')) {
            return 'PPK';
          }
          else if(Object.keys(data).includes('OnHand')) {
            return 'OH';
          }
          return undefined;
        })()
    };

    // Eliminar `partNumber` si queda vacío
    if (formattedData.partNumber.length === 0) {
        return null;
    }

    return cleanObject(formattedData);
  };
  const handleCSV = async (processRow) => {
    const parseCSV = (file) =>
        new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (result) => resolve(result.data),
                error: (err) => reject(err),
            });
        });

    try {
        const rows = await parseCSV(file); // Paso síncrono de parseo
        const processedData = [];

        for (const row of rows) {
          const data = await processRow(row, rows); // Pasar `queryCSR` como parámetro
          if(['ar903s48', 'ar103s42', 'ar103s44', 'ar103s45', 'ar103s46'].includes(row['CSR']?.toLowerCase())) {
            console.log(row['CSR'])
            if (data !== null) {
              processedData.push(data);
            }
          } 
          else if(!row['CSR']) {
            if (data !== null) {
              processedData.push(data);
            }
          }
        }

        return processedData.filter(data => data !== null); // Filtrar filas inválidas
    } catch (error) {
        throw new Error("Error procesando CSV: " + error.message);
    }
  };

  // Deduplicar items por partNumber, priorizando los que tengan ppk/onHand
const deduplicateItems = (items) => {
  const map = new Map();

  for (const item of items) {
    if (!item || !item.partNumber) continue;

    const existing = map.get(item.partNumber);

    if (!existing) {
      map.set(item.partNumber, item);
    } else {
      // Si el nuevo tiene ppk o onHand, lo priorizamos sobre el existente
      const hasPriority = (i) => i?.technician?.ppk || i?.technician?.onHand;

      if (hasPriority(item) && !hasPriority(existing)) {
        map.set(item.partNumber, item);
      }
    }
  }

  return Array.from(map.values());
};

  const processUpload = async () => {
  try {
    if (file) {
      const fileName = file.name;
      const fileType = file.type;
      let responseData = null;
      let queryCSR = null;
      setLoading(true);

      // ✅ función local para deduplicar
      const deduplicateItems = (items) => {
        const map = new Map();

        for (const item of items) {
          if (!item || !item.partNumber) continue;

          const existing = map.get(item.partNumber);

          if (!existing) {
            map.set(item.partNumber, item);
          } else {
            const hasPriority = (i) =>
              i?.technician?.ppk || i?.technician?.onHand;

            // si el nuevo tiene ppk/onHand y el otro no, lo reemplaza
            if (hasPriority(item) && !hasPriority(existing)) {
              map.set(item.partNumber, item);
            }
          }
        }

        return Array.from(map.values());
      };

      if (fileType === "text/csv") {
        possibleName(fileName.replace(/\.[^/.]+$/, ""));
        const collectionData = await handleCSV(async (row, rows) => {
          if (
            !Object.keys(row).find((key) => key.toLowerCase() === "csr") &&
            !queryCSR
          ) {
            previewDetail(
              "Hay " + rows.length + " registros preparados para ser insertado"
            );
            queryCSR = await askCSR();
          }
          return formatDataInventoryToModelDB(row, queryCSR);
        });

        // ✅ aplicar deduplicación antes de enviar
        const deduped = deduplicateItems(collectionData);
        submit(deduped);
      } else {
        throw new Error("Tipo de Archivo no permitido.");
      }
    }
  } catch (error) {
    throw new Error("No se pudo procesar el archivo: " + error.message);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className='file-bar'>
      <input type="file" className='file-input' accept=".csv, .jpg, .png, .jpeg" onChange={handleFileChange} />
      <button onClick={processUpload} disabled={loading} className="submit-input">
        {loading ? "..." : <FontAwesomeIcon icon={faFileArrowUp}></FontAwesomeIcon>}
      </button>
    </div>
  );
};


export default UploadFiles;
