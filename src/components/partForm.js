import React, { useState, useCallback, useEffect } from 'react';
import { Chip, TextField, Button, Stack,  Select, MenuItem, InputLabel, FormControl, FormHelperText, InputAdornment, IconButton  } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Add, Remove } from '@mui/icons-material';

const PartNumberForm = ({active, item}) => {
  const [value, setValue] = useState(0);

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

  // Memoizing handleDragEnd to prevent unnecessary re-renders
  const handleDragEnd = useCallback((result) => {
    console.log('Drag End result:', result); // Depuración

    if (!result.destination) return;

    const reorderedPartNumbers = [...data.partNumbers];
    const [removed] = reorderedPartNumbers.splice(result.source.index, 1);
    reorderedPartNumbers.splice(result.destination.index, 0, removed);

    setData({...data, partNumber: reorderedPartNumbers});
  }, [data.partNumber]);

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

          <div>
            <TextField
              label="Add Part Number"
              variant="outlined"
              fullWidth
              margin="normal"
              onKeyDown={handleAddPartNumber}
              placeholder="Press 'Enter' to add"
            />
          

          
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="partNumbers" direction="horizontal">
                {(provided) => {
                  console.log('Droppable rendered'); // Depuración
                  return (
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {data.partNumber.map((partNumber, index) => (
                        <Draggable key={index} draggableId={`${index}`} index={index}>
                          {(provided) => {
                            console.log(`Draggable rendered: ${index}`); // Depuración
                            return (
                              <Chip
                                label={partNumber}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                ref={provided.innerRef}
                                onDelete={() => handleDelete(index)}
                                sx={{ cursor: 'pointer', marginBottom: '8px' }}
                              />
                            );
                          }}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Stack>
                  );
                }}
              </Droppable>
            </DragDropContext>
          </div>
                <h5>Lista de partes:</h5>
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
