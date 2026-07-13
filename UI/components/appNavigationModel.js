export const primaryNavigationTabs = [
  { key: 'home', label: 'Transacciones' },
  { key: 'recipes', label: 'Recetas' },
  { key: 'inventory', label: 'Inventario' },
];

export const getPrimaryNavigationTabs = () => primaryNavigationTabs;

export const createSecondaryMenuItems = ({
  devToolsEnabled = false,
  showConflicts = true,
} = {}) => [
  {
    description: 'Colaboradores e invitaciones',
    key: 'workspace',
    label: 'Compartir proyecto',
  },
  {
    description: 'Enviar o recibir cambios manualmente',
    key: 'sync',
    label: 'Respaldo y sincronizacion',
  },
  ...(showConflicts
    ? [
        {
          description: 'Cambios que necesitan decision',
          key: 'conflicts',
          label: 'Cambios por revisar',
        },
      ]
    : []),
  ...(devToolsEnabled
    ? [
        {
          description: 'Solo desarrollo',
          key: 'dev-sync',
          label: 'Herramientas dev',
        },
      ]
    : []),
];
