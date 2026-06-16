import { View, Text, StyleSheet } from 'react-native';

import CurrencyFormatter from '../../../../utils/CurrencyFormatter';
import DateFormatter from '../../../../utils/DateFormatter';
import typography from '../../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';

const TransactionDetailItem = ({ transactionDetail }) => {
  const { colors } = useTransactionBalanceTheme();
  const {
    amount = '',
    category = '',
    description = '',
    itemQuantity = '',
    quantity = '',
    selectedDate = '',
    store = '',
    transactionId = '',
    uomId = '',
  } = transactionDetail;

  return (
    <View
      testID="descriptionItemContainer"
      style={styles.descriptionItemContainer}
    >
      <DescriptionItem colors={colors} description={description} />
      <AmountItem amount={amount} colors={colors} />
      {(category.categoryId === '1' || category.categoryId === '2') && (
        <>
          <StoreItem colors={colors} store={store} />
          <QuantityItem
            colors={colors}
            itemQuantity={itemQuantity}
            quantity={quantity}
            category={category}
          />
        </>
      )}
      <SelectedDateItem colors={colors} selectedDate={selectedDate} />
      <TransactionIdItem colors={colors} transactionId={transactionId} />
    </View>
  );
};

export default TransactionDetailItem;

const DescriptionItem = ({ colors, description }) => {
  return (
    <View style={styles.descriptionItemBase}>
      <Text style={[styles.descriptionItemTextBase, { color: colors.textPrimary }]}>
        {description}
      </Text>
    </View>
  );
};

const AmountItem = ({ amount, colors }) => {
  return (
    <View style={styles.descriptionItemBase}>
      <Text style={[styles.amountText, { color: colors.textPrimary }]}>
        {CurrencyFormatter.convertCentsToCurrency(amount)}
      </Text>
    </View>
  );
};

const StoreItem = ({ colors, store }) => {
  return (
    <View style={[styles.descriptionItemBase, styles.compactItem]}>
      <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
        {store.alias}
      </Text>
    </View>
  );
};

const SelectedDateItem = ({ colors, selectedDate }) => {
  return (
    <View style={styles.descriptionItemBase}>
      <Text style={[styles.descriptionItemTextBase, { color: colors.textPrimary }]}>
        {DateFormatter.convertISOtoSelected(selectedDate)}
      </Text>
    </View>
  );
};

const QuantityItem = ({ colors, itemQuantity, quantity, category }) => {
  return (
    <View style={[styles.descriptionItemBase, styles.compactItem]}>
      <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
        Cantidad de productos:{' '}
        {category.categoryId === '1' ? itemQuantity : quantity}
      </Text>
    </View>
  );
};

const TransactionIdItem = ({ colors, transactionId }) => {
  return (
    <View
      style={[
        styles.descriptionItemBase,
        {
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: 5,
        },
      ]}
    >
      <Text
        selectable={true}
        style={[styles.transactionIdText, { color: colors.textSecondary }]}
      >
        {transactionId}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  descriptionItemContainer: {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    // borderColor: 'blue',
    // borderWidth: 2,
  },
  descriptionItemBase: {
    alignItems: 'center',
    flex: 5,
    justifyContent: 'center',
    paddingHorizontal: 22,
    width: '100%',
    // borderColor: 'blue',
    // borderWidth: 2,
  },
  descriptionItemTextBase: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  amountText: {
    fontSize: typography.sizes.displayAmount,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  compactItem: {
    flex: 2,
  },
  secondaryText: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.regular,
    textAlign: 'center',
  },
  transactionIdText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    textAlign: 'right',
  },
});
