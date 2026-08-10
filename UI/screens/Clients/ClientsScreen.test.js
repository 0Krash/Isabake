import fs from 'fs';
import path from 'path';

import { SHARED_SYNC_COLLECTIONS } from '../../data/sync/syncTypes';

describe('ClientsScreen wiring', () => {
  test('clients collection can sync with shared business data', () => {
    expect(SHARED_SYNC_COLLECTIONS).toContain('clients');
    expect(SHARED_SYNC_COLLECTIONS).toContain('clientTypes');
  });

  test('settings opens the clients screen instead of a placeholder', () => {
    const appSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'App.js'),
      'utf8',
    );
    const settingsSource = fs.readFileSync(
      path.join(__dirname, '..', 'Settings', 'SettingsScreen.js'),
      'utf8',
    );

    expect(appSource).toContain("import ClientsScreen from './screens/Clients/ClientsScreen'");
    expect(appSource).toContain("activeTab === 'clients'");
    expect(appSource).toContain('clientsBackTab');
    expect(appSource).toContain('openClientsFrom');
    expect(appSource).toContain("openClientsFrom('settings')");
    expect(appSource).toContain("openClientsFrom('home')");
    expect(settingsSource).toContain('onOpenClients?.()');
  });

  test('client deletion uses the shared confirmation modal', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).toContain('DeleteConfirmationModal');
    expect(clientsSource).toContain('deleteClient');
    expect(clientsSource).toContain('title="Eliminar cliente"');
    expect(clientsSource).toContain('visible={Boolean(clientToDelete)}');
  });

  test('clients are scoped to the selected business', () => {
    const hookSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'hooks', 'Clients', 'useClientsLocal.js'),
      'utf8',
    );

    expect(hookSource).toContain('useCurrentWorkspaceScope');
    expect(hookSource).toContain('getCurrentGroupId');
    expect(hookSource).toContain('clientRepository.getAll({');
    expect(hookSource).toContain('groupId: effectiveGroupId');
    expect(hookSource).toContain('clientsGroupId === groupId ? clients : []');
  });

  test('clients header does not show a configuration action', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).not.toContain('actionLabel="Config."');
    expect(clientsSource).not.toContain('onAction={onBack}');
    expect(clientsSource).not.toContain('Personas o negocios a quienes vendes.');
    expect(clientsSource).not.toContain('title="Clientes"');
  });

  test('selected client card shows editing treatment', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).toContain('isEditing={getClientId(editingClient) === getClientId(client)}');
    expect(clientsSource).toContain('En edición');
    expect(clientsSource).toContain('borderColor: isEditing ? colors.primary : colors.border');
    expect(clientsSource).toContain('editingBadgeOpacity');
    expect(clientsSource).toContain('duration: 120');
    expect(clientsSource).toContain('<Animated.View');
    expect(clientsSource).toContain('const showMenu = !editingBadgeVisible');
  });

  test('clients screen opens the client form in a slide-up modal', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).toContain('function ClientFormModal');
    expect(clientsSource).toContain('useBottomSheet');
    expect(clientsSource).toContain('animationType="none"');
    expect(clientsSource).toContain('{...formSheet.sheetPanHandlers}');
    expect(clientsSource).toContain('{...formSheet.handlePanHandlers}');
    expect(clientsSource).toContain('visible={formModalOpen}');
    expect(clientsSource).toContain('setFormModalOpen(true)');
    expect(clientsSource).toContain('+ Crear');
    expect(clientsSource).toContain('Tipo de cliente');
    expect(clientsSource).toContain('Seleccionar tipo de cliente');
    expect(clientsSource).toContain('const formIsValid = form.name.trim().length > 0');
    expect(clientsSource).not.toContain('form.type.trim().length > 0');
  });

  test('clients use managed client types and filter chips', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );
    const clientRepositorySource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'data', 'repositories', 'clientRepository.js'),
      'utf8',
    );
    const repositoryIndexSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'data', 'repositories', 'index.js'),
      'utf8',
    );
    const clientTypesHookSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'hooks', 'Clients', 'useClientTypesLocal.js'),
      'utf8',
    );

    expect(repositoryIndexSource).toContain('clientTypeRepository');
    expect(clientRepositorySource).toContain("type: client.type || client.Type || ''");
    expect(clientsSource).toContain('useClientTypesLocal');
    expect(clientsSource).toContain('<FilterChips');
    expect(clientsSource).toContain('contentContainerStyle={styles.clientFilterChipsContent}');
    expect(clientsSource).not.toContain('scrollStyle={styles.clientFilterChips}');
    expect(clientsSource).toContain('paddingHorizontal: 0');
    expect(clientsSource).toContain('clientTypeFilters');
    expect(clientsSource).toContain('selectedClientTypeFilter');
    expect(clientsSource).toContain('<ManagedOptionPickerModal');
    expect(clientsSource).toContain('title="Tipo de cliente"');
    expect(clientsSource).toContain('onAdd={addClientType}');
    expect(clientsSource).toContain('onDelete={removeClientType}');
    expect(clientsSource).not.toContain('canDeleteOption={(type) => !type.isDefault}');
    expect(clientTypesHookSource).not.toContain('DEFAULT_CLIENT_TYPES');
    expect(clientTypesHookSource).not.toContain('Cafetería');
    expect(clientTypesHookSource).not.toContain('Taquería');
    expect(clientTypesHookSource).not.toContain('Otro negocio');
    expect(clientsSource).toContain('onSelect={selectClientType}');
    expect(clientsSource).toContain('value={client.type || \'Sin tipo\'}');
  });

  test('editing actions live in the form instead of the client card', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).toContain('styles.formSheet');
    expect(clientsSource).toContain('Cancelar edición');
    expect(clientsSource).not.toContain('clientActionRow');
  });

  test('client delete action lives in the overflow menu', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).toContain('activeClientMenuId');
    expect(clientsSource).toContain('name="dots-vertical"');
    expect(clientsSource).toContain('if (activeClientMenuId)');
    expect(clientsSource).toContain('accessibilityLabel="Cerrar menu de cliente"');
    expect(clientsSource).toContain('onStartShouldSetResponderCapture');
    expect(clientsSource).toContain('styles.clientListDismissSpacer');
    expect(clientsSource).not.toContain('styles.screenDismissLayer');
    expect(clientsSource).toContain('styles.clientOverflowMenu');
    expect(clientsSource).toContain('styles.clientOverflowMenuUpward');
    expect(clientsSource).toContain('filteredClients.length > 1');
    expect(clientsSource).toContain('index === filteredClients.length - 1');
    expect(clientsSource).toContain('onScrollBeginDrag={() => setActiveClientMenuId(null)}');
    expect(clientsSource).toContain('menuActive={Boolean(activeClientMenuId)}');
    expect(clientsSource).toContain('onDismissMenu={() => setActiveClientMenuId(null)}');
    expect(clientsSource).toContain('event.stopPropagation();');
    expect(clientsSource).toContain('onEdit();');
    expect(clientsSource).toContain('style={styles.clientCardButton}');
    expect(clientsSource).toContain('if (menuActive)');
    expect(clientsSource).toContain('onDelete();');
    expect(clientsSource).toContain('onDelete={() => requestRemoveClient(client)}');
    expect(clientsSource).not.toContain('requestRemoveClient(editingClient)');
    expect(clientsSource).not.toContain('styles.deleteButton');
  });

  test('client list cards only show name and phone', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );
    const clientCardSource = clientsSource.slice(
      clientsSource.indexOf('function ClientCard'),
      clientsSource.indexOf('const styles = StyleSheet.create'),
    );

    expect(clientCardSource).toContain('{client.name}');
    expect(clientCardSource).toContain("{client.phone || 'Sin teléfono registrado'}");
    expect(clientCardSource).not.toContain('client.email');
    expect(clientCardSource).not.toContain('client.address');
  });

  test('selecting a client opens a presentation modal with contact actions', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).toContain('const [selectedClient, setSelectedClient] = useState(null)');
    expect(clientsSource).toContain('function ClientPresentationModal');
    expect(clientsSource).toContain('onSelect={() => setSelectedClient(client)}');
    expect(clientsSource).toContain('onSelect();');
    expect(clientsSource).toContain('animationType="fade"');
    expect(clientsSource).not.toContain('Tarjeta de cliente');
    expect(clientsSource).not.toContain('Contacto para ventas y entregas');
    expect(clientsSource).not.toContain('Acciones rápidas');
    expect(clientsSource).toContain('styles.presentationModalRoot');
    expect(clientsSource).toContain('styles.presentationCardWrap');
    expect(clientsSource).not.toContain('styles.presentationTopAccent');
    expect(clientsSource).not.toContain('styles.presentationPrimaryAction');
    expect(clientsSource).toContain('name="contact-whatsapp"');
    expect(clientsSource).toContain('name="contact-phone"');
    expect(clientsSource).toContain('name="contact-map-pin"');
    expect(clientsSource).toContain('backgroundColor: colors.primaryMuted');
    expect(clientsSource).toContain('const formatClientDate');
    expect(clientsSource).toContain('label="Creación"');
    expect(clientsSource).toContain('value={formatClientDate(client.createdAt)}');
    expect(clientsSource).toContain('label="Notas"');
    expect(clientsSource).toContain('lineStyle={styles.clientNotesLine}');
    expect(clientsSource).toContain('clientNotesLine');
    expect(clientsSource).toContain('minHeight: 48');
    expect(clientsSource).toContain("client.notes || 'Sin notas'");
    expect(clientsSource).toContain('Linking.openURL(`tel:${phone}`)');
    expect(clientsSource).toContain('Linking.openURL(`whatsapp://send?phone=${phone}`)');
    expect(clientsSource).toContain('www.google.com/maps/search');
    expect(clientsSource).toContain('WhatsApp');
    expect(clientsSource).toContain('Abrir dirección en mapa');
    expect(clientsSource).toContain("flexDirection: 'row'");
    expect(clientsSource.indexOf('Información de contacto')).toBeLessThan(
      clientsSource.indexOf('styles.presentationActions'),
    );
    expect(clientsSource).not.toContain('tokenHash');
    expect(clientsSource).not.toContain('refreshToken');
  });

  test('hardware back cancels client editing before leaving the screen', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).toContain('if (formModalOpen)');
    expect(clientsSource).toContain('cancelEdit();');
    expect(clientsSource).toContain('scrollToClient(clientBeingEdited)');
    expect(clientsSource.indexOf('if (formModalOpen)')).toBeLessThan(
      clientsSource.indexOf('onBack?.()'),
    );
  });

  test('hardware back closes the client presentation before search or navigation', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).toContain('if (selectedClient)');
    expect(clientsSource).toContain('setSelectedClient(null);');
    expect(clientsSource.indexOf('if (selectedClient)')).toBeLessThan(
      clientsSource.indexOf('if (search.trim())'),
    );
    expect(clientsSource.indexOf('if (selectedClient)')).toBeLessThan(
      clientsSource.indexOf('onBack?.()'),
    );
  });

  test('hardware back clears client search before leaving the screen', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).toContain('if (search.trim())');
    expect(clientsSource).toContain("setSearch('');");
    expect(clientsSource.indexOf('if (search.trim())')).toBeLessThan(
      clientsSource.indexOf('onBack?.()'),
    );
  });

  test('client list scrolls below a fixed search header and edit returns to the client', () => {
    const appScreenSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'layout', 'AppScreen.js'),
      'utf8',
    );
    const appCardSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'layout', 'AppCard.js'),
      'utf8',
    );
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(appScreenSource).toContain('scrollRef');
    expect(appScreenSource).toContain('stickyHeaderIndices');
    expect(appCardSource).toContain('...props');
    expect(clientsSource).toContain('scroll={false}');
    expect(clientsSource).toContain('styles.stickySearchHeader');
    expect(clientsSource).toContain('import AppHeader');
    expect(clientsSource).toContain('title="Clientes registrados"');
    expect(clientsSource).toContain('actionLabel="+ Crear"');
    expect(clientsSource).toContain('styles.clientsListContent');
    expect(clientsSource).toContain('paddingBottom: 14');
    expect(clientsSource).toContain('paddingTop: 0');
    expect(clientsSource).toContain('screenContent: {');
    expect(clientsSource).toContain('gap: 0');
    expect(clientsSource).toContain('<RefreshControl');
    expect(clientsSource).toContain('scrollToClient(clientBeingEdited)');
    expect(clientsSource).toContain('clientCardPositions.current[getClientId(client)]');
  });

  test('registered client list does not show operational feedback', () => {
    const clientsSource = fs.readFileSync(
      path.join(__dirname, 'ClientsScreen.js'),
      'utf8',
    );

    expect(clientsSource).not.toContain('clientFeedbackBorder');
    expect(clientsSource).not.toContain('hasFeedback');
    expect(clientsSource).not.toContain('setActionMessage');
    expect(clientsSource).not.toContain("setMessage('Cliente guardado.')");
    expect(clientsSource).not.toContain("setMessage('Cliente actualizado.')");
    expect(clientsSource).not.toContain("setMessage('Cliente eliminado.')");
    expect(clientsSource).toContain("setMessage('Agrega el nombre del cliente.')");
    expect(clientsSource).toContain("setMessage('No se pudo guardar el cliente.')");
  });
});
