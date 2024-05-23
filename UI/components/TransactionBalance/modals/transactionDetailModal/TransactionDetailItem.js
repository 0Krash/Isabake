import { View, Text, StyleSheet } from 'react-native';

import CurrencyFormatter from '../../../../utils/CurrencyFormatter';

export default TransactionDetailItem = ({ transactionDetail }) => {
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
      <DescriptionItem description={description} />
      <AmountItem amount={amount} />
      {(category.categoryId === '1' || category.categoryId === '2') && (
        <>
          <StoreItem store={store} />
          <QuantityItem
            itemQuantity={itemQuantity}
            quantity={quantity}
            category={category}
          />
        </>
      )}
      <SelectedDateItem selectedDate={selectedDate} />
      <TransactionIdItem transactionId={transactionId} />
    </View>
  );
};

const DescriptionItem = ({ description }) => {
  return (
    <View style={styles.descriptionItemBase}>
      <Text style={styles.descriptionItemTextBase}>{description}</Text>
    </View>
  );
};

const AmountItem = ({ amount }) => {
  return (
    <View style={styles.descriptionItemBase}>
      <Text
        style={[
          styles.descriptionItemTextBase,
          { fontSize: 70, fontWeight: '100' },
        ]}
      >
        {CurrencyFormatter.convertCentsToCurrency(amount)}
      </Text>
    </View>
  );
};

const StoreItem = ({ store }) => {
  return (
    <View
      style={[
        styles.descriptionItemBase,
        {
          flex: 2,
        },
      ]}
    >
      <Text
        style={[
          styles.descriptionItemTextBase,
          { fontSize: 20, fontWeight: '400' },
        ]}
      >
        {store.alias}
      </Text>
    </View>
  );
};

const SelectedDateItem = ({ selectedDate }) => {
  return (
    <View style={styles.descriptionItemBase}>
      <Text style={styles.descriptionItemTextBase}>{selectedDate}</Text>
    </View>
  );
};

const QuantityItem = ({ itemQuantity, quantity, category }) => {
  return (
    <View
      style={[
        styles.descriptionItemBase,
        {
          flex: 2,
        },
      ]}
    >
      <Text
        style={[
          styles.descriptionItemTextBase,
          { fontSize: 20, fontWeight: '400' },
        ]}
      >
        Cantidad de productos:{' '}
        {category.categoryId === '1' ? itemQuantity : quantity}
      </Text>
    </View>
  );
};

const TransactionIdItem = ({ transactionId }) => {
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
        style={[
          styles.descriptionItemTextBase,
          { fontSize: 15, fontWeight: '400', color: '#fff' },
        ]}
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
    fontSize: 35,
    fontWeight: '400',
    textAlign: 'center',
  },
});
