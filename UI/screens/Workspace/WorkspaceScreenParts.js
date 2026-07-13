import React, { useEffect, useRef, useState } from 'react';
import {
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
  View,
} from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import {
  formatWorkspaceRole,
  formatWorkspaceRoleDescription,
  formatWorkspaceDate,
  getCurrentWorkspaceCardState,
  getInvitationActionState,
  getInvitationFormState,
  getLeaveWorkspaceBlockedReason,
  getMemberActionState,
  getWorkspaceEmptyState,
  getWorkspaceRowState,
  getWorkspaceTabState,
  getVisibleMembersForDisplay,
  sanitizeInvitationForDisplay,
} from './workspaceUiModel';

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

export function BusinessContextCard({
  colors,
  onChangeWorkspace,
  role,
  workspace,
}) {
  const card = getCurrentWorkspaceCardState(workspace, role);

  return (
    <View
      style={[
        styles.activeBusinessPanel,
        {
          backgroundColor: colors.primaryMuted,
          borderColor: colors.primary,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.activeBusinessGlow,
          { backgroundColor: colors.primary, opacity: 0.12 },
        ]}
      />
      <View style={styles.activeBusinessTop}>
        <View style={styles.contextRow}>
          <Avatar colors={colors} label={card.initials} />
          <View style={styles.rowText}>
            <Text style={[styles.meta, { color: colors.primaryText }]}>
              Actualmente trabajando con el proyecto:
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
      <Pressable
        onPress={onChangeWorkspace}
        style={[
          styles.changeWorkspaceButton,
          { backgroundColor: colors.primary },
        ]}
      >
        <Text style={[styles.secondaryText, { color: colors.textInverse }]}>
          Cambiar proyecto
        </Text>
      </Pressable>
    </View>
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
                <Text
                  style={[styles.tabAttentionText, { color: colors.primary }]}
                >
                  !
                </Text>
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
  if (!member) {
    return null;
  }

  const canEditRole =
    canAdminWorkspace && !member.isCurrentUser && member.roleKey !== 'owner';

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
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
                      onPress={() => onUpdateRole(member.userId, option)}
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
      </View>
    </Modal>
  );
}

export function TeamTab({
  canAdminWorkspace,
  colors,
  isLocalWorkspace = false,
  loading,
  members,
  onInviteUser,
  onRemove,
  onUpdateRole,
  role,
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const selectedMember = members.find(
    (member) => member.userId === selectedMemberId,
  );
  const activeOwnerCount = members.filter(
    (member) => member.roleKey === 'owner',
  ).length;

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface }]}>
      <View style={[styles.sectionHeader, styles.centeredSectionHeader]}>
        <View style={styles.rowText}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Usuarios del proyecto
          </Text>
          {isLocalWorkspace ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Este proyecto esta solo en este dispositivo. Para invitar
              personas, crea o selecciona un proyecto compartido.
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
            No se pueden invitar usuarios en modo local.
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            El equipo aparece cuando trabajas con un proyecto compartido.
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
                  onRemove={onRemove}
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
                Agrega personas al proyecto activo.
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
                Invitaciones pendientes creadas por este proyecto.
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
  const canLeave = Boolean(workspace?.isRemote);
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
        <Avatar colors={colors} label={row.initials} />
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
            <Text
              style={[styles.overflowButtonText, { color: colors.textPrimary }]}
            >
              ⋮
            </Text>
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
  const targetName = workspace?.name || 'Proyecto compartido';
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
            Eliminar proyecto
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Esta accion elimina el proyecto para todos. Nadie podra seguir
            entrando a este proyecto compartido.
          </Text>
          <Text style={[styles.note, { color: colors.danger }]}>
            Se perdera lo trabajado dentro de este proyecto compartido:
            transacciones, recetas, ingredientes, inventario, invitaciones y
            colaboradores asociados.
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
            Salir del proyecto
          </Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            {workspace?.name || 'Proyecto compartido'}
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Perderas acceso a este proyecto compartido y dejara de aparecer en
            tu lista de proyectos.
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

function CannotLeaveWorkspaceDialog({ colors, onClose, reason, workspace }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            No puedes salir todavía
          </Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            {workspace?.name || 'Proyecto compartido'}
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            {reason}
          </Text>
          <Pressable
            onPress={onClose}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>
              Entendido
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function CreateWorkspaceDialog({
  confirmLabel = 'Crear',
  colors,
  loading,
  name,
  onChangeName,
  onClose,
  onConfirm,
  placeholder = 'Nombre del nuevo proyecto',
  title = 'Crear proyecto',
}) {
  const inputRef = useRef(null);
  const focusTimersRef = useRef([]);
  const [hasEditedName, setHasEditedName] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const disabled = loading || !String(name || '').trim();
  const showNameMissing = hasEditedName && !String(name || '').trim();
  const modalBottom =
    Platform.OS === 'ios' && keyboardHeight > 0 ? keyboardHeight + 10 : 24;

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

  useEffect(() => {
    scheduleFocus();

    const syncKeyboardHeight = (event) => {
      const windowHeight = Dimensions.get('window').height;
      const reportedHeight = event.endCoordinates?.height || 0;
      const screenY = event.endCoordinates?.screenY || 0;
      const measuredHeight =
        screenY > 0 ? windowHeight - screenY : reportedHeight;
      const maxKeyboardHeight = Math.round(windowHeight * 0.48);
      const nextHeight = Math.max(
        0,
        Math.min(measuredHeight || reportedHeight, maxKeyboardHeight),
      );

      setKeyboardHeight(nextHeight);
    };
    const keyboardWillShow = Keyboard.addListener(
      'keyboardWillShow',
      syncKeyboardHeight,
    );
    const keyboardShow = Keyboard.addListener(
      'keyboardDidShow',
      syncKeyboardHeight,
    );
    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      focusTimersRef.current.forEach(clearTimeout);
      focusTimersRef.current = [];
      keyboardWillShow.remove();
      keyboardShow.remove();
      keyboardHide.remove();
    };
  }, []);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      onShow={scheduleFocus}
      transparent
      visible
    >
      <View style={styles.projectNameModalRoot}>
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
              bottom: modalBottom,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <TextInput
            autoFocus={Platform.OS !== 'android'}
            onChangeText={(value) => {
              setHasEditedName(true);
              onChangeName(value);
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
              Agrega un nombre para el proyecto.
            </Text>
          ) : null}
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
      </View>
    </Modal>
  );
}

