import React, { useState, useEffect, useRef } from "react";
import { CompactTable } from '@table-library/react-table-library/compact';
import { useTheme } from '@table-library/react-table-library/theme';
import { DEFAULT_OPTIONS, getTheme } from '@table-library/react-table-library/material-ui';
import { useTree } from "@table-library/react-table-library/tree";
import { IconButton } from '@mui/material';
import IconIsolate from '@mui/icons-material/VisibilityOutlined';
import IconPPK from '@mui/icons-material/AssignmentOutlined';
import IconOnHand from '@mui/icons-material/PanToolOutlined';
import IconStock from '@mui/icons-material/Inventory2Outlined';


import { useSelector, useDispatch } from 'react-redux';
import { isolatePartInTable } from '../redux/actions/actions';

const TableInventory = ({ minified }) => {
  const tableRef = useRef(null);
  const dispatch = useDispatch();
  const mainDataTable = useSelector(state => state.inventory.table);
  const [collectionData, setCollectionData] = useState([]);
  const isolated = useSelector((state) => state.inventory.isolated);
  const [COLUMNS, SET_COLUMNS] = useState([]);

  const materialTheme = getTheme(DEFAULT_OPTIONS);
  const theme = useTheme(materialTheme);


  const tree = useTree({nodes: collectionData});

  useEffect(() => {
    let data = structuredClone(mainDataTable);
    if (isolated) {
      const selectedIndex = data.findIndex(item => item.id === isolated.id);

      // Si no se encuentra el ítem seleccionado, lo agregamos al principio
      if (selectedIndex === -1) {
        data.unshift(isolated);
      } else {
        // Si ya está, lo movemos al principio
        data.sort((a, b) => (a.id === isolated.id ? -1 : 1)); // Aseguramos que el seleccionado esté al principio
      }
    }
    else if(data.length == 1) {
      dispatch(isolatePartInTable(data[0]));
    }
    setCollectionData(data);
  }, [mainDataTable, isolated]);

  const handleAction = (item) => {
    if(isolated && item.id == isolated.id) {
      dispatch(isolatePartInTable(null));
    }
    else {
      dispatch(isolatePartInTable(item));
    }
    // Aquí puedes agregar la lógica que desees para el botón de cada fila
  };

  useEffect(() => {
    SET_COLUMNS(minified ? [
      { label: 'Part Number', renderCell: (item) => item?.partNumber[0], tree: true },
      { label: 'Descripcion', renderCell: (item) => item?.description },
      { label: <IconStock fontSize="small" />, renderCell: (item) => item?.stock },
      {
        label: ' ',
        renderCell: (item) => (
          (item.nodes && item.nodes.length != 0) && (
            <IconButton
              variant="contained"
              color="primary"
              onClick={() => handleAction(item)}
              sx={{
                color: (isolated && isolated.id === item.id) ? "primary.main" : "secondary.main",
                "&:hover": { color: "primary.main" },
                padding: "0",
              }}
            >
              <IconIsolate />
            </IconButton>
          )
        )
      }
    ] : [
      { label: 'Part Number', renderCell: (item) => item?.partNumber[0], tree: true },
      { label: 'Descripcion', renderCell: (item) => item?.description },
      { label: <IconStock fontSize="small" />, renderCell: (item) => item?.stock, align: 'center' },
      { label: <IconOnHand fontSize="small" />, renderCell: (item) => item?.onHand },
      { label: <IconPPK fontSize="small" />, renderCell: (item) => item?.ppk, hide: false },
      {
        label: ' ',
        renderCell: (item) => (
          (item.nodes && item.nodes.length != 0) && (
            <IconButton
              variant="contained"
              color="primary"
              onClick={() => handleAction(item)}
              sx={{
                color: (isolated && isolated.id === item.id) ? "primary.main" : "secondary.main",
                "&:hover": { color: "primary.main" },
                padding: "0",
              }}
            >
              <IconIsolate />
            </IconButton>
          )
        )
      }
    ]);
    tableRef.current.classList.add('hidden');
  }, [minified, isolated]);
  useEffect(() => {
    if (minified) {
      tableRef.current.classList.add('minified');
    } else {
      tableRef.current.classList.remove('minified');
    }
    tableRef.current.classList.remove('hidden');
  }, [COLUMNS])
  return (
    <div className="view-table">
      <CompactTable columns={COLUMNS} data={ {nodes: collectionData} } keyExtractor={(node) => node.id} tree={tree} theme={theme} layout={{ fixedHeader: true }} ref={tableRef} rowProps={(item) => ({
          className: "caca",
        })} />
    </div>
  );
};

export default TableInventory;
