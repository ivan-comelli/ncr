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
import { openOverview, closeOverview } from './redux/actions/sync';
import UploadIcon from '@mui/icons-material/Sync';
import BackIcon from '@mui/icons-material/ArrowBack';
import { ClipLoader } from 'react-spinners';
import BatchImport from './components/Inventory/BatchImport';
import { StockBar } from './components/Inventory/QuickActionsBar';
import CheckerMovement from './components/ItemPart/CheckerMovement';
import CloseIcon from "@mui/icons-material/Close";
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { Chip, Box, FormControl } from '@mui/material';
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/autoplay";

import { Autoplay } from "swiper/modules";

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
  const [modalPromise, setModalPromise] = useState();
  const [showModal, setShowModal] = useState(false);
  const { width, height } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const isLoading = useSelector((state) => state.inventory.stepLoading);
  const loaderDispatch = useSelector((state) => state.inventory.stepLoading);
  const activeDetail = useSelector((state) => state.inventory.activeDetail);
  const [minified, setMinified] = useState(false);
  const searchGlobal = useSelector(state => state.inventory.search);
  const [petitionSubmit, setPetitionSubmit] = useState();
  const [open, setOpen] = useState(false);
  const [statusSelect, setStatusSelect] = useState("default")
  const [typeSelect, setTypeSelect] = useState("default")
  const [indexPrio, setIndexPrio] = useState(0)
  const PRIO = ["HIGH", "MID", "LOW"]
  const dispatch = useDispatch();

  const items = ["S1-S2", "BNA3", "GBRU", "BRM", "SRU", "ATM", "SCPM", "S1-S2", "BNA3", "GBRU", "BRM", "SRU", "ATM", "SCPM", "S1-S2", "BNA3", "GBRU", "BRM", "SRU", "ATM", "SCPM"];

  const [settings, setSettings] = useState(null);

  useEffect(() => {
    dispatch(fetchAllInventory());
  }, []);

  useEffect(() => {
    setSearch(searchGlobal);
  }, [searchGlobal]);

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
      <header className="App-header">
        <img src={minified ? logoMinified : logo} className="App-logo" alt="Logo"/>
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
      </header>
      <StockBar submit={ setPetitionSubmit } minified={minified} />
      {
          <>
            <div className={`container ${minified ? 'full' : ''}`}>
              {
                !loaderDispatch ? (
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
                      onChange={(event, value) => setTypeSelect(value)}
                      exclusive
                      autoFocus={false}
                      aria-label="Tipo"
                      className='select-type'
                    >
                      <ToggleButton value="default" aria-label="Ninguno">
                        Cualquiera
                      </ToggleButton>
                      <ToggleButton value="RW" aria-label="ReWork">
                        ReWork
                      </ToggleButton>
                      <ToggleButton value="noRW" aria-label="Consumible">
                        Consumible
                      </ToggleButton>
                    </ToggleButtonGroup>
                    <IconButton 
                      variant="contained" 
                      color="primary" 
                      className={`priority-icon ${PRIO[indexPrio]}`} 
                      onClick={() => setIndexPrio(prev => (prev + 1) % 3)}
                    />
                    <ToggleButtonGroup
                      value={statusSelect}
                      onChange={(event, value) => setStatusSelect(value)}
                      exclusive
                      autoFocus={false}
                      aria-label="Estados"
                      className='select-status'
                    >
                      <ToggleButton value="default" aria-label="Ninguno">
                        Todos
                      </ToggleButton>
                      <ToggleButton value="issue" aria-label="Conflictivos">
                        Conflictos
                      </ToggleButton>
                      <ToggleButton value="failed" aria-label="Fallos">
                        Fallos
                      </ToggleButton>
                      <ToggleButton value="adjust" aria-label="Ajustados">
                        Ajustados
                      </ToggleButton>
                      <ToggleButton value="critical" aria-label="Criticos">
                        Criticos
                      </ToggleButton>
                    </ToggleButtonGroup>
                    <Swiper
                      modules={[Autoplay]}  
                      slidesPerView={settings}     
                      spaceBetween={10}      
                      loop={true}            
                      autoplay={{
                        delay: 0,          
                        disableOnInteraction: false, 
                      }}
                      speed={2000}      
                      className="category"
                    >
                      {items.map((item, index) => (
                        <SwiperSlide>
                          <Chip key={index} variant="outlined" label={item} sx={{p: "1rem"}}/>
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </FormControl>
                ) : (
                  <LinearProgress variant="determinate" value={loaderDispatch} />
                )
              }
              
           
              <TableInventory />
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
