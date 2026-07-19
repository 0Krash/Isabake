import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppIcon from '../icons/AppIcon';
import { TransactionMenuButton } from '../TransactionBalance/TransactionMenu';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import { getBackupStatusIconName } from '../Sync/backupStatusModel';
import useBackupStatus from '../../hooks/sync/useBackupStatus';
import useCurrentWorkspaceScope from '../../hooks/workspace/useCurrentWorkspaceScope';
import useWorkspaces from '../../hooks/workspace/useWorkspaces';
import {
  isInvitationAttentionSeen,
  subscribeToInvitationAttention,
} from '../../data/workspace/invitationAttentionState';
import { formatWorkspaceName } from '../../screens/Workspace/workspaceUiModel';

const toneColor = (tone, colors) => {
  if (tone === 'success') {
    return colors.success;
  }

  if (tone === 'warning') {
    return '#B7791F';
  }

  if (tone === 'error') {
    return colors.danger;
  }

  if (tone === 'info') {
    return colors.primary;
  }

  return colors.textMuted;
};

export default function WorkspaceContextIndicator({
  menuIsVisible = false,
  onOpenMenu,
  onOpenSync,
  onOpenWorkspace,
  refreshKey = 0,
} = {}) {
  const { colors } = useTransactionBalanceTheme();
  const { backupStatus, loading: backupStatusLoading } = useBackupStatus({
    refreshKey,
  });
  const { workspace } = useCurrentWorkspaceScope();
  const workspaceState = useWorkspaces();
  const [attentionVersion, setAttentionVersion] = useState(0);
  const backupColor = toneColor(backupStatus?.tone, colors);
  const backupIconName = getBackupStatusIconName(backupStatus?.statusKey);
  const backupIsLoading =
    backupStatusLoading || backupStatus?.statusKey === 'syncing';
  const workspaceName = workspace
    ? formatWorkspaceName(workspace)
    : 'Cargando negocio';
  const hasInvitationAttention =
    workspaceState.myInvitations.length > 0 &&
    !isInvitationAttentionSeen(workspaceState.myInvitations);

  useEffect(
    () =>
      subscribeToInvitationAttention(() =>
        setAttentionVersion((version) => version + 1),
      ),
    [],
  );

  void attentionVersion;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primaryMuted || colors.border,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.accent, { backgroundColor: colors.primary }]}
      />
      <View style={styles.headerRow}>
        <TransactionMenuButton
          isOpen={menuIsVisible}
          onPress={() => {
            Keyboard.dismiss();
            onOpenMenu?.();
          }}
        />
        <Pressable
          accessibilityLabel="Abrir administrador de workspaces"
          accessibilityRole={onOpenWorkspace ? 'button' : undefined}
          disabled={!onOpenWorkspace}
          onPress={onOpenWorkspace}
          style={styles.copy}
        >
          <View style={styles.titleRow}>
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.textPrimary }]}
            >
              {workspaceName}
            </Text>
            {hasInvitationAttention ? (
              <View
                style={[
                  styles.attention,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <AppIcon
                  color={colors.primary}
                  decorative
                  name="notification-attention"
                  size={14}
                />
              </View>
            ) : null}
          </View>
        </Pressable>
        <View style={styles.statusSlot}>
          {backupStatus?.showInMainScreens ? (
            <Pressable
              accessibilityLabel={`Abrir centro de sincronización. ${backupStatus.title}`}
              accessibilityRole={onOpenSync ? 'button' : undefined}
              disabled={!onOpenSync}
              onPress={onOpenSync}
              style={[
                styles.status,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              {backupIsLoading ? (
                <ActivityIndicator color={backupColor} size="small" />
              ) : (
                <AppIcon
                  color={backupColor}
                  decorative
                  name={backupIconName}
                  size={20}
                />
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accent: {
    borderRadius: 2,
    bottom: 8,
    left: 0,
    position: 'absolute',
    top: 8,
    width: 3,
  },
  attention: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  container: {
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 12,
    marginTop: 4,
    minHeight: 42,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  copy: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 30,
  },
  status: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  statusSlot: {
    alignItems: 'center',
    width: 44,
  },
  title: {
    flexShrink: 1,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minWidth: 0,
  },
});
