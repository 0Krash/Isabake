import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { capitalizeUserEntry } from '../../utils/textEntryFormat';
import {
  formatWorkspaceRole,
  formatWorkspaceRoleDescription,
  formatWorkspaceDate,
  getShareAccountRequiredModalState,
  getWorkspaceAccountAccessState,
  getCurrentWorkspaceCardState,
  getInvitationActionState,
  getInvitationFormState,
  getMemberActionState,
  getWorkspaceEmptyState,
  getWorkspaceLeaveActionState,
  getWorkspaceRowState,
  getWorkspaceTabState,
  sanitizeInvitationForDisplay,
} from './workspaceUiModel';
import AppIcon from '../../components/icons/AppIcon';
import useKeyboardBottomInset from '../../hooks/useKeyboardBottomInset';

const invitationRoleOptions = ['admin', 'member', 'viewer'];
const memberRoleOptions = ['owner', 'admin', 'member', 'viewer'];
function getToneColor(colors, tone) {
  if (tone === 'danger') {
    return colors.danger;
  }

  if (tone === 'success') {
    return colors.success;
  }

  if (tone === 'warning') {
    return '#D19A2A';
  }

  if (tone === 'primary') {
    return colors.primary;
  }

  return colors.textSecondary;
}

function Avatar({ colors, label }) {
  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor: colors.primaryMuted, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.avatarText, { color: colors.primaryText }]}>
        {label}
      </Text>
    </View>
  );
}

function WorkspaceTypeIcon({ colors, style, workspace }) {
  const isRemote = Boolean(workspace?.isRemote);

  return (
    <View
      style={[
        styles.avatar,
        styles.workspaceTypeIcon,
        style,
        { backgroundColor: colors.primaryMuted, borderColor: colors.border },
      ]}
    >
      <AppIcon
        color={colors.primaryText}
        name={isRemote ? 'project-shared' : 'project-private'}
        size={24}
      />
    </View>
  );
}

