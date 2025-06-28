
import React, { useEffect, useState } from 'react';

import UploadFiles from "../UploadFilesForSync";
import { ClipLoader } from 'react-spinners';

import { useSelector, useDispatch } from 'react-redux';
import { dispatchBulkInventory } from '../../redux/actions/async';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Typography,
} from '@mui/material';

import {
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

function CheckerModal({ show, resolveModal, rejectModal }) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState({ name: null, csr: null }); 
  const options = [{ name: "Diego Molina", csr: "AR103S42"}, { name: "Nahuel DeLuca", csr: "AR103S44"}, { name: "Adrian Santarelli", csr: "AR103S45"}, { name: "Juan Valenzuela", csr: "AR103S46"},  { name: "Ivan Comelli", csr: "AR903S48"}];
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState();
  const [previewDetail, setPreviewDetail] = useState();
  const [attemp, setAttemp] = useState(0);
  const steps = ['Subi un Archivo', 'Confirmacion', 'Importando'];
  const [promiseCSR, setPromiseCSR] = useState({resolve: null, reject: null});
  const [uploadData, setUploadData] = useState();
  const [flagSubmit, setFlagSubmit] = useState(false);
  
  const dispatch = useDispatch();

  useEffect(() => {
    if(uploadData && !flagSubmit) {
      setFlagSubmit(true);
      dispatch(dispatchBulkInventory(uploadData, true));

        setFlagSubmit(false);
        setUploadData(false);
        setActiveStep(0);
        resolveModal("Se Completo Exitosamente");

    } 
  }, [uploadData, activeStep]);
  const presetSelectedPerson = (possibleOption) => {
    const normalizeString = (str) => {
      return str
        .toLowerCase() // Convertir a minúsculas
        .normalize("NFD") // Descomponer caracteres con acento
        .replace(/[\u0300-\u036f]/g, ""); // Eliminar marcas de acento
      }
      const isEqualNames = (option) => {
        const normalizedName1 = normalizeString(possibleOption).split(" ").sort().join(" ");
        const normalizedName2 = normalizeString(option).split(" ").sort().join(" ");
        return normalizedName1 === normalizedName2;
      }
      const optionCoincide = options.find(option => isEqualNames(option.name));
      setSelectedPerson((prev) => optionCoincide ? optionCoincide : prev);
  }

  const queryCSR = async () => {
    handleNext();
    let csr = null;
    try {
      const result = await new Promise((resolve, reject) => {
        setPromiseCSR({resolve, reject});
      });
      csr = result;
    } catch(error) {
      throw new Error(error.message);
    }
    return csr;
  }

  const resetState = () => {
    setPromiseCSR({resolve: null, reject: null});
    setSelectedPerson({ name: null, csr: null });
    setAttemp(attemp + 1);
  }

  const handleNext = () => {
    switch (activeStep) {
      case 1:
        setPromiseCSR(promiseCSR.resolve(selectedPerson));
      break;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleCancel = () => {
    switch (activeStep) {
      case 0:
        rejectModal("Salio del Modal");
      break;
      case 1:
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
        resetState();
      break;
      case 2:
        setActiveStep(0);
        resetState();
      break;
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
      return;
      case 1:
        return <>
          <Typography variant="body1" sx={{ mt: 2 }}>
            ¿A qué técnico se agrega?
          </Typography>
          <div>{ previewDetail }</div>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="select-person-label">Seleccionar Persona</InputLabel>
            <Select
              labelId="select-person-label"
              value={selectedPerson.csr}
              onChange={(e) => {
                const selected = options.find(option => option.csr === e.target.value);
                setSelectedPerson(selected);
              }}
              label="Seleccionar Persona"
            >
              {options.map((option, index) => (
                <MenuItem key={index} value={option.csr}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </>;
      case 2:
          return <div className='content'>
            {loading ? (
              <ClipLoader size={50} color={"#54b948"} loading={loading} />
            ) : (
              <div>Contenido cargado</div>
            )}
          </div>
      default:
        return 'Paso desconocido.';
    }
  };

  return (
    <div>
      <Dialog open={show} maxWidth="sm" fullWidth>
        <DialogTitle>Realizar una tarea</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Typography variant="body1" sx={{ mt: 2 }}>
            <div className={ activeStep > 0 && "hide" } >
              <UploadFiles key={attemp} submit={setUploadData} askCSR={queryCSR} previewFile={setPreviewFile} previewDetail={setPreviewDetail} possibleName={presetSelectedPerson}></UploadFiles>
            </div>
            {getStepContent(activeStep)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button  style={{ display: activeStep == 3 && 'none'}} onClick={handleCancel}>
            { activeStep == 0 ? 'Salir' : 'Cancelar' }
          </Button>
          <Button  style={{ display: activeStep != 1 && 'none'}} disabled={activeStep == 1 && !selectedPerson} onClick={handleNext}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default CheckerModal;