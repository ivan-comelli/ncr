import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // Asegúrate de importar la configuración de Firebase
import { CompactTable } from '@table-library/react-table-library/compact';
import { useTheme } from '@table-library/react-table-library/theme';
import { DEFAULT_OPTIONS, getTheme } from '@table-library/react-table-library/material-ui';
import { useTree } from "@table-library/react-table-library/tree";
import { IconButton } from '@mui/material';
import IconIsolate from '@mui/icons-material/VisibilityOutlined';
import { ClipLoader } from 'react-spinners';
import { getAllInventory } from './actionsInventory';


const TableInventory = ({filter, status, minified}) => {
  const [data, setData] = useState([]);
  const [collectionData, setCollectionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState();
  const materialTheme = getTheme(DEFAULT_OPTIONS);
  const theme = useTheme(materialTheme);


  const tree = useTree({nodes: collectionData}, {
    onChange: onTreeChange,
  });

  function onTreeChange(action, state) {
    console.log(action, state);
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allInventory = await getAllInventory();
        console.log("Inventarios encontrados:", allInventory);
        setData(allInventory.map((item => {
          return {
            id: item.id,
            partNumber: item.partNumber,
            description: item.description,
            stock: Object.values(item.stock.total).reduce((sum, value) => sum += value, 0) || 0,
            ppk: item.technicians.reduce((sum, value) => sum += value.ppk, 0) || 0,
            onHand: item.technicians.reduce((sum, value) => sum += value.onHand, 0) || 0,
            nodes: item.technicians.map((node) => {
              return {
                id: node.id,
                partNumber: [],
                description: node.name,
                ppk: node.ppk,
                onHand: node.onHand,
                stock: item.stock.total[node.csr] || 0
              }
            }) 
          }
        })));
        setLoading(false);
      } catch (error) {
        console.error("Error al recuperar el inventario: " + error.message);
        setLoading(false); // Asegúrate de que loading sea false incluso si hay un error
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const search = filter;
    const filteredData = data.filter((item) => {
      if(search && search !="") {
        const descriptionMatch = item.description && item.description
          .toLowerCase()
          .includes(search.toLowerCase());
        const partNumberMatch = item.description && item.partNumber
          .toString()
          .includes(search);

        return descriptionMatch || partNumberMatch;
      }
      return true;
    });
    if (selected) {
      const selectedIndex = filteredData.findIndex(item => item.id === selected.id);

      // Si no se encuentra el ítem seleccionado, lo agregamos al principio
      if (selectedIndex === -1) {
        filteredData.unshift(selected);
      } else {
        // Si ya está, lo movemos al principio
        filteredData.sort((a, b) => (a.id === selected.id ? -1 : 1)); // Aseguramos que el seleccionado esté al principio
      }
    
      status({ empty: false, partIsolate: selected });
    }
    else {
      if(filteredData.length == 0 && !loading) {
        status({empty: true, partIsolate: null});
      }
      else if(filteredData.length == 1) {
        status({empty: false, partIsolate: filteredData[0]});
      }
      else {
        status({empty: false, partIsolate: null});

      }
    }
    setCollectionData(filteredData);
  }, [data, filter, selected]);

  let COLUMNS = [];
  if(minified) {
    COLUMNS = [
      { label: 'Part Number', renderCell: (item) => item.partNumber[0], tree: true, resize:{resizerWidth:1000} },
      { label: 'Descripcion', renderCell: (item) => item.description || "Fuera de Sistema", resize:{resizerWidth:100}},
      { label: 'Stock', renderCell: (item) => item.stock, resize:{resizerWidth:100}},
      {
        label: '',
        renderCell: (item) => (
          (item.nodes && item.nodes.length != 0) && (
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
    ]
  }
  else {
    COLUMNS = [
      { label: 'Part Number', renderCell: (item) => item.partNumber[0], tree: true, resize:{resizerWidth:1000} },
      { label: 'Descripcion', renderCell: (item) => item.description || "Fuera de Sistema", resize:{resizerWidth:100}},
      { label: 'Stock', renderCell: (item) => item.stock, resize:{resizerWidth:100}},
      { label: 'On Hand', renderCell: (item) => item.onHand, resize:{resizerWidth:100}},
      { label: 'PPK', renderCell: (item) => item.ppk, hide: false, resize:{resizerWidth:100}},
      {
        label: '',
        renderCell: (item) => (
          (item.nodes && item.nodes.length != 0) && (
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
    ]
  }


  if (loading) {
    return <div className="loader"><ClipLoader size={50} color={"#54b948"} loading={true} /></div>;
  }

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


  return (
    <div className="view-table">
      <CompactTable columns={COLUMNS} data={ {nodes: collectionData} } keyExtractor={(node) => node.id} tree={tree} theme={theme} layout={{ fixedHeader: true }}/>
    </div>
  );
};

export default TableInventory;
