import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import TransactionDetailContainer from './TransactionDetailContainer';

const groupByMonth = (transactions) => {
  // Ordenar transacciones por fecha descendente
  const sortedTransactions = transactions.sort((a, b) => {
    const dateA = new Date(a.selectedDate?.$date || a.selectedDate);
    const dateB = new Date(b.selectedDate?.$date || b.selectedDate);
    return dateB - dateA;
  });

  // Agrupar transacciones por mes
  const grouped = sortedTransactions.reduce((groups, transaction) => {
    const dateString =
      transaction.selectedDate?.$date || transaction.selectedDate;
    if (!dateString) {
      console.error('Missing date in transaction:', transaction);
      return groups;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error(`Invalid date: ${dateString}`);
      return groups;
    }

    const monthYear = `${date
      .toLocaleString('default', { month: 'long' })
      .toUpperCase()} ${date.getFullYear()}`;

    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push({ ...transaction, date });

    return groups;
  }, {});

  return grouped;
};

const TransactionDetail = ({
  setTransactionDetailModalIsVisible,
  setDeleteTransactionModalIsVisible,
  dataTransactionsResponse,
  setTransactionDetail,
  transactionType,
}) => {
  // Filtrar transacciones por tipo
  const filteredTransactions = dataTransactionsResponse.filter(
    (item) => item.transactionType === transactionType
  );

  // Agrupar por mes
  const groupedTransactions = groupByMonth(filteredTransactions);

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.transactionDetailContainer}
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(groupedTransactions).map((month) => (
          <View key={month}>
            <Text style={styles.monthHeader}>{month}</Text>
            {groupedTransactions[month].map((item, index) => (
              <TransactionDetailContainer
                key={index}
                data={item}
                setTransactionDetail={setTransactionDetail}
                setTransactionDetailModalIsVisible={
                  setTransactionDetailModalIsVisible
                }
                setDeleteTransactionModalIsVisible={
                  setDeleteTransactionModalIsVisible
                }
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 5,
    marginHorizontal: 15,
    marginBottom: 20,
  },
  transactionDetailContainer: {
    flex: 1,
    backgroundColor: '#EFECFF',
    borderRadius: 20,
    marginVertical: 10,
    alignContent: 'center',
  },
  monthHeader: {
    fontSize: 12,
    color: '#9E9AAB',
    fontWeight: 'bold',
    marginVertical: 10,
    marginLeft: 10,
  },
});

export default TransactionDetail;
