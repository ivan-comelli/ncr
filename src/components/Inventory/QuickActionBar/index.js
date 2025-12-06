import { useDispatch, useSelector } from 'react-redux';
import React, { useState, useEffect } from 'react';
import { InputAdornment, IconButton, TextField } from '@mui/material';
import { Remove } from '@mui/icons-material';
import { Add } from "@mui/icons-material";
import Snackbar from '@mui/material/Snackbar';
import SideButtons from './SideBarButtons';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import DetailsIcon from '@mui/icons-material/DescriptionOutlined';
import TuneIcon from '@mui/icons-material/SquareOutlined';
import SendIcon from '@mui/icons-material/PlayArrowOutlined';
import BtnCsv from './ButtonDownloadCSV';

export const StockBar = ({ submit, minified }) => {
    const partIsolate = useSelector((state) => state.inventory.isolated);
    const [counterStock, setCounterStock] = useState(0);
    const secuenceStatus = ["Confirmado", "Ajuste", "Conflicto"];
    const [indexSecuenceStatus, setIndexSecuenceStatus] = useState(0);

    useEffect(() => {
        setCounterStock(0);
        setIndexSecuenceStatus(0);
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
            
            <BtnCsv></BtnCsv>
            <SideButtons></SideButtons>
           
        </div>
    );
}