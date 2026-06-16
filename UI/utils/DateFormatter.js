import DateFormats from '../constants/TransactionBalance/Dates';

const isValidDate = (date) => date instanceof Date && !isNaN(date.getTime());

const selectedToDate = (selectedDate) => {
  if (!selectedDate || typeof selectedDate !== 'string') {
    return new Date();
  }

  const [dayValue, monthValue, yearValue] = selectedDate.split('-');
  const day = parseInt(dayValue, 10);
  const monthIndex = DateFormats.monthsMM.findIndex(
    (month) => month.toLowerCase() === monthValue?.toLowerCase()
  );
  const year = parseInt(`20${yearValue}`, 10);

  if (!day || monthIndex < 0 || !year) {
    return new Date();
  }

  const date = new Date(year, monthIndex, day);

  return isValidDate(date) ? date : new Date();
};

const ddmmyy = (date) => {
  const safeDate = isValidDate(date) ? date : new Date();
  const year = safeDate.getFullYear().toString().slice(-2);
  const month = DateFormats.monthsMM[safeDate.getMonth()];
  const day = `0${safeDate.getDate()}`.slice(-2);
  return `${day}-${month}-${year}`;
};

const convertISOtoSelected = (isoDate) => {
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, '0');
  const month = DateFormats.monthsMM[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);

  return `${day}-${month}-${year}`;
};

const convertSelectedToISO = (selectedDate) => {
  return selectedToDate(selectedDate).toISOString();
};

export default {
  ddmmyy,
  convertISOtoSelected,
  convertSelectedToISO,
  selectedToDate,
};
