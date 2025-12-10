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
  ToggleButtonGroup,
  Slider,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";

import SectionForm from "../components/Form/SectionForm";

import { useForm, Controller } from "react-hook-form";
import { useEffect, useState } from "react";

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

const mappingLayout = {
  0: [2, 2],
  1: [3, 1],
  2: [2, 1, 1],
  3: [4],
  4: [2, 1, 1],
  5: [4],
  6: [4],
  7: [4],
  8: [4],
  9: [4],
  10: [4],
  11: [4],
  12: [4],
  13: [4],
  14: [4],
  15: [4],
  16: [4],
  17:[4]
};

const inputClient = [
  {
    id: 0,
    name: "terminalId",
    label: "ID Dominio",
    render: {
      type: "TextField",
    },
  },
  {
    id: 1,
    name: "client",
    label: "Banco",
    render: {
      type: "AutoComplete",
      options: [
        { id: 1, label: "BBVA" },
        { id: 2, label: "BNA" },
        { id: 3, label: "BPN" },
        { id: 4, label: "Galicia" },
      ],
    },
  },
  {
    id: 2,
    name: "location",
    label: "Localidad",
    render: {
      type: "AutoComplete",
      options: [
        { id: 1, label: "Neuquen" },
        { id: 2, label: "Cipolletti" },
        { id: 3, label: "Plottier" },
        { id: 4, label: "Rincon de los Sauces" },
        { id: 5, label: "Cinco Saltos" },
        { id: 6, label: "Vista Alegre" },
        { id: 7, label: "Cordero" },
        { id: 8, label: "Zapala" },
        { id: 9, label: "Fernandez Oro" },
        { id: 10, label: "General Roca" },
        { id: 11, label: "Allen" },
        { id: 12, label: "Centenario" },
      ],
    },
  },
  {
    id: 3,
    name: "numberBranch",
    label: "Nº Sucursal",
    render: {
      type: "TextField",
    },
  },
];

const inputSpecs = [
   {
    id: 4,
    name: "serialNumber",
    label: "Nº Serial",
    render: {
      type: 'TextField'
    }
  },
  {
    id: 5,
    name: "terminalModel",
    label: "Modelo",
    render: {
      type: 'Selector',
      options: [
        { id: 1, label: "6632" },
        { id: 2, label: "6634" },
        { id: 3, label: "6622" },
        { id: 4, label: "6624" },
      ]
    }
  },
  {
    id: 6,
    name: "cpuModel",
    label: "CPU",
    render: {
      type: 'Selector',
      options: [
        { id: 1, label: "Talladega" },
        { id: 2, label: "Pocono" },
        { id: 3, label: "Estoril" },
        { id: 4, label: "Misano" },
      ]
    }
  },
  {
    id: 7,
    name: "deviceSetting",
    label: "Modulos",
    render: {
      type: "Selector",
      options:[
        { id: 1, label: "S1" },
        { id: 2, label: "S2" },
        { id: 3, label: "BNA3" },
        { id: 4, label: "GBRU" },
        { id: 5, label: "BRM" },
        { id: 6, label: "SRU" },
        { id: 7, label: "SCPM" },
        { id: 8, label: "SCPM2" },
        { id: 9, label: "Sobres" },
      ]
    },
  },
  {
    id: 8,
    name: "settingRed",
    label: "Red",
    render: {
      type: "ToggleButton",
      options: [
        {id: 1, label: "Red Propia"},
        {id: 2, label: "Banelco"},
        {id: 3, label: "Link"}
      ]
    }
  },
  {
    id: 9,
    name: "settingType",
    label: "Tipo",
    render: {
      type: "ToggleButton",
      options: [
        {id: 1, label: "ATM"},
        {id: 2, label: "TASI"},
      ]
    }
  },
  {
    id: 10,
    name: "siteInfraestructure",
    label: "Sitio",
    render: {
      type: "ToggleButton",
      options: [
        {id: 1, label: "Neutral"},
        {id: 2, label: "Sucursal"},
      ]
    }
  },
];

const inputPresenterS1 = [
  {
    id: 11,
    name: "pressurePump",
    label: "Presion de Bomba",
    render: {
      type: 'CheckBox'
    }
  },
  {
    id: 12,
    name: "presenterBelt",
    label: "Correas Presentador en Buen Estado",
    render: {
      type: 'CheckBox'
    }
  },
  {
    id: 13,
    name: "ldvtDrive",
    label: "Engranaje en Buen Estado",
    render: {
      type: 'CheckBox'
    }
  },
  {
    id: 14,
    name: "ldvtStatus",
    label: "Estado general LVDT",
    render: {
      type: 'CheckBox'
    }
  },
  {
    id: 15,
    name: "motorClamp",
    label: "Estado Motor Clamp",
    render: {
      type: 'CheckBox'
    }
  },
  {
    id: 16,
    name: "capacitorStatus",
    label: "Capacitor en Buen Estado",
    render: {
      type: 'CheckBox'
    }
  }
]

