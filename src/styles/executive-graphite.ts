/**
 * Executive Graphite Design System
 * Inspired by Bloomberg Terminal, SAP Fiori, Oracle NetSuite, BlackRock Aladdin
 * 
 * Philosophy: Corporate, professional, premium enterprise financial software
 * Target audience: CFOs, financial directors, enterprise holdings, multi-branch groups
 */

export const executiveGraphite = {
  // Background colors
  background: {
    primary: '#0A0A0A',    // Main background
    secondary: '#111111',  // Sidebar
    tertiary: '#161616',   // Cards
    hover: '#1F1F1F',      // Hover states
  },

  // Borders
  border: {
    primary: '#2D2D2D',    // Main borders
    secondary: '#3D3D3D',  // Subtle borders
  },

  // Text colors
  text: {
    primary: '#F5F5F5',    // Main text
    secondary: '#A3A3A3',  // Secondary text
    tertiary: '#7E7E7E',   // Tertiary text
    muted: '#5A5A5A',      // Muted text
  },

  // Accent colors (Silver/Platinum)
  accent: {
    silver: '#C0C0C0',     // Primary accent
    silverDark: '#7E7E7E', // Dark silver
    silverLight: '#E8E8E8', // Light silver
  },

  // Financial colors
  financial: {
    positive: '#2F855A',   // Green for positive values
    negative: '#C53030',   // Red for negative values
    warning: '#B7791F',    // Amber for warnings
    info: '#3182CE',       // Blue for info (subtle)
  },

  // Alert severity levels
  alert: {
    critical: '#C53030',   // Critical alerts
    warning: '#B7791F',    // Warning alerts
    info: '#3182CE',       // Info alerts
    resolved: '#2F855A',   // Resolved alerts
  },

  // Chart colors
  charts: {
    primary: '#C0C0C0',     // Main chart line/bar
    secondary: '#2F855A',   // Positive trend
    tertiary: '#C53030',    // Negative trend
    grid: '#2D2D2D',        // Grid lines
    tooltip: '#1F1F1F',     // Tooltip background
  },

  // Sidebar
  sidebar: {
    background: '#111111',
    selected: '#222222',
    selectedBorder: '#C0C0C0',
    hover: '#1A1A1A',
    divider: '#2D2D2D',
  },

  // Tables
  table: {
    header: '#161616',
    row: '#0A0A0A',
    rowAlternate: '#0F0F0F',
    hover: '#1F1F1F',
    selected: '#222222',
    border: '#2D2D2D',
  },

  // Cards
  card: {
    background: '#161616',
    border: '#2D2D2D',
    hover: '#1F1F1F',
  },

  // Buttons
  button: {
    primary: '#C0C0C0',
    primaryHover: '#E8E8E8',
    primaryText: '#0A0A0A',
    secondary: '#2D2D2D',
    secondaryHover: '#3D3D3D',
    secondaryText: '#F5F5F5',
  },

  // Input fields
  input: {
    background: '#161616',
    border: '#2D2D2D',
    borderFocus: '#C0C0C0',
    text: '#F5F5F5',
    placeholder: '#7E7E7E',
  },

  // Shadows (subtle, no glow)
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
    md: '0 2px 4px rgba(0, 0, 0, 0.5)',
    lg: '0 4px 8px rgba(0, 0, 0, 0.5)',
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },

  // Border radius
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
  },
};

// CSS variables for Tailwind integration
export const executiveGraphiteVars = {
  '--bg-primary': '#0A0A0A',
  '--bg-secondary': '#111111',
  '--bg-tertiary': '#161616',
  '--bg-hover': '#1F1F1F',
  '--border-primary': '#2D2D2D',
  '--text-primary': '#F5F5F5',
  '--text-secondary': '#A3A3A3',
  '--text-tertiary': '#7E7E7E',
  '--accent-silver': '#C0C0C0',
  '--accent-silver-dark': '#7E7E7E',
  '--financial-positive': '#2F855A',
  '--financial-negative': '#C53030',
  '--financial-warning': '#B7791F',
  '--sidebar-selected': '#222222',
  '--sidebar-selected-border': '#C0C0C0',
};

// Executive KPI definitions
export const executiveKPIs = {
  saldoDisponible: {
    label: 'Saldo Disponible',
    format: 'currency',
    context: 'Liquidez actual consolidada',
  },
  ingresos: {
    label: 'Ingresos',
    format: 'currency',
    context: 'Total ingresos del período',
  },
  egresos: {
    label: 'Egresos',
    format: 'currency',
    context: 'Total egresos del período',
  },
  flujoNeto: {
    label: 'Flujo Neto',
    format: 'currency',
    context: 'Diferencia ingresos - egresos',
  },
  cuentasPorPagar: {
    label: 'Cuentas por Pagar',
    format: 'currency',
    context: 'Total facturas pendientes de pago',
  },
  cuentasPorCobrar: {
    label: 'Cuentas por Cobrar',
    format: 'currency',
    context: 'Total facturas pendientes de cobro',
  },
  facturasVencidas: {
    label: 'Facturas Vencidas',
    format: 'currency',
    context: 'Facturas con fecha de vencimiento pasada',
  },
  conciliacionesPendientes: {
    label: 'Conciliaciones Pendientes',
    format: 'number',
    context: 'Movimientos por conciliar',
  },
};

// Sidebar categories
export const sidebarCategories = {
  OPERACION: 'OPERACIÓN',
  TESORERIA: 'TESORERÍA',
  COMPRAS: 'COMPRAS',
  ANALISIS: 'ANÁLISIS',
  CONTROL: 'CONTROL',
};

// Menu items by category
export const sidebarMenu = {
  [sidebarCategories.OPERACION]: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { id: 'empresas', label: 'Empresas', icon: 'Building2' },
    { id: 'sucursales', label: 'Sucursales', icon: 'Building' },
  ],
  [sidebarCategories.TESORERIA]: [
    { id: 'bancos', label: 'Bancos', icon: 'Landmark' },
    { id: 'movimientos', label: 'Movimientos', icon: 'ArrowRightLeft' },
    { id: 'transferencias', label: 'Transferencias', icon: 'Send' },
    { id: 'tesoreria', label: 'Tesorería', icon: 'TrendingUp' },
    { id: 'conciliacion', label: 'Conciliación', icon: 'CheckCircle2' },
  ],
  [sidebarCategories.COMPRAS]: [
    { id: 'proveedores', label: 'Proveedores', icon: 'Users' },
    { id: 'compras', label: 'Compras', icon: 'ShoppingCart' },
    { id: 'costos', label: 'Costos', icon: 'Calculator' },
  ],
  [sidebarCategories.ANALISIS]: [
    { id: 'reportes', label: 'Reportes', icon: 'BarChart3' },
    { id: 'pos', label: 'POS', icon: 'Store' },
  ],
  [sidebarCategories.CONTROL]: [
    { id: 'configuracion', label: 'Configuración', icon: 'Settings' },
    { id: 'audit', label: 'Auditoría', icon: 'FileText' },
  ],
};
