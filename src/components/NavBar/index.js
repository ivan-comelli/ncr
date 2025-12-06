import { useState, useEffect } from 'react';
import { TextField, InputAdornment, IconButton, Button, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./style.css";
import logo from '../../ncr-logo.png';
import logoMinified from '../../ncr-logo-minified.png';
import { lazySearch } from '../../redux/actions/async';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from "react-router-dom";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
function NavBar({ minified }) {
  const [search, setSearch] = useState('');
  const dispatch = useDispatch();
  const searchGlobal = useSelector(state => state.inventory.search);
  
  useEffect(() => {
    setSearch(searchGlobal);
  }, [searchGlobal]);

  const handleSearch = (event) => {
    setSearch(event.target.value)
    dispatch(lazySearch(event.target.value));
  };

  const handleIconClick = () => {
      setSearch(""); // Borra el texto si la barra está abierta y tiene contenido
      dispatch(lazySearch(""));
  };

  return (
    <header className="App-header .glass-card">
      <img
        src={minified ? logoMinified : logo}
        className="App-logo"
        alt="Logo"
      />

      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
        }}
      >
        <Button
          component={Link}
          to="/"
          variant="text"
          sx={{ fontWeight: 500 }}
        >
          Inicio
        </Button>

        <Button
          component={Link}
          to="/log"
          variant="text"
          sx={{ fontWeight: 500 }}
        >
          Bitacora
        </Button>
      </Box>
      
      <TextField
        className="search"
        variant="outlined"
        size="small"
        placeholder="Buscar..."
        value={search}
        onChange={handleSearch}
        sx={{
          width: "200px",
          transition: "width 0.3s ease",
          "& .MuiOutlinedInput-root": {
            borderRadius: "1rem",
            paddingLeft: "0.3rem",
          },
          "& .MuiOutlinedInput-input": {
            paddingLeft: "0.3rem",
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleIconClick} edge="start">
                <CloseIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </header>
  );
}

export default NavBar;
