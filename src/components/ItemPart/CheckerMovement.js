import React, { useState, useEffect } from 'react';
import { Box, Modal, TextField, Button, Typography, Backdrop, Fade, Stack, InputLabel, FormControl, MenuItem, Select, FormHelperText } from '@mui/material';
import { Close, Add } from "@mui/icons-material";
import { useDispatch, useSelector } from 'react-redux';
import { dispatchBulkInventory } from '../../redux/actions/async';

const CheckerMovement = ({ petition }) => {
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

  const STATUS = {
    PENDIENT: "Pendiente",
    ADJUST: "Ajuste",
    ISSUE: "Conflicto"
  } 

  const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR103S46" },
    { name: "Ivan Comelli", csr: "AR903S48" }
  ];

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
    if(partIsolate) {
      setOpen(true);
      setData({
        partNumber: partIsolate?.partNumber || '',
        description: partIsolate?.description || '',
        stock: petition?.quantity || 0,
        csr: localStorage.getItem('csr') || "DEFAULT",
        status: petition ? Object.entries(STATUS).find(([key, value]) => value === petition.type)[0] : 'PENDIENT',
        note: ""
      });
    }
  }, [petition]);

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
    dispatch(dispatchBulkInventory([{
      id: data.id,
      partNumber: data.partNumber,
      description: data.description,
      stock: {
        quantity: data.stock,
        csr: data.csr,
        status: data.status,
        note: data.note
      }
    }], false));
    localStorage.setItem('csr', data.csr);
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
          className='registerForm'
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
          <Typography variant="h6" component="h2" className="title">
            Formulario de Inventario
          </Typography>

          <TextField
            className="description"
            fullWidth
            label="Descripción"
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            margin="normal"
          />

          <TextField
            className="counter-stock"
            fullWidth
            label="Stock"
            type="number"
            value={data.stock}
            onChange={(e) => setData({ ...data, stock: e.target.value })}
            margin="normal"
            error={error.stock}
            helperText={error.stock && "Stock es requerido"}
          />

          <Select
            className="owner"
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

          <Select
            className="status"
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
            className="notes"
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

          <Stack className="actions" direction="row" spacing={2} sx={{ marginTop: 2 }}>
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

export default CheckerMovement;