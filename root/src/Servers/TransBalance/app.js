const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

require('dotenv').config();

const transactionRouter = require('./routes/transactionRoutes');
const categoryRouter = require('./routes/categoryRoutes');
const storeRouter = require('./routes/storeRoutes');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/api/v1/transactions', transactionRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/stores', storeRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    status: 'failed',
    message: err.message || err,
  });
});

module.exports = app;
