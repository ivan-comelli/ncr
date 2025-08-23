import React, { useState, useEffect, useCallback } from 'react';
import TableInventory from './components/Inventory/MainDataTable';
import OverviewItem from './components/ItemPart/Overview';
import logo from './ncr-logo.png';
import logoMinified from './ncr-logo-minified.png';
import './App.css';
import { TextField, InputAdornment, IconButton, Select, MenuItem } from '@mui/material';
import { LinearProgress } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllInventory, lazySearch } from './redux/actions/async';
import { closeOverview, filterReWork, filterPriority, filterCategory } from './redux/actions/sync';
import UploadIcon from '@mui/icons-material/Sync';
import BackIcon from '@mui/icons-material/ArrowBack';
import BatchImport from './components/Inventory/BatchImport';
import { StockBar } from './components/Inventory/QuickActionsBar';
import CheckerMovement from './components/ItemPart/CheckerMovement';
import CloseIcon from "@mui/icons-material/Close";
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { Chip, Box, FormControl } from '@mui/material';
import NoteAltIcon from "@mui/icons-material/Description";


const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowDimensions;
};

function App() {

  const ITEM_HEIGHT = 48;
  const ITEM_PADDING_TOP = 8;
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
      },
    },
  };

  const [modalPromise, setModalPromise] = useState();
  const [showModal, setShowModal] = useState(false);
  const { width, height } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const isLoading = useSelector((state) => state.inventory.stepLoading);
  const loaderDispatch = useSelector((state) => state.inventory.stepLoading);
  const activeDetail = useSelector((state) => state.inventory.overView.active);

  const [minified, setMinified] = useState(false);
  const [petitionSubmit, setPetitionSubmit] = useState();
  const [open, setOpen] = useState(false);
  const [statusSelect, setStatusSelect] = useState("default");
  const [typeSelect, setTypeSelect] = useState();
  const [indexPrio, setIndexPrio] = useState();
  const [categoryValues, setCategoryValues] = useState(Array());  

  const searchGlobal = useSelector(state => state.inventory.search);
  const priority = useSelector(state => state.inventory.filters.priority)
  const reWork = useSelector((state) => state.inventory.filters.reWork);
  const status = useSelector((state) => state.inventory.filters.status);
  const category = useSelector((state) => state.inventory.filters.category);

  const dispatch = useDispatch();

  const data = useSelector((state) => state.inventory.renderTable);
  const [neto, setNeto] = useState(0);
  const [settings, setSettings] = useState(null);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    dispatch(fetchAllInventory());
  }, []);

  useEffect(() => {
    let value = 0;
    data.forEach(element => {
      value += (element.cost * element.stock);
    });
    setNeto(Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value));
  }, [data]);



  useEffect(() => {
    setSearch(searchGlobal);
  }, [searchGlobal]);

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

  useEffect(() => {
    setMinified(width < 768 ? true : false);
    let newToShow = Math.floor(width * 12) / 1920;
    setSettings(activeDetail ? newToShow / 2 : newToShow);

  }, [width, activeDetail]);
  
  const handleSearch = (event) => {
    setSearch(event.target.value)
    dispatch(lazySearch(event.target.value));
  };

  const handleIconClick = () => {
      setSearch(""); // Borra el texto si la barra está abierta y tiene contenido
      dispatch(lazySearch(""));
  };

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
  

  const openModal = async () => {
    try {
      const result = await new Promise((resolve, reject) => {
        setModalPromise({ resolve, reject });
        setShowModal(true);
      });
      console.log('Modal result:', result); // Aquí manejas el resultado si se resuelve
    } catch (error) {
      console.error('Modal rejected:', error); // Aquí manejas si se rechaza
      setShowModal(false);
    } finally {
      setShowModal(false); // Asegúrate de cerrar el modal siempre
    }
  };

  return (
    <div className={`App ${activeDetail ? '' : 'without-aditional'} ${minified ? 'minified' : ''}`}>
      <header className={`App-header ${showNotes ? 'absolute' : ''}`}>
        <img src={minified ? logoMinified : logo} className="App-logo" alt="Logo"/>
        <Box sx={{
          gap: '2em',
          display: 'flex'
        }}>
          <TextField
            className="search"
            variant="outlined"
            size="small"
            placeholder={"Buscar..."}
            value={search}
            onChange={handleSearch}
            sx={{
              width: "200px",
              transition: "width 0.3s ease",
              "& .MuiOutlinedInput-root": {
                borderRadius: "1rem",
                paddingLeft: "0.3rem",
              },
              "& .MuiOutlinedInput-input": {
                paddingLeft: "0.3rem",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleIconClick} edge="start">
                    <CloseIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <IconButton
            sx={{
              backgroundColor: 'none', 
              borderRadius: '1rem',              
              padding: '12px'
            }}
            onClick={(e) => {
              setShowNotes((prev) => !prev);
            }}
          >
            <NoteAltIcon fontSize='small'/>
          </IconButton>
        </Box>
      </header>
      { showNotes && <iframe src="https://sapphire-menu-c00.notion.site/ebd/258f57a974ca8025a039f583e1e39150" width="100%" height="100%" frameborder="0" allowfullscreen />}
      {
        !showNotes && 
          <>
            <StockBar submit={ setPetitionSubmit } minified={minified} />
            <div className={`container ${minified ? 'full' : ''}`}>
              {
                loaderDispatch ? ( <LinearProgress variant="determinate" value={loaderDispatch} />):(<div className='emty-bar'></div>)
              } 
                <FormControl size="small" className={`tool-bar ${minified || activeDetail ? 'minified' : ''}`}>
                  <IconButton 
                    className="sync"
                    variant="contained" 
                    color="primary" 
                    onClick={openModal}
                  > 
                    <UploadIcon fontSize="small"></UploadIcon>
                  </IconButton>
              
                  <ToggleButtonGroup
                    value={typeSelect}
                    onChange={changeTypeFilter}
                    exclusive
                    autoFocus={false}
                    aria-label="Tipo"
                    className='select-type'
                  >
                    {
                      reWork.values.map((item, index) => (
                        <ToggleButton key={index} value={index} aria-label="Ninguno">
                          { item }
                        </ToggleButton>
                      ))
                    }
                  </ToggleButtonGroup>
                  <IconButton 
                    variant="contained" 
                    color="primary" 
                    className={`priority-icon ${priority.values[indexPrio]}`} 
                    onClick={() => changePriorityFilter()}
                  />
                  <Select
                    id="category-multiple-chip"
                    className='category'
                    multiple
                    fullWidth
                    value={categoryValues}
                    onChange={handleChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={category.values[value] || value}
                            sx={{
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          />
                        ))}
                      </Box>
                    )}
                    sx={{
                      width: '100%',
                      '.MuiSelect-select': {
                        paddingTop: '3px',    // 🔽 menos padding vertical
                        paddingBottom: '3px',
                        minHeight: 'unset',   // elimina alto mínimo fijo
                      },
                      '&.MuiOutlinedInput-root': {
                        minHeight: '28px',    // 🔽 altura total menor (puede ajustarse aún más)
                        borderRadius: '1rem',
                      },
                    }}
                  >
                    {category.values.map((name, index) => (
                      <MenuItem
                        key={index}
                        value={name}
                        sx={{
                          whiteSpace: 'normal',
                          wordWrap: 'break-word',
                        }}
                      >
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              <TableInventory minified={minified} />
              <div className='info'>
        Capital Neto es de <span>{ neto }</span> de dolares
      </div>
            </div>
            <div className='aditional'>
              <IconButton variant="contained" color="primary" className="middle-back" onClick={() => dispatch(closeOverview())}><BackIcon></BackIcon></IconButton>
              <OverviewItem/>
            </div>
            
          </>
      }
   
      <CheckerMovement petition={ petitionSubmit }/>
      <BatchImport show={showModal} resolveModal={modalPromise?.resolve} rejectModal={modalPromise?.reject} />
    </div>
  );
}

export default App;
