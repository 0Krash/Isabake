import React from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import typography from '../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../context/TransactionBalanceThemeContext';
import { createSecondaryMenuItems } from './appNavigationModel';

export { createSecondaryMenuItems };

export default function AppSecondaryMenu({
  devToolsEnabled = false,
  onClose,
  onSelect,
  visible,
}) {
  const { colors } = useTransactionBalanceTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalContainer}>
        <Pressable
          accessibilityLabel="Cerrar opciones"
          onPress={() => {
            Keyboard.dismiss();
            onClose?.();
          }}
          style={[styles.backdrop, { backgroundColor: colors.softBackdrop }]}
        />
        <SafeAreaView
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderLeftColor: colors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Opciones
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Cuenta, respaldo y negocio compartido
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.closeText, { color: colors.textPrimary }]}>
                Cerrar
              </Text>
            </Pressable>
          </View>
          <View style={styles.items}>
            {createSecondaryMenuItems({ devToolsEnabled }).map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  Keyboard.dismiss();
                  onSelect?.(item.key);
                }}
                style={[
                  styles.item,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  {item.label}
                </Text>
                <Text
                  style={[styles.itemDescription, { color: colors.textMuted }]}
                >
                  {item.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  closeText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerCopy: {
    flex: 1,
  },
  item: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  itemDescription: {
    fontSize: typography.sizes.label,
    marginTop: 4,
  },
  itemTitle: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  items: {
    gap: 10,
  },
  modalContainer: {
    flex: 1,
  },
  sheet: {
    borderLeftWidth: 1,
    borderTopLeftRadius: 28,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 18,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 304,
  },
  subtitle: {
    fontSize: typography.sizes.label,
    marginTop: 4,
  },
  title: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
});
