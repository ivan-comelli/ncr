import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../api/firebase"; // Asegúrate de importar la configuración de Firebase
import { CompactTable } from '@table-library/react-table-library/compact';
import { useTheme } from '@table-library/react-table-library/theme';
import { DEFAULT_OPTIONS, getTheme } from '@table-library/react-table-library/material-ui';
import { useTree } from "@table-library/react-table-library/tree";
import { IconButton } from '@mui/material';
import IconIsolate from '@mui/icons-material/VisibilityOutlined';
import { ClipLoader } from 'react-spinners';
import { useSelector } from 'react-redux';

const TableInventory = ({ status, minified }) => {
  const mainDataTable = useSelector(state => state.inventory.table);
  const [collectionData, setCollectionData] = useState([]);
  const loading = useSelector((state) => state.inventory.isLoading);
  const [selected, setSelected] = useState();
  const [COLUMNS, SET_COLUMNS] = useState([]);

  const materialTheme = getTheme(DEFAULT_OPTIONS);
  const theme = useTheme(materialTheme);


  const tree = useTree({nodes: collectionData});

  useEffect(() => {
    let data = structuredClone(mainDataTable);
    if (selected) {
      const selectedIndex = data.findIndex(item => item.id === selected.id);

      // Si no se encuentra el ítem seleccionado, lo agregamos al principio
      if (selectedIndex === -1) {
        data.unshift(selected);
      } else {
        // Si ya está, lo movemos al principio
        data.sort((a, b) => (a.id === selected.id ? -1 : 1)); // Aseguramos que el seleccionado esté al principio
      }
    
      status({ empty: false, partIsolate: selected });
    }
    else {
      if(data.length == 0 && !loading) {
        status({empty: true, partIsolate: null});
      }
      else if(data.length == 1) {
        status({empty: false, partIsolate: data[0]});
      }
      else {
        status({empty: false, partIsolate: null});

      }
    }
    setCollectionData(data);
  }, [mainDataTable, selected]);

  const handleAction = (item) => {
    console.log("Acción sobre el item:", item);
    if(selected && item.id === selected.id) {
      setSelected(null)
    }
    else {
      setSelected(item)
    }
    // Aquí puedes agregar la lógica que desees para el botón de cada fila
  };

  useEffect(() => {
    if (minified) {
      SET_COLUMNS([
        { label: 'Part Number', renderCell: (item) => item.partNumber[0], tree: true, resize: { resizerWidth: 1000 } },
        { label: 'Descripcion', renderCell: (item) => item.description, resize: { resizerWidth: 100 } },
        { label: 'Stock', renderCell: (item) => item.stock, resize: { resizerWidth: 100 } },
        {
          label: '',
          renderCell: (item) => (
            item.nodes && item.nodes.length !== 0 && (
              <IconButton
                variant="contained"
                color="primary"
                onClick={() => handleAction(item)}
                sx={{
                  color: selected && selected.id === item.id ? "primary.main" : "secondary.main",
                  "&:hover": { color: "primary.main" },
                }}
              >
                <IconIsolate />
              </IconButton>
            )
          ),
          resize: { resizerWidth: 100 },
        },
      ]);
    } else {
      SET_COLUMNS([
        { label: 'Part Number', renderCell: (item) => item.partNumber[0], tree: true, resize: { resizerWidth: 1000 } },
        { label: 'Descripcion', renderCell: (item) => item.description, resize: { resizerWidth: 100 } },
        { label: 'Stock', renderCell: (item) => item.stock, resize: { resizerWidth: 100 } },
        { label: 'On Hand', renderCell: (item) => item.onHand, resize: { resizerWidth: 100 } },
        { label: 'PPK', renderCell: (item) => item.ppk, hide: false, resize: { resizerWidth: 100 } },
        {
          label: '',
          renderCell: (item) => (
            item.nodes && item.nodes.length !== 0 && (
              <IconButton
                variant="contained"
                color="primary"
                onClick={() => handleAction(item)}
                sx={{
                  color: selected && selected.id === item.id ? "primary.main" : "secondary.main",
                  "&:hover": { color: "primary.main" },
                }}
              >
                <IconIsolate />
              </IconButton>
            )
          ),
          resize: { resizerWidth: 100 },
        },
      ]);
    }
  }, [minified]);

  if (loading) {
    return <div className="loader"><ClipLoader size={50} color={"#54b948"} loading={true} /></div>;
  }

  return (
    <div className="view-table">
      <CompactTable columns={COLUMNS} data={ {nodes: collectionData} } keyExtractor={(node) => node.id} tree={tree} theme={theme} layout={{ fixedHeader: true }}/>
    </div>
  );
};

export default TableInventory;
