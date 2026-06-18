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

  const getCategoryColor = (categoryId) => {
    switch (categoryId) {
      case '1':
        return '#EA4641';
      case '2':
        return '#F59C14';
      case '3':
        return '#2AC968';
      case '4':
        return '#3F7AE3';
      default:
        return '#9777DC';
    }
  };
  const categoryColor = getCategoryColor(category.categoryId);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      delayLongPress={180}
      onPress={() => {
        props.setTransactionDetailModalIsVisible(true);
        props.setTransactionDetail(props.data);
      }}
      onLongPress={() => {
        props.setDeleteTransactionModalIsVisible(true);
        props.setTransactionDetail(props.data);
      }}
      style={[
        styles.transactionCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.categoryAccentContainer}>
        <View style={[styles.categoryAccent, { backgroundColor: categoryColor }]} />
      </View>
      <View style={styles.transactionInfo}>
        <DescriptionText description={description} colors={colors} />
        <CategoryText
          category={category}
          colors={colors}
          itemQuantity={itemQuantity}
          quantity={quantity}
        />
      </View>
      <View style={styles.transactionMeta}>
        <AmountText amount={amount} colors={colors} />
        <DateText selectedDate={selectedDate} colors={colors} />
      </View>
    </TouchableOpacity>
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
  const amount = category.categoryId === '1' ? itemQuantity : quantity;

  return (
    <Text
      numberOfLines={1}
      style={[styles.categoryText, { color: colors.textMuted }]}
    >
      {category.description || 'Movimiento'} · x {amount || 0}
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
  categoryAccent: {
    borderRadius: 4,
    height: 58,
    width: 5,
  },
  categoryAccentContainer: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginRight: 10,
    width: 8,
  },
  transactionCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  transactionMeta: {
    alignItems: 'flex-end',
  },
  descriptionText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  categoryText: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  amountContainer: {
    flexDirection: 'row',
  },
  amountText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dateText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    marginTop: 2,
  },
});
