import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { TransactionMenuButton } from '../TransactionBalance/TransactionMenu';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
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
  const { backupStatus } = useBackupStatus({ refreshKey });
  const { workspace } = useCurrentWorkspaceScope();
  const workspaceState = useWorkspaces();
  const [attentionVersion, setAttentionVersion] = useState(0);
  const backupColor = toneColor(backupStatus?.tone, colors);
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
              {formatWorkspaceName(workspace)}
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
                <Text style={[styles.attentionText, { color: colors.primary }]}>
                  !
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        {backupStatus?.showInMainScreens ? (
          <Pressable
            accessibilityLabel="Abrir centro de sincronización"
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
            <View style={[styles.dot, { backgroundColor: backupColor }]} />
            <Text
              numberOfLines={1}
              style={[styles.statusText, { color: colors.textSecondary }]}
            >
              {backupStatus.title}
            </Text>
            {backupStatus.primaryActionLabel ? (
              <Text style={[styles.actionText, { color: colors.primary }]}>
                {backupStatus.primaryActionLabel}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
        <TransactionMenuButton
          isOpen={menuIsVisible}
          onPress={() => {
            Keyboard.dismiss();
            onOpenMenu?.();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  accent: {
    borderRadius: 2,
    bottom: 10,
    left: 0,
    position: 'absolute',
    top: 10,
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
  attentionText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  container: {
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 12,
    marginTop: 6,
    minHeight: 46,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  copy: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
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
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
    justifyContent: 'flex-end',
    maxWidth: '46%',
    minHeight: 28,
    paddingHorizontal: 8,
  },
  statusText: {
    flexShrink: 1,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
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
