import React, { useState, useEffect, useRef } from "react";
import { CompactTable } from '@table-library/react-table-library/compact';
import { useTheme } from '@table-library/react-table-library/theme';
import { DEFAULT_OPTIONS, getTheme } from '@table-library/react-table-library/material-ui';
import { useTree } from "@table-library/react-table-library/tree";
import { IconButton } from '@mui/material';
import IconCheck from '@mui/icons-material/Check';
import IconCancel from '@mui/icons-material/Close';
import { useSelector, useDispatch } from 'react-redux';
import { dispatchDeleteStock } from '../../../redux/actions/async';

const TableHistory = () => {
    const COLUMNS = [
        { label: 'Cantidad', renderCell: (item) => item.stock },
        { label: 'Estado', renderCell: (item) => item.status },

        { label: 'Fecha', renderCell: (item) => new Date(item.lastUpdate?.seconds * 1000).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }) },
        {
            label: 'Borrar', renderCell: (item) => (
                <IconButton
                    variant="contained"
                    onClick={() => dispatch(dispatchDeleteStock(item.id))}
                    xs={{
                        color: '#cd0000'
                      }}
                >
                    <IconCancel />
                </IconButton>
            )
        }
    ]
    const materialTheme = getTheme(DEFAULT_OPTIONS);
    const dispatch = useDispatch();

    const [collectionData, setCollectionData] = useState();

    const theme = useTheme(materialTheme);
    const mainDataTable = useSelector(state => state.inventory.overView.data);

    useEffect(() => {

    }, []);
    useEffect(() => {

        if (Array.isArray(mainDataTable)) {
            setCollectionData(mainDataTable);
        }
    }, [mainDataTable]);
    return (
        <>
            <div className="view-table-history">
                {
                    collectionData?.length > 0 ? <CompactTable columns={COLUMNS} data={ {nodes: collectionData} } keyExtractor={(node) => node.id} theme={theme} layout={{ fixedHeader: true }} /> :
                    <span>No Hay Operaciones Temporales</span>
                }
            </div>
        </>
    );
};

export default TableHistory;
