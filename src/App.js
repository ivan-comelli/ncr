import React, { useState, useEffect, useCallback } from 'react';
import TableInventory from './components/tableInventory';
import TableHistory from './components/tableHistory';
import logo from './ncr-logo.png';
import './App.css';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Button } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllInventory, lazySearch } from './redux/actions/inventoryThunks';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/Upload';
import { ClipLoader } from 'react-spinners';
import CheckerModal from './components/checkerModal';
import { StockBar } from './components/stockBar';
import { ModalForm } from './components/modalForm';
import CloseIcon from "@mui/icons-material/Close";


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
  const [minified, setMinified] = useState(false);
  const searchGlobal = useSelector(state => state.inventory.search);
  const [activeDetail, setActiveDetail] = useState(false);
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
    if (open && search) {
      setSearch(""); // Borra el texto si la barra está abierta y tiene contenido
    } else {
      setOpen(!open); // Alterna la visibilidad si está vacía
    }
  };

  const toggleActiveDetail = useCallback(() => {
    setActiveDetail(prev => !prev);
  }, []);

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
        <img src={logo} className="App-logo" alt="Logo"/>
        <IconButton 
          className="sync"
          variant="contained" 
          color="primary" 
          onClick={openModal}
          sx={{
            borderRadius: '1rem',              
            padding: '12px',
          }}
        >
          <UploadIcon></UploadIcon>
        </IconButton>
        <TextField
          className="search"
          variant="outlined"
          size="small"
          placeholder={open ? "Buscar..." : ""}
          value={search}
          onChange={handleSearch}
          sx={{
            width: open ? "200px" : "40px",
            transition: "width 0.3s ease",
            "& .MuiOutlinedInput-root": {
              borderRadius: "1rem",
              paddingLeft: "0.3rem",
            },
            "& .MuiOutlinedInput-input": {
              paddingLeft: open ? "0.3rem" : "0",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleIconClick} edge="start">
                  {open ? <CloseIcon /> : <SearchIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </header>
      <StockBar toggleActiveDetail={ toggleActiveDetail } submit={ setPetitionSubmit } />
      {
        isLoading ? (
          <div className="loader"><ClipLoader size={50} color={"#54b948"} loading={true} /></div>
        ) : (
          <>
            <div className={`container ${minified ? 'full' : ''}`}>
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
