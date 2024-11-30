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


const TableInventory = ({filter, status, minified}) => {
  const [data, setData] = useState([]);
  const [collectionData, setCollectionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState();
  const materialTheme = getTheme(DEFAULT_OPTIONS);
  const theme = useTheme(materialTheme);


  const tree = useTree({nodes: data}, {
    onChange: onTreeChange,
  });

  function onTreeChange(action, state) {
    console.log(action, state);
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapInventory = await getDocs(collection(db, "Inventory")); // Cambia "Inventory" por el nombre de tu colección
        const inventoryData = await Promise.all(
          snapInventory.docs.map(async (inventoryDoc) => {
            try {
              // Obtén los documentos de la colección "technician"
              const snapTechnician = await getDocs(collection(inventoryDoc.ref, "technicians"));
              const snapStock = await getDocs(collection(inventoryDoc.ref, "stock"));

              let sumPPK = 0;
              let sumOnHand = 0;
              let techniciansData = [];
              snapTechnician.forEach((technicianDoc) => {
                techniciansData.push({
                  partNumber: "",
                  description: technicianDoc.data().name,
                  onHand: technicianDoc.data().onHand,
                  ppk: technicianDoc.data().ppk
                });
                sumPPK += Number(technicianDoc.data().ppk); // Asegúrate de que ppk sea un número
                sumOnHand += Number(technicianDoc.data().onHand); // Asegúrate de que onHand sea un número
              });
              return { ...inventoryDoc.data(), stock: !snapStock.empty ? snapStock.docs[0].data().quantity : 0, onHand: sumOnHand, ppk: sumPPK, id: inventoryDoc.id, nodes: techniciansData };
            } catch (error) {
              console.error(
                "Fallo en recuperar la colección de técnicos del número de parte: " +
                  inventoryDoc.data().partNumber +
                  " | " +
                  error.message
              );
              return { ...inventoryDoc.data(), onHand: 0, ppk: 0, id: inventoryDoc.id }; // Retorna datos con valores por defecto si hay un error
            }
          })
        );
        setData(inventoryData);
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
    console.log(filter)
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
      return data;
    });
    console.log(filteredData.length)
    if(filteredData.length == 0 && !loading) {
      status({empty: true, partIsolate: null});
    }
    else if(filteredData.length == 1) {
      status({empty: false, partIsolate: filteredData[0]});
    }
    else {
      status({empty: false, partIsolate: null});

    }
    setCollectionData(filteredData);
  }, [data, filter]);

  let COLUMNS = [];
  if(minified) {
    COLUMNS = [
      { label: 'Part Number', renderCell: (item) => item.partNumber[0], tree: true, resize:{resizerWidth:1000} },
      { label: 'Descripcion', renderCell: (item) => item.description || "Fuera de Sistema", resize:{resizerWidth:100}},
      { label: 'Stock', renderCell: (item) => item.stock, resize:{resizerWidth:100}},
      {
        label: '',
        renderCell: (item) => (
          <IconButton
            variant="contained"
            color="primary"
            onClick={() => handleAction(item)}
            sx={{
              color: selected ? "primary.main" : "secondary.main", 
              "&:hover": { color: "primary.main" }, 
            }}
          >
            <IconIsolate></IconIsolate>
          </IconButton>
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
          <IconButton
            variant="contained"
            color="primary"
            onClick={() => handleAction(item)}
            sx={{
              color: selected ? "primary.main" : "secondary.main", 
              "&:hover": { color: "primary.main" }, 
            }}
          >
            <IconIsolate></IconIsolate>
          </IconButton>
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
    setSelected(item)
    // Aquí puedes agregar la lógica que desees para el botón de cada fila
  };


  return (
    <div className="view-table">
      <CompactTable columns={COLUMNS} data={ {nodes: collectionData} } tree={tree} theme={theme} layout={{ fixedHeader: true }}/>
    </div>
  );
};

export default TableInventory;