export function WorkspacesTab({
  colors,
  currentWorkspace,
  loading,
  members = [],
  newWorkspaceName,
  onCreateWorkspace,
  onDeleteWorkspace,
  onLeave,
  onRefreshMembers,
  onRenameWorkspace,
  onSelectWorkspace,
  onSetNewWorkspaceName,
  onSetWorkspaceNameDraft,
  onSetWorkspaceMenuKey,
  workspaceNameDraft,
  workspaceMenuKey,
  workspaces,
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteWorkspaceTarget, setDeleteWorkspaceTarget] = useState(null);
  const [leaveBlockedReason, setLeaveBlockedReason] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveWorkspaceTarget, setLeaveWorkspaceTarget] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameWorkspaceTarget, setRenameWorkspaceTarget] = useState(null);
  const setMenuWorkspaceKey = onSetWorkspaceMenuKey || (() => {});
  const menuWorkspaceKey = workspaceMenuKey || null;
  const canRenameWorkspace = (workspace) =>
    Boolean(workspace?.isRemote) &&
    ['owner', 'admin'].includes(workspace?.workspaceRole);
  const canDeleteWorkspace = (workspace) =>
    workspace?.workspaceRole === 'owner';
  const requestLeaveWorkspace = async (workspace) => {
    setMenuWorkspaceKey(null);

    let membersForValidation = members;

    if (workspace?.workspaceRole === 'owner' && onRefreshMembers) {
      try {
        membersForValidation = getVisibleMembersForDisplay(
          await onRefreshMembers(workspace),
        );
      } catch (error) {
        setLeaveWorkspaceTarget(workspace);
        setLeaveBlockedReason(
          'No pudimos confirmar si hay otro propietario activo. Actualiza el proyecto e intenta salir de nuevo.',
        );
        return;
      }
    }

    const blockedReason = getLeaveWorkspaceBlockedReason({
      members: membersForValidation,
      workspace,
    });

    if (blockedReason) {
      setLeaveWorkspaceTarget(workspace);
      setLeaveBlockedReason(blockedReason);
      return;
    }

    setLeaveWorkspaceTarget(workspace);
    setLeaveOpen(true);
  };
  const handleCreateWorkspace = async () => {
    const result = await onCreateWorkspace();

    if (result?.ok) {
      onSetNewWorkspaceName('');
      setCreateOpen(false);
    }

    return result;
  };
  const handleRenameWorkspace = async () => {
    const result = await onRenameWorkspace(
      renameWorkspaceTarget || currentWorkspace,
    );

    if (result?.ok) {
      setRenameOpen(false);
      setRenameWorkspaceTarget(null);
    }

    return result;
  };

  return (
    <View
      style={[
        styles.panel,
        styles.workspacePanel,
        menuWorkspaceKey ? styles.workspacePanelMenuOpen : null,
        { backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.rowText}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Proyectos
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Administra tus proyectos.
          </Text>
        </View>
        <Pressable
          onPress={() => {
            setMenuWorkspaceKey(null);
            setRenameWorkspaceTarget(null);
            setRenameOpen(false);
            onSetNewWorkspaceName('');
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
        <Text style={[styles.body, { color: colors.textPrimary }]}>
          Cambiar proyecto
        </Text>
        {workspaces.length ? (
          workspaces.map((workspace) => (
            <WorkspaceRow
              canDelete={canDeleteWorkspace(workspace)}
              canRename={canRenameWorkspace(workspace)}
              colors={colors}
              currentWorkspace={currentWorkspace}
              key={getWorkspaceRowState(workspace, currentWorkspace).key}
              loading={loading}
              menuOpen={
                menuWorkspaceKey ===
                getWorkspaceRowState(workspace, currentWorkspace).key
              }
              onCloseMenu={() => setMenuWorkspaceKey(null)}
              onDelete={() => {
                setMenuWorkspaceKey(null);
                setDeleteWorkspaceTarget(workspace);
                setDeleteOpen(true);
              }}
              onLeave={() => {
                requestLeaveWorkspace(workspace);
              }}
              onOpenMenu={() =>
                setMenuWorkspaceKey(
                  getWorkspaceRowState(workspace, currentWorkspace).key,
                )
              }
              onRename={() => {
                setMenuWorkspaceKey(null);
                setRenameWorkspaceTarget(workspace);
                onSetWorkspaceNameDraft(workspace?.name || '');
                setCreateOpen(false);
                setRenameOpen(true);
              }}
              onSelect={onSelectWorkspace}
              workspace={workspace}
            />
          ))
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
            loading={loading}
            name={workspaceNameDraft}
            onChangeName={onSetWorkspaceNameDraft}
            onClose={() => {
              setRenameOpen(false);
              setRenameWorkspaceTarget(null);
            }}
            onConfirm={handleRenameWorkspace}
            placeholder="Nombre del proyecto"
            title="Editar proyecto"
          />
        ) : null}

        {createOpen ? (
          <CreateWorkspaceDialog
            colors={colors}
            loading={loading}
            name={newWorkspaceName}
            onChangeName={onSetNewWorkspaceName}
            onClose={() => {
              setCreateOpen(false);
              onSetNewWorkspaceName('');
            }}
            onConfirm={handleCreateWorkspace}
          />
        ) : null}
      </View>

      {deleteOpen ? (
        <DeleteWorkspaceDialog
          colors={colors}
          loading={loading}
          onClose={() => {
            setDeleteOpen(false);
            setDeleteWorkspaceTarget(null);
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
            setLeaveOpen(false);
            setLeaveWorkspaceTarget(null);
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
      {leaveBlockedReason ? (
        <CannotLeaveWorkspaceDialog
          colors={colors}
          onClose={() => {
            setLeaveBlockedReason(null);
            setLeaveWorkspaceTarget(null);
          }}
          reason={leaveBlockedReason}
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
  activeBusinessPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    minHeight: 150,
    overflow: 'hidden',
    padding: 14,
  },
  activeBusinessMeta: {
    minHeight: 18,
  },
  activeBusinessName: {
    fontSize: 30,
    fontWeight: typography.weights.bold,
    marginTop: 4,
  },
  activeBusinessGlow: {
    borderRadius: 90,
    height: 110,
    position: 'absolute',
    right: -28,
    top: -42,
    width: 160,
  },
  activeBusinessTop: {
    alignItems: 'flex-start',
    gap: 10,
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
  changeWorkspaceButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
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
    marginHorizontal: 20,
    maxHeight: '82%',
    padding: 16,
    width: '90%',
  },
  modalSection: {
    borderTopWidth: 1,
    paddingTop: 14,
  },
  modalRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
  overflowButtonText: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    lineHeight: 20,
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
  projectNameModalCard: {
    position: 'absolute',
  },
  projectNameModalRoot: {
    alignItems: 'center',
    flex: 1,
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
  tabAttentionText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
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
