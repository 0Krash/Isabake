import { Modal, KeyboardAvoidingView, StyleSheet, View } from 'react-native';

const AddStoreModal = () => {
  return (
    <Modal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <View style={styles.mainContainer}></View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddStoreModal;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalView: {
    backgroundColor: '#EFECFF',
    flex: 6,
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 15,
  },
  modalContaier: {
    paddingHorizontal: 5,
    flex: 1,
  },
  inputContainer: {
    height: 350,
  },
  switchContainer: {
    height: 90,
    marginBottom: 10,
  },
});
