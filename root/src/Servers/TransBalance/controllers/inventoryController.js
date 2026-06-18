const Inventory = require('../models/inventoryModel');
const asyncHandler = require('../utils/asyncHandler');
const { sendFail, sendSuccess } = require('../utils/httpResponses');

const normalizeQuality = (quality) => {
  const qualityMap = {
    alta: 4,
    baja: 2,
    media: 3,
    premium: 5,
  };
  const numericQuality = Number(quality);

  if (!Number.isNaN(numericQuality)) {
    return Math.min(Math.max(numericQuality, 1), 5);
  }

  return qualityMap[String(quality || '').trim().toLowerCase()] || 3;
};

const sanitizeLotPayload = (lot, index) => ({
  brand: lot.brand,
  cost: Number(lot.cost || 0),
  expiryDate: lot.expiryDate,
  location: lot.location || '',
  lotId: lot.lotId || lot.id || `lot-${Date.now()}-${index}`,
  notes: lot.notes || '',
  purchaseDate: lot.purchaseDate || '',
  quality: normalizeQuality(lot.quality),
  quantity: Number(lot.quantity || 0),
  supplier: lot.supplier || '',
  supplierId:
    lot.supplierId === null || lot.supplierId === undefined
      ? null
      : Number(lot.supplierId),
  unit: lot.unit || 'g',
});

const sanitizeInventoryPayload = (payload) => ({
  category: payload.category || '',
  lots: Array.isArray(payload.lots)
    ? payload.lots.map((lot, index) => sanitizeLotPayload(lot, index))
    : [],
  minimumStock: Number(payload.minimumStock || 0),
  name: payload.name,
  notes: payload.notes || '',
  storage: payload.storage || '',
});

exports.getAllInventoryItems = asyncHandler(async (req, res) => {
  const inventoryItems = await Inventory.find().sort({
    name: 1,
    inventoryId: 1,
  });

  sendSuccess(res, {
    data: inventoryItems,
    result: inventoryItems.length,
  });
});

exports.createInventoryItem = asyncHandler(async (req, res) => {
  const lastInventoryItem = await Inventory.findOne().sort({ inventoryId: -1 });
  const nextInventoryId = (lastInventoryItem?.inventoryId || 0) + 1;
  const inventoryItem = await Inventory.create({
    ...sanitizeInventoryPayload(req.body),
    inventoryId: req.body.inventoryId || nextInventoryId,
  });

  sendSuccess(res, {
    statusCode: 201,
    data: {
      inventoryItem,
    },
  });
});

exports.updateInventoryItemById = asyncHandler(async (req, res) => {
  const inventoryItem = await Inventory.findOneAndUpdate(
    { inventoryId: Number(req.params.inventoryId) },
    sanitizeInventoryPayload(req.body),
    {
      new: true,
      runValidators: true,
    }
  );

  if (!inventoryItem) {
    return sendFail(res, {
      statusCode: 404,
      message: 'Ingrediente no encontrado',
    });
  }

  sendSuccess(res, {
    data: {
      inventoryItem,
    },
  });
});

exports.deleteInventoryItemById = asyncHandler(async (req, res) => {
  const result = await Inventory.deleteOne({
    inventoryId: Number(req.params.inventoryId),
  });

  if (result.deletedCount === 0) {
    return sendFail(res, {
      statusCode: 404,
      message: 'Ingrediente no encontrado',
    });
  }

  sendSuccess(res);
});
