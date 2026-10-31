import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

// Declare global types for CDN libraries
declare const JsBarcode: any;
declare const XLSX: any;

interface PriceItem {
  id: string;
  name: string;
  price: number;
  sku: string;
  quantity: number;
  ribbon: "" | "OFERTA" | "NUEVO";
}

interface LabelPreset {
  name: string;
  width: number;
  height: number;
}

const LABEL_PRESETS: LabelPreset[] = [
  { name: "40x20mm", width: 40, height: 20 },
  { name: "50x30mm", width: 50, height: 30 },
  { name: "66x34mm", width: 66, height: 34 },
  { name: "80x40mm", width: 80, height: 40 },
];

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 5;

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function formatPrice(price: number): { integer: string; decimal: string } {
  const parts = price.toFixed(2).split(".");
  return { integer: parts[0], decimal: parts[1] };
}

// Price Tag Component
// Diseño: tarjeta verde con franja blanca diagonal, insignia azul inclinada,
// cinta triangular en la esquina, esquina azul inferior y precio rojo.
// Todas las medidas se escalan con el ancho de la etiqueta (base 80mm).
const PriceTag: React.FC<{
  item: PriceItem;
  labelWidth: number;
  labelHeight: number;
  showName: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  showStoreBadge: boolean;
  storeName: string;
  showRibbon: boolean;
  nameFontSize: number;
  priceFontSize: number;
  barcodeHeight: number;
  tagId?: string;
}> = ({
  item,
  labelWidth,
  labelHeight,
  showName,
  showPrice,
  showBarcode,
  showStoreBadge,
  storeName,
  showRibbon,
  nameFontSize,
  priceFontSize,
  barcodeHeight,
  tagId,
}) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const { integer, decimal } = formatPrice(item.price);

  const widthPx = Math.round(labelWidth * 3.7795);
  const heightPx = Math.round(labelHeight * 3.7795);
  // Factor de escala respecto a la etiqueta base de 80mm de ancho
  const s = labelWidth / 80;
  // Tamaño en px de la tarjeta (descontando el margen de corte)
  const gutter = 5 * s;
  const cardW = widthPx - gutter * 2;
  const cardH = heightPx - gutter * 2;
  const ribbonSize = Math.min(cardW * 0.27, cardH * 0.55);
  const barcodeW = cardW * 0.33;
  const barcodeH = barcodeHeight * s;

  // Altura disponible para el nombre (hasta donde empieza el código de barras)
  const nameTop = showStoreBadge ? cardH * 0.25 : cardH * 0.1;
  const hasBarcode = showBarcode && !!item.sku;
  const nameBottomLimit = hasBarcode
    ? cardH * (1 - 0.06) - barcodeH - 11 * s - cardH * 0.03
    : cardH * 0.94;
  const nameMaxH = Math.max(10, nameBottomLimit - nameTop);

  // Re-calcular el auto-ajuste cuando la tipografía termine de cargar
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    let alive = true;
    (document as any).fonts?.ready?.then(() => alive && setFontTick((n) => n + 1));
    return () => {
      alive = false;
    };
  }, []);

  // Auto-ajuste: reduce la fuente del nombre hasta que quepa sin tapar el código de barras
  useLayoutEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    let size = nameFontSize * s;
    el.style.fontSize = `${size}px`;
    const minSize = 7 * s;
    while (
      size > minSize &&
      (el.scrollHeight > nameMaxH + 0.5 || el.scrollWidth > el.clientWidth + 0.5)
    ) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
  }, [item.name, nameFontSize, s, nameMaxH, cardW, showName, fontTick]);

  useEffect(() => {
    if (showBarcode && barcodeRef.current && item.sku) {
      try {
        JsBarcode(barcodeRef.current, item.sku, {
          format: "CODE128",
          width: 1,
          height: 40,
          displayValue: false,
          margin: 0,
          background: "transparent",
        });
        // Ajustar el SVG al ancho/alto deseado manteniendo las barras nítidas
        const svg = barcodeRef.current;
        const w = svg.getAttribute("width");
        const h = svg.getAttribute("height");
        if (w && h && !svg.getAttribute("viewBox")) {
          svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
        }
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("width", String(barcodeW));
        svg.setAttribute("height", String(barcodeH));
        svg.style.width = `${barcodeW}px`;
        svg.style.height = `${barcodeH}px`;
      } catch (e) {
        // fallback if barcode generation fails
      }
    }
  }, [item.sku, showBarcode, barcodeW, barcodeH, tagId]);

  return (
    <div
      className="price-tag"
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        padding: `${gutter}px`,
      }}
    >
      <div className="tag-card" style={{ borderRadius: `${16 * s}px` }}>
        {/* Franja blanca diagonal */}
        <div className="tag-white" />

        {/* Esquina azul inferior derecha */}
        <div
          className="navy-corner"
          style={{ width: `${cardW * 0.17}px`, height: `${cardH * 0.28}px` }}
        />

        {/* Insignia de tienda - arriba a la izquierda */}
        {showStoreBadge && (
          <div
            className="store-badge"
            style={{
              fontSize: `${9.5 * s}px`,
              height: `${cardH * 0.19}px`,
              paddingLeft: `${cardW * 0.045}px`,
              paddingRight: `${cardW * 0.075}px`,
              borderTopLeftRadius: `${16 * s}px`,
              borderBottomRightRadius: `${6 * s}px`,
            }}
          >
            {storeName}
          </div>
        )}

        {/* Cinta triangular - esquina superior derecha */}
        {showRibbon && item.ribbon && (
          <div
            className={`corner-ribbon ${item.ribbon.toLowerCase()}`}
            style={{ width: `${ribbonSize}px`, height: `${ribbonSize}px` }}
          >
            <span style={{ fontSize: `${8.5 * s}px` }}>{item.ribbon}</span>
          </div>
        )}

        {/* Nombre del producto */}
        {showName && (
          <div
            ref={nameRef}
            className="product-name"
            style={{
              top: `${nameTop}px`,
              left: `${cardW * 0.075}px`,
              width: `${cardW * 0.7}px`,
              fontSize: `${nameFontSize * s}px`,
            }}
          >
            {item.name}
          </div>
        )}

        {/* Código de barras y SKU - abajo a la izquierda */}
        {showBarcode && item.sku && (
          <div
            className="barcode-section"
            style={{ left: `${cardW * 0.075}px`, bottom: `${cardH * 0.06}px` }}
          >
            <svg ref={barcodeRef}></svg>
            <div className="sku-text" style={{ fontSize: `${6.5 * s}px` }}>
              SKU {item.sku}
            </div>
          </div>
        )}

        {/* Precio - abajo a la derecha */}
        {showPrice && (
          <div
            className="price-badge"
            style={{ right: `${cardW * 0.075}px`, bottom: `${cardH * 0.04}px` }}
          >
            <span
              className="price-currency"
              style={{ fontSize: `${priceFontSize * 0.42 * s}px` }}
            >
              S/.
            </span>
            <span
              className="price-integer"
              style={{ fontSize: `${priceFontSize * s}px` }}
            >
              {integer}
            </span>
            <span
              className="price-decimal"
              style={{ fontSize: `${priceFontSize * 0.5 * s}px` }}
            >
              .{decimal}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  // Items state
  const [items, setItems] = useState<PriceItem[]>([
    { id: generateId(), name: "LAVAVAJILLA LÍQUIDO", price: 19.90, sku: "0342062", quantity: 2, ribbon: "OFERTA" },
    { id: generateId(), name: "EDREDÓN 2 PLZ.", price: 59.90, sku: "0342001", quantity: 2, ribbon: "NUEVO" },
    { id: generateId(), name: "TALADRO PERCUTOR", price: 49.90, sku: "0342993", quantity: 2, ribbon: "OFERTA" },
    { id: generateId(), name: "JUGUETE CARRO POLICIA", price: 49.90, sku: "0342953", quantity: 2, ribbon: "NUEVO" },
  ]);

  // Visibility toggles
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showStoreBadge, setShowStoreBadge] = useState(true);
  const [showRibbon, setShowRibbon] = useState(true);

  // Store name
  const [storeName, setStoreName] = useState("IMPORTACIONES");

  // Font sizes
  const [nameFontSize, setNameFontSize] = useState(25);
  const [priceFontSize, setPriceFontSize] = useState(46);
  const [barcodeHeight, setBarcodeHeight] = useState(28);

  // Label dimensions
  const [labelWidth, setLabelWidth] = useState(80);
  const [labelHeight, setLabelHeight] = useState(40);

  // Custom dimensions
  const [customWidth, setCustomWidth] = useState(80);
  const [customHeight, setCustomHeight] = useState(40);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate total labels and pages
  const totalLabels = items.reduce((sum, item) => sum + item.quantity, 0);
  const usableWidth = A4_WIDTH_MM - PAGE_PADDING_MM * 2;
  const usableHeight = A4_HEIGHT_MM - PAGE_PADDING_MM * 2;
  const colsPerPage = Math.floor(usableWidth / labelWidth);
  const rowsPerPage = Math.floor(usableHeight / labelHeight);
  const labelsPerPage = colsPerPage * rowsPerPage;
  const totalPages = Math.ceil(totalLabels / labelsPerPage);

  // Generate expanded label list (based on quantity)
  const expandedLabels: PriceItem[] = [];
  items.forEach((item) => {
    for (let i = 0; i < item.quantity; i++) {
      expandedLabels.push(item);
    }
  });

  // Group labels into pages
  const pages: PriceItem[][] = [];
  for (let i = 0; i < expandedLabels.length; i += labelsPerPage) {
    pages.push(expandedLabels.slice(i, i + labelsPerPage));
  }

  // Excel import handler
  const handleExcelImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Skip header row if present
        const startRow = jsonData.length > 1 && typeof jsonData[0][0] === "string" && 
          jsonData[0][0].toLowerCase().includes("nombre") ? 1 : 0;

        const newItems: PriceItem[] = [];
        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const name = String(row[0] || "").trim();
          const price = parseFloat(String(row[1] || "0")) || 0;
          const sku = String(row[2] || "").trim();
          const quantity = parseInt(String(row[3] || "1")) || 1;
          const ribbonRaw = String(row[4] || "").trim().toUpperCase();
          const ribbon = (ribbonRaw === "OFERTA" || ribbonRaw === "NUEVO") ? ribbonRaw : "";

          if (name) {
            newItems.push({
              id: generateId(),
              name,
              price,
              sku,
              quantity,
              ribbon: ribbon as "" | "OFERTA" | "NUEVO",
            });
          }
        }

        if (newItems.length > 0) {
          setItems(newItems);
          alert(`✅ Se importaron ${newItems.length} productos exitosamente.`);
        } else {
          alert("⚠️ No se encontraron productos válidos en el archivo.");
        }
      } catch (err) {
        alert("❌ Error al leer el archivo. Verifique el formato.");
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Item management
  const updateItem = (id: string, field: keyof PriceItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: generateId(), name: "", price: 0, sku: "", quantity: 1, ribbon: "" },
    ]);
  };

  const applyPreset = (preset: LabelPreset) => {
    setLabelWidth(preset.width);
    setLabelHeight(preset.height);
    setCustomWidth(preset.width);
    setCustomHeight(preset.height);
  };

  const applyCustomSize = () => {
    if (customWidth > 0 && customHeight > 0) {
      setLabelWidth(customWidth);
      setLabelHeight(customHeight);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-[340px] min-w-[340px] bg-white border-r border-gray-200 overflow-y-auto p-4 flex flex-col gap-3 no-print">
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <i className="fas fa-tags text-blue-900"></i>
          Diseñador de Etiquetas
        </h1>

        {/* Visibility Toggles */}
        <div className="sidebar-section">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Visibilidad
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="toggle-checkbox w-4 h-4 rounded border-gray-300" />
              <span className="text-sm text-gray-700">Nombre del Producto</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="toggle-checkbox w-4 h-4 rounded border-gray-300" />
              <span className="text-sm text-gray-700">Precio</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} className="toggle-checkbox w-4 h-4 rounded border-gray-300" />
              <span className="text-sm text-gray-700">Código de Barras y SKU</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showStoreBadge} onChange={(e) => setShowStoreBadge(e.target.checked)} className="toggle-checkbox w-4 h-4 rounded border-gray-300" />
              <span className="text-sm text-gray-700">Insignia de Tienda</span>
            </label>
            {showStoreBadge && (
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Nombre de tienda"
                className="ml-6 w-[calc(100%-24px)] px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showRibbon} onChange={(e) => setShowRibbon(e.target.checked)} className="toggle-checkbox w-4 h-4 rounded border-gray-300" />
              <span className="text-sm text-gray-700">Cinta Esquinera</span>
            </label>
          </div>
        </div>

        {/* Font Sizes */}
        <div className="sidebar-section">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Tamaños de Fuente
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Nombre del Producto</span>
                <span className="font-mono">{nameFontSize}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="34"
                value={nameFontSize}
                onChange={(e) => setNameFontSize(Number(e.target.value))}
                className="slider-input w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Precio (entero)</span>
                <span className="font-mono">{priceFontSize}px</span>
              </div>
              <input
                type="range"
                min="24"
                max="72"
                value={priceFontSize}
                onChange={(e) => setPriceFontSize(Number(e.target.value))}
                className="slider-input w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Altura del Código de Barras</span>
                <span className="font-mono">{barcodeHeight}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="40"
                value={barcodeHeight}
                onChange={(e) => setBarcodeHeight(Number(e.target.value))}
                className="slider-input w-full"
              />
            </div>
          </div>
        </div>

        {/* Label Presets */}
        <div className="sidebar-section">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Tamaño de Etiqueta
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {LABEL_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                  labelWidth === preset.width && labelHeight === preset.height
                    ? "bg-blue-900 text-white border-blue-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Ancho (mm)</label>
              <input
                type="number"
                min="20"
                max="200"
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Alto (mm)</label>
              <input
                type="number"
                min="10"
                max="200"
                value={customHeight}
                onChange={(e) => setCustomHeight(Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={applyCustomSize}
              className="px-3 py-1.5 text-xs font-medium bg-blue-900 text-white rounded hover:bg-blue-800 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>

        {/* Excel Import */}
        <div className="sidebar-section">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Importar desde Excel
          </h3>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-3 py-2 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-file-excel"></i>
            Cargar Archivo (.xlsx, .xls, .csv)
          </button>
          <p className="text-xs text-gray-400 mt-1">
            Columnas: Nombre | Precio | SKU | Cantidad | Cinta
          </p>
        </div>

        {/* Counters */}
        <div className="sidebar-section">
          <div className="flex gap-3">
            <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-900">{totalLabels}</div>
              <div className="text-xs text-blue-600">Etiquetas totales</div>
            </div>
            <div className="flex-1 bg-purple-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-purple-900">{totalPages}</div>
              <div className="text-xs text-purple-600">Páginas A4</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400 text-center">
            {colsPerPage} × {rowsPerPage} = {labelsPerPage} etiquetas por página
          </div>
        </div>

        {/* Print Button */}
        <button
          onClick={() => window.print()}
          className="w-full px-4 py-2.5 text-sm font-bold bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
        >
          <i className="fas fa-print"></i>
          Imprimir Etiquetas
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Item Management Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 no-print">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <i className="fas fa-list text-blue-900"></i>
              Gestión de Productos
            </h2>
            <button
              onClick={addItem}
              className="px-3 py-1.5 text-xs font-medium bg-blue-900 text-white rounded hover:bg-blue-800 transition-colors flex items-center gap-1"
            >
              <i className="fas fa-plus"></i>
              Agregar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-1 text-gray-500 font-medium">Nombre</th>
                  <th className="text-left py-2 px-1 text-gray-500 font-medium w-20">Precio</th>
                  <th className="text-left py-2 px-1 text-gray-500 font-medium w-20">SKU</th>
                  <th className="text-left py-2 px-1 text-gray-500 font-medium w-16">Cant.</th>
                  <th className="text-left py-2 px-1 text-gray-500 font-medium w-24">Cinta</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, "name", e.target.value)}
                        placeholder="Nombre del producto"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => updateItem(item.id, "sku", e.target.value)}
                        placeholder="SKU"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <select
                        value={item.ribbon}
                        onChange={(e) => updateItem(item.id, "ribbon", e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">Ninguna</option>
                        <option value="OFERTA">OFERTA</option>
                        <option value="NUEVO">NUEVO</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-1">
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Eliminar"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <p className="text-center text-gray-400 text-xs py-4">
              No hay productos. Agregue uno o importe desde Excel.
            </p>
          )}
        </div>

        {/* Preview Area - visible on both screen and print */}
        <div className="print-area">
          {pages.length === 0 ? (
            <div className="text-center py-12 text-gray-400 no-print">
              <i className="fas fa-file-alt text-4xl mb-2 block"></i>
              <p className="text-sm">No hay etiquetas para mostrar.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pages.map((pageItems, pageIndex) => (
                <div key={pageIndex} className="flex flex-col items-center">
                  <div className="text-xs text-gray-400 mb-2 no-print">
                    Página {pageIndex + 1} de {pages.length}
                  </div>
                  <div
                    className="a4-page bg-white shadow-lg border border-gray-300"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignContent: "flex-start",
                      gap: "0px",
                    }}
                  >
                    {pageItems.map((item, idx) => (
                      <PriceTag
                        key={`${item.id}-${idx}`}
                        item={item}
                        labelWidth={labelWidth}
                        labelHeight={labelHeight}
                        showName={showName}
                        showPrice={showPrice}
                        showBarcode={showBarcode}
                        showStoreBadge={showStoreBadge}
                        storeName={storeName}
                        showRibbon={showRibbon}
                        nameFontSize={nameFontSize}
                        priceFontSize={priceFontSize}
                        barcodeHeight={barcodeHeight}
                        tagId={`${item.id}-${idx}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
