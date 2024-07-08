import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

import CurrencyFormatter from '../../utils/CurrencyFormatter';
import DateFormatter from '../../utils/DateFormatter';

export default function TransactionDetailContainer(props) {
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
      <View style={styles.cardContainer}>
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
            <DescriptionText description={description} />
            <CategoryText
              category={category}
              itemQuantity={itemQuantity}
              quantity={quantity}
            />
          </View>
          <View style={styles.bottomStyle}>
            <AmountText amount={amount} />
            <DateText selectedDate={selectedDate} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const DescriptionText = ({ description }) => {
  return (
    <Text
      style={{
        fontWeight: '400',
        fontSize: 20,
        color: '#3B3F3A',
      }}
    >
      {description.length > 20 ? description.slice(0, 25) + '...' : description}
    </Text>
  );
};

const CategoryText = ({ category, itemQuantity, quantity }) => {
  return (
    <Text style={styles.categoryText}>
      {category.categoryId === '1'
        ? `\tx\ ` + itemQuantity
        : `\tx\ ` + quantity}
    </Text>
  );
};

const AmountText = ({ amount }) => {
  return (
    <View style={{ flexDirection: 'row', left: 10, top: 5 }}>
      <Text style={{ fontWeight: '200', fontSize: 22, marginBottom: 5 }}>
        {CurrencyFormatter.convertCentsToCurrency(amount)}
      </Text>
    </View>
  );
};

const DateText = ({ selectedDate }) => {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      <Text style={{ fontWeight: '400', fontSize: 10 }}>
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
    backgroundColor: '#FEFCFF',
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
  categoryText: {
    fontWeight: '400',
    fontSize: 20,
    color: '#3B3F3A',
  },
});