const inputPickAriaS1 = [
  {
    id: 17,
    name: "verticalBelt",
    label: "Estado Correa Verticales",
    render: {
      type: 'CheckBox'
    }
  },
  {
    id: 18,
    name: "sensorLow",
    label: "Integridad Sensor Low Bill",
    render: {
      type: 'CheckBox'
    }
  },
  {
    id: 19,
    name: "interfacePCB",
    label: "Estado Placa de Interface",
    render: {
      type: 'CheckBox'
    }
  },
  {
    id: 20,
    name: "solenoidStatus",
    label: "Estado Solenoide",
    render: {
      type: 'CheckBox'
    }
  },
  {
    id: 21,
    name: "gearDriveStatus",
    label: "Estado Engranajes de Transmicion",
    render: {
      type: 'CheckBox'
    }
  },
  {
    id: 22,
    name: "pickLineStatus",
    label: "Estado Sistema de Piqueo",
    render: {
      type: 'CheckBox'
    }
  },
]

const inputResultS1 = [
    {
    id: 23,
    name: "resultStatusS1",
    label: "Estado Resultante",
    render: {
      type: 'Ranking'
    }
  }
]

export default function PasoPropiedades() {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { terminalId: "", client: null, location: null, deviceSetting: [] },
  });

  const [tab, setTab] = useState(0);

  const getInputsWithLevel = (inputs, mapping) => {
    const flatLayout = Object.values(mapping).flat();

    return inputs.map((input) => {
      const level = flatLayout[input.id];
      return {
        ...input,
        level,
      };
    });
  };

  const handleChange = (_, newValue) => {
    setTab(newValue);
  };

  const onSubmit = (data) => {
    console.log("Seleccionado:", data);
  };

  const idValue = watch("terminalId");
  const deviceSettingValue = watch("deviceSetting");

  useEffect(() => {
    console.log(deviceSettingValue)
  }, [deviceSettingValue]);

  useEffect(() => {
    if (idValue !== String(idValue).toUpperCase()) {
      setValue("terminalId", String(idValue).toUpperCase());
    }
  }, [idValue]);
  //Me interesa capturar la informacion tanto del estado previo como el del posterior al mantenimiento
  //Por eso se requiere precision en detallo como se encontro
  //Y segun el procedimiento que establecio a seguir sin mucho detalle se entiende que se arreglaron todos los detalles mencionados anteriormente
  return (
    <Box className="container" spacing={2} sx={{ width: "100%", m: 0 }}>
      <Typography className="form-header" variant="h5" marginBottom={"1rem"}>
        Administracion
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3}>
          <SectionForm
            register={register}
            control={control}
            section={{ name: "Cliente", label: "El Cliente" }}
            inputs={getInputsWithLevel(inputClient, mappingLayout)}
          />
          <SectionForm
            register={register}
            control={control}
            section={{ name: "Specs", label: "Especificaciones" }}
            inputs={getInputsWithLevel(inputSpecs, mappingLayout)}
          />
          { deviceSettingValue.length != 0 ? (
            <Box sx={{ width: "100%" }}>
              {/**
              { id: 1, label: "S1" },
              { id: 2, label: "S2" },
              { id: 3, label: "BNA3" },
              { id: 4, label: "GBRU" },
              { id: 5, label: "BRM" },
              { id: 6, label: "SRU" },
              { id: 7, label: "SCPM" },
              { id: 8, label: "SCPM2" },
              { id: 9, label: "Sobres" },*/}
              <Tabs value={tab} onChange={handleChange}>
                { deviceSettingValue.map(item => (
                  <Tab value={item.id} label={item.label} />
                ))
                }
              </Tabs>

              {tab === 1 && (
                <Stack spacing={3}>
                  <SectionForm
                    register={register}
                    control={control}
                    section={{ name: "presenter", label: "Presentador" }}
                    inputs={getInputsWithLevel(inputPresenterS1, mappingLayout)}
                  />
                  <SectionForm
                    register={register}
                    control={control}
                    section={{ name: "pickAria", label: "Pick Aria" }}
                    inputs={getInputsWithLevel(inputPickAriaS1, mappingLayout)}
                  />
                  <SectionForm
                    register={register}
                    control={control}
                    section={{ name: "eval", label: "Evaluacion" }}
                    inputs={getInputsWithLevel(inputResultS1, mappingLayout)}
                  />
                </Stack>
              )}
              {tab === 2 && <Box sx={{ p: 2 }}>Contenido Gabinete</Box>}
              {tab === 3 && <Box sx={{ p: 2 }}>Contenido Mantenimiento</Box>}
            </Box>
          ) : <></>}
        </Stack>
        <Button
          variant="text"
          type="submit"
          sx={{ position: "absolute", bottom: "1rem", right: "1rem" }}
        >
          Enviar
        </Button>
      </form>
    </Box>
  );
}

//Pienso que unas de las reglas para contruir la proporcion de las rows. va de la mano de que campo es tonica o importante mas que otro
//Entonces seria identificar cuantas columnas se necesitan y que rol cumple cada una
