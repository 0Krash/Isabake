import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import TransactionDetailContainer from './TransactionDetailContainer';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

const PAGE_SIZE = 20;

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
  hasMoreTransactions,
  isLoadingMoreTransactions,
  loadMoreTransactions,
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

  const transactionRows = useMemo(
    () =>
      Object.entries(groupedTransactions).flatMap(([month, transactions]) => [
        {
          id: `header-${month}`,
          month,
          type: 'header',
        },
        ...transactions.map((transaction, index) => ({
          id: [
            'transaction',
            month,
            transaction.transactionId || transaction._id || index,
            transaction.selectedDate?.$date || transaction.selectedDate,
            index,
          ].join('-'),
          transaction,
          type: 'transaction',
        })),
      ]),
    [groupedTransactions]
  );

  const renderTransactionRow = ({ item }) => {
    if (item.type === 'header') {
      return (
        <Text style={[styles.monthHeader, { color: colors.textMuted }]}>
          {item.month}
        </Text>
      );
    }

    return (
      <TransactionDetailContainer
        data={item.transaction}
        setTransactionDetail={setTransactionDetail}
        setTransactionDetailModalIsVisible={setTransactionDetailModalIsVisible}
        setDeleteTransactionModalIsVisible={setDeleteTransactionModalIsVisible}
      />
    );
  };

  const renderFooter = () => {
    if (isLoadingMoreTransactions) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Cargando más movimientos...
          </Text>
        </View>
      );
    }

    if (!hasMoreTransactions && transactionRows.length > 0) {
      return (
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          No hay más movimientos
        </Text>
      );
    }

    return null;
  };

  return (
    <View style={styles.mainContainer}>
      <FlatList
        data={transactionRows}
        renderItem={renderTransactionRow}
        keyExtractor={(item) => item.id}
        style={[
          styles.transactionDetailContainer,
          { backgroundColor: colors.screenBackground },
        ]}
        contentContainerStyle={styles.transactionDetailContent}
        initialNumToRender={PAGE_SIZE}
        ListFooterComponent={renderFooter}
        maxToRenderPerBatch={PAGE_SIZE}
        onEndReached={loadMoreTransactions}
        onEndReachedThreshold={0.35}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={40}
        windowSize={9}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 5,
    marginBottom: 20,
  },
  transactionDetailContainer: {
    flex: 1,
    marginTop: 10,
  },
  transactionDetailContent: {
    paddingBottom: 92,
    paddingHorizontal: 15,
  },
  monthHeader: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    marginVertical: 10,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  footerText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    paddingVertical: 14,
    textAlign: 'center',
  },
});

export default TransactionDetail;
