import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';

import AppCard from '../../components/layout/AppCard';
import AppHeader from '../../components/layout/AppHeader';
import AppScreen from '../../components/layout/AppScreen';
import AppIcon from '../../components/icons/AppIcon';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useAuthSession from '../../hooks/auth/useAuthSession';
import { createSettingsMenuItems } from '../../components/appNavigationModel';

const getAccountTitle = (session) =>
  session?.displayName || session?.email || 'Cuenta';

const getAccountDetail = (session) =>
  session?.email || 'Inicia sesion para compartir negocios y respaldar datos.';

export default function SettingsScreen({
  devToolsEnabled = false,
  onBack,
  onOpenAccount,
  onOpenClients,
  onOpenDevTools,
  onOpenStores,
  onOpenWorkspace,
} = {}) {
  const { colors } = useTransactionBalanceTheme();
  const auth = useAuthSession();
  const [message, setMessage] = useState(null);
  const accountTitle = getAccountTitle(auth.session);
  const accountDetail = getAccountDetail(auth.session);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (onBack) {
          onBack();
          return true;
        }

        return false;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [onBack]);

  const openComingSoon = (key) => {
    if (key === 'clients') {
      setMessage(
        'Clientes se usara para agregar compradores a las ventas y controlar mejor las transacciones.',
      );
      return;
    }

    setMessage('Estas opciones se agregaran aqui.');
  };

  const handleSelect = (key) => {
    setMessage(null);

    if (key === 'workspace') {
      onOpenWorkspace?.();
      return;
    }

    if (key === 'stores') {
      onOpenStores?.();
      return;
    }

    if (key === 'clients') {
      onOpenClients?.();
      return;
    }

    if (key === 'dev-sync') {
      onOpenDevTools?.();
      return;
    }

    openComingSoon(key);
  };

  return (
    <AppScreen>
      <AppHeader title="Configuracion" />

      <Pressable
        accessibilityLabel="Abrir cuenta"
        accessibilityRole="button"
        onPress={onOpenAccount}
        style={[
          styles.accountCard,
          {
            backgroundColor: colors.surface,
            borderColor: auth.session ? colors.primary : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.accountIcon,
            { backgroundColor: colors.primaryMuted, borderColor: colors.border },
          ]}
        >
          <AppIcon
            color={auth.session ? colors.primary : colors.textMuted}
            decorative
            name="account-user"
            size={30}
          />
        </View>
        <Text style={[styles.accountEyebrow, { color: colors.textMuted }]}>
          Cuenta
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.accountTitle, { color: colors.textPrimary }]}
        >
          {accountTitle}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.accountDetail, { color: colors.textSecondary }]}
        >
          {accountDetail}
        </Text>
      </Pressable>

      <View style={styles.list}>
        {createSettingsMenuItems({ devToolsEnabled }).map((item) => (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="button"
            key={item.key}
            onPress={() => handleSelect(item.key)}
            style={[
              styles.item,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.itemCopy}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                {item.label}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.itemDescription, { color: colors.textMuted }]}
              >
                {item.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {message ? (
        <AppCard>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>
        </AppCard>
      ) : null}

    </AppScreen>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  accountDetail: {
    fontSize: typography.sizes.bodySmall,
    textAlign: 'center',
  },
  accountEyebrow: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  accountIcon: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  accountTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  item: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 64,
    padding: 12,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemDescription: {
    fontSize: typography.sizes.label,
    marginTop: 3,
  },
  itemTitle: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  list: {
    gap: 10,
  },
  message: {
    fontSize: typography.sizes.bodySmall,
  },
});
