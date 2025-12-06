import * as XLSX from "xlsx";
import { useSelector } from "react-redux";

const DownloadExcelButton = () => {
  const dataTableRender = useSelector(state => state.inventory.renderTable);

  const handleDownload = () => {
    if (!dataTableRender || !dataTableRender.length) {
      alert("No hay datos para exportar");
      return;
    }

    // 🔹 Prepara y transforma los datos
    const formattedData = dataTableRender.map(item => {
      const diferencia = (item.teoricStock ?? 0) - (item.stock ?? 0);

      return {
        // Agregá acá sólo las columnas que te interesen
        TMP: Array.isArray(item.partNumber)
          ? item.partNumber.join(" - ")
          : item.partNumber || "",        
        Descripcion: item.description,
        Categoría: item.category,
        Imbalance: diferencia,
        ReWork: item.reWork,
        Costo: item.cost
        // Podés agregar más campos calculados o renombrar columnas
      };
    });

    // 🔹 Convierte a hoja de Excel
    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // 🔹 Crea el libro y agrega la hoja
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

    // 🔹 Genera y descarga el archivo
    XLSX.writeFile(workbook, "inventario_export.xlsx");
  };

  return (
    <button
      onClick={handleDownload}
      style={{
        background: "#28a745",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "8px 16px",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      Descargar Excel
    </button>
  );
};

export default DownloadExcelButton;
