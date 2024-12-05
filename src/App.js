import React, { useState, useEffect } from 'react';
import TableInventory from './components/tableInventory';
import logo from './ncr-logo.png';
import './App.css';
import { TextField } from '@mui/material';
import { Button } from '@mui/material';
import CheckerModal from './components/checkerModal';
import PartNumberForm from './components/partForm';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/Upload';

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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalPromise, setModalPromise] = useState();
  const [showModal, setShowModal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [partIsolate, setPartIsolate] = useState();//UID
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search); // Cambia el estado final después del debounce
    }, 1000); // Ventana de 1 segundo

    return () => {
      clearTimeout(timer); // Limpia el timeout si el usuario sigue escribiendo
    };
  }, [search]); // Solo se ejecuta cuando `search` cambia

  const handleSearch = (event) => {
    setSearch(event.target.value);
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
    <div className="App">
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
      <PartNumberForm active={showEditor} item={partIsolate}/>
      <div
        style={{
          display: showEditor && !partIsolate ? 'none' : 'block',
        }}
      >
        <TableInventory
          minified={width < 768 ? true : false}
          status={(response) => {
            if (response.empty || response.partIsolate) {
              setShowEditor(true);
              setPartIsolate(response.partIsolate);
            } else {
              setShowEditor(false);
              setPartIsolate(response.partIsolate);
            }
          }}
          filter={debouncedSearch}
        />
      </div>

      {/* Mensaje */}
      {showEditor && !partIsolate && (
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
      <CheckerModal show={showModal} rejectModal={modalPromise?.reject} resolveModal={modalPromise?.resolve}></CheckerModal>
    </div>
  );
}

export default App;
