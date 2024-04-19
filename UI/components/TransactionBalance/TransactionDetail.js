import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import TransactionDetailContainer from './TransactionDetailContainer';

export default function TransactionDetail({
  dataTransactionsResponse,
  transactionType,
}) {
  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.transactionDetailContainer}
        showsVerticalScrollIndicator={false}
      >
        {dataTransactionsResponse
          .filter((item) => item.transactionType === transactionType)
          .sort((a, b) => b.transactionId - a.transactionId)
          .map((item, index) => (
            <TransactionDetailContainer key={index} data={item} />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 5,
    marginHorizontal: 15,
    marginBottom: 20,
  },
  transactionDetailContainer: {
    flex: 1,
    backgroundColor: '#EFECFF',
    borderRadius: 20,
    marginVertical: 10,
    alignContent: 'center',
  },
});
