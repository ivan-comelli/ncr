import React, { useState, useCallback, useEffect } from 'react';
import { Box, Autocomplete, ClickAwayListener, Chip, TextField, Button, Stack, Menu, Select, MenuItem, InputLabel, FormControl, FormHelperText, InputAdornment, IconButton, Typography, ListItemIcon  } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Remove } from '@mui/icons-material';
import { ArrowDropDown } from '@mui/icons-material';
import { Add, Close } from "@mui/icons-material";
import { useDispatch, useSelector } from 'react-redux';
import { dispatchBulkInventory } from '../redux/actions/inventoryThunks'
const PartNumberForm = ({active, item}) => {
  const dispatch = useDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [helperError, setHelperError] = useState();
  const [error, setError] = useState({
    stock: false,
    note: false,
    owner: false
  });
  const [isAnimating, setIsAnimating] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const STATUS = {
    PENDIENT: "Pendiente",
    ADJUST: "Ajuste",
    ISSUE: "Conflicto"
  } 
  const [data, setData] = useState({
    partNumber: [],
    description: "",
    stock: 0,
    csr: "DEFAULT",
    status: "PENDIENT",
    note: ""
  });
  const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR903S49" },
    { name: "Ivan Comelli", csr: "AR903S48" }
  ];
  const [helpers, setHelpers] = useState({
    indicators: ["Text 1", "Text 2"],
    errors: []
  });
  const [helperIndex, setHelperIndex] = useState({error: 0, indicator: 0});

  useEffect(() => {
    const showOtherHelper = () => {
      if(helpers.errors.length > 0) {
        setHelperIndex((prevIndex) => {
          let newIndex = (prevIndex.error + 1) % helpers.errors.length;
          handleChangeText(helpers.errors[newIndex]);
          return { 
            indicator: prevIndex.indicator, 
            error: newIndex
          }
        })
      }
      else {
        setHelperIndex((prevIndex) => {
          let newIndex = (prevIndex.indicator + 1) % helpers.indicators.length;
          handleChangeText(helpers.indicators[newIndex]);
          return {
            indicator: newIndex, 
            error: prevIndex.error
          }
        })
      }
    }

    const interval = setInterval(showOtherHelper, 10000); // Cambia cada 2000ms (2 segundos)
    showOtherHelper();
    return () => clearInterval(interval);
  }, [helpers]);

  const handleChange = (event) => {
    setData((prev) => ({
      ...prev,
      csr: event.target.value
    }));
  };

  useEffect(() => {
    setError({
      stock: false,
      note: false,
      owner: false
    })
    setHelpers((prev) => ({ errors: [], indicators: prev.indicators }));

    if(item) {
      setData({
        partNumber: item.partNumber,
        description: item.description,
        stock: 0,
        csr: "DEFAULT",
        status: "PENDIENT",
        note: ""
      })
    }
    else {
      setData({
        partNumber: [],
        description: "",
        stock: 0,
        csr: "DEFAULT",
        status: "PENDIENT",
        note: ""
      })
    }
  }, [active, item])

  const handleChangeText = (text) => {
    if (isAnimating) return; // Evitar múltiples animaciones simultáneas
    setIsAnimating(true);
    setTimeout(() => {
        setHelperError(text);
        setIsAnimating(false);
    }, 500); // Tiempo de la animación (debe coincidir con el CSS)
};


  const toggleAddingState = () => {
    setIsAdding(!isAdding);
    if (!isAdding) {
      setInputValue(""); // Resetea el campo al cambiar a estado de agregar
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let isEmptyStock = data.stock === 0;
    let isValidPartNumber = data.partNumber.length > 0;
    let isValidOwner = data.csr !== "DEFAULT";
    let isValidNote = (data.status === "ISSUE" && data.note !== "") || data.status !== "ISSUE";
    if(!isEmptyStock && isValidPartNumber && isValidOwner && isValidNote) {
      dispatch(dispatchBulkInventory([{
        id: item.id,
        ...data,
        stock: {
          quantity: data.stock,
          csr: data.csr,
          status: data.status,
          note: data.note
        }
      }]));
      setHelpers((prev) => ({ errors: [], indicators: prev.indicators }));
      setData((prev) => ({...prev, stock: 0, csr: "DEFAULT"}))
    }
    if(isEmptyStock) {
      setHelpers((prev) => ({ errors: [...prev.errors, "No hay Monto en Stock"], indicators: prev.indicators }));
      setError(prev => ({...prev, stock: true}));
    }
    if(!isValidOwner) {
      setHelpers((prev) => ({ errors: [...prev.errors, "No Seleccionaste un Dueño"], indicators: prev.indicators }));
      setError(prev => ({...prev, owner: true}));
    }
    if(!isValidNote) {
      setHelpers((prev) => ({ errors: [...prev.errors, "Falta la nota para este caso"], indicators: prev.indicators }));
      setError(prev => ({...prev, note: true}));
    }
  }

  const StockManager = () => {
    const handleStockChange = (e) => {
      // Asegúrate de solo aceptar números
      const value = e.target.value;
      console.log(value)
      if (!isNaN(value)) {
        setData((prev) => ({
          ...prev,
          stock: Number(value)
        }));
      }
    };
    return (
      <>
          <TextField
            label="Agregar Stock"
            className='stock'
            value={data.stock}
            fullWidth
            error={error.stock}
            margin="none"
            onChange={handleStockChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que se cierre el menú al interactuar
                      setData((prev) => ({...prev, stock: prev.stock - 1}));
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
                      setData((prev) => ({...prev, stock: (prev.stock + 1)}));
                    }}
                  >
                    <Add />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Select
            className='status'
            value={data.status}
            onChange={(value) => {
              setData((prev) => ({ ...prev, status: value.target.value }));
            }}
          >
            {Object.entries(STATUS).map(([key, status]) => (
              <MenuItem key={key} value={key}>
                {status}
              </MenuItem>
            ))}
          </Select>
          <TextField
            label="Nota"
            error={error.note}
            className='note'
            variant="outlined"
            fullWidth
            margin="none"
            value={data.note}
            onChange={(e) => setData({...data, note: e.target.value})}
          />
          <Button 
            className='history'
            variant="contained" 
            color="primary" 
          >
            Historial
        </Button>
      </>
    );
  };

  return (
    <>
      {active && (
        <FormControl className='registerForm' fullWidth>  
          <div className ={`helper ${helpers.errors.length > 0 ? 'error' : ''} `}>
            <Box className={`text ${isAnimating ? 'slide-out' : ''} `}>
              { helperError }
            </Box>     
          </div>            
          <TextField
            label="Description"
            className='description'
            variant="outlined"
            fullWidth
            margin="none"
            value={data.description}
            onChange={(e) => setData({...data, description: e.target.value})}
          />
          <Autocomplete
            className='partNumber'
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
          <Select
            className='select'
            value={data.csr}
            error={error.owner}
            onChange={handleChange}
          >
            <MenuItem value={"DEFAULT"}>
              <em>Selecciona un empleado</em>
            </MenuItem>
            {options.map((option) => (
              <MenuItem key={option.csr} value={option.csr}>
                {option.name}
              </MenuItem>
            ))}
          </Select>

          <StockManager></StockManager>
     
          <Button className='submit' variant="contained" color="primary" onClick={handleSubmit}>
            Submit
          </Button>
        </FormControl>
      )}
    </>
  );
};

export default PartNumberForm;
