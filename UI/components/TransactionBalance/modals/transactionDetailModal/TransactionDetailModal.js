import {
  View,
  Text,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';

import TransactionDetailItem from './TransactionDetailItem';

export default function TransactionDetailModal({
  setTransactionDetailModalIsVisible,
  transactionDetailModalIsVisible,
  transactionDetail,
}) {
  const { category = '' } = transactionDetail;

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={transactionDetailModalIsVisible}
      onRequestClose={() => {
        setTransactionDetailModalIsVisible(false);
      }}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <View style={styles.mainContainer}>
          <View style={[styles.modalContainerBase, { height: '65%' }]}>
            <CategoryLabel category={category} />
            <TransactionDetailItem transactionDetail={transactionDetail} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const CategoryLabel = ({ category }) => {
  return (
    <View
      testID="categoryLabel"
      style={{
        height: '10%',
        alignItems: 'center',
      }}
    >
      <View
        style={[
          styles.modalContainerBase,
          styles.categoryLabel,
          {
            backgroundColor: getColor(category.categoryId),
          },
        ]}
      />
      <Text style={styles.categoryLabelText}>{category.shortDescription}</Text>
      <View
        style={[styles.modalContainerBase, styles.categoryLabel, { top: 20 }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainerBase: {
    backgroundColor: '#EFECFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    width: '100%',
  },
  descriptionContainer: { height: '100%' },
  categoryLabel: {
    position: 'absolute',
    height: '100%',
  },
  categoryLabelText: {
    color: '#FFFF',
    fontWeight: '700',
    paddingTop: 2,
    letterSpacing: 3,
  },
});

const getColor = (categoryId) => {
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
