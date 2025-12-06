import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Chip,
  Stack,
  Typography,
  Paper,
  Divider,
} from "@mui/material";

import {
  filterReWork,
  filterPriority,
  filterCategory,
  filterStatus,
} from "../../../redux/actions/sync";

const FilterSelector = () => {
  const dispatch = useDispatch();

  // --- Redux state ---
  const { priority, reWork, status, category } = useSelector(
    (state) => state.inventory.filters
  );

  // --- Local state ---
  const [filters, setFilters] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  // --- Chip states ---
  const [priorityChip, setPriorityChip] = useState(null); // 'low' | 'mid' | 'high' | null
  const [reworkChip, setReworkChip] = useState(null); // true | false | null

  // --- Configs ---
  const availableFilters = useMemo(
    () => ({
      status: ["Non Audit", "Audit", "Imbalance", "Cost +5"],
      category: [
        "S1",
        "S2",
        "BNA3",
        "SCPM",
        "SRU",
        "GBRU",
        "BRM",
        "CPU",
        "OTROS",
        "LECTORAS",
        "SOBRES",
        "PRINTERS",
      ],
    }),
    []
  );

  const displayPriority = {
    low: "Baja",
    mid: "Media",
    high: "Alta",
    null: "Sin",
  };

  const displayRework = {
    true: "Rework: Sí",
    false: "Rework: No",
    null: "Rework: -",
  };

  const chipStyle = {
    borderRadius: "8px",
    fontSize: "0.85rem",
    px: 0.5,
    background: "#fafafa",
    borderColor: "#ddd",
  };

  // --- Ciclar chips ---
  const handleCycle = (type) => {
    if (type === "priority") {
      const order = [null, "low", "mid", "high"];
      const next = order[(order.indexOf(priorityChip) + 1) % order.length];
      setPriorityChip(next);
      dispatch(filterPriority(next));
    } else if (type === "rework") {
      const order = [null, false, true];
      const next = order[(order.indexOf(reworkChip) + 1) % order.length];
      setReworkChip(next);
      dispatch(filterReWork(next));
    }
  };

  // --- Sincronizar con Redux ---
  useEffect(() => {
    const data = [
      { category: "status", label: Array.isArray(status.key) ? status.key : [status.key] },
      { category: "category", label: Array.isArray(category.key) ? category.key : [category.key] },
      { category: "priority", label: priority.key },
      { category: "reWork", label: reWork.key },
    ];
    setFilters(data.filter((f) => f.label && f.label.length));
  }, [status.key, category.key, priority.key, reWork.key]);

  // --- Handlers ---
  const handleAddFilter = (filter, type) => {
    const found = filters.find((f) => f.category === type);
    let data = found ? [...new Set([...found.label, filter])] : [filter];

    if (type === "status") dispatch(filterStatus(data));
    else if (type === "category") dispatch(filterCategory(data));
  };

  const handleDeleteFilter = (category, value) => {
    const found = filters.find((f) => f.category === category);
    if (!found) return;

    if (category === "priority") return dispatch(filterPriority(null));
    if (category === "reWork") return dispatch(filterReWork(null));

    const updated = found.label.filter((l) => l !== value);
    category === "status"
      ? dispatch(filterStatus(updated))
      : dispatch(filterCategory(updated));
  };

  // --- Render ---
  return (
    <Box sx={{ width: "100%", color: "#222" }}>
      {/* Panel de filtros */}
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
      {showPanel && (
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            p: 2,
            background: "#fff",
          }}
        >
          {Object.entries(availableFilters).map(([key, list]) => (
            <Box key={key} sx={{ mb: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: "#555", fontWeight: 500 }}
              >
                {key === "status" ? "Estados" : "Categorías"}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {list.map((filter, i) => (
                  <Chip
                    key={i}
                    label={filter}
                    variant="outlined"
                    onClick={() => handleAddFilter(filter, key)}
                    sx={{
                      ...chipStyle,
                      transition: "0.2s ease",
                      "&:hover": { background: "#f0f0f0" },
                    }}
                  />
                ))}
              </Stack>
              {key === "status" && <Divider sx={{ my: 2 }} />}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default FilterSelector;
