import {
  TextField,
  Box,
  Grid2 as Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Autocomplete,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup
} from "@mui/material";

import { useForm, Controller } from "react-hook-form";
import { useEffect } from "react";

//PROPIEDADES
//Identificadores y dueño
//Tipo por modelo
//Modulos Disponibles
//Tipo de Lectora

//CPU
//Modelo
//Suciedad Previa
//Rendimiento del sistema
//Cambio de Pasta termica
//Nota

//MODELO FORM LIMPIEZA ATM 6632
//Valoracion Estado Previo en General de Limpieza
//Interferencias en la Carpinteria adicional con el equipo
//No abre adecuadamente Fasia
//NO abre adecuadamente Tesoro
//Limpieza Ventilacion Forzada
//Limpieza Vano Superior CPU
//Limpieza Vano Bandeja
//Limpieza Bandeja y correderas telescopicas
//Limpieza Vano SCPM y correderas telescopicas
//Limpieza de Monitor Cliente
//Limpieza Fasia
//Limpieza y lubricacion Shutters
//Remover polvillo y suciedad del Vano Tesoro
//Limpieza General Exterior
//Nota de Detalles o Faltantes

//ACCESORIOS
//Se pregunta si es reemplazada la pieza o no por una nueva o reacondicionada.
//LECTORA MOTORIZADA
//Revision y limpieza de pre magnetico y cortina Shutter
//Revision y Limpieza EMV
//Revision y Limpieza cabezal Magnetico
//Revision y Limpieza rubber rolls
//Revision y calibracion tolerancia espesor de tarjeta
//Revision y limpieza general de sensores, chasis.
//Conserva Main PCB

//Lectora DIP
//Limpieza general de magnetico, mecanismos, endstop, emv y body.
//Revision de Desgaste anomalo en cuerpo plastico
//Revision de emv por desgaste o deformaciones
//Revision desgaste magnetico

//Impresora de Recibos
//Limpieza sensor low
//Limpieza y revision engine
//Limpieza y pruebas cabezal termico
//Limpieza de transporte por correa y sensores

//Se Encontro el Biometrico Funcionando?

//los modulos tiene que recaudar informcion de ante mano la longevidad de las piezas y si se van a reemplazar o no

// se detalla el estado de las piezas
//const presenter = {
// Suciedad en el Timing sensor disk pick arias
//Engranaje de transporte LVDT Gastado
//Correas de Transporte Gastadas
//Motor Clamp dañado
// Sensor de posicion clamp
//sensor de timing transporte
// Rechinidos
// sensores de presentado
// sensor de atasco en clamp, purga
//en el lvdt puede fallar tensores o las mismas correas desgastadas
//Estado bomba de vacio
//Estado Capacitor
//}
//const pick = {
//correas verticales desgastadas
//Sensor low
//limpieza de sensor confirmacion de  emisor y receptor
//Estado de pinch roll en grasitud y degradacion del caucho
//estado de conjunto de pick lines
//estado de conjunto pick drive
//holgura de bujes en tolerancia
//kit de vacio y filtro
//Estado de pick valve por resistencia y sonido
//estado pick interface por lectura de tipos
//}

//const carriage = {
//estado de correas
//limpieza de sensores en transporte
//Estado de brackets
//limpieza de timing sensor
//verificacion de estado motor stepper
//}/

const equipos = [
  {
    anio: "", // Año puesta en producción
    type: "TASI",
    id: "ATM001",
    serial: "SN-123456",
    flag: "BNA",
    suc: "100",
    localidad: "Neuquen",
    modelo: "Diebold Opteva",
    modulos: [],
    lectora: "",
    biometria: "",
    tactilCliente: "",
  },
];

const clients = [
  { label: 'BBVA' },
  { label: 'BNA' },
  { label: 'BPN' },
  { label: 'Galicia' },
];

const models = [
  { label: '6632' },
  { label: '6634' },
  { label: '6622' },
  { label: '6624' },
]

const prodType = [
  { label: 'ATM' },
  { label: 'TASI' },
]

const red = [
  { label: 'Red Propia' },
  { label: 'Banelco' },
  { label: 'Link' },
]

