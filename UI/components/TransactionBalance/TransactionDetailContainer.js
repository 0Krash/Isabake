import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

export default function TransactionDetailContainer(props) {
  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: getColor(props.data.category.categoryId) },
      ]}
    >
      <View style={styles.cardContainer}>
        <TouchableOpacity
          onLongPress={() => {
            props.setDeleteTransactionModalIsVisible(true);
            props.setTransactionDetail(props.data);
          }}
          delayLongPress={180}
          onPress={() => {
            props.setTransactionDetailModalIsVisible(true);
            props.setTransactionDetail(props.data);
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              left: 10,
              top: 5,
            }}
          >
            <Text
              style={{
                fontWeight: '400',
                fontSize: 20,
                color: '#3B3F3A',
              }}
            >
              {props.data.description.length > 20
                ? props.data.description.slice(0, 25) + '...'
                : props.data.description}
            </Text>
            <Text style={{ fontWeight: '400', fontSize: 22, color: '#3B3F3A' }}>
              {props.data.category.categoryId === '1'
                ? `\tx\ ` + props.data.itemQuantity
                : `\tx\ ` + props.data.quantity}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', left: 10, top: 5 }}>
            <Text style={{ fontWeight: '200', fontSize: 25, marginBottom: 5 }}>
              {props.data.amount}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Text style={{ fontWeight: '400', fontSize: 10 }}>
              {props.data.selectedDate}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 2.5,
    marginTop: 12,
    height: 90,
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
  category: {
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 2,
    transform: [{ rotate: '-90deg' }],
  },
  categoryText: {
    fontWeight: '600',
    fontSize: 8,
    color: 'white',
  },
});

const getColor = (categoryId) => {
  switch (categoryId) {
    case '1':
      return '#EA464198';
    // return '#FA8072';
    case '2':
      return '#F59C1498';
    // return '#E4007C';
    case '3':
      return '#2AC96898';
    // return '#FFC0CB';
    case '4':
      return '#3F7AE398';
    // return '#98348F';
    default:
      // return '#C7158598';
      return '#9777DC98';
  }
};
