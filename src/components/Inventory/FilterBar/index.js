import { useState } from "react";
import { Chip, Stack } from "@mui/material";

const FilterChips = () => {
  const [priority, setPriority] = useState(null); // null | 'low' | 'mid' | 'high'
  const [rework, setRework] = useState(null); // null | true | false

  const handleCyclePriority = () => {
    const order = [null, "low", "mid", "high"];
    const next = order[(order.indexOf(priority) + 1) % order.length];
    setPriority(next);
  };

  const handleCycleRework = () => {
    const order = [null, false, true];
    const next = order[(order.indexOf(rework) + 1) % order.length];
    setRework(next);
  };

  // etiquetas para mostrar en los chips
  const displayPriority = {
    low: "Baja",
    mid: "Media",
    high: "Alta",
    null: "Sin prioridad",
  };

  const displayRework = {
    true: "Rework: Sí",
    false: "Rework: No",
    null: "Rework: -",
  };

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {/* Chips fijos */}
      <Chip
        label={`Prioridad: ${displayPriority[priority]}`}
        onClick={handleCyclePriority}
        variant="outlined"
        sx={{
          cursor: "pointer",
          userSelect: "none",
        }}
      />
      <Chip
        label={displayRework[rework]}
        onClick={handleCycleRework}
        variant="outlined"
        sx={{
          cursor: "pointer",
          userSelect: "none",
        }}
      />

    </Stack>
  );
};

export default FilterChips;
