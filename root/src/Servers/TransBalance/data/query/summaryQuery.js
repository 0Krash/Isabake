exports.totalAmountByCategory = () => [
  {
    $group: {
      _id: {
        transactionType: '$transactionType',
        categoryShort: '$category.shortDescription',
      },
      totalAmount: { $sum: '$amount' },
      totalDocuments: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      transactionType: '$_id.transactionType',
      category: '$_id.categoryShort',
      totalAmount: 1,
      totalDocuments: 1,
    },
  },
  {
    $group: {
      _id: '$transactionType',
      categories: {
        $push: {
          category: '$category',
          totalAmount: '$totalAmount',
          totalDocuments: '$totalDocuments',
        },
      },
      total: { $sum: '$totalAmount' }, // Calcula el total como la suma de todas las categorías
    },
  },
  {
    $project: {
      _id: 0,
      transactionType: '$_id',
      categories: 1,
      total: 1, // Incluye el campo total en la salida
    },
  },
];

exports.totalAmountByDateCategory = () => [
  {
    $group: {
      _id: {
        transactionType: '$transactionType',
        categoryShort: '$category.shortDescription',
        year: { $year: '$selectedDate' },
        month: { $month: '$selectedDate' },
      },
      totalAmount: { $sum: '$amount' },
      totalDocuments: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      transactionType: '$_id.transactionType',
      category: '$_id.categoryShort',
      year: '$_id.year',
      month: '$_id.month',
      totalAmount: 1,
      totalDocuments: 1,
    },
  },
  {
    $group: {
      _id: {
        transactionType: '$transactionType',
        year: '$year',
        month: '$month',
      },
      categories: {
        $push: {
          category: '$category',
          totalAmount: '$totalAmount',
          totalDocuments: '$totalDocuments',
        },
      },
      monthTotalAmount: { $sum: '$totalAmount' },
      monthTotalDocuments: { $sum: '$totalDocuments' },
    },
  },
  {
    $project: {
      _id: 0,
      transactionType: '$_id.transactionType',
      year: '$_id.year',
      month: '$_id.month',
      categories: 1,
      monthTotalAmount: 1,
      monthTotalDocuments: 1,
    },
  },
  {
    $group: {
      _id: '$transactionType',
      months: {
        $push: {
          year: '$year',
          month: '$month',
          categories: '$categories',
          monthTotalAmount: '$monthTotalAmount',
          monthTotalDocuments: '$monthTotalDocuments',
        },
      },
      transactionTotalAmount: { $sum: '$monthTotalAmount' },
      transactionTotalDocuments: { $sum: '$monthTotalDocuments' },
    },
  },
  {
    $project: {
      _id: 0,
      transactionType: '$_id',
      months: 1,
      transactionTotalAmount: 1,
      transactionTotalDocuments: 1,
    },
  },
];
