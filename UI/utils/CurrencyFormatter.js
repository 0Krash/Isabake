const convertCurrencyToCents = (currencyValue) => {
  return parseFloat(currencyValue.replace(/[$,]/g, '')) * 100;
};

const convertCentsToCurrency = (centsValue) => {
  return (
    '$' +
    (parseFloat(centsValue) / 100)
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  );
};

export default { convertCurrencyToCents, convertCentsToCurrency };
