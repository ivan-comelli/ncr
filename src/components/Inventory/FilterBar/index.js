import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  FormControl,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  Box,
  Chip,
} from "@mui/material";
import UtilityIcon from "@mui/icons-material/MoreVert";
import UpIcon from "@mui/icons-material/ArrowUpward";
import DownIcon from "@mui/icons-material/ArrowDownward";
import SideIcon from "@mui/icons-material/DragIndicator";
import AllIcon from "@mui/icons-material/AllInclusive";
import { filterReWork, filterPriority, filterCategory, filterMore } from '../../../redux/actions/sync';

function Toolbar({ minified, activeDetail, setShowModal }) {

    const [statusSelect, setStatusSelect] = useState("default");
    const [typeSelect, setTypeSelect] = useState();
    const [indexPrio, setIndexPrio] = useState();
    const [categoryValues, setCategoryValues] = useState(Array());  
    const [moreValues, setMoreValues] = useState(Array())

    
      const priority = useSelector(state => state.inventory.filters.priority)
      const reWork = useSelector((state) => state.inventory.filters.reWork);
      const status = useSelector((state) => state.inventory.filters.status);
      const category = useSelector((state) => state.inventory.filters.category);
    
        const dispatch = useDispatch();
      
        
   useEffect(() => {
      setTypeSelect(reWork.key)
    }, [reWork.key])
  
    useEffect(() => {
      setIndexPrio(priority.key)
    }, [priority.key])
  
    useEffect(() => {
      if(category.key != null) {
        setCategoryValues(
          typeof value === 'string' ? category.key.split(',') : category.key,
        );
        setCategoryValues(category.key)
      }
      else {
        setCategoryValues([])
      }
    }, [category.key])

    const changeTypeFilter = (event, value) => {
        dispatch(filterReWork(value));
      }
    
      const changePriorityFilter = (event, value) => {
        dispatch(filterPriority((indexPrio + 1) % 4));
      }
    
      const handleChange = (event) => {
        const {
          target: { value },
        } = event;
        dispatch(filterCategory(value))
        console.log(value)
      };
      
      const handleChangeMore = (event) => {
        const {
          target: { value },
        } = event;
        setMoreValues(value)
        console.log(value)
            dispatch(filterMore(value))
    
      };
    
  return (
    <FormControl
      size="small"
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 1,
        width: "100%",
        padding: "4px",
        "&.minified": {
          gap: 0.5,
        },
      }}
      className={`tool-bar ${minified || activeDetail ? "minified" : ""}`}
    >
      {/* Botón de utilidades */}
      <IconButton
        className="sync"
        variant="contained"
        color="primary"
        onClick={() => setShowModal(true)}
        size="small"
      >
        <UtilityIcon fontSize="small" />
      </IconButton>

      {/* ToggleButtonGroup */}
      <ToggleButtonGroup
        value={typeSelect}
        onChange={changeTypeFilter}
        exclusive
        sx={{ gap: 0.5 }}
      >
        {reWork.values.map((item, index) => (
          <ToggleButton key={index} value={index}>
            {item}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* IconButton de prioridad */}
      <IconButton
        variant="contained"
        color="primary"
        sx={{ minWidth: 36 }}
        className={`priority-icon trigger ${priority.values[indexPrio]}`}
        onClick={changePriorityFilter}
      >
        {indexPrio === 0 ? (
          <UpIcon />
        ) : indexPrio === 1 ? (
          <DownIcon />
        ) : indexPrio === 2 ? (
          <SideIcon />
        ) : (
          <AllIcon fontSize="small" />
        )}
      </IconButton>

      {/* Select de "more" */}
      <Select
        multiple
        value={moreValues}
        onChange={handleChangeMore}
        sx={{
          width: "90%",
          ".MuiSelect-select": {
            paddingTop: "3px",
            paddingBottom: "3px",
            minHeight: "unset",
          },
          "&.MuiOutlinedInput-root": {
            minHeight: 28,
            borderRadius: "1rem",
          },
        }}
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {selected.map((value) => (
              <Chip
                key={value}
                label={value}
                sx={{
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              />
            ))}
          </Box>
        )}
      >
        {["Non Audit", "Audit", "Imbalance", "Cost +5"].map((item) => (
          <MenuItem
            key={item}
            value={item}
            sx={{ whiteSpace: "normal", wordWrap: "break-word" }}
          >
            {item}
          </MenuItem>
        ))}
      </Select>

      {/* Select de categorías */}
      <Select
        multiple
        value={categoryValues}
        onChange={handleChange}
        sx={{
          width: "100%",
          ".MuiSelect-select": {
            paddingTop: "3px",
            paddingBottom: "3px",
            minHeight: "unset",
          },
          "&.MuiOutlinedInput-root": {
            minHeight: 28,
            borderRadius: "1rem",
          },
        }}
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {selected.map((value) => (
              <Chip
                key={value}
                label={category.values[value] || value}
                sx={{
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              />
            ))}
          </Box>
        )}
      >
        {category.values.map((name, index) => (
          <MenuItem
            key={index}
            value={name}
            sx={{ whiteSpace: "normal", wordWrap: "break-word" }}
          >
            {name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default Toolbar;
