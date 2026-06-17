import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import { TRANSACTIONS_PAGE_SIZE } from '../../hooks/TransactionBalance/useTransactionBalanceData';

const MENU_WIDTH = 280;
const ANIMATION_DURATION = 240;

const MenuIcon = ({ color, isOpen }) => (
  <View style={styles.icon}>
    <View
      style={[
        styles.iconLine,
        styles.iconLineTop,
        {
          backgroundColor: color,
          transform: [
            { translateY: isOpen ? 7 : 0 },
            { rotate: isOpen ? '45deg' : '0deg' },
          ],
        },
      ]}
    />
    <View
      style={[
        styles.iconLine,
        {
          backgroundColor: color,
          opacity: isOpen ? 0 : 1,
        },
      ]}
    />
    <View
      style={[
        styles.iconLine,
        styles.iconLineBottom,
        {
          backgroundColor: color,
          transform: [
            { translateY: isOpen ? -7 : 0 },
            { rotate: isOpen ? '-45deg' : '0deg' },
          ],
        },
      ]}
    />
  </View>
);

export const TransactionMenuButton = ({ isOpen, onPress }) => {
  const { colors } = useTransactionBalanceTheme();

  return (
    <TouchableOpacity
      accessibilityLabel={isOpen ? 'Cerrar menu' : 'Abrir menu'}
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.menuButton, { backgroundColor: colors.surface }]}
    >
      <MenuIcon color={colors.textPrimary} isOpen={isOpen} />
    </TouchableOpacity>
  );
};

export default function TransactionMenu({
  isVisible,
  onClose,
  onOpenStoreManager,
}) {
  const { colorScheme, colors } = useTransactionBalanceTheme();
  const [shouldRender, setShouldRender] = useState(isVisible);
  const translateX = useRef(new Animated.Value(MENU_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const menuItems = [
    {
      description: 'Respeta el modo claro u oscuro del telefono.',
      label: 'Tema del telefono',
      value: colorScheme === 'dark' ? 'Oscuro' : 'Claro',
    },
    {
      description: 'Formato usado para importes y reportes.',
      label: 'Moneda',
      value: 'MXN',
    },
    {
      description: 'Movimientos que se cargan al bajar la lista.',
      label: 'Registros por carga',
      value: `${TRANSACTIONS_PAGE_SIZE}`,
    },
    {
      description: 'Agrega o administra los puntos de venta disponibles.',
      label: 'Tiendas',
      onPress: onOpenStoreManager,
      value: 'Administrar',
    },
  ];

  useEffect(() => {
    if (isVisible) {
      translateX.stopAnimation();
      backdropOpacity.stopAnimation();
      translateX.setValue(MENU_WIDTH);
      backdropOpacity.setValue(0);
      setShouldRender(true);

      Animated.parallel([
        Animated.timing(translateX, {
          duration: ANIMATION_DURATION,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          duration: ANIMATION_DURATION,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateX, {
        duration: ANIMATION_DURATION,
        toValue: MENU_WIDTH,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        duration: ANIMATION_DURATION,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setShouldRender(false);
      }
    });
  }, [backdropOpacity, isVisible, translateX]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={shouldRender}
    >
      <View style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: colors.softBackdrop,
              opacity: backdropOpacity,
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Cerrar menu"
            onPress={onClose}
            style={styles.backdropPressable}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.surface,
              borderLeftColor: colors.border,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>
              Configuracion
            </Text>
            <TransactionMenuButton isOpen onPress={onClose} />
          </View>

          <View style={styles.itemsContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                activeOpacity={item.onPress ? 0.75 : 1}
                disabled={!item.onPress}
                key={item.label}
                onPress={item.onPress}
                style={[
                  styles.menuItem,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.menuItemHeader}>
                  <Text
                    style={[styles.menuItemText, { color: colors.textPrimary }]}
                  >
                    {item.label}
                  </Text>
                  <Text style={[styles.menuItemValue, { color: colors.primary }]}>
                    {item.value}
                  </Text>
                </View>
                <Text
                  style={[styles.menuItemDescription, { color: colors.textMuted }]}
                >
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPressable: {
    flex: 1,
  },
  drawer: {
    borderLeftWidth: 1,
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 28,
    position: 'absolute',
    right: 0,
    top: 0,
    width: MENU_WIDTH,
  },
  drawerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  drawerTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
  },
  icon: {
    height: 22,
    justifyContent: 'center',
    width: 24,
  },
  iconLine: {
    borderRadius: 2,
    height: 2,
    width: 24,
  },
  iconLineBottom: {
    marginTop: 5,
  },
  iconLineTop: {
    marginBottom: 5,
  },
  itemsContainer: {
    gap: 12,
  },
  menuButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  menuItem: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemDescription: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    lineHeight: 17,
    marginTop: 6,
  },
  menuItemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  menuItemText: {
    flex: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.medium,
  },
  menuItemValue: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  modalContainer: {
    flex: 1,
  },
});
