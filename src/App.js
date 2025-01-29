import React, { useState, useEffect } from 'react';
import TableInventory from './components/tableInventory';
import TableHistory from './components/tableHistory';
import PartNumberForm from './components/partForm';
import logo from './ncr-logo.png';
import './App.css';
import { TextField } from '@mui/material';
import { Button } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllInventory, lazySearch } from './redux/actions/inventoryThunks';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/Upload';
import { ClipLoader } from 'react-spinners';
import CheckerModal from './components/checkerModal';

import { Box, Autocomplete, ClickAwayListener, Chip, Stack, Menu, Select, MenuItem, InputLabel, FormControl, FormHelperText, InputAdornment, IconButton, Typography, ListItemIcon  } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Remove } from '@mui/icons-material';
import { ArrowDropDown } from '@mui/icons-material';
import { Add, Close } from "@mui/icons-material";
import StockUp from '@mui/icons-material/MoveToInbox';
import StockDown from '@mui/icons-material/Outbox';
import DetailsIcon from '@mui/icons-material/Description';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { minHeight } from '@mui/system';


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
  const partIsolate = useSelector((state) => state.inventory.isolated);
  const forceOpenForm = useSelector((state) => (state.inventory.table.length == 0 || state.inventory.isolated != null));
  const { width, height } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [ dualStateContent, setDualStateContent ] = useState(true);
  const isLoading = useSelector((state) => state.inventory.isLoading);
  const [ minified, setMinified ] = useState(false);
  const searchGlobal = useSelector(state => state.inventory.search)
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

  const iconButtonStyle = {
    backgroundColor: '#fefefe', 
    borderRadius: '1rem',              
    padding: '12px',                 
  };

  return (
    <div className={`App without-aditional ${minified ? 'minified' : ''}`}>
      <header className="App-header">
        <img src={logo} className="App-logo" alt="Logo"/>
        <div className='tool-bar'>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={openModal}
          >
            <UploadIcon></UploadIcon>
          </Button>
          <TextField label="Busca una parte" value={search} icon={<SearchIcon></SearchIcon>} onChange={handleSearch} sx={{ width: '20rem' }} 
            InputProps={{
              style: { height: "3rem"},
            }}
          />
      </div>
      </header>
      <div className='stock-bar'>
      <IconButton
          sx={iconButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <DetailsIcon />
        </IconButton>
        <IconButton
          sx={iconButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <StockUp />
        </IconButton>
        <TextField
          className='stock'
          fullWidth
          margin="none"
          variant='standard'
          value={1}
          InputProps={{
            disableUnderline: true,
            endAdornment: (
              <InputAdornment position="start">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Remove />
                </IconButton>
              </InputAdornment>
            ),
            startAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation(); // Evita que se cierre el menú al interactuar
                  }}
                >
                  <Add />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <IconButton
          sx={iconButtonStyle}          
          onClick={(e) => {
            e.stopPropagation(); // Evita que se cierre el menú al interactuar
          }}
        >
          <StockDown />
        </IconButton>
      </div>
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
            { forceOpenForm && !partIsolate && (
              <p
                style={{
                  textAlign: 'center',
                  marginTop: '20px',
                  fontSize: '18px',
                  color: '#666',
                }}
              >
                Agrega una nueva parte para empezar.
              </p>
            )}
          </>
        )
      }
      <CheckerModal show={showModal} resolveModal={modalPromise?.resolve} rejectModal={modalPromise?.reject} />
    </div>
  );
}

export default App;
