import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import AppIcon from '../icons/AppIcon';

const MENU_WIDTH = 280;
const ANIMATION_DURATION = 240;

export const TransactionMenuButton = ({ isOpen, onPress }) => {
  const { colors } = useTransactionBalanceTheme();

  return (
    <TouchableOpacity
      accessibilityLabel={isOpen ? 'Cerrar menu' : 'Abrir menu'}
      activeOpacity={0.75}
      onPress={() => {
        Keyboard.dismiss();
        onPress?.();
      }}
      style={[styles.menuButton, { backgroundColor: colors.surface }]}
    >
      <AppIcon
        accessibilityLabel={isOpen ? 'Cerrar menu' : 'Abrir menu'}
        color={colors.textPrimary}
        name={isOpen ? 'close' : 'menu'}
        size={28}
      />
    </TouchableOpacity>
  );
};

export default function TransactionMenu({
  canWrite = true,
  isVisible,
  onAfterClose,
  onClose,
  onDismiss,
  onOpenAccount,
  onOpenAppOptions,
  onOpenSync,
  onOpenStoreManager,
  onOpenWorkspace,
}) {
  const { colors } = useTransactionBalanceTheme();
  const [shouldRender, setShouldRender] = useState(isVisible);
  const onAfterCloseRef = useRef(onAfterClose);
  const translateX = useRef(new Animated.Value(MENU_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const menuItems = [
    {
      description: 'Sesion, acceso y dispositivos.',
      label: 'Cuenta',
      onPress: onOpenAccount,
      value: 'Abrir',
    },
    {
      description: 'Equipo, accesos e invitaciones.',
      label: 'Administrar negocios',
      onPress: onOpenWorkspace,
      value: 'Abrir',
    },
    {
      description: 'Estado, respaldo e historial.',
      label: 'Respaldo y sync',
      onPress: onOpenSync,
      value: 'Abrir',
    },
    ...(canWrite
      ? [
          {
            description: 'Agrega o administra los puntos de venta disponibles.',
            label: 'Tiendas',
            onPress: onOpenStoreManager,
            value: 'Administrar',
          },
        ]
      : []),
    {
      description: 'Cambios por revisar y herramientas disponibles.',
      label: 'Opciones de la app',
      onPress: onOpenAppOptions,
      value: 'Abrir',
    },
  ];

  useEffect(() => {
    onAfterCloseRef.current = onAfterClose;
  }, [onAfterClose]);

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
        requestAnimationFrame(() => {
          onAfterCloseRef.current?.();
        });
      }
    });
  }, [backdropOpacity, isVisible, translateX]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onDismiss={onDismiss}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
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
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
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
                onPress={() => {
                  Keyboard.dismiss();
                  item.onPress?.();
                }}
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
