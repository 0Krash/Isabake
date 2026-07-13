const toIsoDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

const getEntityId = (entity, field) =>
  entity?.[field] || entity?.id || entity?.localId || '';

const getDefaultCreateId = () => require('../db/localIds').createLocalId;

const getDefaultRepositories = () => {
  const {
    inventoryRepository,
    recipeRepository,
    transactionRepository,
  } = require('../repositories');

  return {
    inventory: inventoryRepository,
    recipes: recipeRepository,
    transactions: transactionRepository,
  };
};

const createInventoryPayloads = ({ createId, label }) => [
  {
    category: 'Harinas',
    lots: [
      {
        brand: 'Demo molino',
        cost: 420,
        lotId: createId('dev_demo_lot'),
        location: 'Almacen seco',
        purchaseDate: label.createdAt,
        quantity: 25000,
        supplier: 'Proveedor demo',
        unit: 'g',
      },
    ],
    minimumStock: 5000,
    name: `${label.prefix} harina de trigo`,
    notes: 'Creado desde herramientas dev',
    storage: 'Seco',
  },
  {
    category: 'Lacteos',
    lots: [
      {
        brand: 'Demo granja',
        cost: 185,
        expiryDate: label.expiryDate,
        lotId: createId('dev_demo_lot'),
        location: 'Refrigerador',
        purchaseDate: label.createdAt,
        quantity: 4000,
        supplier: 'Proveedor demo',
        unit: 'g',
      },
    ],
    minimumStock: 1000,
    name: `${label.prefix} mantequilla`,
    notes: 'Creado desde herramientas dev',
    storage: 'Frio',
  },
  {
    category: 'Endulzantes',
    lots: [
      {
        brand: 'Demo dulce',
        cost: 95,
        lotId: createId('dev_demo_lot'),
        location: 'Almacen seco',
        purchaseDate: label.createdAt,
        quantity: 10000,
        supplier: 'Proveedor demo',
        unit: 'g',
      },
    ],
    minimumStock: 2000,
    name: `${label.prefix} azucar`,
    notes: 'Creado desde herramientas dev',
    storage: 'Seco',
  },
];

const createRecipePayloads = ({ createId, inventory, label }) => {
  const [flour, butter, sugar] = inventory;

  return [
    {
      cost: 285,
      ingredients: [
        {
          ingredientId: createId('dev_demo_ingredient'),
          inventoryId: getEntityId(flour, 'inventoryId'),
          name: flour?.name || 'Harina',
          quantity: '500',
          section: 'Masa',
          unit: 'g',
        },
        {
          ingredientId: createId('dev_demo_ingredient'),
          inventoryId: getEntityId(butter, 'inventoryId'),
          name: butter?.name || 'Mantequilla',
          quantity: '120',
          section: 'Masa',
          unit: 'g',
        },
        {
          ingredientId: createId('dev_demo_ingredient'),
          inventoryId: getEntityId(sugar, 'inventoryId'),
          name: sugar?.name || 'Azucar',
          quantity: '180',
          section: 'Masa',
          unit: 'g',
        },
      ],
      name: `${label.prefix} galletas`,
      servings: 12,
      steps: [
        {
          description: 'Mezclar ingredientes secos y grasas.',
          order: 1,
          stepId: createId('dev_demo_step'),
        },
        {
          description: 'Hornear hasta dorar.',
          order: 2,
          stepId: createId('dev_demo_step'),
        },
      ],
      type: 'Panaderia',
    },
    {
      cost: 340,
      ingredients: [
        {
          ingredientId: createId('dev_demo_ingredient'),
          inventoryId: getEntityId(flour, 'inventoryId'),
          name: flour?.name || 'Harina',
          quantity: '350',
          section: 'Base',
          unit: 'g',
        },
        {
          ingredientId: createId('dev_demo_ingredient'),
          inventoryId: getEntityId(sugar, 'inventoryId'),
          name: sugar?.name || 'Azucar',
          quantity: '240',
          section: 'Base',
          unit: 'g',
        },
      ],
      name: `${label.prefix} pastel sencillo`,
      servings: 8,
      steps: [
        {
          description: 'Preparar mezcla base.',
          order: 1,
          stepId: createId('dev_demo_step'),
        },
        {
          description: 'Decorar y dejar enfriar.',
          order: 2,
          stepId: createId('dev_demo_step'),
        },
      ],
      type: 'Pasteleria',
    },
  ];
};

const createTransactionPayloads = ({ createdAt, label }) => [
  {
    amount: 18000,
    category: {
      categoryId: 'dev_demo_sales',
      description: 'Ventas demo',
      shortDescription: 'Ventas',
    },
    description: `${label.prefix} venta de galletas`,
    quantity: '12',
    selectedDate: createdAt,
    transactionType: 'Ventas',
  },
  {
    amount: 7200,
    category: {
      categoryId: 'dev_demo_supplies',
      description: 'Materia prima demo',
      shortDescription: 'Materia prima',
    },
    description: `${label.prefix} compra de insumos`,
    quantity: '1',
    selectedDate: createdAt,
    transactionType: 'Gastos',
  },
  {
    amount: 25000,
    category: {
      categoryId: 'dev_demo_sales',
      description: 'Ventas demo',
      shortDescription: 'Ventas',
    },
    description: `${label.prefix} pedido especial`,
    quantity: '1',
    selectedDate: createdAt,
    transactionType: 'Ventas',
  },
];

export const createDevSampleBusinessData = async ({
  createId,
  now = () => new Date(),
  repositories,
} = {}) => {
  const resolvedCreateId = createId || getDefaultCreateId();
  const resolvedRepositories = repositories || getDefaultRepositories();
  const createdAt = toIsoDate(now());
  const runId = resolvedCreateId('dev_demo_run');
  const readableSuffix = createdAt
    .replace(/[-:.TZ]/g, '')
    .slice(0, 12);
  const label = {
    createdAt,
    expiryDate: toIsoDate(new Date(Date.parse(createdAt) + 14 * 24 * 60 * 60 * 1000)),
    prefix: `Demo ${readableSuffix}`,
  };

  const inventory = [];

  for (const payload of createInventoryPayloads({
    createId: resolvedCreateId,
    label,
  })) {
    inventory.push(await resolvedRepositories.inventory.create(payload));
  }

  const recipes = [];

  for (const payload of createRecipePayloads({
    createId: resolvedCreateId,
    inventory,
    label,
  })) {
    recipes.push(await resolvedRepositories.recipes.create(payload));
  }

  const transactions = [];

  for (const payload of createTransactionPayloads({ createdAt, label })) {
    transactions.push(await resolvedRepositories.transactions.create(payload));
  }

  return {
    counts: {
      inventory: inventory.length,
      recipes: recipes.length,
      transactions: transactions.length,
    },
    createdAt,
    ids: {
      inventory: inventory.map((item) => getEntityId(item, 'inventoryId')),
      recipes: recipes.map((recipe) => getEntityId(recipe, 'recipeId')),
      transactions: transactions.map((transaction) =>
        getEntityId(transaction, 'transactionId'),
      ),
    },
    ok: true,
    runId,
  };
};

export default {
  createDevSampleBusinessData,
};
