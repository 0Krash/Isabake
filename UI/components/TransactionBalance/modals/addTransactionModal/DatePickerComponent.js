import React from 'react';
import { Text, TextInput, View, Keyboard } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import stylesBase from '../../../../constants/TransactionBalance/Styles';
import DateFormatter from '../../../../utils/DateFormatter';

const handleInputFocus = () => {
  Keyboard.dismiss();
};

export default function DatePickerComponent({
  isDatePickerVisible,
  showDatePicker,
  hideDatePicker,
  handleConfirm,
  selectedDate,
}) {
  return (
    <View testID="date">
      <Text style={stylesBase.textInputLabelBase}>Fecha</Text>
      <TextInput
        autoCorrect={false}
        style={[stylesBase.textInputBase, { width: 150 }]}
        onPressIn={showDatePicker}
        onFocus={handleInputFocus}
        value={selectedDate}
      />
      <DateTimePickerModal
        date={DateFormatter.selectedToDate(selectedDate)}
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
      />
    </View>
  );
}
