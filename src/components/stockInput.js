import React, { useState } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  MenuItem,
  Box,
  ClickAwayListener,
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

const StockManager = () => {
  const [currentStockChange, setCurrentStockChange] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState([
    { date: '2024-11-28', value: 10 },
    { date: '2024-11-29', value: -5 },
  ]);

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleMenuClose = () => {
    setMenuOpen(false);
  };

  return (
    <ClickAwayListener onClickAway={handleMenuClose} >
      <Box position="relative" className="stock">
        <TextField
          label="Agregar Stock o Ver Historial"
          value={currentStockChange}
          fullWidth
          margin="none"
          onClick={toggleMenu} // Despliega el menú al hacer clic
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation(); // Evita que se cierre el menú al interactuar
                    setCurrentStockChange((prev) => (parseFloat(prev) || 0) - 1);
                  }}
                >
                  <Remove />
                </IconButton>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation(); // Evita que se cierre el menú al interactuar
                    setCurrentStockChange((prev) => (parseFloat(prev) || 0) + 1);
                  }}
                >
                  <Add />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Menú dentro del TextField */}
        {menuOpen && (
          <Box
            position="absolute"
            top="100%"
            left="0"
            width="100%"
            bgcolor="white"
            border="1px solid rgba(0, 0, 0, 0.23)"
            borderRadius="4px"
            zIndex="10"
            boxShadow="0px 4px 6px rgba(0, 0, 0, 0.1)"
          >
            {history.map((record, index) => (
              <MenuItem
                key={index}
                onClick={() => {
                  setCurrentStockChange(record.value); // Actualiza el valor al seleccionar un ítem
                  handleMenuClose();
                }}
              >
                {record.date} - {record.value > 0 ? `+${record.value}` : record.value}
              </MenuItem>
            ))}
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default StockManager;
