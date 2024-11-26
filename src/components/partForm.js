import React, { useState, useCallback } from 'react';
import { Chip, TextField, Button, Stack } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const PartNumberForm = () => {
  const [partNumbers, setPartNumbers] = useState([]);
  const [description, setDescription] = useState('');

  const handleAddPartNumber = (event) => {
    if (event.key === 'Enter' && event.target.value) {
      setPartNumbers([...partNumbers, event.target.value]);
      event.target.value = ''; // Limpiar el input después de agregar
    }
  };

  const handleDelete = (index) => {
    const updatedPartNumbers = [...partNumbers];
    updatedPartNumbers.splice(index, 1);
    setPartNumbers(updatedPartNumbers);
  };

  // Memoizing handleDragEnd to prevent unnecessary re-renders
  const handleDragEnd = useCallback((result) => {
    console.log('Drag End result:', result); // Depuración

    if (!result.destination) return;

    const reorderedPartNumbers = [...partNumbers];
    const [removed] = reorderedPartNumbers.splice(result.source.index, 1);
    reorderedPartNumbers.splice(result.destination.index, 0, removed);

    setPartNumbers(reorderedPartNumbers);
  }, [partNumbers]);

  return (
    <form>
      {/* Input de Descripción */}
      <TextField
        label="Description"
        variant="outlined"
        fullWidth
        margin="normal"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* Input de Part Numbers */}
      <TextField
        label="Add Part Number"
        variant="outlined"
        fullWidth
        margin="normal"
        onKeyDown={handleAddPartNumber}
        placeholder="Press 'Enter' to add"
      />

      {/* Implementación de Drag and Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="partNumbers" direction="horizontal">
          {(provided) => {
            console.log('Droppable rendered'); // Depuración
            return (
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                marginTop={2}
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {partNumbers.map((partNumber, index) => (
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

      {/* Botón para enviar el formulario */}
      <Button variant="contained" color="primary" sx={{ marginTop: 2 }}>
        Submit
      </Button>
    </form>
  );
};

export default PartNumberForm;
