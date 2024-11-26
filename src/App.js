import React, { useState, useEffect } from 'react';
import TableInventory from './components/tableInventory';
import logo from './ncr-logo.png';
import './App.css';
import { TextField } from '@mui/material';
import { FaSearch } from 'react-icons/fa';
import { Button } from '@mui/material';
import CheckerModal from './components/checkerModal';
import PartNumberForm from './components/partForm';

function App() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalPromise, setModalPromise] = useState();
  const [showModal, setShowModal] = useState(false);

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
      </header>
      <div className='tool-bar'>
        <TextField label="Busca una parte" value={search} icon={<FaSearch/>} onChange={handleSearch}/>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={openModal}
        >
          Subir
        </Button>
      </div>
      <PartNumberForm/>
      <div className=''>
        <TableInventory filter={debouncedSearch}></TableInventory>
      </div>
      <CheckerModal show={showModal} rejectModal={modalPromise?.reject} resolveModal={modalPromise?.resolve}></CheckerModal>
    </div>
  );
}

export default App;
