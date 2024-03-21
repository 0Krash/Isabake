import { useState } from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';

import AddTransactionModal from './modals/AddTransactionModal';

export default function AddTransactionButton() {
  const [AddTransactionModalIsVisible, setAddTransactionModalIsVisible] =
    useState(false);

  const openModal = () => {
    setAddTransactionModalIsVisible(true);
  };

  const closeModal = () => {
    setAddTransactionModalIsVisible(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.mainContainer} onPress={openModal}>
        <View style={{ height: 48 }}>
          <Text
            style={{
              fontSize: 40,
              fontWeight: '300',
              color: '#FEFCFF',
              textAlign: 'center',
            }}
          >
            +
          </Text>
        </View>
      </TouchableOpacity>
      <AddTransactionModal
        visible={AddTransactionModalIsVisible}
        onClose={closeModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    position: 'absolute',
    top: '3%',
    left: '80%',
    backgroundColor: '#6D37FF',
    height: 50,
    width: 50,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