const locations = [
  { label: 'Neuquen' },
  { label: 'Cipolletti' },
  { label: 'Plottier' },
  { label: 'Rincon de los Sauces' },
  { label: 'Cinco Saltos' },
  { label: 'Vista Alegre' },
  { label: 'Cordero' },
  { label: 'Zapala' },
  { label: 'Fernandez Oro' },
  { label: 'General Roca' },
  { label: 'Allen' },
  { label: 'Centenario' },
];

export default function PasoPropiedades() {
  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { id: "", client: null, location: null },
  });

  const onSubmit = (data) => {
    console.log('Seleccionado:', data);
  };

  const idValue = watch("id");

  useEffect(() => {
    if(idValue !== String(idValue).toUpperCase()) {
      setValue("id", String(idValue).toUpperCase())
    }
  }, [idValue]); 
  //Me interesa capturar la informacion tanto del estado previo como el del posterior al mantenimiento
  //Por eso se requiere precision en detallo como se encontro
  //Y segun el procedimiento que establecio a seguir sin mucho detalle se entiende que se arreglaron todos los detalles mencionados anteriormente
  return (
    <Box className="container" spacing={2} sx={{ width: "100%", m: 0 }}>
      <Typography className="form-header" variant="h5">
        Administracion
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3}>
          <Grid className="section-wrap" data-section="client"
            container
            columnSpacing={2}
            size={12}
          >
            <Grid size={{ md: 2, lg: 4 }} className="subtitle-wrap">
              <Typography variant="subtitle1">Cliente</Typography>
            </Grid>
            <Grid size="grow" className="content-wrapper">
              <Stack spacing={2}>
                <Grid container className="1/2-row" columnSpacing={2}>
                  <Grid size={6} className="field-cell" data-field="ID">
                    <TextField
                      label="ID"
                      size="small"
                      fullWidth
                      {...register("id", { required: "El ID es obligatorio"})}
                      error={!!errors.id} // true si hay error
                      helperText={errors.id?.message} // mensaje del error
                    />
                  </Grid>
                  <Grid size={6} className="field-cell" data-field="Banco">
                    <Controller
                      name="client"
                      control={control}
                      rules={{ required: 'Campo requerido' }}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          {...field}
                          options={clients}
                          freeSolo
                          getOptionLabel={(option) => (option.label ? option.label : "")}
                          onChange={(_, value) => {
                            if(value) {
                              const matches = clients.filter(c =>
                                String(c.label).toLowerCase().includes(String(value.label || value).toLowerCase())
                              );
                              if (matches.length === 1) {
                                field.onChange(matches[0]); // selecciona automáticamente
                              } else {
                                field.onChange(null); // ningún match
                              }
                            }
                            else {
                              field.onChange(null)
                            }
                            
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Banco"
                              size="small"
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
                <Grid container className="1/3-row" columnSpacing={2}>
                  <Grid size={8} className="field-cell" data-field="Localidad">
                    <Controller
                      name="location"
                      control={control}
                      rules={{ required: 'Campo requerido' }}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          {...field}
                          options={locations}
                          freeSolo
                          getOptionLabel={(option) => (option.label ? option.label : "")}
                          onChange={(_, value) => {
                            if(value) {
                              const matches = locations.filter(c =>
                                String(c.label).toLowerCase().includes(String(value.label || value).toLowerCase())
                              );
                              if (matches.length === 1) {
                                field.onChange(matches[0]); // selecciona automáticamente
                              } else {
                                field.onChange(null); // ningún match
                              }
                            }
                            else {
                              field.onChange(null)
                            }
                            
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Localidad"
                              size="small"
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={4} className="field-cell" data-field="Branch">
                    <TextField
                      label="Nº Sucursal"
                      size="small"
                      fullWidth
                      {...register("branch", { required: "La sucursal es obligatorio"})}
                      error={!!errors.id} // true si hay error
                      helperText={errors.id?.message} // mensaje del error
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Grid>
          </Grid>
          <Grid className="section-wrap" data-section="specs"
            container
            columnSpacing={2}
            size={12}
          >
            <Grid size={{ md: 2, lg: 4 }} className="subtitle-wrap">
              <Typography variant="subtitle1">Especificaciones</Typography>
            </Grid>
            <Grid size="grow" className="content-wrapper">
              <Stack spacing={2}>
                <Grid container className="1/2-row" columnSpacing={2}>
                  <Grid size={6} className="field-cell" data-field="serial">
                    <TextField
                      label="Nº Serial"
                      size="small"
                      fullWidth
                      {...register("serial", { required: "El serial es obligatorio"})}
                      error={!!errors.id} // true si hay error
                      helperText={errors.id?.message} // mensaje del error
                    />
                  </Grid>
                  <Grid size={6} className="field-cell" data-field="model">
                    <Controller
                      name="model"
                      control={control}
                      rules={{ required: 'Campo requerido' }}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          {...field}
                          options={models}
                          freeSolo
                          getOptionLabel={(option) => (option.label ? option.label : "")}
                          onChange={(_, value) => {
                            if(value) {
                              const matches = models.filter(c =>
                                String(c.label).toLowerCase().includes(String(value.label || value).toLowerCase())
                              );
                              if (matches.length === 1) {
                                field.onChange(matches[0]); // selecciona automáticamente
                              } else {
                                field.onChange(null); // ningún match
                              }
                            }
                            else {
                              field.onChange(null)
                            }
                            
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Modelo"
                              size="small"
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
                <Grid container className="row" columnSpacing={2}>
                  <Grid size={6} className="field-cell" data-field="red">
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Red
                    </Typography>
                    <Controller
                      name="network"
                      control={control}
                      defaultValue=""
                      rules={{ required: "Seleccioná una red" }}
                      render={({ field, fieldState }) => (
                        <ToggleButtonGroup
                          exclusive
                          value={field.value}
                          onChange={(_, value) => {
                            if (value !== null) field.onChange(value);
                          }}
                          size="small"
                          color={fieldState.error ? "error" : "primary"}
                        >
                          <ToggleButton value="propia">Red Propia</ToggleButton>
                          <ToggleButton value="banelco">Banelco</ToggleButton>
                          <ToggleButton value="link">Link</ToggleButton>
                        </ToggleButtonGroup>
                      )}
                    />
                    
                    {errors.network && (
                      <Typography variant="caption" color="error">
                        {errors.network.message}
                      </Typography>
                    )}
                  </Grid>  
                  <Grid size={2} className="field-cell" data-field="type">
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Tipo
                    </Typography>
                    <Controller
                      name="network"
                      control={control}
                      defaultValue=""
                      rules={{ required: "Seleccioná una red" }}
                      render={({ field, fieldState }) => (
                        <ToggleButtonGroup
                          exclusive
                          value={field.value}
                          onChange={(_, value) => {
                            if (value !== null) field.onChange(value);
                          }}
                          size="small"
                          color={fieldState.error ? "error" : "primary"}
                        >
                          <ToggleButton value="atm">ATM</ToggleButton>
                          <ToggleButton value="tasi">TASI</ToggleButton>
                        </ToggleButtonGroup>
                      )}
                    />
                    
                    {errors.network && (
                      <Typography variant="caption" color="error">
                        {errors.network.message}
                      </Typography>
                    )}
                  </Grid>   
                  <Grid size={2} className="field-cell" data-field="type">
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Sitio
                    </Typography>
                    <Controller
                      name="network"
                      control={control}
                      defaultValue=""
                      rules={{ required: "Seleccioná una red" }}
                      render={({ field, fieldState }) => (
                        <ToggleButtonGroup
                          exclusive
                          value={field.value}
                          onChange={(_, value) => {
                            if (value !== null) field.onChange(value);
                          }}
                          size="small"
                          color={fieldState.error ? "error" : "primary"}
                        >
                          <ToggleButton value="atm">Sucursal</ToggleButton>
                          <ToggleButton value="tasi">Neutral</ToggleButton>
                        </ToggleButtonGroup>
                      )}
                    />
                    
                    {errors.network && (
                      <Typography variant="caption" color="error">
                        {errors.network.message}
                      </Typography>
                    )}
                  </Grid>          
                </Grid>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
        <Button variant="text" type="submit" sx={{position:"absolute", bottom:"1rem", right:"1rem"}}>Enviar</Button>
      </form>
    </Box>
  );
}
