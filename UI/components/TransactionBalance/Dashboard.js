import { StyleSheet, View, Text } from 'react-native';
import CurrencyFormatter from '../../utils/CurrencyFormatter';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

export default function Dashboard({
  transactionType,
  totalAmountByCategoryResponse,
  totalAmountByDateCategoryResponse,
}) {
  const { colors } = useTransactionBalanceTheme();
  const filteredTransactions = totalAmountByCategoryResponse.filter(
    (transaction) => transaction.transactionType === transactionType
  );

  return (
    <View style={styles.mainContainer}>
      <Text style={[styles.title, { color: colors.textMuted }]}>
        Balance total
      </Text>
      <View style={[styles.balances, { backgroundColor: colors.surface }]}>
        <View testID="totalValues" style={styles.totalValues} />
        <View testID="categoryValues" style={styles.categoryValues}>
          {filteredTransactions.length ? (
            filteredTransactions.map((transaction, index) => (
              <View key={index} style={styles.summaryGroup}>
                {transaction.categories.map((category, idx) => (
                  <View key={idx} style={styles.summaryRow}>
                    <View testID="categoryLabel">
                      <Text
                        style={[
                          styles.summaryText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {category.category || 'Ventas'}:{' '}
                      </Text>
                    </View>
                    <View testID="categoryValues" style={styles.summaryValue}>
                      <Text
                        style={[
                          styles.summaryText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {CurrencyFormatter.convertCentsToCurrency(
                          category.totalAmount,
                        )}
                      </Text>
                    </View>
                  </View>
                ))}
                <View style={styles.summaryRow}>
                  <View>
                    <Text
                      style={[
                        styles.totalText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Total:{' '}
                    </Text>
                  </View>
                  <View style={styles.summaryValue}>
                    <Text
                      style={[
                        styles.totalText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {CurrencyFormatter.convertCentsToCurrency(
                        transaction.total,
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Sin movimientos registrados
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    marginHorizontal: 15,
    marginTop: 16,
  },
  title: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginBottom: 8,
  },
  balances: {
    borderRadius: 8,
    minHeight: 86,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  categoryValues: {
    justifyContent: 'center',
  },
  summaryGroup: {
    width: '100%',
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  summaryValue: {
    alignItems: 'flex-end',
    flex: 1,
    minWidth: 0,
  },
  summaryText: {
    flexShrink: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.regular,
  },
  totalValues: {},
  totalText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    flexShrink: 1,
  },
  emptyText: {
    fontSize: typography.sizes.label,
    lineHeight: 19,
  },
});
