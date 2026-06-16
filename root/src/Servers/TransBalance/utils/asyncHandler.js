module.exports = (handler, errorStatusCode = 400) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch((error) => {
    error.statusCode = error.statusCode || errorStatusCode;
    next(error);
  });
};
