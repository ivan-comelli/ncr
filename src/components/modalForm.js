import React, { useState, useEffect } from 'react';
import { Box, Modal, TextField, Button, Typography, Backdrop, Fade, Stack, InputLabel, FormControl, MenuItem, Select, FormHelperText } from '@mui/material';
import { Close, Add } from "@mui/icons-material";
import { useDispatch, useSelector } from 'react-redux';
import { dispatchBulkInventory } from '../redux/actions/inventoryThunks';
import { findDetailStock } from '../redux/actions/actions';

export const ModalForm = ({ petition }) => {
  const partIsolate = useSelector((state) => state.inventory.isolated);

  const dispatch = useDispatch();
  const [open, setOpen] = useState(false); // Estado para abrir o cerrar el modal
  const [isAdding, setIsAdding] = useState(false);
  const [helperError, setHelperError] = useState();
  const [error, setError] = useState({
    stock: false,
    note: false,
    owner: false
  });

  const [data, setData] = useState({
    partNumber: [],
    description: "",
    stock: 0,
    csr: "DEFAULT",
    status: "PENDIENT",
    note: ""
  });

  const handleClose = () => setOpen(false); // Función para cerrar el modal

  useEffect(() => {
    setError({
      stock: false,
      note: false,
      owner: false
    });

    if(petition) {
      setOpen(true);
    }
    else {
      setOpen(false);
    }

    if (partIsolate) {
      setData({
        partNumber: partIsolate.partNumber,
        description: partIsolate.description,
        stock: 0,
        csr: "DEFAULT",
        status: "PENDIENT",
        note: ""
      });
    } else {
      setData({
        partNumber: [],
        description: "",
        stock: 0,
        csr: "DEFAULT",
        status: "PENDIENT",
        note: ""
      });
    }
  }, [petition, partIsolate]);

  const handleChange = (event) => {
    setData((prev) => ({
      ...prev,
      csr: event.target.value
    }));
  };

  const handleChangeText = (text) => {
    setHelperError(text);
  };

  const submitForm = () => {
    // Lógica para enviar el formulario
    // Por ejemplo, podrías hacer un dispatch de la acción correspondiente:
    dispatch(dispatchBulkInventory(data));
    handleClose(); // Cerrar el modal después de enviar el formulario
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            width: '80%',
            maxWidth: 600,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" component="h2">
            Formulario de Inventario
          </Typography>

          <TextField
            fullWidth
            label="Descripción"
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            margin="normal"
            error={error.note}
            helperText={error.note && "Descripción es requerida"}
          />

          <TextField
            fullWidth
            label="Stock"
            type="number"
            value={data.stock}
            onChange={(e) => setData({ ...data, stock: e.target.value })}
            margin="normal"
            error={error.stock}
            helperText={error.stock && "Stock es requerido"}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Cargo del CSR</InputLabel>
            <Select
              value={data.csr}
              onChange={handleChange}
              error={error.owner}
            >
              <MenuItem value="DEFAULT">Seleccione un CSR</MenuItem>
              <MenuItem value="AR103S42">Diego Molina</MenuItem>
              <MenuItem value="AR103S44">Nahuel DeLuca</MenuItem>
              <MenuItem value="AR103S45">Adrian Santarelli</MenuItem>
              <MenuItem value="AR903S49">Juan Valenzuela</MenuItem>
              <MenuItem value="AR903S48">Ivan Comelli</MenuItem>
            </Select>
            {error.owner && <FormHelperText>Seleccione un CSR</FormHelperText>}
          </FormControl>

          <TextField
            fullWidth
            label="Nota"
            value={data.note}
            onChange={(e) => setData({ ...data, note: e.target.value })}
            margin="normal"
            multiline
            rows={4}
            error={error.note}
            helperText={error.note && "La nota es requerida"}
          />

          <Stack direction="row" spacing={2} sx={{ marginTop: 2 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClose}
              startIcon={<Close />}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={submitForm}
              startIcon={<Add />}
            >
              Enviar
            </Button>
          </Stack>
        </Box>
      </Fade>
    </Modal>
  );
};
