import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

export default function DeleteConfirmationModal({
  confirmLabel = 'Eliminar',
  isProcessing = false,
  message,
  onCancel,
  onConfirm,
  title = 'Eliminar',
  visible,
}) {
  const { colors } = useTransactionBalanceTheme();

  const closeModal = () => {
    if (!isProcessing) {
      onCancel?.();
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={closeModal}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.root}
      >
        <Pressable
          onPress={closeModal}
          style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.screenBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>
            {message}
          </Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>
            ¿Estás seguro de eliminar?
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isProcessing}
              onPress={closeModal}
              style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text
                numberOfLines={1}
                style={[styles.secondaryText, { color: colors.textPrimary }]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isProcessing}
              onPress={onConfirm}
              style={[
                styles.button,
                {
                  backgroundColor: isProcessing
                    ? colors.surfaceMuted
                    : colors.danger,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.primaryText,
                  {
                    color: isProcessing
                      ? colors.inactiveText
                      : colors.textInverse,
                  },
                ]}
              >
                {isProcessing ? 'Eliminando...' : confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  button: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 18,
    padding: 18,
    width: '90%',
  },
  message: {
    fontSize: typography.sizes.label,
    lineHeight: 19,
    marginTop: 8,
  },
  primaryText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  root: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  title: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
  },
});
