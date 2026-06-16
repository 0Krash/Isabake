import { StyleSheet, View, Text } from 'react-native';
import CurrencyFormatter from '../../utils/CurrencyFormatter';

export default function Dashboard({
  transactionType,
  totalAmountByCategoryResponse,
  totalAmountByDateCategoryResponse,
}) {
  const filteredTransactions = totalAmountByCategoryResponse.filter(
    (transaction) => transaction.transactionType === transactionType
  );

  return (
    <View style={styles.mainContainer}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Balance Total</Text>
      </View>
      <View style={styles.balances}>
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
                    <Text>{category.category || 'Ventas'}: </Text>
                  </View>
                  <View testID="categoryValues" style={styles.summaryValue}>
                    <Text>
                      {CurrencyFormatter.convertCentsToCurrency(
                        category.totalAmount
                      )}
                    </Text>
                  </View>
                </View>
              ))}
              <View style={styles.summaryRow}>
                <View>
                  <Text style={{ fontWeight: '600' }}>Total: </Text>
                </View>
                <View style={styles.summaryValue}>
                  <Text style={{ fontWeight: '600' }}>
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
    fontSize: 12,
    color: '#9E9AAB',
    fontWeight: '500',
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
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    // borderColor: 'blue',
    // borderWidth: 2,
  },
  summaryGroup: {
    paddingLeft: 60,
  },
  summaryRow: {
    width: '100%',
    paddingLeft: 30,
    display: 'flex',
    flexDirection: 'row',
  },
  summaryValue: {
    flex: 1,
    paddingRight: 90,
    alignItems: 'flex-end',
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
    fontSize: 15,
    color: '#9777DC',
    fontWeight: '500',
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    marginTop: 10,
    paddingTop: 10,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
