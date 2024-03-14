const mongoose = require('mongoose');
const app = require('./app');

const DB = process.env.DATABASE;
console.log(`Trying to connect to: ${DB}`);
mongoose
  .connect(DB)
  .then(() => {
    console.log('Database Connection Successfully');
  })
  .catch((error) => {
    console.log('Database Connection Error', error);
  });

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
