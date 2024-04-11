import DateFormats from '../constants/TransactionBalance/Dates';

const ddmmm = (date) => {
  const month = DateFormats.monthsMMM[date.getMonth()];
  const day = `0${date.getDate()}`.slice(-2);
  return `${day}-${month}`;
};

const ddmmmyy = (date) => {
  const year = date.getFullYear().toString().slice(-2);
  const month = DateFormats.monthsMMM[date.getMonth()];
  const day = `0${date.getDate()}`.slice(-2);
  return `${day}-${month}-${year}`;
};

const ddmmyy = (date) => {
  const year = date.getFullYear().toString().slice(-2);
  const month = DateFormats.monthsMM[date.getMonth()];
  const day = `0${date.getDate()}`.slice(-2);
  return `${day}-${month}-${year}`;
};

export default { ddmmm, ddmmyy, ddmmmyy };
