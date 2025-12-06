import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Chip,
  Stack,
  Typography,
  Paper,
  Divider,
} from "@mui/material";

function FilterChipsBar() {
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
        {/* Chips de prioridad y rework */}
        <Chip
          label={`Prioridad: ${displayPriority[priorityChip]}`}
          onClick={() => handleCycle("priority")}
          variant="outlined"
          sx={chipStyle}
        />
        <Chip
          label={displayRework[reworkChip]}
          onClick={() => handleCycle("rework")}
          variant="outlined"
          sx={chipStyle}
        />

        {/* Chips activos */}
        {filters.map((filter) =>
          Array.isArray(filter.label)
            ? filter.label.map((val, i) => (
                <Chip
                  key={`${filter.category}-${val}-${i}`}
                  label={val}
                  onDelete={() => handleDeleteFilter(filter.category, val)}
                  variant="outlined"
                  sx={chipStyle}
                />
              ))
            : filter.label && (
                <Chip
                  key={filter.category}
                  label={filter.label}
                  onDelete={() => handleDeleteFilter(filter.category, filter.label)}
                  variant="outlined"
                  sx={chipStyle}
                />
              )
        )}

        {/* Botón abrir/cerrar panel */}
        <Chip
          label={!showPanel ? "Nuevo filtro" : "Cerrar"}
          onClick={() => setShowPanel((prev) => !prev)}
          sx={{
            ...chipStyle,
            background: showPanel ? "#efefef" : "#fff",
            cursor: "pointer",
            borderColor: "#ccc",
          }}
        />
      </Stack>
    );
}

export default FilterChipsBar;