import { Types } from "@table-library/react-table-library"

import TYPES from '../../types'

export const filterReWork = (value) => ({
    type: TYPES.FILTER_REWORK,
    key: value 
})

export const filterPriority = (value) => ({
    type: TYPES.FILTER_PRIORITY,
    key: value
})

export const filterCategory = (value) => ({
    type: TYPES.FILTER_CATEGORY,
    key: value 
})

export const filterStatus = (value) => ({
    type: TYPES.FILTER_STATUS,
    key: value
})

export const searchInDataTable = (value) => ({
    type: TYPES.SEARCH_IN_TABLE,
    search: value
});