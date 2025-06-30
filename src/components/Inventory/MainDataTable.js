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
import { Menu, MenuItem, Button } from "@mui/material";
import CategoryIcon from "@mui/icons-material/ViewListOutlined";
import IconPrio from '@mui/icons-material/PriorityHigh';
import IconPPK from '@mui/icons-material/AssignmentOutlined';
import IconOnHand from '@mui/icons-material/PanToolOutlined';
import IconStock from '@mui/icons-material/Inventory2Outlined';
import VisibilityIcon from '@mui/icons-material/Visibility';

import PushPinIcon from "@mui/icons-material/PushPin";
import CheckIcon from "@mui/icons-material/Check";
import LowPriorityIcon from "@mui/icons-material/ArrowDownward";
import MediumPriorityIcon from "@mui/icons-material/ArrowForward";
import HighPriorityIcon from "@mui/icons-material/ArrowUpward";
import DotPriorityIcon from "@mui/icons-material/CircleSharp";
import { useSelector, useDispatch } from 'react-redux';
import { dispatchUpdatePriority } from '../../redux/actions/async';
import { isolatePartInTable, setPriority, openOverview, closeOverview } from '../../redux/actions/sync';
import useEnhancedEffect from "@mui/material/utils/useEnhancedEffect";

const TableInventory = ({ minified }) => {
  const dispatch = useDispatch();
  const collectionData = useSelector(state => state.inventory.renderTable);
  const isolated = useSelector((state) => state.inventory.isolated);
  const overView = useSelector((state) => state.inventory.overView.active);
  const category = useSelector((state) => state.inventory.filters.category);

  const materialTheme = getTheme(DEFAULT_OPTIONS);
  const theme = useTheme(materialTheme);

  const [menuPosition, setMenuPosition] = useState(null);
  const [menuPositionCategory, setMenuPositionCategory] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null);
  const [pinnedItems, setPinnedItems] = useState({});
  const [markedItems, setMarkedItems] = useState({});
  const [priorityItems, setPriorityItems] = useState({});

  const handleContextMenu = (event, item) => {
    event.preventDefault(); // Bloquea el menú predeterminado del navegador
    setMenuPosition({ mouseX: event.clientX, mouseY: event.clientY });
    if(item.partNumber.length > 0) {
      setSelectedItem(item);
      dispatch(isolatePartInTable(item))
    }
  };

  // Cierra el menú
  const handleClose = () => {
    setMenuPosition(null);
    setMenuPositionCategory(false);
    setSelectedItem(null);
  };

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
  
  const showDetail = () => {
    dispatch(openOverview());
    handleClose();
  }

  const isolateItem = (item, e) => {
    if((!isolated || item.id !== isolated?.id) && item.partNumber.length > 0) {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dispatch(isolatePartInTable(item));
    }
    else if(!isolated || item.id === isolated?.id || item.partNumber.length == 0) {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dispatch(isolatePartInTable(null));
    }
  };

  const handlePin = () => {
    setPinnedItems((prev) => ({
      ...prev,
      [selectedItem.id]: !prev[selectedItem.id],
    }));
    handleClose();
  };

  // Marcar ítem
  const handleMark = () => {
    setMarkedItems((prev) => ({
      ...prev,
      [selectedItem.id]: !prev[selectedItem.id],
    }));
    handleClose();
  };

  // Establecer prioridad
  const handleSetPriority = (priority) => {
    dispatch(dispatchUpdatePriority(selectedItem.id, priority));
    handleClose();
  };

  return (
    <div className={`view-table ${isolated ? 'isIsolated' : ''}`} >
      <Table data={ {nodes: collectionData} } theme={theme} tree={tree}>
       {(tableList) => (
         <>
         <Header>
           <HeaderRow>
             <HeaderCell>Part Number</HeaderCell>
             <HeaderCell>Description</HeaderCell>
             {!minified && <HeaderCell>Categoria</HeaderCell>}
             <HeaderCell><IconStock fontSize="small" /></HeaderCell>
             {!minified && <HeaderCell><IconOnHand fontSize="small" /></HeaderCell>}
             <HeaderCell><IconPPK fontSize="small" /></HeaderCell>
             {!minified && <HeaderCell>$</HeaderCell>}
             {!minified && <HeaderCell>RW</HeaderCell>}
             <HeaderCell><IconPrio fontSize="small" /></HeaderCell>
           </HeaderRow>
         </Header>

         <Body>
           {tableList.map((item) => (
             <Row 
              onContextMenu={(e) => handleContextMenu(e, item)}
              key={item.id} item={item} onClick={(item, e) => isolateItem(item, e)} className={`${item.issue ? 'issue' : ''}`}>
               <Cell>{item?.partNumber[0]}</Cell>
               <Cell>{item?.description}</Cell>
               {!minified && <Cell>{item?.category}</Cell>}
               <Cell>{item?.stock}</Cell>
               {!minified && <Cell>{item?.onHand}</Cell>}
               <Cell>{item?.ppk}</Cell>
               {!minified && <Cell>{item?.cost}</Cell>}
               {!minified && <Cell>{item.reWork != null ? (item.reWork ? "T" : "F") : ''}</Cell>}
               <Cell>{item?.partNumber != "" && <span className={`priority-icon ${item?.priority ? item.priority : 'LOW'}`}/>}</Cell>
             </Row>
           ))}
         </Body>
       </>
       )}
      </Table>

      <Menu
        open={!!menuPosition}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition ? { top: menuPosition.mouseY, left: menuPosition.mouseX } : undefined}
        disableAutoFocusItem
      >

        <MenuItem onClick={() => showDetail()} disabled={overView}>
            <VisibilityIcon style={{marginLeft: "-.4rem", color: "#e1e1e1"}}/>
            <span style={{marginLeft : "1rem"}}>Ver Detalles</span>
        </MenuItem>

        <MenuItem onClick={() => handleSetPriority('LOW')}>
          <span className="priority-icon LOW"/>
          <span style={{marginLeft : "1rem"}}>Baja Prioridad</span>
        </MenuItem>

        <MenuItem onClick={() => handleSetPriority('MID')}>
          <span className="priority-icon MID"/>
          <span style={{marginLeft : "1rem"}}>Media Prioridad</span>
        </MenuItem>

        <MenuItem onClick={() => handleSetPriority('HIGH')}>
          <span className="priority-icon HIGH"/>
          <span style={{marginLeft : "1rem"}}>Alta Prioridad</span>
        </MenuItem>

      </Menu>
    </div>
  );
};

export default TableInventory;
