import React, { useState, useCallback, useEffect } from 'react';
import { Autocomplete, Chip, TextField, Button, Stack, Menu, Select, MenuItem, InputLabel, FormControl, FormHelperText, InputAdornment, IconButton, Typography, ListItemIcon  } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Remove } from '@mui/icons-material';
import { ArrowDropDown } from '@mui/icons-material';
import { Add, Close } from "@mui/icons-material";

const PartNumberForm = ({active, item}) => {
  const [value, setValue] = useState(0);
  const [partNumber, setPartNumber] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleIncrement = () => {
    setValue((prevValue) => prevValue + 1);
  };

  const handleDecrement = () => {
    setValue((prevValue) => (prevValue > 0 ? prevValue - 1 : 0));
  };

  const handleChangeStock = (event) => {
    const newValue = event.target.value;
    if (newValue === '' || !isNaN(newValue)) {
      setValue(Number(newValue));
    }
  };
  const [data, setData] = useState({
    partNumber: [],
    description: "",
    stock: null,
    csr: null
  });
  const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR903S49" },
    { name: "Ivan Comelli", csr: "AR903S48" }
  ];

  const [selectedCsr, setSelectedCsr] = useState('');

  const handleChange = (event) => {
    setSelectedCsr(event.target.value);
  };

  useEffect(() => {
    if(item) {
      setData({
        partNumber: item.partNumber,
        description: item.description,
        stock: item.stock,
        csr: null
      })
    }
    else {
      setData({
        partNumber: [],
        description: "",
        stock: null,
        csr: null
      })
    }
  }, [active, item])

  const handleAddPartNumber = (event) => {
    if (event.key === 'Enter' && event.target.value) {
      setData({...data, partNumber: [...data.partNumber, event.target.value]});
      event.target.value = ''; // Limpiar el input después de agregar
    }
  };

  const handleDelete = (index) => {
    const updatedPartNumbers = [...data.partNumbers];
    updatedPartNumbers.splice(index, 1);
    setData({...data, partNumber: updatedPartNumbers});
  };

  const handleSelectPartNumber = (selectedPart) => {
    setPartNumber(selectedPart); // Actualiza el campo con el número seleccionado
    handleCloseMenu();
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const toggleAddingState = () => {
    setIsAdding(!isAdding);
    if (!isAdding) {
      setInputValue(""); // Resetea el campo al cambiar a estado de agregar
    }
  };

  const handleInputKeyPress = (event) => {
    if (event.key === "Enter" && isAdding) {
      handleAddPartNumber();
    }
  };

  return (
    <>
      {active && (
        <form className='registerForm'>
                   
          <TextField
            label="Description"
            variant="outlined"
            fullWidth
            margin="normal"
            value={data.description}
            onChange={(e) => setData({...data, description: e.target.value})}
          />
        <Autocomplete
  freeSolo
  disabled={!isAdding && data.partNumber.length == 0} // Deshabilitar si no está en modo agregar
  id="free-solo-2-demo"
  disableClearable
  getOptionDisabled={() => true}
  options={data.partNumber.length > 0 ? data.partNumber : []} // Asegurar opciones válidas
  value={data.partNumber.length > 0 ? data.partNumber[0] : ""} // Si no hay elementos, usar cadena vacía
  inputValue={isAdding ? inputValue : data.partNumber.length > 0 ? data.partNumber[0] : ""} // Manejar entrada vacía
  onInputChange={(event, newInputValue) => {
    if (isAdding) {
      setInputValue(newInputValue); // Solo actualizar inputValue cuando está en modo agregar
    }
  }}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Numero de Parte"
      variant="outlined"
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <>
            {params.InputProps.endAdornment}
            <InputAdornment position="end">
              <IconButton
                onClick={toggleAddingState}
                size="small"
                color={isAdding ? "secondary" : "primary"}
                aria-label={isAdding ? "Cancelar" : "Agregar nueva parte"}
              >
                {isAdding ? <Close /> : <Add />}
              </IconButton>
            </InputAdornment>
          </>
        ),
      }}
    />
  )}
/>
         
            <FormControl fullWidth>
              <InputLabel id="csr-select-label">Selecciona un empleado</InputLabel>
              <Select
                labelId="csr-select-label"
                value={selectedCsr}
                onChange={handleChange}
                label="Selecciona un empleado"
                placeholder="Selecciona un empleado"
              >
                <MenuItem value="">
                  <em>Selecciona un empleado</em>
                </MenuItem>
                {options.map((option) => (
                  <MenuItem key={option.csr} value={option.csr}>
                    {option.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Número incremental"
              value={value}
              onChange={handleChangeStock}
              type="number"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton onClick={handleDecrement}>
                      <Remove />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleIncrement}>
                      <Add />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" color="primary">
              Submit
            </Button>
        </form>
      )}
    </>
  );
};

export default PartNumberForm;
