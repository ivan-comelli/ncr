import { Types } from "@table-library/react-table-library"

import TYPES from '../../types'

export const filterForRework = (value) => ({
    type: Types.FILTER_REWORK,
    status: value 
})

export const filterForPriority = () => ({
    
})

export const filterForCategory = () => ({
    
})

export const filterForStatus = () => ({
    
})

export const searchInDataTable = (value) => ({
    type: TYPES.SEARCH_IN_TABLE,
    search: value
});