function StatusBadge({ colors, label, tone = 'neutral' }) {
  const color = getToneColor(colors, tone);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor:
            tone === 'primary' ? colors.primaryMuted : colors.surfaceMuted,
          borderColor: color,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function EmptyState({ colors, children }) {
  return (
    <Text style={[styles.meta, { color: colors.textMuted }]}>{children}</Text>
  );
}

export function BusinessContextCard({ colors, role, workspace }) {
  const card = getCurrentWorkspaceCardState(workspace, role);

  return (
    <View
      style={[
        styles.activeBusinessPanel,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.activeBusinessAccent,
          { backgroundColor: colors.primary },
        ]}
      />
      <View style={styles.activeBusinessLayout}>
        <WorkspaceTypeIcon
          colors={colors}
          style={styles.activeBusinessIcon}
          workspace={workspace}
        />
        <View style={styles.activeBusinessCopy}>
          <Text
            style={[styles.activeBusinessKicker, { color: colors.primaryText }]}
          >
            Negocio actual
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.activeBusinessName, { color: colors.textPrimary }]}
          >
            {card.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.meta,
              styles.activeBusinessMeta,
              { color: colors.textMuted },
            ]}
          >
            {card.detailLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function AccountAccessButton({
  colors,
  loading = false,
  onPress,
  session,
}) {
  const state = getWorkspaceAccountAccessState({ loading, session });
  const accentColor = state.signedIn ? colors.primary : colors.textMuted;

  return (
    <Pressable
      accessibilityLabel={`${state.label}. ${state.actionLabel}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.accountAccessButton,
        state.signedIn ? styles.accountAccessButtonActive : null,
        {
          backgroundColor: state.signedIn
            ? colors.primaryMuted
            : colors.surfaceMuted,
          borderColor: state.signedIn ? colors.primary : colors.border,
        },
      ]}
    >
      <AppIcon
        color={accentColor}
        decorative
        name={state.iconName}
        size={state.signedIn ? 24 : 22}
      />
    </Pressable>
  );
}

export function BusinessShareTabs({
  activeTab,
  colors,
  onChange,
  showInvitationAttention = false,
}) {
  return (
    <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
      {getWorkspaceTabState(activeTab).map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[
            styles.tab,
            {
              backgroundColor: tab.active
                ? colors.primaryMuted
                : colors.surface,
            },
          ]}
        >
          <View style={styles.tabLabelRow}>
            <Text
              style={[
                styles.tabText,
                {
                  color: tab.active ? colors.primaryText : colors.inactiveText,
                },
              ]}
            >
              {tab.label}
            </Text>
            {tab.key === 'invitations' && showInvitationAttention ? (
              <View
                style={[styles.tabAttention, { borderColor: colors.primary }]}
              >
                <AppIcon
                  color={colors.primary}
                  decorative
                  name="notification-attention"
                  size={12}
                />
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function MemberRow({
  activeOwnerCount,
  colors,
  isSelected,
  loading,
  member,
  onRemove,
  onSelect,
  role,
}) {
  const actionState = getMemberActionState({
    loading,
    member: {
      ...member,
      lastActiveOwner: member.roleKey === 'owner' && activeOwnerCount <= 1,
    },
    role,
  });

  return (
    <Pressable
      onPress={() => onSelect(member)}
      style={[
        styles.listRow,
        {
          backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
    >
      <Avatar colors={colors} label={member.initials} />
      <View style={styles.rowText}>
        <Text
          numberOfLines={1}
          style={[styles.body, { color: colors.textPrimary }]}
        >
          {member.displayName}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {member.role}
        </Text>
      </View>
      {member.isCurrentUser ? (
        <StatusBadge colors={colors} label="Tú" tone="primary" />
      ) : null}
      {actionState.showAction ? (
        <Pressable
          disabled={!actionState.canRemove}
          onPress={() => onRemove(member)}
          style={[
            styles.compactButton,
            {
              borderColor: actionState.canRemove
                ? colors.danger
                : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.compactButtonText,
              {
                color: actionState.canRemove ? colors.danger : colors.textMuted,
              },
            ]}
          >
            {actionState.actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function MemberDetailPanel({
  canAdminWorkspace,
  colors,
  loading,
  member,
  onClose,
  onUpdateRole,
}) {
  const [ownerConfirmationOpen, setOwnerConfirmationOpen] = useState(false);

  if (!member) {
    return null;
  }

  const canEditRole =
    canAdminWorkspace && !member.isCurrentUser && member.roleKey !== 'owner';
  const requestRoleChange = (nextRole) => {
    if (nextRole === 'owner') {
      setOwnerConfirmationOpen(true);
      return;
    }

    onUpdateRole(member.userId, nextRole);
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={
        ownerConfirmationOpen ? () => setOwnerConfirmationOpen(false) : onClose
      }
      transparent
      visible
    >
      <View style={styles.modalRoot}>
        <Pressable
          onPress={onClose}
          style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
        />
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.screenBackground || colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.rowText}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                {member.displayName}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Informacion del usuario
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.iconButton, { borderColor: colors.border }]}
            >
              <Text
                style={[
                  styles.compactButtonText,
                  { color: colors.textPrimary },
                ]}
              >
                X
              </Text>
            </Pressable>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailLine}>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Correo
              </Text>
              <Text style={[styles.body, { color: colors.textPrimary }]}>
                {member.email || 'Sin correo registrado'}
              </Text>
            </View>
            <View style={styles.detailLine}>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Fecha de ingreso
              </Text>
              <Text style={[styles.body, { color: colors.textPrimary }]}>
                {formatWorkspaceDate(member.createdAt)}
              </Text>
            </View>
            <View style={styles.detailLine}>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Rol
              </Text>
              <Text style={[styles.body, { color: colors.textPrimary }]}>
                {member.role}
              </Text>
            </View>
          </View>

          {canEditRole ? (
            <View
              style={[
                styles.subsection,
                styles.modalSection,
                { borderTopColor: colors.border },
              ]}
            >
              <Text style={[styles.body, { color: colors.textPrimary }]}>
                Cambiar rol
              </Text>
              <View style={styles.roleOptionList}>
                {memberRoleOptions.map((option) => {
                  const selected = member.roleKey === option;

                  return (
                    <Pressable
                      disabled={loading || selected}
                      key={option}
                      onPress={() => requestRoleChange(option)}
                      style={[
                        styles.roleOptionCard,
                        {
                          backgroundColor: selected
                            ? colors.primaryMuted
                            : colors.surfaceMuted,
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: selected
                              ? colors.primaryText
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {formatWorkspaceRole(option)}
                      </Text>
                      <Text style={[styles.note, { color: colors.textMuted }]}>
                        {formatWorkspaceRoleDescription(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
        {ownerConfirmationOpen ? (
          <PromoteOwnerPanel
            colors={colors}
            loading={loading}
            member={member}
            onClose={() => setOwnerConfirmationOpen(false)}
            onConfirm={async () => {
              const result = await onUpdateRole(member.userId, 'owner');

              if (result?.ok) {
                setOwnerConfirmationOpen(false);
              }
            }}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function PromoteOwnerPanel({ colors, loading, member, onClose, onConfirm }) {
  return (
    <View style={styles.confirmationLayer}>
      <Pressable
        disabled={loading}
        onPress={onClose}
        style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
      />
      <View
        style={[
          styles.modalCard,
          {
            backgroundColor: colors.screenBackground || colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Hacer propietario a {member?.displayName || 'Usuario del negocio'}
        </Text>
        <Text style={[styles.note, { color: colors.textMuted }]}>
          Esta persona tendra control total del negocio. Podra crear, eliminar y
          editar cualquier cosa.
        </Text>
        <Text style={[styles.note, { color: colors.textMuted }]}>
          Una vez aprovado no podras cambiar su rol en este negocio.
        </Text>
        <View style={styles.modalActions}>
          <Pressable
            disabled={loading}
            onPress={onClose}
            style={[
              styles.secondaryButton,
              styles.modalButton,
              { borderColor: colors.border },
            ]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Cancelar
            </Text>
          </Pressable>
          <Pressable
            disabled={loading}
            onPress={onConfirm}
            style={[
              styles.primaryButton,
              styles.modalButton,
              {
                backgroundColor: loading ? colors.surfaceMuted : colors.danger,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                { color: loading ? colors.inactiveText : colors.textInverse },
              ]}
            >
              {loading ? 'Actualizando...' : 'Hacer propietario'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function TeamTab({
  canAdminWorkspace,
  colors,
  currentWorkspace,
  isLocalWorkspace = false,
  loading,
  members,
  onInviteUser,
  onLeaveWorkspace,
  onRemove,
  onUpdateRole,
  role,
}) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const selectedMember = members.find(
    (member) => member.userId === selectedMemberId,
  );
  const activeOwnerCount = members.filter(
    (member) => member.roleKey === 'owner',
  ).length;
  const handleMemberAction = (member) => {
    if (member?.isCurrentUser) {
      setSelectedMemberId(null);
      setLeaveOpen(true);
      return;
    }

    setSelectedMemberId(null);
    setRemoveMemberTarget(member);
  };

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface }]}>
      <View style={[styles.sectionHeader, styles.centeredSectionHeader]}>
        <View style={styles.rowText}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Usuarios del negocio
          </Text>
          {isLocalWorkspace ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Este es tu negocio personal. Para invitar personas, crea o
              selecciona un negocio compartido.
            </Text>
          ) : null}
        </View>
        {!isLocalWorkspace && canAdminWorkspace ? (
          <Pressable
            onPress={onInviteUser}
            style={[styles.compactButton, { borderColor: colors.border }]}
          >
            <Text
              style={[styles.compactButtonText, { color: colors.textPrimary }]}
            >
              + Invitar
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLocalWorkspace ? (
        <View style={[styles.localNotice, { borderColor: colors.border }]}>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            No se pueden invitar a otros a un negocio privado.
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            El equipo aparece cuando trabajas con un negocio compartido.
          </Text>
        </View>
      ) : members.length ? (
        <>
          <ScrollView
            nestedScrollEnabled
            style={styles.memberList}
            contentContainerStyle={styles.memberListContent}
          >
            {members.map((member) => (
              <View key={member.userId} style={styles.memberItem}>
                <MemberRow
                  activeOwnerCount={activeOwnerCount}
                  colors={colors}
                  isSelected={member.userId === selectedMemberId}
                  loading={loading}
                  member={member}
                  onRemove={handleMemberAction}
                  onSelect={(nextMember) =>
                    setSelectedMemberId(nextMember.userId)
                  }
                  role={role}
                />
              </View>
            ))}
          </ScrollView>
          <MemberDetailPanel
            canAdminWorkspace={canAdminWorkspace}
            colors={colors}
            loading={loading}
            member={selectedMember}
            onClose={() => setSelectedMemberId(null)}
            onUpdateRole={onUpdateRole}
          />
        </>
      ) : (
        <EmptyState colors={colors}>
          {getWorkspaceEmptyState({ loading, type: 'members' })}
        </EmptyState>
      )}

      {/* {!isLocalWorkspace ? (
        <Text style={[styles.note, { color: colors.textMuted }]}>
          Debe quedar al menos un propietario activo.
        </Text>
      ) : null} */}
      {leaveOpen ? (
        <LeaveWorkspaceDialog
          colors={colors}
          loading={loading}
          onClose={() => setLeaveOpen(false)}
          onConfirm={async () => {
            const result = await onLeaveWorkspace?.(currentWorkspace);

            if (result?.ok) {
              setLeaveOpen(false);
            }
          }}
          workspace={currentWorkspace}
        />
      ) : null}
      {removeMemberTarget ? (
        <RemoveMemberDialog
          colors={colors}
          loading={loading}
          member={removeMemberTarget}
          onClose={() => setRemoveMemberTarget(null)}
          onConfirm={async () => {
            const result = await onRemove(removeMemberTarget);

            if (result?.ok) {
              setRemoveMemberTarget(null);
            }
          }}
        />
      ) : null}
    </View>
  );
}

function RoleSelector({ colors, role, onSetRole }) {
  return (
    <View style={styles.optionRow}>
      {invitationRoleOptions.map((option) => {
        const selected = role === option;

        return (
          <Pressable
            key={option}
            onPress={() => onSetRole(option)}
            style={[
              styles.option,
              {
                backgroundColor: selected
                  ? colors.primary
                  : colors.surfaceMuted,
              },
            ]}
          >
            <Text
              style={[
                styles.optionText,
                { color: selected ? colors.textInverse : colors.textSecondary },
              ]}
            >
              {formatWorkspaceRole(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ReceivedInvitationRow({
  colors,
  invitation,
  loading,
  onAccept,
  onDecline,
}) {
  return (
    <View style={[styles.listRow, { borderColor: colors.border }]}>
      <Avatar
        colors={colors}
        label={invitation.workspaceName.charAt(0).toUpperCase()}
      />
      <View style={styles.rowText}>
        <Text style={[styles.body, { color: colors.textPrimary }]}>
          {invitation.workspaceName}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Invita: {invitation.invitedByLabel}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {invitation.role} · {invitation.expiresLabel}
        </Text>
      </View>
      <View style={styles.actionColumn}>
        <Pressable
          disabled={loading}
          onPress={() => onAccept(invitation.invitationId)}
          style={[styles.compactButton, { borderColor: colors.border }]}
        >
          <Text
            style={[styles.compactButtonText, { color: colors.textPrimary }]}
          >
            Aceptar
          </Text>
        </Pressable>
        <Pressable
          disabled={loading}
          onPress={() => onDecline(invitation.invitationId)}
          style={[styles.compactButton, { borderColor: colors.border }]}
        >
          <Text
            style={[styles.compactButtonText, { color: colors.textPrimary }]}
          >
            Rechazar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SentInvitationRow({
  colors,
  invitation,
  loading,
  onRegenerate,
  onRevoke,
}) {
  const actionState = getInvitationActionState({
    invitation: { status: invitation.statusKey },
    loading,
    role: 'admin',
  });

  return (
    <View style={[styles.listRow, { borderColor: colors.border }]}>
      <Avatar
        colors={colors}
        label={invitation.email.charAt(0).toUpperCase()}
      />
      <View style={styles.rowText}>
        <View style={styles.titleLine}>
          <Text
            numberOfLines={1}
            style={[styles.body, { color: colors.textPrimary }]}
          >
            {invitation.email}
          </Text>
          <StatusBadge
            colors={colors}
            label={invitation.status}
            tone={invitation.statusTone}
          />
        </View>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {invitation.role} · {invitation.expiresLabel}
        </Text>
        {invitation.emailDeliveryLabel ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {invitation.emailDeliveryLabel}
          </Text>
        ) : null}
      </View>
      <View style={styles.actionColumn}>
        <Pressable
          disabled={!actionState.canRegenerate}
          onPress={() => onRegenerate(invitation.invitationId)}
          style={[styles.compactButton, { borderColor: colors.border }]}
        >
          <Text
            style={[styles.compactButtonText, { color: colors.textPrimary }]}
          >
            Reenviar
          </Text>
        </Pressable>
        <Pressable
          disabled={!actionState.canRevoke}
          onPress={() => onRevoke(invitation.invitationId)}
          style={[styles.compactButton, { borderColor: colors.danger }]}
        >
          <Text style={[styles.compactButtonText, { color: colors.danger }]}>
            Revocar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function InvitationsTab({
  canAdminWorkspace,
  colors,
  inviteEmail,
  inviteRole,
  invitations,
  loading,
  members = [],
  onAccept,
  onCreateInvitation,
  onDecline,
  onRegenerate,
  onRevoke,
  onSetInviteEmail,
  onSetInviteRole,
  outgoingInvitations,
}) {
  const formState = getInvitationFormState({
    email: inviteEmail,
    existingInvitations: outgoingInvitations,
    existingMembers: members,
  });

  return (
    <>
      {canAdminWorkspace ? (
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.rowText}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Nueva invitacion
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Agrega personas al negocio activo.
              </Text>
            </View>
          </View>

          <View style={styles.subsection}>
            <Text style={[styles.body, { color: colors.textPrimary }]}>
              Invitar usuario
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={onSetInviteEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  borderColor: formState.error ? colors.danger : colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={inviteEmail}
            />
            {formState.error ? (
              <Text style={[styles.error, { color: colors.danger }]}>
                {formState.error}
              </Text>
            ) : null}
            <RoleSelector
              colors={colors}
              onSetRole={onSetInviteRole}
              role={inviteRole}
            />
            <Text style={[styles.note, { color: colors.textMuted }]}>
              {formatWorkspaceRoleDescription(inviteRole)}
            </Text>
            <Pressable
              disabled={loading || !formState.canSubmit}
              onPress={onCreateInvitation}
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    loading || !formState.canSubmit
                      ? colors.border
                      : colors.primary,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                Enviar invitacion
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.rowText}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Invitaciones recibidas
            </Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Solicitudes que puedes aceptar o rechazar.
            </Text>
          </View>
        </View>
        {invitations.length ? (
          invitations.map((rawInvitation) => {
            const invitation = sanitizeInvitationForDisplay(rawInvitation);
            return (
              <ReceivedInvitationRow
                colors={colors}
                invitation={invitation}
                key={invitation.invitationId}
                loading={loading}
                onAccept={onAccept}
                onDecline={onDecline}
              />
            );
          })
        ) : (
          <EmptyState colors={colors}>
            {getWorkspaceEmptyState({ loading, type: 'myInvitations' })}
          </EmptyState>
        )}
      </View>

      {canAdminWorkspace ? (
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.rowText}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Invitaciones enviadas
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Invitaciones pendientes creadas por este negocio.
              </Text>
            </View>
          </View>
          {outgoingInvitations.length ? (
            outgoingInvitations.map((rawInvitation) => {
              const invitation = sanitizeInvitationForDisplay(rawInvitation);
              return (
                <SentInvitationRow
                  colors={colors}
                  invitation={invitation}
                  key={invitation.invitationId}
                  loading={loading}
                  onRegenerate={onRegenerate}
                  onRevoke={onRevoke}
                />
              );
            })
          ) : (
            <EmptyState colors={colors}>
              No hay invitaciones enviadas pendientes.
            </EmptyState>
          )}
        </View>
      ) : null}
    </>
  );
}

function WorkspaceRow({
  canDelete,
  canLeave,
  canRename,
  colors,
  currentWorkspace,
  loading,
  menuOpen,
  onCloseMenu,
  onDelete,
  onLeave,
  onOpenMenu,
  onRename,
  onSelect,
  workspace,
}) {
  const row = getWorkspaceRowState(workspace, currentWorkspace);
  const showMenu = canRename || canDelete || canLeave;

  return (
    <View
      style={[
        styles.workspaceRowWrap,
        menuOpen ? styles.workspaceRowMenuOpen : null,
      ]}
    >
      <Pressable
        disabled={loading && !row.isCurrent}
        onPress={
          row.isCurrent || loading
            ? undefined
            : () => {
                onCloseMenu();
                onSelect(workspace);
              }
        }
        style={[
          styles.listRow,
          { borderColor: row.isCurrent ? colors.primary : colors.border },
        ]}
      >
        <WorkspaceTypeIcon colors={colors} workspace={workspace} />
        <View style={styles.rowText}>
          <View style={styles.titleLine}>
            <Text
              numberOfLines={1}
              style={[styles.body, { color: colors.textPrimary }]}
            >
              {row.name}
            </Text>
          </View>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {row.typeLabel}
          </Text>
        </View>
        {row.isCurrent ? (
          <StatusBadge colors={colors} label="En uso" tone="primary" />
        ) : null}
        {showMenu ? (
          <Pressable
            disabled={loading}
            onPress={menuOpen ? onCloseMenu : onOpenMenu}
            style={styles.overflowButton}
          >
            <AppIcon
              accessibilityLabel="Acciones del negocio"
              color={colors.textPrimary}
              name="dots-vertical"
              size={20}
            />
          </Pressable>
        ) : null}
      </Pressable>
      {showMenu && menuOpen ? (
        <View
          style={[
            styles.workspaceOverflowMenu,
            {
              backgroundColor: colors.screenBackground || colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {canRename ? (
            <Pressable onPress={onRename} style={styles.workspaceMenuAction}>
              <Text
                style={[styles.secondaryText, { color: colors.textPrimary }]}
              >
                Editar
              </Text>
            </Pressable>
          ) : null}
          {canLeave ? (
            <Pressable onPress={onLeave} style={styles.workspaceMenuAction}>
              <Text style={[styles.secondaryText, { color: colors.danger }]}>
                Salir
              </Text>
            </Pressable>
          ) : null}
          {canDelete ? (
            <Pressable onPress={onDelete} style={styles.workspaceMenuAction}>
              <Text style={[styles.secondaryText, { color: colors.danger }]}>
                Eliminar
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const normalizeDeleteName = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase();

function DeleteWorkspaceDialog({
  colors,
  loading,
  onClose,
  onConfirm,
  workspace,
}) {
  const [confirmationText, setConfirmationText] = useState('');
  const isPrivateProject = !workspace?.isRemote;
  const targetName = workspace?.name || 'Negocio compartido';
  const nameMatches =
    normalizeDeleteName(confirmationText) === normalizeDeleteName(targetName);
  const DeleteModalRoot = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const deleteModalRootProps =
    Platform.OS === 'ios' ? { behavior: 'padding' } : {};

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <DeleteModalRoot {...deleteModalRootProps} style={styles.modalRoot}>
        <Pressable
          disabled={loading}
          onPress={onClose}
          style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
        />
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.screenBackground || colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Eliminar negocio
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            {isPrivateProject
              ? 'Esta accion elimina este negocio privado.'
              : 'Esta accion elimina el negocio para todos. Nadie podra seguir entrando a este negocio compartido.'}
          </Text>
          <Text style={[styles.note, { color: colors.danger }]}>
            {isPrivateProject
              ? 'Se perdera todo lo trabajado dentro de este negocio: transacciones, recetas, ingredientes e inventario.'
              : 'Se perdera lo trabajado dentro de este negocio compartido: transacciones, recetas, ingredientes, inventario, invitaciones y colaboradores asociados.'}
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Escribe exactamente: {targetName}
          </Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setConfirmationText}
            placeholder={targetName}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                borderColor:
                  confirmationText.length > 0 && !nameMatches
                    ? colors.danger
                    : colors.border,
                color: colors.textPrimary,
              },
            ]}
            value={confirmationText}
          />
          <View style={styles.modalActions}>
            <Pressable
              disabled={loading}
              onPress={onClose}
              style={[
                styles.secondaryButton,
                styles.modalButton,
                { borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.secondaryText, { color: colors.textPrimary }]}
              >
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              disabled={loading || !nameMatches}
              onPress={onConfirm}
              style={[
                styles.primaryButton,
                styles.modalButton,
                {
                  backgroundColor:
                    loading || !nameMatches
                      ? colors.surfaceMuted
                      : colors.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color:
                      loading || !nameMatches
                        ? colors.inactiveText
                        : colors.textInverse,
                  },
                ]}
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </DeleteModalRoot>
    </Modal>
  );
}

function AccountRequiredContent({ colors, loading, onClose, onOpenAccount }) {
  const modalState = getShareAccountRequiredModalState({
    onClose,
    onOpenAccount,
  });
  const { copy } = modalState;

  return (
    <>
      <Pressable
        disabled={loading}
        onPress={onClose}
        style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
      />
      <View
        style={[
          styles.modalCard,
          styles.accountRequiredCard,
          {
            backgroundColor: colors.screenBackground || colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.accountRequiredHeader}>
          <View
            style={[
              styles.accountRequiredIcon,
              {
                backgroundColor: colors.primaryMuted,
                borderColor: colors.primary,
              },
            ]}
          >
            <AppIcon
              color={colors.primaryText}
              name="project-shared"
              size={26}
            />
          </View>
          <View style={styles.rowText}>
            <Text
              style={[
                styles.accountRequiredTitle,
                { color: colors.textPrimary },
              ]}
            >
              {copy.title}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.accountRequiredDivider,
            { backgroundColor: colors.border },
          ]}
        />
        <Text
          style={[
            styles.accountRequiredDescription,
            { color: colors.textSecondary },
          ]}
        >
          {copy.description}
        </Text>
        <View
          style={[
            styles.accountRequiredInfo,
            {
              backgroundColor: colors.primaryMuted,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.accountRequiredPrivacyIcon,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <AppIcon
              color={colors.primaryText}
              name="project-private"
              size={18}
            />
          </View>
          <Text
            style={[
              styles.accountRequiredPrivacyText,
              { color: colors.textSecondary },
            ]}
          >
            {copy.privacyNote}
          </Text>
        </View>
        <View style={styles.modalActions}>
          <Pressable
            disabled={loading}
            onPress={modalState.actions.cancel}
            style={[
              styles.secondaryButton,
              styles.modalButton,
              { borderColor: colors.border },
            ]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              {copy.cancelLabel}
            </Text>
          </Pressable>
          <Pressable
            disabled={loading || !onOpenAccount}
            onPress={modalState.actions.openAccount}
            style={[
              styles.primaryButton,
              styles.modalButton,
              {
                backgroundColor:
                  loading || !onOpenAccount
                    ? colors.surfaceMuted
                    : colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color:
                    loading || !onOpenAccount
                      ? colors.inactiveText
                      : colors.textInverse,
                },
              ]}
            >
              {copy.loginLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function AccountRequiredDialog({ colors, loading, onClose, onOpenAccount }) {
  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.modalRoot}>
        <AccountRequiredContent
          colors={colors}
          loading={loading}
          onClose={onClose}
          onOpenAccount={onOpenAccount}
        />
      </View>
    </Modal>
  );
}

function AccountRequiredOverlay({ colors, loading, onClose, onOpenAccount }) {
  return (
    <View style={styles.confirmationLayer}>
      <AccountRequiredContent
        colors={colors}
        loading={loading}
        onClose={onClose}
        onOpenAccount={onOpenAccount}
      />
    </View>
  );
}

function LeaveWorkspaceDialog({
  colors,
  loading,
  onClose,
  onConfirm,
  workspace,
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalRoot}>
        <Pressable
          disabled={loading}
          onPress={onClose}
          style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
        />
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.screenBackground || colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Salir del negocio
          </Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            {workspace?.name || 'Negocio compartido'}
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Perderas acceso a este negocio compartido y dejara de aparecer en tu
            lista de negocios. La informacion de este negocio dejara de estar
            disponible para tu cuenta.
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              disabled={loading}
              onPress={onClose}
              style={[
                styles.secondaryButton,
                styles.modalButton,
                { borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.secondaryText, { color: colors.textPrimary }]}
              >
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              disabled={loading}
              onPress={onConfirm}
              style={[
                styles.primaryButton,
                styles.modalButton,
                {
                  backgroundColor: loading
                    ? colors.surfaceMuted
                    : colors.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: loading ? colors.inactiveText : colors.textInverse },
                ]}
              >
                {loading ? 'Saliendo...' : 'Salir'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RemoveMemberDialog({ colors, loading, member, onClose, onConfirm }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalRoot}>
        <Pressable
          disabled={loading}
          onPress={onClose}
          style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
        />
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.screenBackground || colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Remover colaborador
          </Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            {member?.displayName || 'Usuario del negocio'}
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Esta persona perdera acceso al negocio y dejara de verlo en su
            lista. La informacion de este negocio dejara de estar disponible
            para su cuenta.
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              disabled={loading}
              onPress={onClose}
              style={[
                styles.secondaryButton,
                styles.modalButton,
                { borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.secondaryText, { color: colors.textPrimary }]}
              >
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              disabled={loading}
              onPress={onConfirm}
              style={[
                styles.primaryButton,
                styles.modalButton,
                {
                  backgroundColor: loading
                    ? colors.surfaceMuted
                    : colors.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: loading ? colors.inactiveText : colors.textInverse },
                ]}
              >
                {loading ? 'Removiendo...' : 'Remover'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CreateWorkspaceDialog({
  accountRequiredOpen = false,
  confirmLabel = 'Crear',
  colors,
  error = null,
  loading,
  name,
  onChangeName,
  onClose,
  onCloseAccountRequired,
  onConfirm,
  onOpenAccountRequired,
  onSetWorkspaceType,
  placeholder = 'Nombre del nuevo negocio',
  showWorkspaceTypePicker = false,
  title = 'Crear negocio',
  workspaceType = 'private',
}) {
  const inputRef = useRef(null);
  const focusTimersRef = useRef([]);
  const [hasEditedName, setHasEditedName] = useState(false);
  const [keyboardIsVisible, setKeyboardIsVisible] = useState(false);
  const [modalRootHeight, setModalRootHeight] = useState(0);
  const keyboardBottomInset = useKeyboardBottomInset();
  const screenHeight = Dimensions.get('screen').height;
  const { height: windowHeight } = useWindowDimensions();
  const availableModalHeight = modalRootHeight || windowHeight;
  const modalWasResized =
    keyboardIsVisible && screenHeight - availableModalHeight > 120;
  const modalBottomInset = keyboardIsVisible
    ? modalWasResized
      ? 12
      : keyboardBottomInset + 12
    : 24;
  const dialogMaxHeight = Math.max(
    320,
    availableModalHeight - modalBottomInset - 24,
  );
  const disabled = loading || !String(name || '').trim();
  const showNameMissing = hasEditedName && !String(name || '').trim();
  const showInlineAccountRequired =
    Platform.OS === 'ios' && accountRequiredOpen;

  const focusNameInput = () => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    if (Platform.OS === 'android') {
      input.blur?.();
      setTimeout(() => {
        input.focus?.();
        Keyboard.show?.();
      }, 40);
      return;
    }

    input.focus?.();
    Keyboard.show?.();
  };

  const handleNameInputFocus = () => {
    Keyboard.show?.();
  };

  const scheduleFocus = () => {
    focusTimersRef.current.forEach(clearTimeout);
    const focusDelays = Platform.OS === 'android' ? [150] : [80, 280, 650];

    focusTimersRef.current = focusDelays.map((delay) =>
      setTimeout(() => {
        InteractionManager.runAfterInteractions(focusNameInput);
      }, delay),
    );
  };

  const closeAccountRequired = () => {
    onCloseAccountRequired?.();
  };

  useEffect(() => {
    scheduleFocus();

    return () => {
      focusTimersRef.current.forEach(clearTimeout);
      focusTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showListener = Keyboard.addListener(showEvent, () => {
      setKeyboardIsVisible(true);
    });
    const hideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardIsVisible(false);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return (
    <Modal
      animationType="fade"
      onRequestClose={
        showInlineAccountRequired ? closeAccountRequired : onClose
      }
      onShow={scheduleFocus}
      transparent
      visible
    >
      <View
        onLayout={(event) => {
          setModalRootHeight(event.nativeEvent.layout.height);
        }}
        style={[
          styles.projectNameModalRoot,
          keyboardIsVisible ? styles.projectNameModalRootWithKeyboard : null,
          { paddingBottom: modalBottomInset },
        ]}
      >
        <Pressable
          disabled={loading}
          onPress={onClose}
          style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
        />
        <View
          style={[
            styles.modalCard,
            styles.projectNameModalCard,
            {
              backgroundColor: colors.screenBackground || colors.surface,
              borderColor: colors.border,
              maxHeight: dialogMaxHeight,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.projectNameModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.projectNameModalScroll}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {title}
            </Text>
            <TextInput
              autoFocus={Platform.OS !== 'android'}
              onChangeText={(value) => {
                setHasEditedName(true);
                onChangeName(capitalizeUserEntry(value));
              }}
              onFocus={handleNameInputFocus}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              ref={inputRef}
              selectTextOnFocus
              showSoftInputOnFocus
              style={[
                styles.input,
                {
                  borderColor: showNameMissing ? colors.danger : colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={name}
            />
            {showNameMissing ? (
              <Text style={[styles.error, { color: colors.danger }]}>
                Agrega un nombre para el negocio.
              </Text>
            ) : null}
            {error && !showNameMissing ? (
              <Text style={[styles.error, { color: colors.danger }]}>
                {error}
              </Text>
            ) : null}
            {showWorkspaceTypePicker ? (
              <View style={styles.workspaceTypePicker}>
                {[
                  {
                    description: 'Solo en este dispositivo',
                    icon: 'project-private',
                    label: 'Privado',
                    value: 'private',
                  },
                  {
                    description: 'Con equipo y respaldo en la nube',
                    icon: 'project-shared',
                    label: 'Compartido',
                    value: 'shared',
                  },
                ].map((option) => {
                  const active = workspaceType === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        onSetWorkspaceType?.(option.value);
                      }}
                      style={[
                        styles.workspaceTypeOption,
                        {
                          backgroundColor: active
                            ? colors.primaryMuted
                            : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <AppIcon
                        color={active ? colors.primaryText : colors.textMuted}
                        name={option.icon}
                        size={22}
                      />
                      <View style={styles.rowText}>
                        <Text
                          style={[
                            styles.secondaryText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[styles.meta, { color: colors.textMuted }]}
                        >
                          {option.description}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>
          <View style={[styles.modalActions, styles.projectNameModalActions]}>
            <Pressable
              disabled={loading}
              onPress={onClose}
              style={[
                styles.secondaryButton,
                styles.modalButton,
                { borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.secondaryText, { color: colors.textPrimary }]}
              >
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              disabled={disabled}
              onPress={onConfirm}
              style={[
                styles.primaryButton,
                styles.modalButton,
                {
                  backgroundColor: disabled ? colors.border : colors.primary,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
        {showInlineAccountRequired ? (
          <AccountRequiredOverlay
            colors={colors}
            loading={loading}
            onClose={closeAccountRequired}
            onOpenAccount={onOpenAccountRequired}
          />
        ) : null}
      </View>
    </Modal>
  );
}

export function WorkspacesTab({
  authRequired = false,
  colors,
  currentWorkspace,
  hasAccountSession = false,
  loading,
  members = [],
  newWorkspaceName,
  newWorkspaceType = 'private',
  onCreateWorkspace,
  onDeleteWorkspace,
  onLeave,
  onRenameWorkspace,
  onOpenAccount,
  onSelectWorkspace,
  onSetNewWorkspaceName,
  onSetNewWorkspaceType,
  onSetWorkspaceNameDraft,
  onSetWorkspaceMenuKey,
  workspaceNameDraft,
  workspaceMenuKey,
  workspaces,
}) {
  const accountRequiredUsesInlineOverlay = Platform.OS === 'ios';
  const [accountRequiredOpen, setAccountRequiredOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteWorkspaceTarget, setDeleteWorkspaceTarget] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveWorkspaceTarget, setLeaveWorkspaceTarget] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameError, setRenameError] = useState(null);
  const [renameWorkspaceTarget, setRenameWorkspaceTarget] = useState(null);
  const setMenuWorkspaceKey = onSetWorkspaceMenuKey || (() => {});
  const menuWorkspaceKey = workspaceMenuKey || null;
  const canRenameWorkspace = (workspace) =>
    !workspace?.isRemote ||
    ['owner', 'admin'].includes(workspace?.workspaceRole);
  const canDeleteWorkspace = (workspace) =>
    !workspace?.isRemote || workspace?.workspaceRole === 'owner';
  const sharedProjectRequiresAccount = authRequired || !hasAccountSession;
  const closeCreateWorkspace = () => {
    setCreateOpen(false);
    setCreateError(null);
    setAccountRequiredOpen(false);
    onSetNewWorkspaceName('');
    onSetNewWorkspaceType?.('private');
  };
  const closeAccountRequired = () => {
    setAccountRequiredOpen(false);

    if (sharedProjectRequiresAccount && newWorkspaceType === 'shared') {
      onSetNewWorkspaceType?.('private');
    }
  };
  const openAccountFromRequirement = () => {
    closeAccountRequired();
    onOpenAccount?.();
  };
  const closeRenameWorkspace = () => {
    setRenameOpen(false);
    setRenameError(null);
    setRenameWorkspaceTarget(null);
  };
  const closeDeleteWorkspace = () => {
    setDeleteOpen(false);
    setDeleteWorkspaceTarget(null);
  };
  const closeLeaveWorkspace = () => {
    setLeaveOpen(false);
    setLeaveWorkspaceTarget(null);
  };
  const requestLeaveWorkspace = (workspace) => {
    setMenuWorkspaceKey(null);
    setLeaveWorkspaceTarget(workspace);
    setLeaveOpen(true);
  };
  const handleCreateWorkspace = async () => {
    setCreateError(null);
    const result = await onCreateWorkspace();

    if (result?.ok) {
      onSetNewWorkspaceName('');
      setCreateOpen(false);
    } else if (result?.reason === 'account_required') {
      onSetNewWorkspaceType?.('private');
      setAccountRequiredOpen(true);
    } else {
      setCreateError(result?.message || 'No se pudo crear el negocio.');
    }

    return result;
  };
  const handleSetCreateWorkspaceType = (nextType) => {
    setCreateError(null);

    if (nextType === 'shared' && sharedProjectRequiresAccount) {
      onSetNewWorkspaceType?.('private');
      setAccountRequiredOpen(true);
      return;
    }

    onSetNewWorkspaceType?.(nextType);
    setAccountRequiredOpen(false);
  };
  const handleRenameWorkspace = async () => {
    setRenameError(null);
    const targetWorkspace = renameWorkspaceTarget;

    if (!targetWorkspace) {
      const message = 'Selecciona el negocio que quieres editar.';
      setRenameError(message);
      return { message, ok: false };
    }

    const result = await onRenameWorkspace(targetWorkspace);

    if (result?.ok) {
      setRenameOpen(false);
      setRenameWorkspaceTarget(null);
    } else {
      setRenameError(result?.message || 'No se pudo guardar el negocio.');
    }

    return result;
  };

  useEffect(() => {
    const hasOpenModal =
      accountRequiredOpen ||
      createOpen ||
      deleteOpen ||
      leaveOpen ||
      renameOpen;

    if (!hasOpenModal) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (accountRequiredOpen) {
          closeAccountRequired();
          return true;
        }

        if (createOpen) {
          closeCreateWorkspace();
          return true;
        }

        if (renameOpen) {
          closeRenameWorkspace();
          return true;
        }

        if (deleteOpen) {
          closeDeleteWorkspace();
          return true;
        }

        if (leaveOpen) {
          closeLeaveWorkspace();
          return true;
        }

        return false;
      },
    );

    return () => subscription.remove();
  }, [accountRequiredOpen, createOpen, deleteOpen, leaveOpen, renameOpen]);

  return (
    <View
      style={[
        styles.panel,
        styles.workspacePanel,
        menuWorkspaceKey ? styles.workspacePanelMenuOpen : null,
        { backgroundColor: colors.surface },
      ]}
    >
      <View style={[styles.sectionHeader, styles.centeredSectionHeader]}>
        <View style={styles.rowText}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Tus negocios
          </Text>
        </View>
        <Pressable
          onPress={() => {
            setMenuWorkspaceKey(null);
            setRenameWorkspaceTarget(null);
            setRenameOpen(false);
            onSetNewWorkspaceName('');
            onSetNewWorkspaceType?.('private');
            setCreateError(null);
            setAccountRequiredOpen(false);
            setCreateOpen(true);
          }}
          style={[styles.compactButton, { borderColor: colors.border }]}
        >
          <Text
            style={[styles.compactButtonText, { color: colors.textPrimary }]}
          >
            + Crear
          </Text>
        </Pressable>
      </View>

      <View style={styles.subsection}>
        {workspaces.length ? (
          workspaces.map((workspace) => {
            const row = getWorkspaceRowState(workspace, currentWorkspace);
            const leaveAction = getWorkspaceLeaveActionState({
              members: row.isCurrent ? members : [],
              workspace,
            });

            return (
              <WorkspaceRow
                canDelete={canDeleteWorkspace(workspace)}
                canLeave={leaveAction.canLeave}
                canRename={canRenameWorkspace(workspace)}
                colors={colors}
                currentWorkspace={currentWorkspace}
                key={row.key}
                loading={loading}
                menuOpen={menuWorkspaceKey === row.key}
                onCloseMenu={() => setMenuWorkspaceKey(null)}
                onDelete={() => {
                  setMenuWorkspaceKey(null);
                  setDeleteWorkspaceTarget(workspace);
                  setDeleteOpen(true);
                }}
                onLeave={() => {
                  requestLeaveWorkspace(workspace);
                }}
                onOpenMenu={() => setMenuWorkspaceKey(row.key)}
                onRename={() => {
                  setMenuWorkspaceKey(null);
                  setRenameWorkspaceTarget(workspace);
                  onSetWorkspaceNameDraft(workspace?.name || '');
                  setRenameError(null);
                  setCreateOpen(false);
                  setRenameOpen(true);
                }}
                onSelect={onSelectWorkspace}
                workspace={workspace}
              />
            );
          })
        ) : (
          <EmptyState colors={colors}>
            {getWorkspaceEmptyState({
              currentWorkspace,
              loading,
              type: 'workspaces',
            })}
          </EmptyState>
        )}
      </View>

      <View style={styles.subsection}>
        {renameOpen ? (
          <CreateWorkspaceDialog
            confirmLabel="Guardar"
            colors={colors}
            error={renameError}
            loading={loading}
            name={workspaceNameDraft}
            onChangeName={(value) => {
              setRenameError(null);
              onSetWorkspaceNameDraft(value);
            }}
            onClose={() => {
              closeRenameWorkspace();
            }}
            onConfirm={handleRenameWorkspace}
            placeholder="Nombre del negocio"
            title="Editar negocio"
          />
        ) : null}
        {createOpen ? (
          <CreateWorkspaceDialog
            accountRequiredOpen={
              accountRequiredUsesInlineOverlay && accountRequiredOpen
            }
            colors={colors}
            error={createError}
            loading={loading}
            name={newWorkspaceName}
            onChangeName={(value) => {
              setCreateError(null);
              onSetNewWorkspaceName(value);
            }}
            onClose={() => {
              closeCreateWorkspace();
            }}
            onCloseAccountRequired={closeAccountRequired}
            onConfirm={handleCreateWorkspace}
            onOpenAccountRequired={openAccountFromRequirement}
            onSetWorkspaceType={handleSetCreateWorkspaceType}
            showWorkspaceTypePicker
            workspaceType={newWorkspaceType}
          />
        ) : null}
        {!accountRequiredUsesInlineOverlay && accountRequiredOpen ? (
          <AccountRequiredDialog
            colors={colors}
            loading={loading}
            onClose={closeAccountRequired}
            onOpenAccount={openAccountFromRequirement}
          />
        ) : null}
      </View>

      {deleteOpen ? (
        <DeleteWorkspaceDialog
          colors={colors}
          loading={loading}
          onClose={() => {
            closeDeleteWorkspace();
          }}
          onConfirm={async () => {
            const result = await onDeleteWorkspace(
              deleteWorkspaceTarget || currentWorkspace,
            );

            if (result?.ok) {
              setDeleteOpen(false);
              setDeleteWorkspaceTarget(null);
            }
          }}
          workspace={deleteWorkspaceTarget || currentWorkspace}
        />
      ) : null}
      {leaveOpen ? (
        <LeaveWorkspaceDialog
          colors={colors}
          loading={loading}
          onClose={() => {
            closeLeaveWorkspace();
          }}
          onConfirm={async () => {
            const result = await onLeave(
              leaveWorkspaceTarget || currentWorkspace,
            );

            if (result?.ok) {
              setLeaveOpen(false);
              setLeaveWorkspaceTarget(null);
            }
          }}
          workspace={leaveWorkspaceTarget || currentWorkspace}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionColumn: {
    gap: 8,
  },
  accountRequiredCard: {
    gap: 16,
    padding: 16,
  },
  accountRequiredDescription: {
    fontSize: typography.sizes.label,
    lineHeight: 20,
  },
  accountRequiredDivider: {
    height: 1,
    opacity: 0.8,
    width: '100%',
  },
  accountRequiredHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  accountRequiredIcon: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  accountRequiredInfo: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  accountRequiredPrivacyIcon: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  accountRequiredPrivacyText: {
    flex: 1,
    fontSize: typography.sizes.label,
    lineHeight: 20,
  },
  accountRequiredTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    lineHeight: 22,
  },
  accountAccessButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  accountAccessButtonActive: {
    borderWidth: 1.5,
    shadowColor: '#8B5CF6',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  activeBusinessPanel: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 88,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeBusinessAccent: {
    bottom: 0,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  activeBusinessIcon: {
    height: 54,
    width: 46,
  },
  activeBusinessCopy: {
    flex: 1,
    gap: 2,
    justifyContent: 'space-between',
    minHeight: 54,
    minWidth: 0,
  },
  activeBusinessLayout: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    width: '100%',
  },
  activeBusinessKicker: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  activeBusinessMeta: {
    minHeight: 18,
  },
  activeBusinessName: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  avatarText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  workspaceTypeIcon: {
    flexShrink: 0,
  },
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  body: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  buttonText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  compactButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 10,
  },
  compactButtonText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  confirmationLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    elevation: 20,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    zIndex: 20,
  },
  contextRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  dangerButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  dangerZone: {
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  detailPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  detailGrid: {
    gap: 10,
  },
  detailLine: {
    gap: 2,
  },
  error: {
    fontSize: typography.sizes.label,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 38,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  listRow: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  meta: {
    fontSize: typography.sizes.label,
    marginTop: 3,
  },
  memberList: {
    maxHeight: 280,
  },
  memberListContent: {
    gap: 10,
  },
  memberItem: {
    gap: 8,
  },
  localNotice: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  modalButton: {
    flex: 1,
  },
  modalCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    marginHorizontal: 0,
    maxHeight: '82%',
    maxWidth: 390,
    padding: 16,
    width: '100%',
  },
  modalSection: {
    borderTopWidth: 1,
    paddingTop: 14,
  },
  modalRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  note: {
    fontSize: typography.sizes.label,
    lineHeight: 18,
  },
  option: {
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 10,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  overflowButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    marginRight: -6,
    width: 26,
  },
  panel: {
    borderRadius: 8,
    gap: 12,
    padding: 14,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  projectNameModalRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  projectNameModalRootWithKeyboard: {
    justifyContent: 'flex-end',
  },
  projectNameModalCard: {
    gap: 0,
  },
  projectNameModalActions: {
    marginTop: 14,
  },
  projectNameModalContent: {
    gap: 14,
    paddingBottom: 4,
  },
  projectNameModalScroll: {
    flexShrink: 1,
  },
  workspaceTypeOption: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 58,
    padding: 10,
    width: '100%',
  },
  workspaceTypePicker: {
    gap: 8,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  roleOptionCard: {
    borderRadius: 8,
    gap: 6,
    padding: 10,
  },
  roleOptionList: {
    gap: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  secondaryText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  centeredSectionHeader: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  subsection: {
    gap: 10,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  tabText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  tabAttention: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  tabLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  tabs: {
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  titleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  workspaceMenuAction: {
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  workspaceOverflowMenu: {
    borderRadius: 8,
    borderWidth: 1,
    elevation: 6,
    position: 'absolute',
    right: 0,
    top: 46,
    zIndex: 20,
  },
  workspaceRowWrap: {
    position: 'relative',
    zIndex: 1,
  },
  workspaceRowMenuOpen: {
    zIndex: 30,
  },
  workspacePanel: {
    position: 'relative',
    zIndex: 1,
  },
  workspacePanelMenuOpen: {
    zIndex: 30,
  },
});
