import React, { useState, useEffect } from "react";
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
import IconPPK from '@mui/icons-material/AssignmentOutlined';
import IconOnHand from '@mui/icons-material/PanToolOutlined';
import IconStock from '@mui/icons-material/Inventory2Outlined';


import { useSelector, useDispatch } from 'react-redux';
import { isolatePartInTable } from '../redux/actions/actions';
import useEnhancedEffect from "@mui/material/utils/useEnhancedEffect";

const TableInventory = ({ minified }) => {
  const dispatch = useDispatch();
  const collectionData = useSelector(state => state.inventory.table);
  const isolated = useSelector((state) => state.inventory.isolated);

  const materialTheme = getTheme(DEFAULT_OPTIONS);
  const theme = useTheme(materialTheme);


  const tree = useTree({nodes: collectionData});

  useEffect(() => {
    tree.state.ids.forEach(node => {
      if (!isolated || node !== isolated.id) {
        tree.fns.onRemoveById(node);
      }
    });
    if(isolated && tree.state.ids.length === 0) {
      tree.fns.onAddById(isolated.id);
    }
  }, [isolated])

  useEffect(() => {
    if(isolated && tree.state.ids.length === 0) {
      tree.fns.onAddById(isolated.id);
    }
  }, [tree.state.ids])
  
  const isolateItem = (item, e) => {
    console.log(isolated?.id)
    console.log(item.id)
    if(!isolated || item.id !== isolated?.id) {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dispatch(isolatePartInTable(item));
    }
    else if(!isolated || item.id === isolated?.id) {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dispatch(isolatePartInTable(null));
    }
  };

  return (
    <div className="view-table">
      <Table data={ {nodes: collectionData} } theme={theme} tree={tree}>
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
             <Row key={item.id} item={item} onClick={(item, e) => isolateItem(item, e)} className={`${item.issue ? 'issue' : ''}`}>
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
