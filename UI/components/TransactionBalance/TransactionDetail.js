import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import TransactionDetailContainer from './TransactionDetailContainer';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

const groupByMonth = (transactions) => {
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.selectedDate?.$date || a.selectedDate);
    const dateB = new Date(b.selectedDate?.$date || b.selectedDate);
    return dateB - dateA;
  });

  return sortedTransactions.reduce((groups, transaction) => {
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
};

const TransactionDetail = ({
  setTransactionDetailModalIsVisible,
  setDeleteTransactionModalIsVisible,
  dataTransactionsResponse,
  setTransactionDetail,
  transactionType,
}) => {
  const { colors } = useTransactionBalanceTheme();
  const groupedTransactions = useMemo(() => {
    const filteredTransactions = dataTransactionsResponse.filter(
      (item) => item.transactionType === transactionType
    );

    return groupByMonth(filteredTransactions);
  }, [dataTransactionsResponse, transactionType]);

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={[
          styles.transactionDetailContainer,
          { backgroundColor: colors.screenBackground },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(groupedTransactions).map((month) => (
          <View key={month}>
            <Text style={[styles.monthHeader, { color: colors.textMuted }]}>
              {month}
            </Text>
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
    borderRadius: 20,
    marginVertical: 10,
    alignContent: 'center',
  },
  monthHeader: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    marginVertical: 10,
    marginLeft: 10,
  },
});

export default TransactionDetail;
