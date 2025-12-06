import { useState, useEffect } from 'react';
import TableInventory from '../components/Inventory/MainDataTable';
import OverviewItem from '../components/Inventory/Overview';
import { IconButton } from '@mui/material';
import { LinearProgress } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllInventory } from '../redux/actions/async';
import { closeOverview } from '../redux/actions/sync';

import FilterSelector from '../components/Inventory/Filters/FilterSelector';

import UtilityModal from '../components/Inventory/UtilityModal';
import { StockBar } from '../components/Inventory/QuickActionBar';
import CheckerMovement from '../components/Inventory/CheckerMovement';
import BackIcon from '@mui/icons-material/ArrowBack';

const InventoryPage = ({minified}) => {
    const dispatch = useDispatch();

    useEffect(() => {
      dispatch(fetchAllInventory());
    }, []);
      const [showModal, setShowModal] = useState(false);
    const loaderDispatch = useSelector((state) => state.inventory.stepLoading);
    const activeDetail = useSelector((state) => state.inventory.overView.active);
    const [petitionSubmit, setPetitionSubmit] = useState();
    return (
        <>
            <>
                <StockBar submit={ setPetitionSubmit } minified={minified} />
                <div className={`container ${minified ? 'full' : ''}`}>
                {
                    loaderDispatch ? ( <LinearProgress variant="determinate" value={loaderDispatch} />):(<div className='emty-bar'></div>)
                } 
                <FilterSelector minified={minified} activeDetail={activeDetail} setShowModal={setShowModal}></FilterSelector>
                <TableInventory minified={minified} />
                </div>
                { (!minified && activeDetail) ?
                (<div className='aside'>
                <IconButton variant="contained" color="primary" className="middle-back" onClick={() => dispatch(closeOverview())}><BackIcon></BackIcon></IconButton>
                <OverviewItem/>
                </div>) : <></>
                }
                
            </>
            <CheckerMovement petition={ petitionSubmit }/>
            <UtilityModal show={showModal} />
        </>
    )
}   
   
export default InventoryPage;