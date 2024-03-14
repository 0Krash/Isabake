const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

require('dotenv').config();

const transactionRouter = require('./routes/transactionRoutes');

const app = express();

//middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use((req, res, next) => {
  console.log('hello from the middleware ✅');
  next();
});
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString;
  next();
});

//Routes
app.use('/api/v1/transactions', transactionRouter);

//Server
module.exports = app;
