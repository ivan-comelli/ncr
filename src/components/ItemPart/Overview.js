import React, { useState, useEffect, useRef } from "react";
import { CompactTable } from '@table-library/react-table-library/compact';
import { useTheme } from '@table-library/react-table-library/theme';
import { DEFAULT_OPTIONS, getTheme } from '@table-library/react-table-library/material-ui';
import { useTree } from "@table-library/react-table-library/tree";
import { IconButton } from '@mui/material';
import IconCheck from '@mui/icons-material/Check';
import IconCancel from '@mui/icons-material/Close';

import { useSelector, useDispatch } from 'react-redux';
const TableHistory = () => {
    const COLUMNS = [
        { label: 'Dueño', renderCell: (item) => item.name },
        { label: 'Cantidad', renderCell: (item) => item.stock },
        { label: 'Estado', renderCell: (item) => item.status },

        { label: 'Fecha', renderCell: (item) => new Date(item.lastUpdate?.seconds * 1000).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }) },
        {
            label: 'Confirmar', renderCell: (item) => (
                <IconButton
                    variant="contained"
                    color="primary"
                    onClick={() => {}}
                >
                    <IconCheck />
                </IconButton>
            )
        },
        {
            label: 'Cancelar', renderCell: (item) => (
                <IconButton
                    variant="contained"
                    onClick={() => {}}
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
    const mainDataTable = useSelector(state => state.inventory.detail);

    useEffect(() => {

    }, []);
    useEffect(() => {
        if (Array.isArray(mainDataTable?.data)) {
            const data = mainDataTable.data.filter((item) => item.status !== "SYNC");
            setCollectionData(data);
        }
    }, [mainDataTable?.data]);
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
