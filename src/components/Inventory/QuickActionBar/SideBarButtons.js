import React, { useState } from "react";
import { IconButton, Box } from "@mui/material";
import ToolsIcon from "@mui/icons-material/Handyman";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SettingsIcon from "@mui/icons-material/Settings";
import { motion, AnimatePresence } from "framer-motion";

const buttonsConfig = [
  { id: 1, icon: <ToolsIcon />, label: "Herramientas" },
  { id: 2, icon: <InventoryIcon />, label: "Inventario" },
  { id: 3, icon: <LocalShippingIcon />, label: "Logística" },
  { id: 4, icon: <SettingsIcon />, label: "Ajustes" },
];

export default function SidebarButtons() {
  const [focused, setFocused] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        p: 2,
      }}
    >
      {/* Simula tener o no foco */}
      <Box
        onClick={() => setFocused((prev) => !prev)}
        sx={{
          cursor: "pointer",
          color: focused ? "primary.main" : "text.secondary",
          mb: 2,
          userSelect: "none",
        }}
      >
        {focused ? "Perder foco" : "Dar foco"}
      </Box>

      {buttonsConfig.map((btn) => (
        <motion.div
          key={btn.id}
          initial={{ scale: 0.8, opacity: 0.3 }}
          animate={{
            scale: focused ? 1 : 0.8,
            opacity: focused ? 1 : 0.3,
            backgroundColor: focused
              ? "rgba(25,118,210,0.1)"
              : "rgba(0,0,0,0.05)",
          }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={{
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
          }}
        >
          <AnimatePresence>
            {focused && (
              <motion.div
                key={btn.label}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <IconButton
                  color="primary"
                  size="large"
                  sx={{
                    width: 48,
                    height: 48,
                    transition: "transform 0.2s",
                    "&:hover": { transform: "scale(1.1)" },
                  }}
                >
                  {btn.icon}
                </IconButton>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </Box>
  );
}
