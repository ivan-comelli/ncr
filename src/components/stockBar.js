import { useDispatch, useSelector } from 'react-redux';
import React, { useState, useEffect } from 'react';
import { InputAdornment, IconButton, TextField } from '@mui/material';
import { Remove } from '@mui/icons-material';
import { Add } from "@mui/icons-material";
import StockUp from '@mui/icons-material/MoveToInbox';
import StockDown from '@mui/icons-material/Outbox';
import DetailsIcon from '@mui/icons-material/Description';
import { counter } from '@fortawesome/fontawesome-svg-core';


export const StockBar = ({ toggleActiveDetail, submit }) => {
    const partIsolate = useSelector((state) => state.inventory.isolated);
    const [counterStock, setCounterStock] = useState(0);

    useEffect(() => {
        setCounterStock(0);
        submit(null);
    }, [partIsolate])

    const iconButtonStyle = {
        backgroundColor: '#fefefe', 
        borderRadius: '1rem',              
        padding: '12px',                 
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
            onClick={(e) => {
                e.stopPropagation();
                submit({quantity: counterStock, type: 'UP'})
            }}
            >
            <StockUp />
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
            <StockDown />
            </IconButton>
        </div>
    );
}