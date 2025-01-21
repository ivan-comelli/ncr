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

  const searchGlobal = useSelector(state => state.inventory.search)
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(fetchAllInventory());
  }, []);

  useEffect(() => {
    setSearch(searchGlobal);
  }, [searchGlobal]);
  
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
      <div className='container'>
      {
        isLoading ? (
          <div className="loader"><ClipLoader size={50} color={"#54b948"} loading={true} /></div>
        ) : (
          <>
            <PartNumberForm active={forceOpenForm} item={partIsolate} goContent={setDualStateContent}/>
            <div className='content'      
              style={{
                display: forceOpenForm && !partIsolate ? 'none' : 'flex',
              }}
            >
              {
                dualStateContent && (<TableInventory minified={width < 768 ? true : false} />)
              }
              {
                !dualStateContent && (<TableHistory goContent={setDualStateContent} />)
              }
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
    </div>
  );
}

export default App;
