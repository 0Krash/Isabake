exports.sendSuccess = (
  res,
  { statusCode = 200, data, pagination, result } = {}
) => {
  const response = {
    status: 'success',
  };

  if (result !== undefined) {
    response.result = result;
  }

  if (pagination !== undefined) {
    response.pagination = pagination;
  }

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

exports.sendFail = (res, { statusCode = 400, message }) =>
  res.status(statusCode).json({
    status: 'failed',
    message,
  });
