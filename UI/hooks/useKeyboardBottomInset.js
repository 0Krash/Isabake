import { useEffect, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  useWindowDimensions,
} from 'react-native';

const ANDROID_BOTTOM_SHEET_INSET = 24;
const KEYBOARD_VISUAL_GAP = 26;

export default function useKeyboardBottomInset() {
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const layoutInset = Math.max(
    0,
    Dimensions.get('screen').height - windowHeight,
  );
  const resizedKeyboardInset = layoutInset > 120 ? layoutInset : 0;
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showListener = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  if (resizedKeyboardInset > 0) {
    return KEYBOARD_VISUAL_GAP;
  }

  if (keyboardHeight > 0) {
    return keyboardHeight + KEYBOARD_VISUAL_GAP;
  }

  return Platform.OS === 'android' ? ANDROID_BOTTOM_SHEET_INSET : 0;
}
