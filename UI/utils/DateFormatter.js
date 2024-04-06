import DateFormats from '../constants/TransactionBalance/Dates';

const ddmmm = (date) => {
  const month = DateFormats.monthsMMM[date.getMonth()];
  const day = `0${date.getDate()}`.slice(-2);
  return `${day}-${month}`;
};

export default { ddmmm };
