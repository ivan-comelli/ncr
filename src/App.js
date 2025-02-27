import React, { useState, useEffect, useCallback } from 'react';
import TableInventory from './components/tableInventory';
import TableHistory from './components/tableHistory';
import logo from './ncr-logo.png';
import logoMinified from './ncr-logo-minified.png';
import './App.css';
import { TextField, InputAdornment, IconButton, Select, MenuItem } from '@mui/material';
import { LinearProgress } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllInventory, lazySearch } from './redux/actions/inventoryThunks';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/Sync';
import { ClipLoader } from 'react-spinners';
import CheckerModal from './components/checkerModal';
import { StockBar } from './components/stockBar';
import { ModalForm } from './components/modalForm';
import CloseIcon from "@mui/icons-material/Close";
import FavIcon from "@mui/icons-material/BookmarkBorder";

import OutDoorIcon from "@mui/icons-material/LogoutOutlined";



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
  const isLoading = useSelector((state) => state.inventory.isLoading);
  const loaderDispatch = useSelector((state) => state.inventory.loaderDispatch);
  const activeDetail = useSelector((state) => state.inventory.activeDetail);
  const [minified, setMinified] = useState(false);
  const searchGlobal = useSelector(state => state.inventory.search);
  const [petitionSubmit, setPetitionSubmit] = useState();
  const [open, setOpen] = useState(false);

  const dispatch = useDispatch();

  
  useEffect(() => {
    dispatch(fetchAllInventory());
  }, []);

  useEffect(() => {
    setSearch(searchGlobal);
  }, [searchGlobal]);

  useEffect(() => {
    setMinified(width < 768 ? true : false);
  }, [width]);
  
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
        isLoading ? (
          <div className="loader"><ClipLoader size={50} color={"#54b948"} loading={true} /></div>
        ) : (
          <>
            
            <div className={`container ${minified ? 'full' : ''}`}>
              {
                !loaderDispatch ? (
                  <div className='tool-bar'>
                    <IconButton 
                      className="sync"
                      variant="contained" 
                      color="primary" 
                      onClick={openModal}
                    > 
                      <UploadIcon fontSize="small"></UploadIcon>
                    </IconButton>
                    
                    <Select
                      className="status-filter"
                      value={"DEFAULT"}
                      sx={{
                        borderRadius: '1rem',              
                        padding: '12px',
                        height: '2.5rem'
                      }}
                    >
                      <MenuItem value={"DEFAULT"}>Estados</MenuItem>
                      <MenuItem value={"ISSUE"}>Conflictos</MenuItem>
                      <MenuItem value={"FAILED"}>Fallas</MenuItem>
                      <MenuItem value={"ADJUST"}>Ajustes</MenuItem>
                      <MenuItem value={"CRITICAL"}>Criticos</MenuItem>
                    </Select>
                  
                    <Select
                      className="type-filter"
                      value={"DEFAULT"}
                      sx={{
                        borderRadius: '1rem',              
                        padding: '12px',
                        height: '2.5rem'
                      }}
                    >
                      <MenuItem value={"DEFAULT"}>Tipos</MenuItem>
                      <MenuItem value={"NOTRW"}>Consumibles</MenuItem>
                      <MenuItem value={"RW"}>ReWorks</MenuItem>
                    </Select>
                    <IconButton
                      variant="contained" 
                      color="secondary">
                      <FavIcon fontSize="small"/>
                    </IconButton>
                    <IconButton
                      variant="contained" 
                      color="secondary">
                      <OutDoorIcon fontSize="small"/>
                    </IconButton>

                  </div>
                ) : (
                  <LinearProgress variant="determinate" value={loaderDispatch} />
                )
              }
              
           
              <TableInventory />
            </div>
            <div className='aditional'>
              <TableHistory/>
            </div>
          </>
        )
      }
      <ModalForm petition={ petitionSubmit }/>
      <CheckerModal show={showModal} resolveModal={modalPromise?.resolve} rejectModal={modalPromise?.reject} />
    </div>
  );
}

export default App;
