// Constantes centralizadas do sistema de inventário
// Evita duplicação entre add-asset-modal e edit-asset-modal

export const EQUIPMENT_TYPES = [
    "Acess point",
    "Celular",
    "Computador",
    "Impressora",
    "Monitor",
    "Notebook",
    "Nobreak",
    "Roteador",
    "Switch",
    "Tablet",
    "Telefone IP",
    "Outro",
] as const

export const STATUS_OPTIONS = [
    "Disponível",
    "Em uso",
    "Manutenção",
    "Baixado",
] as const

export const RAM_OPTIONS = [
    "1GB",
    "2GB",
    "4GB",
    "8GB",
    "16GB",
    "32GB",
    "64GB",
] as const

export const STORAGE_OPTIONS = [
    "120GB SSD",
    "240GB SSD",
    "256GB SSD",
    "480GB SSD",
    "512GB SSD",
    "1TB SSD",
    "2TB SSD",
    "500GB HDD",
    "1TB HDD",
    "2TB HDD",
] as const

export const CPU_GENERATIONS = [
    "Intel Celeron",
    "Intel Pentium",
    "Intel Core i3 (8ª Gen)",
    "Intel Core i3 (10ª Gen)",
    "Intel Core i3 (12ª Gen)",
    "Intel Core i3 (13ª Gen)",
    "Intel Core i5 (8ª Gen)",
    "Intel Core i5 (10ª Gen)",
    "Intel Core i5 (12ª Gen)",
    "Intel Core i5 (13ª Gen)",
    "Intel Core i7 (8ª Gen)",
    "Intel Core i7 (10ª Gen)",
    "Intel Core i7 (12ª Gen)",
    "Intel Core i7 (13ª Gen)",
    "Intel Core i9 (12ª Gen)",
    "Intel Core i9 (13ª Gen)",
    "AMD Ryzen 3",
    "AMD Ryzen 5",
    "AMD Ryzen 7",
    "AMD Ryzen 9",
] as const

// Monitor-specific constants
export const MONITOR_SIZES = [
    '19" - 22"',
    '23" - 24"',
    '25" - 27"',
    '29" - 34"',
] as const

export const VIDEO_OUTPUTS = [
    "VGA",
    "HDMI",
    "DisplayPort",
    "DVI",
    "USB-C",
    "Mini DisplayPort",
    "Mini HDMI",
] as const

// Hardware-capable equipment types (show hardware specs section)
export const HARDWARE_TYPES = ["Computador", "Notebook"] as const

// Monitor-capable equipment types (show monitor specs section)
export const MONITOR_TYPES = ["Monitor"] as const

// Status colors for UI consistency
export const STATUS_COLORS: Record<string, string> = {
    "Disponível": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Em uso": "bg-blue-50 text-blue-700 border-blue-200",
    "Manutenção": "bg-amber-50 text-amber-700 border-amber-200",
    "Baixado": "bg-red-50 text-red-700 border-red-200",
} as const

export const MAINTENANCE_REPLACEMENT_THRESHOLD = 5

export const ASSET_CONDITIONS = ["Novo", "Semi-novo"] as const

