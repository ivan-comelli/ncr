import TYPES from '../../types';
export * from './dispatch';
export * from './filters';
export * from './setters';
export * from './fetch';

export const isolatePartInTable = (value) => ({
    type: TYPES.ISOLATE_PART_IN_TABLE,
    dataItem: value
});

export const setStepLoader = (value) => ({
    type: TYPES.STEP_LOADER,
    step: value
});

export const openOverview = () => ({
    type: TYPES.OPEN_OVERVIEW
})

export const closeOverview = () => ({
    type: TYPES.CLOSE_OVERVIEW
})
