import fs from 'fs';
import path from 'path';

describe('StoresScreen wiring', () => {
  test('settings opens stores as a dedicated screen', () => {
    const appSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'App.js'),
      'utf8',
    );
    const settingsSource = fs.readFileSync(
      path.join(__dirname, '..', 'Settings', 'SettingsScreen.js'),
      'utf8',
    );

    expect(appSource).toContain(
      "import StoresScreen from './screens/Stores/StoresScreen'",
    );
    expect(appSource).toContain("activeTab === 'stores'");
    expect(appSource).toContain('storesBackTab');
    expect(appSource).toContain('openStoresFrom');
    expect(appSource).toContain("openStoresFrom('settings')");
    expect(appSource).toContain("openStoresFrom('home')");
    expect(appSource).toContain("openStoresFrom('recipes')");
    expect(appSource).toContain("openStoresFrom('inventory')");
    expect(appSource).toContain('hideBottomNavigation');
    expect(appSource).toContain(
      'onMapFullscreenChange={setHideBottomNavigation}',
    );
    expect(appSource).toContain('!hideBottomNavigation');
    expect(settingsSource).toContain('onOpenStores?.()');
    expect(settingsSource).not.toContain('AddStoreModal');
    expect(settingsSource).not.toContain('setStoreManagerIsVisible');
  });

  test('old store manager modal is no longer wired from main screens', () => {
    const transactionSource = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'TransactionBalance',
        'TransactionBalanceScreen.js',
      ),
      'utf8',
    );
    const recipeSource = fs.readFileSync(
      path.join(__dirname, '..', 'RecipeBook', 'RecipeBookScreen.js'),
      'utf8',
    );
    const inventorySource = fs.readFileSync(
      path.join(__dirname, '..', 'Inventory', 'InventoryScreen.js'),
      'utf8',
    );

    [transactionSource, recipeSource, inventorySource].forEach((source) => {
      expect(source).toContain('onOpenStores');
      expect(source).toContain('onOpenStores?.()');
      expect(source).not.toContain('AddStoreModal');
      expect(source).not.toContain('setAddStoreModalIsVisible');
    });
  });

  test('stores screen follows the clients screen management pattern', () => {
    const storesSource = fs.readFileSync(
      path.join(__dirname, 'StoresScreen.js'),
      'utf8',
    );

    expect(storesSource).toContain('function StoreFormModal');
    expect(storesSource).toContain('useBottomSheet');
    expect(storesSource).toContain('animationType="none"');
    expect(storesSource).toContain('visible={formModalOpen}');
    expect(storesSource).toContain('setFormModalOpen(true)');
    expect(storesSource).toContain('title="Tiendas registradas"');
    expect(storesSource).toContain('subtitle="Para surtir tus materiales."');
    expect(storesSource).toContain('placeholder="Buscar tienda..."');
    expect(storesSource).toContain('actionLabel="+ Crear"');
  });

  test('store deletion uses the shared confirmation modal', () => {
    const storesSource = fs.readFileSync(
      path.join(__dirname, 'StoresScreen.js'),
      'utf8',
    );

    expect(storesSource).toContain('DeleteConfirmationModal');
    expect(storesSource).toContain('deleteStore');
    expect(storesSource).toContain('title="Eliminar tienda"');
    expect(storesSource).toContain('visible={Boolean(storeToDelete)}');
  });

  test('store cards use overflow actions and editing treatment', () => {
    const storesSource = fs.readFileSync(
      path.join(__dirname, 'StoresScreen.js'),
      'utf8',
    );

    expect(storesSource).toContain('activeStoreMenuId');
    expect(storesSource).toContain('name="dots-vertical"');
    expect(storesSource).toContain(
      'accessibilityLabel="Acciones de la tienda"',
    );
    expect(storesSource).toContain('size={20}');
    expect(storesSource).toContain('if (activeStoreMenuId)');
    expect(storesSource).toContain(
      'accessibilityLabel="Cerrar menu de tienda"',
    );
    expect(storesSource).toContain('onStartShouldSetResponderCapture');
    expect(storesSource).toContain('styles.storeListDismissSpacer');
    expect(storesSource).toContain('styles.storeOverflowMenu');
    expect(storesSource).toContain('styles.storeOverflowMenuUpward');
    expect(storesSource).toContain('index === filteredStores.length - 1');
    expect(storesSource).toContain(
      'onScrollBeginDrag={() => setActiveStoreMenuId(null)}',
    );
    expect(storesSource).toContain('event.stopPropagation();');
    expect(storesSource).toContain('onEdit();');
    expect(storesSource).toContain('onDelete();');
    expect(storesSource).toContain('En edición');
    expect(storesSource).toContain('editingBadgeOpacity');
  });

  test('store search input matches client search sizing', () => {
    const storesSource = fs.readFileSync(
      path.join(__dirname, 'StoresScreen.js'),
      'utf8',
    );

    expect(storesSource).toContain('fontSize: typography.sizes.bodySmall');
    expect(storesSource).toContain('minHeight: 46');
    expect(storesSource).toContain('paddingHorizontal: 12');
  });

  test('store form uses the real store fields', () => {
    const storesSource = fs.readFileSync(
      path.join(__dirname, 'StoresScreen.js'),
      'utf8',
    );

    expect(storesSource).toContain(
      "const emptyForm = {\n  Address: '',\n  Alias: '',\n  Latitude: null,\n  Longitude: null,\n  Name: '',\n};",
    );
    expect(storesSource).toContain(
      'form.Name.trim().length > 0 && form.Alias.trim().length > 0',
    );
    expect(storesSource).toContain('Latitude: form.Latitude ?? null');
    expect(storesSource).toContain('Longitude: form.Longitude ?? null');
    expect(storesSource).toContain(
      'placeholder="Nombre completo de la tienda"',
    );
    expect(storesSource).toContain('placeholder="Nombre corto para listas"');
    expect(storesSource).toContain('placeholder="Dirección o referencia"');
    expect(storesSource).not.toContain('Tipo de tienda');
    expect(storesSource).not.toContain('useStoreTypesLocal');
  });

  test('store address field uses no-key place suggestions', () => {
    const storesSource = fs.readFileSync(
      path.join(__dirname, 'StoresScreen.js'),
      'utf8',
    );

    expect(storesSource).toContain('fetchPlaceSuggestions');
    expect(storesSource).toContain('fetchAddressFromCoordinates');
    expect(storesSource).toContain('getPlaceAutocompleteBaseUrl');
    expect(storesSource).toContain('function AddressSuggestions');
    expect(storesSource).toContain('function MapPickerScreen');
    expect(storesSource).toContain('react-native-webview');
    expect(storesSource).toContain('Buscando direcciones...');
    expect(storesSource).toContain('styles.addressInputWrap');
    expect(storesSource).toContain('styles.mapPickerInlineButton');
    expect(storesSource).toContain('name="contact-map-pin"');
    expect(storesSource).toContain('Mapa');
    expect(storesSource).toContain('initialSearch={form.Address}');
    expect(storesSource).toContain('initialPoint={');
    expect(storesSource).toContain('form.Latitude != null && form.Longitude != null');
    expect(storesSource).toContain('title="Elegir ubicación"');
    expect(storesSource).toContain('mapScreenFrame');
    expect(storesSource).toContain('styles.mapScreenFooter');
    expect(storesSource).toContain("position: 'absolute'");
    expect(storesSource).toContain('APP_HORIZONTAL_PADDING');
    expect(storesSource).toContain('getSystemNavigationClearance');
    expect(storesSource).toContain('Buscar negocio o dirección');
    expect(storesSource).toContain('Limpiar búsqueda de ubicación');
    expect(storesSource).toContain('styles.mapSearchClearButton');
    expect(storesSource).toContain('onMapFullscreenChange?.(mapPickerOpen)');
    expect(storesSource).not.toContain('Dirección encontrada.');
    expect(storesSource).not.toContain('Negocio seleccionado.');
    expect(storesSource).toContain('setSelectedPoint');
    expect(storesSource).toContain('injectJavaScript');
    expect(storesSource).toContain('Usar dirección');
    expect(storesSource).not.toContain('Sugerencias de OpenStreetMap');
    expect(storesSource).toContain('formSheetContentWithSuggestions');
    expect(storesSource).toContain('scrollToEnd');
    expect(storesSource).toContain('addressSuggestionList');
    expect(storesSource).toContain('Latitude: suggestion.latitude ?? null');
    expect(storesSource).toContain('Longitude: suggestion.longitude ?? null');
  });

  test('stores are scoped to the selected business like clients', () => {
    const hookSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'hooks', 'Stores', 'useStoresLocal.js'),
      'utf8',
    );

    expect(hookSource).toContain('useCurrentWorkspaceScope');
    expect(hookSource).toContain('getCurrentGroupId');
    expect(hookSource).toContain('storeRepository.getAll({');
    expect(hookSource).toContain('groupId: effectiveGroupId');
    expect(hookSource).toContain(
      'const visibleGroupId = groupId || storesGroupId',
    );
    expect(hookSource).toContain(
      'storesGroupId === visibleGroupId ? stores : []',
    );
    expect(hookSource).toContain('targetStore.groupId !== effectiveGroupId');
    expect(hookSource).toContain('setStores((currentStores) =>');
    expect(hookSource).not.toContain('await refreshStores();');
  });

  test('stores persist selected map coordinates', () => {
    const hookSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'hooks', 'Stores', 'useStoresLocal.js'),
      'utf8',
    );
    const repositorySource = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        '..',
        'data',
        'repositories',
        'storeRepository.js',
      ),
      'utf8',
    );

    expect(hookSource).toContain(
      'Latitude: store.Latitude ?? store.latitude ?? null',
    );
    expect(hookSource).toContain(
      'Longitude: store.Longitude ?? store.longitude ?? null',
    );
    expect(repositorySource).toContain(
      'Latitude: store.Latitude ?? store.latitude ?? null',
    );
    expect(repositorySource).toContain(
      'Longitude: store.Longitude ?? store.longitude ?? null',
    );
  });

  test('selecting a store opens a presentation modal with map action', () => {
    const storesSource = fs.readFileSync(
      path.join(__dirname, 'StoresScreen.js'),
      'utf8',
    );

    expect(storesSource).toContain(
      'const [selectedStore, setSelectedStore] = useState(null)',
    );
    expect(storesSource).toContain('function StorePresentationModal');
    expect(storesSource).toContain('onSelect={() => setSelectedStore(store)}');
    expect(storesSource).toContain('animationType="fade"');
    expect(storesSource).toContain('Información de Tienda');
    expect(storesSource).toContain('name="contact-map-pin"');
    expect(storesSource).toContain('Abrir en mapa');
    expect(storesSource).toContain('Linking.openURL');
    expect(storesSource).toContain('query=${latitude},${longitude}');
    expect(storesSource).toContain('function StorePresentationModal');
    expect(storesSource).toContain(
      'const hasMapLocation = hasCoordinates || hasAddress',
    );
    expect(storesSource).toContain("address.toLowerCase() !== 'sin dirección'");
    expect(storesSource).toContain(
      "if (value === null || value === undefined || value === '')",
    );
    expect(storesSource).toContain(
      'const hasCoordinates = latitude !== null && longitude !== null',
    );
    expect(storesSource).toContain('disabled={!hasMapLocation}');
  });
});
