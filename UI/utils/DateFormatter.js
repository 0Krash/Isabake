import DateFormats from '../constants/TransactionBalance/Dates';

const ddmmyy = (date) => {
  const year = date.getFullYear().toString().slice(-2);
  const month = DateFormats.monthsMM[date.getMonth()];
  const day = `0${date.getDate()}`.slice(-2);
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
  let partesFecha = selectedDate.split('-');
  let dia = parseInt(partesFecha[0], 10);
  let mes = partesFecha[1];
  let ano = '20' + partesFecha[2];

  let meses = {
    ene: 1,
    feb: 2,
    mar: 3,
    abr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    ago: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dic: 12,
  };

  let fecha = new Date(ano, meses[mes.toLowerCase()] - 1, dia);

  return fecha.toISOString();
};

export default {
  ddmmyy,
  convertISOtoSelected,
  convertSelectedToISO,
};
