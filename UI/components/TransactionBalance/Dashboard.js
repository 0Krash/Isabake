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
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.textMuted }]}>
          Balance Total
        </Text>
      </View>
      <View style={[styles.balances, { backgroundColor: colors.surface }]}>
        {/* <View testID="dateFilters" style={styles.dateFilters}>
          <TouchableOpacity style={styles.baseFilter}>
            <Text style={styles.baseTextFilter}>Todos los días</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.baseFilter}>
            <Text style={styles.baseTextFilter}>Semana</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.baseFilter}>
            <Text style={styles.baseTextFilter}>Mes</Text>
          </TouchableOpacity>
        </View> */}
        <View testID="totalValues" style={styles.totalValues}></View>
        <View testID="categoryValues" style={styles.categoryValues}>
          {filteredTransactions.map((transaction, index) => (
            <View key={index} style={styles.summaryGroup}>
              {transaction.categories.map((category, idx) => (
                <View key={idx} style={styles.summaryRow}>
                  <View testID="categoryLabel">
                    <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
                      {category.category || 'Ventas'}:{' '}
                    </Text>
                  </View>
                  <View testID="categoryValues" style={styles.summaryValue}>
                    <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
                      {CurrencyFormatter.convertCentsToCurrency(
                        category.totalAmount
                      )}
                    </Text>
                  </View>
                </View>
              ))}
              <View style={styles.summaryRow}>
                <View>
                  <Text style={[styles.totalText, { color: colors.textPrimary }]}>
                    Total:{' '}
                  </Text>
                </View>
                <View style={styles.summaryValue}>
                  <Text style={[styles.totalText, { color: colors.textPrimary }]}>
                    {CurrencyFormatter.convertCentsToCurrency(
                      transaction.total
                    )}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    // borderColor: 'blue',
    // borderWidth: 2,
    flex: 1.5,
    marginHorizontal: 15,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    position: 'absolute',
    bottom: 5,
    left: 2,
  },
  balances: {
    flex: 3,
    backgroundColor: '#FEFCFF',
    borderRadius: 20,
    marginBottom: 10,
  },
  categoryValues: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 15,
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
  dateFilters: {
    height: 35,
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  baseFilter: {
    alignItems: 'center',
    backgroundColor: '#E5D6FF',
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    margin: 5,
    padding: 3,
  },
  baseTextFilter: {
    fontSize: typography.sizes.label,
    color: '#9777DC',
    fontWeight: typography.weights.medium,
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    marginTop: 10,
    paddingTop: 10,
    alignItems: 'center',
  },
  totalText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    flexShrink: 1,
  },
});
