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
    description: 'Equipo, accesos e invitaciones',
    key: 'workspace',
    label: 'Administrar negocios',
  },
  {
    description: 'Estado, respaldo e historial',
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

export const createSettingsMenuItems = ({ devToolsEnabled = false } = {}) => [
  {
    description: 'Equipo, accesos e invitaciones.',
    key: 'workspace',
    label: 'Administrar negocios',
  },
  {
    description: 'Lugares donde surtes materiales para tus recetas.',
    key: 'stores',
    label: 'Tiendas',
  },
  {
    description: 'Clientes asociados a ventas y transacciones.',
    key: 'clients',
    label: 'Clientes',
  },
  {
    description: 'Preferencias generales de la aplicacion.',
    key: 'app-options',
    label: 'Opciones de la app',
  },
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
