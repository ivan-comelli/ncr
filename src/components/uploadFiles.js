import React, { useState } from 'react';
import Papa from 'papaparse';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileArrowUp } from '@fortawesome/free-solid-svg-icons';
import Tesseract from 'tesseract.js';
import { Client } from "@gradio/client";
import { Timestamp } from "firebase/firestore";
import { CompactTable } from '@table-library/react-table-library/compact';
import { useTheme } from '@table-library/react-table-library/theme';
import { DEFAULT_OPTIONS, getTheme } from '@table-library/react-table-library/material-ui';

const UploadFiles = ({previewFile, previewDetail, askCSR, possibleName, submit}) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const materialTheme = getTheme(DEFAULT_OPTIONS);
  const theme = useTheme(materialTheme);

  const llmFormatImgData = async (ocrText) => {
    try {
        const client = await Client.connect("Qwen/Qwen2.5");
        const result = await client.predict("/model_chat", { 		
            query: `Compilame la informacion solo en un json formateado para ser usado, sin mas respuesta de contexto. El modelo que espero es - {entrega: string "Nombre de persona", fecha: date, nmbRemito: number, items: {cantidad as stock: number, descripcion as partNumber: number, observaciones hay que ignorarla: number}}: "${ocrText}"`, 		
        });
        let cleanString = result.data[1][0][1].text
          .replace(/```json/g, "")  
          .replace(/```/g, "")      
          .replace(/\n/g, "")      
          .trim();                  

        const jsonObject = JSON.parse(cleanString); 
        return jsonObject;  
    } catch (error) {
        throw new Error("Error en la solicitud a Hugging Face: " + error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const readDataWithOCR = async () => {
    if (!file) return;  
    try {
      const result = await Tesseract.recognize(file, 'spa', {
        logger: (m) => console.log(m), // Log progress
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // O usa otro valor como Tesseract.PSM.AUTO
      });
      const text = result.data.text;
      const llmResult = await llmFormatImgData(text);
      return llmResult;
    } catch (error) {
      throw new Error('Fallo el OCR: ' + error.message);
    }
  };

  const formatData = (data, defaultCSR) => {
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
        partNumber: cleanArray([String(data["Part Nbr"]), String(data["TMP"]), String(data["Part#"]), String(data["partNumber"])]),
        description: data["Description"],
        stock: cleanObject({
            csr: data["CSR"] || defaultCSR && defaultCSR.csr,
            name: data["Name"] || defaultCSR && defaultCSR.name,
            quantity: data["quantity"] || data["stock"],
            createdAt: data["deliveryDate"] || data["date"],
        }),
        technician: cleanObject({
            csr: data["CSR"] || defaultCSR && defaultCSR.csr,
            onHand: Number(data["OnHand"]),
            ppk: Number(data["Maximum Qty"]) || Number(data["PPK"]),
            name: data["Name"] || defaultCSR && defaultCSR.name,
            createdAt: data["As Of Date"] || data["Issue Date"],
        }),
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
          if (data !== null) {
              processedData.push(data);
          }
        }

        return processedData.filter(data => data !== null); // Filtrar filas inválidas
    } catch (error) {
        throw new Error("Error procesando CSV: " + error.message);
    }
  };

  const processUpload = async () => {
    try {
        if (file) {
            const fileName = file.name;
            const fileType = file.type;
            let responseData = null;
            let queryCSR = null;
            setLoading(true);

            if (fileType === 'text/csv') {
                possibleName(fileName.replace(/\.[^/.]+$/, ''));
                const collectionData = await handleCSV(async(row, rows) => {
                  if (!Object.keys(row).find((key) => key.toLowerCase() === 'csr') && !queryCSR) {
                    previewDetail("Hay " + rows.length + " registros preparados para ser insertado");
                    queryCSR = await askCSR();
                  }
                  return formatData(row, queryCSR);
                });
                submit(collectionData)  
            } else if (fileType === 'image/jpeg' || fileType === 'image/png') {
                responseData = await readDataWithOCR();
                possibleName(responseData.entrega);
                previewDetail(<CompactTable columns={[
                  { label: 'Part Number', renderCell: (item) => item.partNumber },
                  { label: 'Stock', renderCell: (item) => item.stock },
                ]} 
                data={{ nodes: responseData.items }} theme={theme} layout={{ fixedHeader: true }} />);
                queryCSR = await askCSR();
                submit(responseData.items.map((item) => formatData(item, queryCSR)));
            } else {
                throw new Error("Tipo de Archivo no permitido.");
            }
        }
    } catch(error) {
        throw new Error("No se pudo procesar el archivo: " + error.message );
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
