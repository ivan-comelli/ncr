import { useState, useEffect } from 'react';
import TableInventory from './components/Inventory/MainDataTable';
import OverviewItem from './components/Inventory/Overview';
import './App.css';
import { IconButton } from '@mui/material';
import { LinearProgress } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllInventory } from './redux/actions/async';
import { closeOverview } from './redux/actions/sync';

import UpIcon from '@mui/icons-material/KeyboardArrowUp';
import DownIcon from '@mui/icons-material/KeyboardArrowDown';
import SideIcon from '@mui/icons-material/KeyboardArrowLeft';
import AllIcon from '@mui/icons-material/HorizontalRule';
import BackIcon from '@mui/icons-material/ArrowBack';

import UtilityModal from './components/Inventory/UtilityModal';
import { StockBar } from './components/Inventory/QuickActionBar';
import CheckerMovement from './components/Inventory/CheckerMovement';
import Navbar from './components/NavBar';
import FilterBar from './components/Inventory/FilterBar';

const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowDimensions;
};

function App() {

  const ITEM_HEIGHT = 48;
  const ITEM_PADDING_TOP = 8;
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
      },
    },
  };

  const [showModal, setShowModal] = useState(false);
  const { width, height } = useWindowDimensions();
  const loaderDispatch = useSelector((state) => state.inventory.stepLoading);
  const activeDetail = useSelector((state) => state.inventory.overView.active);
  const [minified, setMinified] = useState(false);
  const [petitionSubmit, setPetitionSubmit] = useState();
  
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchAllInventory());
  }, []);

  useEffect(() => {
    setMinified(width < 768 ? true : false);
    let newToShow = Math.floor(width * 12) / 1920;
  }, [width, activeDetail]);
  
  
  return (
    <div className={`App ${activeDetail ? '' : 'without-aditional'} ${minified ? 'minified' : ''}`}>
      <Navbar minified={minified}></Navbar>
      <>
        <StockBar submit={ setPetitionSubmit } minified={minified} />
        <div className={`container ${minified ? 'full' : ''}`}>
          {
            loaderDispatch ? ( <LinearProgress variant="determinate" value={loaderDispatch} />):(<div className='emty-bar'></div>)
          } 
          <FilterBar minified={minified} activeDetail={activeDetail} setShowModal={setShowModal}></FilterBar>
          <TableInventory minified={minified} />
        </div>
        <div className='aditional'>
          <IconButton variant="contained" color="primary" className="middle-back" onClick={() => dispatch(closeOverview())}><BackIcon></BackIcon></IconButton>
          <OverviewItem/>
        </div>
        
      </>
      <CheckerMovement petition={ petitionSubmit }/>
      <UtilityModal show={showModal} />
    </div>
  );
}

export default App;
