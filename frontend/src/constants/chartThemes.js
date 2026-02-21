// Chart theme configurations with different color schemes
export const chartThemes = {
  default: {
    name: 'Default',
    colors: [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
    ],
    background: '#ffffff',
    text: '#1f2937',
    grid: 'rgba(0, 0, 0, 0.1)'
  },
  light: {
    name: 'Light',
    colors: [
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f59e0b', // amber
      '#8b5cf6', // violet
      '#3b82f6', // blue
      '#10b981', // green
      '#f97316', // orange
      '#ef4444', // red
    ],
    background: '#ffffff',
    text: '#1f2937',
    grid: 'rgba(0, 0, 0, 0.1)'
  },
  dark: {
    name: 'Dark',
    colors: [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
    ],
    background: '#1f2937',
    text: '#f9fafb',
    grid: 'rgba(255, 255, 255, 0.1)'
  },
  ocean: {
    name: 'Ocean',
    colors: [
      '#0ea5e9', // sky blue
      '#0284c7', // ocean blue
      '#0369a1', // deep blue
      '#0891b2', // teal
      '#0d9488', // emerald
      '#059669', // green
      '#0f766e', // teal green
      '#14b8a6', // mint
    ],
    background: '#ffffff',
    text: '#1f2937',
    grid: 'rgba(0, 0, 0, 0.1)'
  },
  sunset: {
    name: 'Sunset',
    colors: [
      '#f97316', // orange
      '#ea580c', // darker orange
      '#dc2626', // red
      '#b91c1c', // darker red
      '#7c2d12', // brown
      '#9a3412', // burnt orange
      '#c2410c', // orange red
      '#ea580c', // orange
    ],
    background: '#ffffff',
    text: '#1f2937',
    grid: 'rgba(0, 0, 0, 0.1)'
  },
  forest: {
    name: 'Forest',
    colors: [
      '#22c55e', // green
      '#16a34a', // darker green
      '#15803d', // forest green
      '#166534', // dark green
      '#14532d', // very dark green
      '#10b981', // emerald
      '#059669', // teal green
      '#047857', // dark teal
    ],
    background: '#ffffff',
    text: '#1f2937',
    grid: 'rgba(0, 0, 0, 0.1)'
  },
  purple: {
    name: 'Purple',
    colors: [
      '#8b5cf6', // violet
      '#a855f7', // purple
      '#9333ea', // dark purple
      '#7c3aed', // indigo
      '#6d28d9', // dark indigo
      '#5b21b6', // darker purple
      '#4c1d95', // very dark purple
      '#3730a3', // blue purple
    ],
    background: '#ffffff',
    text: '#1f2937',
    grid: 'rgba(0, 0, 0, 0.1)'
  },
  rainbow: {
    name: 'Rainbow',
    colors: [
      '#dc2626', // red
      '#ea580c', // orange
      '#d97706', // amber
      '#65a30d', // yellow green
      '#16a34a', // green
      '#0891b2', // teal
      '#2563eb', // blue
      '#7c3aed', // purple
    ],
    background: '#ffffff',
    text: '#1f2937',
    grid: 'rgba(0, 0, 0, 0.1)'
  },
  monochrome: {
    name: 'Monochrome',
    colors: [
      '#1f2937', // dark gray
      '#374151', // gray
      '#4b5563', // medium gray
      '#6b7280', // light gray
      '#9ca3af', // lighter gray
      '#d1d5db', // very light gray
      '#e5e7eb', // even lighter
      '#f3f4f6', // almost white
    ],
    background: '#ffffff',
    text: '#1f2937',
    grid: 'rgba(0, 0, 0, 0.1)'
  },
  neon: {
    name: 'Neon',
    colors: [
      '#00ff00', // bright green
      '#00ffff', // cyan
      '#ff00ff', // magenta
      '#ffff00', // yellow
      '#ff0000', // red
      '#0000ff', // blue
      '#ff8000', // orange
      '#8000ff', // purple
    ],
    background: '#000000',
    text: '#ffffff',
    grid: 'rgba(255, 255, 255, 0.1)'
  }
};

// Get theme by key
export const getTheme = (themeKey) => {
  return chartThemes[themeKey] || chartThemes.default;
};

// Get all theme options for dropdown
export const getThemeOptions = () => {
  return Object.keys(chartThemes).map(key => ({
    value: key,
    label: chartThemes[key].name,
    colors: chartThemes[key].colors
  }));
};
