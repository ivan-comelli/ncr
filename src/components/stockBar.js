import { useDispatch, useSelector } from 'react-redux';
import React, { useState, useEffect } from 'react';
import { InputAdornment, IconButton, TextField } from '@mui/material';
import { Remove } from '@mui/icons-material';
import { Add } from "@mui/icons-material";
import Snackbar from '@mui/material/Snackbar';


import DetailsIcon from '@mui/icons-material/DescriptionOutlined';
import TuneIcon from '@mui/icons-material/SquareOutlined';
import SendIcon from '@mui/icons-material/PlayArrowOutlined';


export const StockBar = ({ toggleActiveDetail, submit }) => {
    const partIsolate = useSelector((state) => state.inventory.isolated);
    const [counterStock, setCounterStock] = useState(0);
    const secuenceStatus = ["Pendiente", "Ajuste", "Conflicto"];
    const [indexSecuenceStatus, setIndexSecuenceStatus] = useState(0);

    useEffect(() => {
        setCounterStock(0);
        submit(null);
    }, [partIsolate])

    const iconButtonStyle = {
        backgroundColor: '#fefefe', 
        borderRadius: '1rem',              
        padding: '12px',                 
    };
    const [open, setOpen] = useState(false);

    const handleClose = (_, reason) => {
      if (reason === "clickaway") return;
      setOpen(false);
    };
    return (
        <div className='stock-bar'>
            <IconButton
            sx={iconButtonStyle}
            onClick={(e) => {
                e.stopPropagation();
                toggleActiveDetail();
            }}
            >
            <DetailsIcon />
            </IconButton>
            <IconButton
                disabled={ partIsolate ? false : true }
                sx={iconButtonStyle}
                className={secuenceStatus[indexSecuenceStatus]}
                onClick={(e) => {
                    e.stopPropagation();
                    setIndexSecuenceStatus(prev => (prev + 1) % secuenceStatus.length);
                    setOpen(true);
                }}
            >
            <TuneIcon fontSize='small'/>
            </IconButton>
            <TextField
            disabled={ partIsolate ? false : true }
            className='stock'
            fullWidth
            margin="none"
            variant='standard'
            value={counterStock}
            InputProps={{
                disableUnderline: true,
                endAdornment: (
                <InputAdornment position="start">
                    <IconButton
                    disabled={ partIsolate ? false : true }
                    onClick={(e) => {
                        e.stopPropagation();
                        setCounterStock((prev) => prev > 0 ? (prev - 1) : 0);
                    }}
                    >
                    <Remove />
                    </IconButton>
                </InputAdornment>
                ),
                startAdornment: (
                <InputAdornment position="end">
                    <IconButton
                    disabled={ partIsolate ? false : true }
                    onClick={(e) => {
                        e.stopPropagation(); 
                        setCounterStock((prev) => prev + 1);
                    }}
                    >
                    <Add />
                    </IconButton>
                </InputAdornment>
                ),
            }}
            />
            <IconButton
            disabled={ partIsolate ? false : true }
            sx={iconButtonStyle}          
            onClick={(e) => {
                e.stopPropagation();
                submit({quantity: counterStock, type: 'DOWN'})
            }}
            >
            <SendIcon />
            </IconButton>
            <Snackbar
               
                open={open}
                autoHideDuration={1000} // Cierra después de 3 segundos
                onClose={handleClose}
                message={`Estado de operacion ${secuenceStatus[indexSecuenceStatus]}`}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            />
        </div>
    );
}