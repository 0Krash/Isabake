import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

import CurrencyFormatter from '../../utils/CurrencyFormatter';
import DateFormatter from '../../utils/DateFormatter';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

export default function TransactionDetailContainer(props) {
  const { colors } = useTransactionBalanceTheme();
  const {
    amount = '',
    category = '',
    description = '',
    itemQuantity = '',
    quantity = '',
    selectedDate = '',
  } = props.data;

  const getColor = (categoryId) => {
    switch (categoryId) {
      case '1':
        return '#EA464198';
      case '2':
        return '#F59C1498';
      case '3':
        return '#2AC96898';
      case '4':
        return '#3F7AE398';
      default:
        return '#9777DC98';
    }
  };

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: getColor(category.categoryId) },
      ]}
    >
      <View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          delayLongPress={180}
          onPress={() => {
            props.setTransactionDetailModalIsVisible(true);
            props.setTransactionDetail(props.data);
          }}
          onLongPress={() => {
            props.setDeleteTransactionModalIsVisible(true);
            props.setTransactionDetail(props.data);
          }}
        >
          <View style={styles.headerStyle}>
            <DescriptionText description={description} colors={colors} />
            <CategoryText
              category={category}
              colors={colors}
              itemQuantity={itemQuantity}
              quantity={quantity}
            />
          </View>
          <View style={styles.bottomStyle}>
            <AmountText amount={amount} colors={colors} />
            <DateText selectedDate={selectedDate} colors={colors} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const DescriptionText = ({ description, colors }) => {
  return (
    <Text style={[styles.descriptionText, { color: colors.textPrimary }]}>
      {description.length > 20 ? description.slice(0, 25) + '...' : description}
    </Text>
  );
};

const CategoryText = ({ category, colors, itemQuantity, quantity }) => {
  return (
    <Text style={[styles.categoryText, { color: colors.textPrimary }]}>
      {category.categoryId === '1'
        ? `\tx\ ` + itemQuantity
        : `\tx\ ` + quantity}
    </Text>
  );
};

const AmountText = ({ amount, colors }) => {
  return (
    <View style={styles.amountContainer}>
      <Text style={[styles.amountText, { color: colors.textPrimary }]}>
        {CurrencyFormatter.convertCentsToCurrency(amount)}
      </Text>
    </View>
  );
};

const DateText = ({ selectedDate, colors }) => {
  return (
    <View style={styles.dateContainer}>
      <Text style={[styles.dateText, { color: colors.textSecondary }]}>
        {DateFormatter.convertISOtoSelected(selectedDate)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 2.5,
    marginTop: 4,
    height: 70,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  cardContainer: {
    padding: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    position: 'absolute',
    height: '101%',
    width: '99%',
  },
  headerStyle: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    left: 10,
    top: 0,
  },
  bottomStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    top: -6,
  },
  descriptionText: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.regular,
  },
  categoryText: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.regular,
  },
  amountContainer: {
    flexDirection: 'row',
    left: 10,
    top: 5,
  },
  amountText: {
    fontSize: typography.sizes.amount,
    fontWeight: typography.weights.medium,
    marginBottom: 5,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dateText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
  },
});
