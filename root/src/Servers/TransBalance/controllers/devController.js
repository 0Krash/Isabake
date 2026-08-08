const {
  resetBackendDatabase,
} = require('../services/devDatabaseResetService');

exports.resetDatabase = async (req, res, next) => {
  try {
    const result = await resetBackendDatabase({
      confirm: req.body?.confirm,
      confirmation: req.get('x-dev-reset-confirm'),
      scope: req.body?.scope,
    });

    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
