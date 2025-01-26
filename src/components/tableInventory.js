import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  Header,
  HeaderRow,
  Body,
  Row,
  HeaderCell,
  Cell,
} from '@table-library/react-table-library/table';
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

  const materialTheme = getTheme(DEFAULT_OPTIONS);
  const theme = useTheme(materialTheme);


  const tree = useTree({nodes: collectionData}, {onChange: onTreeChange});
  function onTreeChange(action) {
      tree.fns.onRemoveAll();
      tree.fns.onAddById(action.payload.id)
    
  }
  useEffect(() => {
    let data = structuredClone(mainDataTable);
    /**if (isolated) {
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
    }**/
    setCollectionData(data);
  }, [mainDataTable, isolated]);

  const isolateItem = (item, e) => {

    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if(isolated && item.id == isolated.id) {
      dispatch(isolatePartInTable(null));
    }
    else {
      dispatch(isolatePartInTable(item));
    }
    // Aquí puedes agregar la lógica que desees para el botón de cada fila
  };

  return (
    <div className="view-table">
      <Table data={ {nodes: collectionData} } theme={theme} tree={tree} ref={tableRef}>
       {(tableList) => (
         <>
         <Header>
           <HeaderRow>
             <HeaderCell>Part Number</HeaderCell>
             <HeaderCell>Description</HeaderCell>
             <HeaderCell><IconStock fontSize="small" /></HeaderCell>
             {!minified && <HeaderCell><IconOnHand fontSize="small" /></HeaderCell>}
             {!minified && <HeaderCell><IconPPK fontSize="small" /></HeaderCell>}
           </HeaderRow>
         </Header>

         <Body>
           {tableList.map((item) => (
             <Row key={item.id} item={item} onClick={(item, e) => isolateItem(item, e)}>
               <Cell>{item?.partNumber[0]}</Cell>
               <Cell>{item?.description}</Cell>
               <Cell>{item?.stock}</Cell>
               {!minified && <Cell>{item?.onHand}</Cell>}
               {!minified && <Cell>{item?.ppk}</Cell>}
             </Row>
           ))}
         </Body>
       </>
       )}
      </Table>
    </div>
  );
};

export default TableInventory;
