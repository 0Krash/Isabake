import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  FlatList,
  InteractionManager,
  Keyboard,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';

import TransactionMenu, {
  TransactionMenuButton,
} from '../../components/TransactionBalance/TransactionMenu';
import AddStoreModal from '../../components/TransactionBalance/modals/addStoreModal/AddStoreModal';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useRecipeBookData, {
  normalizeRecipe,
  toApiRecipe,
} from '../../hooks/RecipeBook/useRecipeBookData';
import useRecipeSectionsData, {
  normalizeRecipeSection,
} from '../../hooks/RecipeBook/useRecipeSectionsData';
import useInventoryData from '../../hooks/Inventory/useInventoryData';
import recipeService from '../../services/TransactionBalance/API/recipeService';

const ingredientUnits = [
  { description: 'Gramos', key: 'g' },
  { description: 'Kilogramos', key: 'kg' },
  { description: 'Mililitros', key: 'ml' },
  { description: 'Litros', key: 'l' },
  { description: 'Piezas', key: 'pza' },
  { description: 'Cucharadas', key: 'cda' },
  { description: 'Cucharaditas', key: 'cdta' },
];

const STEP_DESCRIPTION_PREVIEW_LIMIT = 95;
const STEP_DRAG_SLOT_HEIGHT = 76;

const parseRecipeQuantity = (quantity) =>
  Number(String(quantity ?? '').replace(',', '.'));

const shouldSyncPieceIngredientWithServings = (ingredient, servings) => {
  const ingredientQuantity = parseRecipeQuantity(ingredient.quantity);

  return (
    ingredient.unit === 'pza' &&
    Number.isFinite(ingredientQuantity) &&
    ingredientQuantity === Number(servings)
  );
};

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getIngredientUnitLabel = (unitKey) =>
  ingredientUnits.find((unit) => unit.key === unitKey)?.description || 'Unidad';

const getStepPreview = (description) => {
  if (description.length <= STEP_DESCRIPTION_PREVIEW_LIMIT) {
    return description;
  }

  return `${description.slice(0, STEP_DESCRIPTION_PREVIEW_LIMIT).trim()}...`;
};

function useBottomSheet(isVisible, onClose) {
  const { height: windowHeight } = useWindowDimensions();
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);

  const resetSwipePosition = useCallback(() => {
    Animated.spring(sheetTranslateY, {
      damping: 18,
      stiffness: 180,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY]);

  const closeBottomSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetTranslateY, {
        duration: 190,
        toValue: windowHeight,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        duration: 190,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  }, [backdropOpacity, onClose, sheetTranslateY, windowHeight]);

  useEffect(() => {
    if (isVisible) {
      sheetTranslateY.setValue(windowHeight);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(sheetTranslateY, {
          duration: 240,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          duration: 180,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [backdropOpacity, isVisible, sheetTranslateY, windowHeight]);

  const shouldCaptureSheetSwipe = (_, gestureState) =>
    scrollOffsetY.current <= 0 &&
    gestureState.dy > 8 &&
    Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: shouldCaptureSheetSwipe,
        onMoveShouldSetPanResponderCapture: shouldCaptureSheetSwipe,
        onPanResponderMove: (_, gestureState) => {
          sheetTranslateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 1.1) {
            closeBottomSheet();
            return;
          }

          resetSwipePosition();
        },
        onPanResponderTerminate: resetSwipePosition,
      }),
    [closeBottomSheet, resetSwipePosition, sheetTranslateY],
  );

  const handlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          gestureState.dy > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          sheetTranslateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 90 || gestureState.vy > 0.9) {
            closeBottomSheet();
            return;
          }

          resetSwipePosition();
        },
        onPanResponderTerminate: resetSwipePosition,
      }),
    [closeBottomSheet, resetSwipePosition, sheetTranslateY],
  );

  const handleScroll = useCallback((event) => {
    scrollOffsetY.current = event.nativeEvent.contentOffset.y;
  }, []);

  return {
    backdropStyle: { opacity: backdropOpacity },
    closeBottomSheet,
    handlePanHandlers: handlePanResponder.panHandlers,
    onScroll: handleScroll,
    sheetPanHandlers: sheetPanResponder.panHandlers,
    sheetStyle: { transform: [{ translateY: sheetTranslateY }] },
  };
}

export default function RecipeBookScreen({ onOpenInventory }) {
  const { colors } = useTransactionBalanceTheme();
  const { height: windowHeight } = useWindowDimensions();
  const { isLoadingRecipes, recipes, refreshRecipes, setRecipes } =
    useRecipeBookData();
  const { inventoryItems, isLoadingInventory } = useInventoryData();
  const { recipeSections, refreshRecipeSections, setRecipeSections } =
    useRecipeSectionsData();
  const [addStoreModalIsVisible, setAddStoreModalIsVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalIsVisible, setModalIsVisible] = useState(false);
  const [menuIsVisible, setMenuIsVisible] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [recipeNameIsFocused, setRecipeNameIsFocused] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [ingredientName, setIngredientName] = useState('');
  const [selectedInventoryIngredient, setSelectedInventoryIngredient] =
    useState(null);
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [isSavingIngredient, setIsSavingIngredient] = useState(false);
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientSection, setIngredientSection] = useState('');
  const [newIngredientSection, setNewIngredientSection] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('g');
  const [ingredientPickerIsVisible, setIngredientPickerIsVisible] =
    useState(false);
  const [ingredientInventorySearch, setIngredientInventorySearch] =
    useState('');
  const [
    ingredientSectionPickerIsVisible,
    setIngredientSectionPickerIsVisible,
  ] = useState(false);
  const [unitPickerIsVisible, setUnitPickerIsVisible] = useState(false);
  const [recipeDetailTab, setRecipeDetailTab] = useState('Ingredientes');
  const [keyboardIsVisible, setKeyboardIsVisible] = useState(false);
  const [expandedIngredientSections, setExpandedIngredientSections] = useState(
    {},
  );
  const [isReorderingStep, setIsReorderingStep] = useState(false);
  const [stepDragPreview, setStepDragPreview] = useState(null);
  const [editingStepId, setEditingStepId] = useState(null);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [stepDescription, setStepDescription] = useState('');
  const [recipeNameDraft, setRecipeNameDraft] = useState('');
  const ingredientFormOffsetY = useRef(0);
  const inventoryIngredientScrollRef = useRef(null);
  const isSavingIngredientRef = useRef(false);
  const isSavingStepRef = useRef(false);
  const newRecipeNameInputRef = useRef(null);
  const recipeDetailScrollRef = useRef(null);
  const stepFormOffsetY = useRef(0);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId),
    [recipes, selectedRecipeId],
  );

  const filteredInventoryIngredientOptions = useMemo(() => {
    const normalizedSearch = ingredientInventorySearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return inventoryItems;
    }

    return inventoryItems.filter((inventoryItem) => {
      const searchableText = [
        inventoryItem.name,
        inventoryItem.category,
        inventoryItem.storage,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [ingredientInventorySearch, inventoryItems]);
  const inventoryIngredientPickerMaxHeight = keyboardIsVisible
    ? Math.min(windowHeight * 0.58, 430)
    : Math.min(windowHeight * 0.86, 560);

  useEffect(() => {
    if (!ingredientPickerIsVisible) {
      return undefined;
    }

    const flashIndicatorTimeout = setTimeout(() => {
      inventoryIngredientScrollRef.current?.flashScrollIndicators?.();
    }, 180);

    return () => {
      clearTimeout(flashIndicatorTimeout);
    };
  }, [ingredientPickerIsVisible, filteredInventoryIngredientOptions.length]);

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardIsVisible(true);
    });
    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardIsVisible(false);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  const sortedRecipeIngredients = useMemo(
    () =>
      [...(selectedRecipe?.ingredients || [])].sort(
        (ingredientA, ingredientB) =>
          ingredientA.name.localeCompare(ingredientB.name, 'es', {
            sensitivity: 'base',
          }),
      ),
    [selectedRecipe?.ingredients],
  );

  const groupedRecipeIngredients = useMemo(() => {
    const hasSections = sortedRecipeIngredients.some(
      (ingredient) => !!ingredient.section,
    );

    if (!hasSections) {
      return [];
    }

    const groups = sortedRecipeIngredients.reduce(
      (currentGroups, ingredient) => {
        const section = ingredient.section || 'Sin sección';

        return {
          ...currentGroups,
          [section]: [...(currentGroups[section] || []), ingredient],
        };
      },
      {},
    );

    const sectionOrder = recipeSections.map((section) => section.name);
    const orderedSections = [
      ...sectionOrder,
      ...Object.keys(groups).filter(
        (section) =>
          section !== 'Sin sección' && !sectionOrder.includes(section),
      ),
      'Sin sección',
    ];

    return orderedSections
      .filter((section) => groups[section]?.length)
      .map((section) => ({
        ingredients: groups[section],
        section,
      }));
  }, [recipeSections, sortedRecipeIngredients]);

  const shouldGroupRecipeIngredients = groupedRecipeIngredients.length > 0;

  const ingredientSectionOptions = useMemo(() => {
    const sectionsByName = new Map();

    recipeSections.forEach((section) => {
      sectionsByName.set(section.name.toLowerCase(), section);
    });

    if (ingredientSection) {
      const normalizedSection = ingredientSection.toLowerCase();

      if (!sectionsByName.has(normalizedSection)) {
        sectionsByName.set(normalizedSection, {
          id: `local-${ingredientSection}`,
          name: ingredientSection,
          normalizedName: normalizedSection,
          recipeSectionId: null,
        });
      }
    }

    return [...sectionsByName.values()].sort((sectionA, sectionB) =>
      sectionA.name.localeCompare(sectionB.name, 'es', {
        sensitivity: 'base',
      }),
    );
  }, [ingredientSection, recipeSections]);

  const ingredientStickyHeaderIndices = useMemo(() => {
    if (recipeDetailTab !== 'Ingredientes' || !shouldGroupRecipeIngredients) {
      return [];
    }

    let sectionOffset = 0;

    return groupedRecipeIngredients.map(({ ingredients, section }) => {
      const headerIndex = 3 + sectionOffset;
      const isExpanded = expandedIngredientSections[section] !== false;

      sectionOffset += 1 + (isExpanded ? ingredients.length : 0);

      return headerIndex;
    });
  }, [
    expandedIngredientSections,
    groupedRecipeIngredients,
    recipeDetailTab,
    shouldGroupRecipeIngredients,
  ]);

  const ingredientAlreadyExistsInSection = useMemo(() => {
    if (!selectedInventoryIngredient) {
      return false;
    }

    const currentIngredientId =
      editingIngredientId === null || editingIngredientId === undefined
        ? null
        : String(editingIngredientId);
    const currentSection = ingredientSection.trim();

    return (selectedRecipe?.ingredients || []).some((ingredient) => {
      const ingredientId =
        ingredient.id === null || ingredient.id === undefined
          ? null
          : String(ingredient.id);
      const isIngredientBeingEdited =
        currentIngredientId !== null && ingredientId === currentIngredientId;

      return (
        !isIngredientBeingEdited &&
        Number(ingredient.inventoryId) ===
          Number(selectedInventoryIngredient.inventoryId) &&
        String(ingredient.section || '').trim() === currentSection
      );
    });
  }, [
    editingIngredientId,
    ingredientSection,
    selectedInventoryIngredient,
    selectedRecipe?.ingredients,
  ]);

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return recipes;
    }

    return recipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(normalizedSearch),
    );
  }, [recipes, searchText]);

  const scrollToIngredientForm = useCallback((animated = true) => {
    const targetY = Math.max(ingredientFormOffsetY.current - 12, 0);

    if (targetY > 0) {
      recipeDetailScrollRef.current?.scrollTo({
        animated,
        y: targetY,
      });
      return;
    }

    recipeDetailScrollRef.current?.scrollToEnd({ animated });
  }, []);

  const scrollToStepForm = useCallback((animated = true) => {
    const targetY = Math.max(stepFormOffsetY.current - 12, 0);

    if (targetY > 0) {
      recipeDetailScrollRef.current?.scrollTo({
        animated,
        y: targetY,
      });
      return;
    }

    recipeDetailScrollRef.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    if (!editingIngredientId || recipeDetailTab !== 'Ingredientes') {
      return undefined;
    }

    const interaction = InteractionManager.runAfterInteractions(() => {
      scrollToIngredientForm(true);

      setTimeout(() => {
        scrollToIngredientForm(true);
      }, 120);
    });

    return () => {
      interaction.cancel?.();
    };
  }, [editingIngredientId, recipeDetailTab, scrollToIngredientForm]);

  useEffect(() => {
    if (!editingStepId || recipeDetailTab !== 'Preparacion') {
      return undefined;
    }

    const interaction = InteractionManager.runAfterInteractions(() => {
      scrollToStepForm(true);

      setTimeout(() => {
        scrollToStepForm(true);
      }, 120);
    });

    return () => {
      interaction.cancel?.();
    };
  }, [editingStepId, recipeDetailTab, scrollToStepForm]);

  useEffect(() => {
    if (!modalIsVisible) {
      return undefined;
    }

    const focusTimer = setTimeout(() => {
      newRecipeNameInputRef.current?.focus();
    }, 280);

    return () => {
      clearTimeout(focusTimer);
    };
  }, [modalIsVisible]);

  const handleOpenStoreManager = () => {
    setMenuIsVisible(false);
    setTimeout(() => {
      setAddStoreModalIsVisible(true);
    }, 90);
  };

  const handleOpenInventoryFromPicker = () => {
    setIngredientPickerIsVisible(false);
    recipeDetailSheet.closeBottomSheet();
    setTimeout(() => {
      onOpenInventory?.();
    }, 190);
  };

  const closeModal = useCallback(() => {
    setRecipeName('');
    setRecipeNameIsFocused(false);
    setModalIsVisible(false);
  }, []);

  const createRecipe = async () => {
    const name = recipeName.trim();

    if (!name) {
      return;
    }

    try {
      const response = await recipeService.postRecipe({
        cost: 0,
        ingredients: [],
        name,
        servings: 1,
        steps: [],
      });
      const createdRecipe = normalizeRecipe(response.data.recipe);
      setRecipes((currentRecipes) => [createdRecipe, ...currentRecipes]);
      refreshRecipes();
      setRecipeName('');
      setRecipeNameIsFocused(false);
      setModalIsVisible(false);
      setRecipeDetailTab('Ingredientes');
      setRecipeNameDraft(createdRecipe.name);
      setSelectedRecipeId(createdRecipe.id);
    } catch (error) {
      console.warn('Error al crear receta:', error);
      Alert.alert(
        'No se pudo guardar',
        'Revisa la conexion con el backend e intenta crear la receta nuevamente.',
      );
    }
  };

  const deleteSelectedRecipe = async () => {
    if (!selectedRecipe) {
      return;
    }

    try {
      await recipeService.deleteRecipeById(selectedRecipe.recipeId);
      setRecipes((currentRecipes) =>
        currentRecipes.filter((recipe) => recipe.id !== selectedRecipe.id),
      );
      recipeDetailSheet.closeBottomSheet();
      refreshRecipes();
    } catch (error) {
      console.warn('Error al eliminar receta:', error);
      Alert.alert(
        'No se pudo eliminar',
        'Revisa la conexion con el backend e intenta eliminar la receta nuevamente.',
      );
    }
  };

  const confirmDeleteRecipe = () => {
    if (!selectedRecipe) {
      return;
    }

    Alert.alert(
      'Eliminar receta',
      `Esta accion eliminara "${selectedRecipe.name}" del recetario.`,
      [
        {
          style: 'cancel',
          text: 'Cancelar',
        },
        {
          onPress: deleteSelectedRecipe,
          style: 'destructive',
          text: 'Eliminar',
        },
      ],
    );
  };

  const closeRecipeDetail = useCallback(() => {
    setSelectedRecipeId(null);
    setIngredientName('');
    setSelectedInventoryIngredient(null);
    setEditingIngredientId(null);
    setIngredientQuantity('');
    setIngredientSection('');
    setNewIngredientSection('');
    setIngredientUnit('g');
    setIngredientInventorySearch('');
    setIngredientPickerIsVisible(false);
    setIngredientSectionPickerIsVisible(false);
    setUnitPickerIsVisible(false);
    setRecipeDetailTab('Ingredientes');
    setEditingStepId(null);
    setStepDescription('');
    setRecipeNameDraft('');
  }, []);

  const createRecipeSheet = useBottomSheet(modalIsVisible, closeModal);
  const recipeDetailSheet = useBottomSheet(
    Boolean(selectedRecipe),
    closeRecipeDetail,
  );

  const handleRecipeDetailBack = () => {
    if (ingredientPickerIsVisible) {
      setIngredientInventorySearch('');
      setIngredientPickerIsVisible(false);
      return;
    }

    if (ingredientSectionPickerIsVisible) {
      setIngredientSectionPickerIsVisible(false);
      return;
    }

    if (unitPickerIsVisible) {
      setUnitPickerIsVisible(false);
      return;
    }

    if (editingIngredientId) {
      cancelIngredientEdition();
      return;
    }

    if (editingStepId) {
      cancelPreparationStepEdition();
      return;
    }

    recipeDetailSheet.closeBottomSheet();
  };

  const persistRecipe = (recipe) => {
    recipeService
      .updateRecipeById(recipe.recipeId, toApiRecipe(recipe))
      .then(refreshRecipes)
      .catch(async (error) => {
        const status = error?.response?.status;

        if (status === 404) {
          try {
            await recipeService.postRecipe({
              ...toApiRecipe(recipe),
              recipeId: recipe.recipeId,
            });
            refreshRecipes();
            return;
          } catch (createError) {
            console.warn(
              'Error al crear receta local en backend:',
              createError,
            );
            return;
          }
        }

        console.warn('Error al actualizar receta:', error);
      });
  };

  const updateSelectedRecipe = (updater) => {
    if (!selectedRecipe) {
      return;
    }

    const nextRecipe = updater(selectedRecipe);
    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) =>
        recipe.id === selectedRecipeId ? nextRecipe : recipe,
      ),
    );

    persistRecipe(nextRecipe);
  };

  const updateServings = (nextServings) => {
    if (!selectedRecipe) {
      return;
    }

    const nextRecipeServings = Math.max(1, nextServings);
    const syncedEditingIngredient =
      editingIngredientId &&
      selectedRecipe.ingredients.some(
        (ingredient) =>
          ingredient.id === editingIngredientId &&
          shouldSyncPieceIngredientWithServings(
            ingredient,
            selectedRecipe.servings,
          ),
      );

    updateSelectedRecipe((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) =>
        shouldSyncPieceIngredientWithServings(ingredient, recipe.servings)
          ? {
              ...ingredient,
              quantity: `${nextRecipeServings}`,
            }
          : ingredient,
      ),
      servings: nextRecipeServings,
    }));

    if (syncedEditingIngredient) {
      setIngredientQuantity(`${nextRecipeServings}`);
    }
  };

  const saveRecipeNameEdition = () => {
    if (!selectedRecipe) {
      return;
    }

    const name = recipeNameDraft.trim();

    if (!name || name === selectedRecipe.name) {
      setRecipeNameDraft(selectedRecipe.name);
      return;
    }

    updateSelectedRecipe((recipe) => ({
      ...recipe,
      name,
    }));
  };

  const addIngredientSection = async () => {
    const section = newIngredientSection.trim();

    if (!section) {
      return;
    }

    try {
      const response = await recipeService.postRecipeSection({ name: section });
      const recipeSection = normalizeRecipeSection(response.data.recipeSection);

      setRecipeSections((currentSections) => {
        const nextSections = currentSections.filter(
          (currentSection) =>
            currentSection.normalizedName !== recipeSection.normalizedName,
        );

        return [...nextSections, recipeSection].sort((sectionA, sectionB) =>
          sectionA.name.localeCompare(sectionB.name, 'es', {
            sensitivity: 'base',
          }),
        );
      });
      setIngredientSection(recipeSection.name);
      setNewIngredientSection('');
      setIngredientSectionPickerIsVisible(false);
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        'Revisa la conexion con el backend e intenta agregar la sección nuevamente.',
      );
    }
  };

  const deleteIngredientSection = async (sectionToDelete) => {
    if (!sectionToDelete?.name) {
      return;
    }

    const sectionName = sectionToDelete.name;

    try {
      if (sectionToDelete.recipeSectionId) {
        await recipeService.deleteRecipeSectionById(
          sectionToDelete.recipeSectionId,
        );
      }
    } catch (error) {
      Alert.alert(
        'No se pudo eliminar',
        'Revisa la conexion con el backend e intenta eliminar la sección nuevamente.',
      );
      return;
    }

    setRecipeSections((currentSections) =>
      currentSections.filter(
        (currentSection) =>
          currentSection.normalizedName !== sectionToDelete.normalizedName,
      ),
    );

    if (ingredientSection === sectionName) {
      setIngredientSection('');
    }

    setExpandedIngredientSections((currentSections) => {
      const nextSections = { ...currentSections };
      delete nextSections[sectionName];
      return nextSections;
    });

    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) =>
          ingredient.section === sectionName
            ? {
                ...ingredient,
                section: '',
              }
            : ingredient,
        ),
      })),
    );

    refreshRecipeSections();
  };

  const saveIngredient = () => {
    const name = selectedInventoryIngredient?.name || ingredientName.trim();
    const quantity = ingredientQuantity.trim();

    isSavingIngredientRef.current = true;
    setIsSavingIngredient(true);

    const ingredient = {
      id: editingIngredientId || `${selectedRecipeId}-${Date.now()}`,
      inventoryId: selectedInventoryIngredient.inventoryId,
      name,
      quantity,
      section: ingredientSection,
      unit: ingredientUnit,
    };

    updateSelectedRecipe((recipe) => ({
      ...recipe,
      ingredients: editingIngredientId
        ? recipe.ingredients.map((currentIngredient) =>
            currentIngredient.id === editingIngredientId
              ? ingredient
              : currentIngredient,
          )
        : [...recipe.ingredients, ingredient],
    }));
    setIngredientName('');
    setSelectedInventoryIngredient(null);
    setEditingIngredientId(null);
    setIngredientQuantity('');
    setIngredientSection('');
    setNewIngredientSection('');
    setIngredientUnit('g');

    setTimeout(() => {
      isSavingIngredientRef.current = false;
      setIsSavingIngredient(false);
    }, 350);
  };

  const addIngredient = () => {
    if (isSavingIngredientRef.current) {
      return;
    }

    const name = selectedInventoryIngredient?.name || ingredientName.trim();
    const quantity = ingredientQuantity.trim();

    if (
      !selectedInventoryIngredient ||
      !name ||
      !quantity ||
      ingredientAlreadyExistsInSection
    ) {
      return;
    }

    const numericQuantity = Number(quantity.replace(',', '.'));
    const recipeServings = Number(selectedRecipe?.servings || 1);
    const shouldConfirmPieces =
      ingredientUnit === 'pza' &&
      !Number.isNaN(numericQuantity) &&
      numericQuantity !== recipeServings;
    const diff = numericQuantity > recipeServings ? 'mas' : 'menos';

    if (shouldConfirmPieces) {
      Alert.alert(
        'Validar piezas',
        `La receta esta definida para ${recipeServings} porciones, pero este ingrediente tiene ${numericQuantity} pza. \n \nEn cada venta de esta receta se descontaran ${numericQuantity} pza. del inventario. \n \n¿Estas seguro de usar ${diff} piezas que porciones?`,
        [
          { style: 'cancel', text: 'Revisar' },
          { onPress: saveIngredient, text: 'Si, continuar' },
        ],
      );
      return;
    }

    saveIngredient();
  };

  const editIngredient = (ingredient) => {
    const inventoryIngredient = inventoryItems.find(
      (item) => item.inventoryId === ingredient.inventoryId,
    );

    setRecipeDetailTab('Ingredientes');
    setEditingIngredientId(ingredient.id);
    setSelectedInventoryIngredient(
      inventoryIngredient || {
        category: '',
        inventoryId: ingredient.inventoryId,
        lots: [],
        name: ingredient.name,
      },
    );
    setIngredientName(ingredient.name);
    setIngredientQuantity(ingredient.quantity);
    setIngredientSection(ingredient.section || '');
    setIngredientUnit(ingredient.unit);
  };

  const cancelIngredientEdition = () => {
    isSavingIngredientRef.current = false;
    setIsSavingIngredient(false);
    setEditingIngredientId(null);
    setSelectedInventoryIngredient(null);
    setIngredientName('');
    setIngredientQuantity('');
    setIngredientSection('');
    setNewIngredientSection('');
    setIngredientUnit('g');

  };

  const removeIngredient = (ingredientId) => {
    updateSelectedRecipe((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.filter(
        (ingredient) => ingredient.id !== ingredientId,
      ),
    }));
  };

  const savePreparationStep = () => {
    if (isSavingStepRef.current) {
      return;
    }

    const description = stepDescription.trim();

    if (!description) {
      return;
    }

    isSavingStepRef.current = true;
    setIsSavingStep(true);

    if (editingStepId) {
      updateSelectedRecipe((recipe) => ({
        ...recipe,
        steps: (recipe.steps || []).map((step) =>
          step.id === editingStepId
            ? {
                ...step,
                description,
              }
            : step,
        ),
      }));
      setEditingStepId(null);
      setStepDescription('');
    } else {
      updateSelectedRecipe((recipe) => {
        const nextOrder = (recipe.steps || []).length + 1;

        return {
          ...recipe,
          steps: [
            ...(recipe.steps || []),
            {
              description,
              id: `${selectedRecipeId}-step-${Date.now()}`,
              order: nextOrder,
            },
          ],
        };
      });
      setStepDescription('');
    }

    setTimeout(() => {
      isSavingStepRef.current = false;
      setIsSavingStep(false);
    }, 350);
  };

  const editPreparationStep = (step) => {
    setRecipeDetailTab('Preparacion');
    setEditingStepId(step.id);
    setStepDescription(step.description);
  };

  const cancelPreparationStepEdition = () => {
    isSavingStepRef.current = false;
    setIsSavingStep(false);
    setEditingStepId(null);
    setStepDescription('');
  };

  const removePreparationStep = (stepId) => {
    updateSelectedRecipe((recipe) => ({
      ...recipe,
      steps: (recipe.steps || [])
        .filter((step) => step.id !== stepId)
        .map((step, index) => ({
          ...step,
          order: index + 1,
        })),
    }));
  };

  const handleStepDragStateChange = (isDragging) => {
    setIsReorderingStep(isDragging);

    if (!isDragging) {
      setStepDragPreview(null);
    }
  };

  const movePreparationStep = (stepId, targetOrder) => {
    LayoutAnimation.configureNext({
      duration: 180,
      update: {
        property: LayoutAnimation.Properties.opacity,
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    updateSelectedRecipe((recipe) => {
      const sortedSteps = [...(recipe.steps || [])].sort(
        (stepA, stepB) => stepA.order - stepB.order,
      );
      const currentIndex = sortedSteps.findIndex((step) => step.id === stepId);
      const targetIndex = Math.min(
        Math.max(Number(targetOrder) - 1, 0),
        sortedSteps.length - 1,
      );

      if (currentIndex < 0 || targetIndex === currentIndex) {
        return recipe;
      }

      const reorderedSteps = [...sortedSteps];
      const [movingStep] = reorderedSteps.splice(currentIndex, 1);
      reorderedSteps.splice(targetIndex, 0, movingStep);

      return {
        ...recipe,
        steps: reorderedSteps.map((step, index) => ({
          ...step,
          order: index + 1,
        })),
      };
    });
  };

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: colors.screenBackground },
      ]}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Recetario
        </Text>
        <TransactionMenuButton
          isOpen={menuIsVisible}
          onPress={() => {
            Keyboard.dismiss();
            setMenuIsVisible(true);
          }}
        />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          onChangeText={setSearchText}
          placeholder="Buscar receta..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.fieldBackground,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          value={searchText}
        />
        {searchText.length > 0 && (
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setSearchText('');
            }}
            style={[
              styles.clearButton,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <Text
              style={[styles.clearButtonText, { color: colors.textSecondary }]}
            >
              x
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        columnWrapperStyle={styles.recipeGridRow}
        contentContainerStyle={styles.recipeList}
        data={filteredRecipes}
        key="recipe-grid"
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => {
              Keyboard.dismiss();
              setSelectedRecipeId(item.id);
            }}
            style={[
              styles.recipeCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.recipeInfo}>
              <Text
                numberOfLines={2}
                style={[styles.recipeName, { color: colors.textPrimary }]}
              >
                {item.name}
              </Text>
              <Text style={[styles.recipeMeta, { color: colors.textMuted }]}>
                {item.ingredients.length} ing. · {item.servings} porciones
              </Text>
            </View>
            <View style={styles.recipeCostContainer}>
              <Text
                style={[styles.recipeCostLabel, { color: colors.textMuted }]}
              >
                {' '}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.recipeCost, { color: colors.textPrimary }]}
              >
                {item.cost}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {isLoadingRecipes ? 'Cargando recetas' : 'No encontramos recetas'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isLoadingRecipes
                ? 'Estamos consultando tu recetario.'
                : 'Prueba con otro nombre o agrega una nueva receta.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          Keyboard.dismiss();
          setModalIsVisible(true);
        }}
        style={[styles.addButton, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.addButtonText, { color: colors.textInverse }]}>
          +
        </Text>
      </TouchableOpacity>

      <TransactionMenu
        isVisible={menuIsVisible}
        onClose={() => setMenuIsVisible(false)}
        onOpenStoreManager={handleOpenStoreManager}
      />

      {addStoreModalIsVisible && (
        <AddStoreModal
          AddStoreModalIsVisible={addStoreModalIsVisible}
          setAddStoreModalIsVisible={setAddStoreModalIsVisible}
        />
      )}

      <Modal
        animationType="none"
        onRequestClose={createRecipeSheet.closeBottomSheet}
        transparent
        visible={modalIsVisible}
      >
        <View style={styles.sheetRoot}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sheetBackdrop,
              {
                backgroundColor: colors.backdrop,
              },
              createRecipeSheet.backdropStyle,
            ]}
          />
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              createRecipeSheet.closeBottomSheet();
            }}
            style={styles.sheetBackdrop}
          />
          <Animated.View
            {...createRecipeSheet.sheetPanHandlers}
            style={[
              styles.recipeModal,
              { backgroundColor: colors.screenBackground },
              createRecipeSheet.sheetStyle,
            ]}
          >
            <View
              style={styles.dragHandleArea}
              {...createRecipeSheet.handlePanHandlers}
            >
              <View
                style={[styles.dragHandle, { backgroundColor: colors.border }]}
              />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Nueva receta
            </Text>
            <TextInput
              ref={newRecipeNameInputRef}
              onBlur={() => setRecipeNameIsFocused(false)}
              onChangeText={setRecipeName}
              onFocus={() => setRecipeNameIsFocused(true)}
              placeholder="Nombre del producto"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.fieldBackground,
                  borderColor: recipeNameIsFocused ? colors.primary : colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={recipeName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  Keyboard.dismiss();
                  createRecipeSheet.closeBottomSheet();
                }}
                style={[
                  styles.modalSecondaryButton,
                  { borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.modalSecondaryText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  Keyboard.dismiss();
                  createRecipe();
                }}
                style={[
                  styles.modalPrimaryButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.modalPrimaryText,
                    { color: colors.textInverse },
                  ]}
                >
                  Crear
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        animationType="none"
        onRequestClose={handleRecipeDetailBack}
        transparent
        visible={Boolean(selectedRecipe)}
      >
        <View style={styles.sheetRoot}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sheetBackdrop,
              {
                backgroundColor: colors.backdrop,
              },
              recipeDetailSheet.backdropStyle,
            ]}
          />
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                recipeDetailSheet.closeBottomSheet();
              }}
              style={styles.sheetBackdrop}
            />
          <Animated.View
            {...recipeDetailSheet.sheetPanHandlers}
            style={[
              styles.recipeDetailModal,
              { backgroundColor: colors.screenBackground },
              recipeDetailSheet.sheetStyle,
            ]}
          >
            {selectedRecipe && (
              <>
                <View
                  style={styles.dragHandleArea}
                  {...recipeDetailSheet.handlePanHandlers}
                >
                  <View
                    style={[
                      styles.dragHandle,
                      { backgroundColor: colors.border },
                    ]}
                  />
                </View>
                <View style={styles.detailHeader}>
                  <View style={styles.detailTitleContainer}>
                    <TextInput
                      onChangeText={setRecipeNameDraft}
                      onEndEditing={saveRecipeNameEdition}
                      onFocus={() => setRecipeNameDraft(selectedRecipe.name)}
                      placeholder="Nombre de la receta"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.recipeNameEditInput,
                        {
                          backgroundColor: colors.fieldBackground,
                          color: colors.textPrimary,
                        },
                      ]}
                      value={recipeNameDraft || selectedRecipe.name}
                    />
                    <Text
                      style={[
                        styles.detailSubtitle,
                        { color: colors.textMuted },
                      ]}
                    >
                      Define porciones e ingredientes de elaboracion.
                    </Text>
                  </View>
                </View>

                <ScrollView
                  contentContainerStyle={styles.detailContent}
                  keyboardShouldPersistTaps="handled"
                  onScroll={recipeDetailSheet.onScroll}
                  ref={recipeDetailScrollRef}
                  scrollEventThrottle={16}
                  scrollEnabled={!isReorderingStep}
                  showsVerticalScrollIndicator={false}
                  stickyHeaderIndices={ingredientStickyHeaderIndices}
                >
                  <View
                    style={[
                      styles.servingsPanel,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.servingsCopy}>
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Porciones de venta
                      </Text>
                      <Text
                        style={[
                          styles.servingsHint,
                          { color: colors.textMuted },
                        ]}
                      >
                        Usa una cantidad realista para calcular costos por
                        pieza.
                      </Text>
                    </View>
                    <View style={styles.servingsStepper}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => {
                          Keyboard.dismiss();
                          updateServings(selectedRecipe.servings - 1);
                        }}
                        style={[
                          styles.stepperButton,
                          { backgroundColor: colors.primaryMuted },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperText,
                            { color: colors.primaryText },
                          ]}
                        >
                          -
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.servingsValue,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {selectedRecipe.servings}
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => {
                          Keyboard.dismiss();
                          updateServings(selectedRecipe.servings + 1);
                        }}
                        style={[
                          styles.stepperButton,
                          { backgroundColor: colors.primaryMuted },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperText,
                            { color: colors.primaryText },
                          ]}
                        >
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    Receta
                  </Text>

                  <View
                    style={[
                      styles.detailTabs,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    {['Ingredientes', 'Preparacion'].map((tab) => {
                      const isSelected = recipeDetailTab === tab;

                      return (
                        <TouchableOpacity
                          activeOpacity={0.75}
                          key={tab}
                          onPress={() => {
                            Keyboard.dismiss();
                            setRecipeDetailTab(tab);
                          }}
                          style={[
                            styles.detailTabButton,
                            {
                              backgroundColor: isSelected
                                ? colors.primaryMuted
                                : colors.surface,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.detailTabText,
                              {
                                color: isSelected
                                  ? colors.primaryText
                                  : colors.inactiveText,
                              },
                            ]}
                          >
                            {tab}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {recipeDetailTab === 'Ingredientes' ? (
                    [
                      shouldGroupRecipeIngredients
                        ? groupedRecipeIngredients.flatMap(
                            ({ ingredients, section }) => {
                              const isExpanded =
                                expandedIngredientSections[section] !== false;

                              return [
                                <View
                                  key={`${section}-header`}
                                  style={[
                                    styles.ingredientSectionHeaderShell,
                                    { backgroundColor: colors.screenBackground },
                                  ]}
                                >
                                  <TouchableOpacity
                                    activeOpacity={0.75}
                                    onPress={() => {
                                      Keyboard.dismiss();
                                      setExpandedIngredientSections(
                                        (currentSections) => ({
                                          ...currentSections,
                                          [section]: !isExpanded,
                                        }),
                                      );
                                    }}
                                    style={[
                                      styles.ingredientSectionHeader,
                                      {
                                        backgroundColor: colors.fieldBackground,
                                        borderColor: colors.border,
                                      },
                                    ]}
                                  >
                                    <View
                                      style={
                                        styles.ingredientSectionHeaderContent
                                      }
                                    >
                                      <Text
                                        numberOfLines={1}
                                        style={[
                                          styles.ingredientSectionHeaderTitle,
                                          { color: colors.textPrimary },
                                        ]}
                                      >
                                        {section}
                                      </Text>
                                      <Text
                                        numberOfLines={1}
                                        style={[
                                          styles.ingredientSectionHeaderMeta,
                                          { color: colors.textMuted },
                                        ]}
                                      >
                                        {ingredients.length}{' '}
                                        {ingredients.length === 1
                                          ? 'ingrediente'
                                          : 'ingredientes'}
                                      </Text>
                                      <View
                                        style={[
                                          styles.ingredientSectionToggle,
                                          {
                                            backgroundColor: colors.surface,
                                            borderColor: colors.border,
                                          },
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.ingredientSectionToggleText,
                                            { color: colors.textSecondary },
                                          ]}
                                        >
                                          {isExpanded ? '-' : '+'}
                                        </Text>
                                      </View>
                                    </View>
                                  </TouchableOpacity>
                                </View>,
                                ...(isExpanded
                                  ? ingredients.map((ingredient) => {
                                      const isEditingIngredient =
                                        ingredient.id === editingIngredientId;

                                      return (
                                        <EditableIngredientRow
                                          colors={colors}
                                          ingredient={ingredient}
                                          isEditing={isEditingIngredient}
                                          key={ingredient.id}
                                          onEdit={editIngredient}
                                          onRemove={removeIngredient}
                                        />
                                      );
                                    })
                                  : []),
                              ];
                            },
                          )
                        : sortedRecipeIngredients.map((ingredient) => {
                            const isEditingIngredient =
                              ingredient.id === editingIngredientId;

                            return (
                              <EditableIngredientRow
                                colors={colors}
                                ingredient={ingredient}
                                isEditing={isEditingIngredient}
                                key={ingredient.id}
                                onEdit={editIngredient}
                                onRemove={removeIngredient}
                              />
                            );
                          }),
                      sortedRecipeIngredients.length === 0 && (
                        <View
                          key="empty-ingredients"
                          style={[
                            styles.detailEmptyState,
                            { borderColor: colors.border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.emptyTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            Sin ingredientes
                          </Text>
                          <Text
                            style={[
                              styles.emptyText,
                              { color: colors.textMuted },
                            ]}
                          >
                            Los ingredientes se veran reflejados cuando los
                            agregues.
                          </Text>
                        </View>
                      ),

                      <View
                        key="ingredient-form"
                        onLayout={(event) => {
                          ingredientFormOffsetY.current =
                            event.nativeEvent.layout.y;
                        }}
                        style={[
                          styles.ingredientForm,
                          {
                            backgroundColor: colors.surface,
                            borderColor: editingIngredientId
                              ? colors.primary
                              : colors.border,
                          },
                          editingIngredientId && styles.ingredientFormEditing,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sectionLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {editingIngredientId
                            ? 'Editar ingrediente'
                            : 'Agregar ingrediente'}
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => {
                            Keyboard.dismiss();
                            setIngredientPickerIsVisible(true);
                          }}
                          style={[
                            styles.inventoryIngredientSelect,
                            {
                              backgroundColor: colors.fieldBackground,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.inventoryIngredientSelectText,
                              {
                                color: selectedInventoryIngredient
                                  ? colors.textPrimary
                                  : colors.textMuted,
                              },
                            ]}
                          >
                            {selectedInventoryIngredient?.name ||
                              'Seleccionar ingrediente del inventario'}
                          </Text>
                          {selectedInventoryIngredient && (
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.inventoryIngredientSelectMeta,
                                { color: colors.textMuted },
                              ]}
                            >
                              {selectedInventoryIngredient.category ||
                                'Sin categoria'}
                            </Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => {
                            Keyboard.dismiss();
                            setIngredientSectionPickerIsVisible(true);
                          }}
                          style={[
                            styles.inventoryIngredientSelect,
                            {
                              backgroundColor: colors.fieldBackground,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.inlineSelectRow}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.inventoryIngredientSelectText,
                                styles.inlineSelectText,
                                {
                                  color: ingredientSection
                                    ? colors.textPrimary
                                    : colors.textMuted,
                                },
                              ]}
                            >
                              {ingredientSection || 'Seleccionar sección'}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.inventoryIngredientSelectMeta,
                                { color: colors.textMuted },
                              ]}
                            >
                              Opcional
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.quantityRow}>
                          <TextInput
                            keyboardType="decimal-pad"
                            onChangeText={setIngredientQuantity}
                            placeholder="Cantidad"
                            placeholderTextColor={colors.textMuted}
                            style={[
                              styles.quantityInput,
                              {
                                backgroundColor: colors.fieldBackground,
                                color: colors.textPrimary,
                              },
                            ]}
                            value={ingredientQuantity}
                          />
                          <View style={styles.unitListContainer}>
                            <TouchableOpacity
                              activeOpacity={0.75}
                              onPress={() => {
                                Keyboard.dismiss();
                                setUnitPickerIsVisible(true);
                              }}
                              style={[
                                styles.unitSelectBox,
                                {
                                  backgroundColor: colors.fieldBackground,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.unitSelectText,
                                  { color: colors.textPrimary },
                                ]}
                              >
                                {ingredientUnit}
                              </Text>
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.unitSelectDescription,
                                  { color: colors.textMuted },
                                ]}
                              >
                                {getIngredientUnitLabel(ingredientUnit)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        {ingredientAlreadyExistsInSection && (
                          <Text
                            style={[
                              styles.ingredientDuplicateWarning,
                              { color: colors.danger },
                            ]}
                          >
                            Este ingrediente ya fue agregado en esta sección.
                          </Text>
                        )}
                        <TouchableOpacity
                          activeOpacity={0.75}
                          disabled={
                            isSavingIngredient ||
                            !selectedInventoryIngredient ||
                            !ingredientQuantity.trim() ||
                            ingredientAlreadyExistsInSection
                          }
                          onPress={() => {
                            Keyboard.dismiss();
                            addIngredient();
                          }}
                          style={[
                            styles.addIngredientButton,
                            {
                              backgroundColor:
                                isSavingIngredient ||
                                !selectedInventoryIngredient ||
                                !ingredientQuantity.trim() ||
                                ingredientAlreadyExistsInSection
                                  ? colors.surfaceMuted
                                  : colors.primary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.addIngredientText,
                              {
                                color:
                                  isSavingIngredient ||
                                  !selectedInventoryIngredient ||
                                  !ingredientQuantity.trim() ||
                                  ingredientAlreadyExistsInSection
                                    ? colors.inactiveText
                                    : colors.textInverse,
                              },
                            ]}
                          >
                            {isSavingIngredient
                              ? 'Guardando...'
                              : editingIngredientId
                                ? 'Actualizar ingrediente'
                                : 'Agregar ingrediente'}
                          </Text>
                        </TouchableOpacity>
                        {editingIngredientId && (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => {
                              Keyboard.dismiss();
                              cancelIngredientEdition();
                            }}
                            style={[
                              styles.cancelIngredientButton,
                              { borderColor: colors.border },
                            ]}
                          >
                            <Text
                              style={[
                                styles.editIngredientText,
                                { color: colors.textPrimary },
                              ]}
                            >
                              Cancelar edicion
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>,
                    ]
                  ) : (
                    <>
                      {(() => {
                        const sortedSteps = [
                          ...(selectedRecipe.steps || []),
                        ].sort((stepA, stepB) => stepA.order - stepB.order);

                        return sortedSteps.map((step) => {
                          const previewFromOrder = stepDragPreview?.fromOrder;
                          const previewTargetOrder =
                            stepDragPreview?.targetOrder;
                          let displacement = 0;

                          if (
                            stepDragPreview?.stepId !== step.id &&
                            previewFromOrder &&
                            previewTargetOrder
                          ) {
                            if (
                              previewTargetOrder > previewFromOrder &&
                              step.order > previewFromOrder &&
                              step.order <= previewTargetOrder
                            ) {
                              displacement = -STEP_DRAG_SLOT_HEIGHT;
                            }

                            if (
                              previewTargetOrder < previewFromOrder &&
                              step.order < previewFromOrder &&
                              step.order >= previewTargetOrder
                            ) {
                              displacement = STEP_DRAG_SLOT_HEIGHT;
                            }
                          }

                          return (
                            <DraggablePreparationStep
                              colors={colors}
                              displacement={displacement}
                              isEditing={editingStepId === step.id}
                              key={step.id}
                              onDragPreview={setStepDragPreview}
                              onDragStateChange={handleStepDragStateChange}
                              onEdit={editPreparationStep}
                              onMove={movePreparationStep}
                              onRemove={removePreparationStep}
                              step={step}
                              stepsCount={sortedSteps.length}
                            />
                          );
                        });
                      })()}

                      {(selectedRecipe.steps || []).length === 0 && (
                        <View
                          style={[
                            styles.detailEmptyState,
                            { borderColor: colors.border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.emptyTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            Sin pasos de preparacion
                          </Text>
                          <Text
                            style={[
                              styles.emptyText,
                              { color: colors.textMuted },
                            ]}
                          >
                            Los pasos de preparacion se veran reflejados cuando
                            los agregues.
                          </Text>
                        </View>
                      )}

                      <View
                        onLayout={(event) => {
                          stepFormOffsetY.current = event.nativeEvent.layout.y;
                        }}
                        style={[
                          styles.ingredientForm,
                          {
                            backgroundColor: colors.surface,
                            borderColor: editingStepId
                              ? colors.primary
                              : colors.border,
                          },
                          editingStepId && styles.ingredientFormEditing,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sectionLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {editingStepId ? 'Editar paso' : 'Agregar paso'}
                        </Text>
                        <TextInput
                          multiline
                          onChangeText={setStepDescription}
                          placeholder="Ej. Batir queso crema con azucar hasta suavizar."
                          placeholderTextColor={colors.textMuted}
                          style={[
                            styles.stepInput,
                            {
                              backgroundColor: colors.fieldBackground,
                              color: colors.textPrimary,
                            },
                          ]}
                          textAlignVertical="top"
                          value={stepDescription}
                        />
                        <TouchableOpacity
                          activeOpacity={0.75}
                          disabled={isSavingStep || !stepDescription.trim()}
                          onPress={() => {
                            Keyboard.dismiss();
                            savePreparationStep();
                          }}
                          style={[
                            styles.addIngredientButton,
                            {
                              backgroundColor:
                                isSavingStep || !stepDescription.trim()
                                  ? colors.surfaceMuted
                                  : colors.primary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.addIngredientText,
                              {
                                color:
                                  isSavingStep || !stepDescription.trim()
                                    ? colors.inactiveText
                                    : colors.textInverse,
                              },
                            ]}
                          >
                            {isSavingStep
                              ? 'Guardando...'
                              : editingStepId
                                ? 'Actualizar paso'
                                : 'Agregar paso'}
                          </Text>
                        </TouchableOpacity>
                        {editingStepId && (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => {
                              Keyboard.dismiss();
                              cancelPreparationStepEdition();
                            }}
                            style={[
                              styles.cancelIngredientButton,
                              { borderColor: colors.border },
                            ]}
                          >
                            <Text
                              style={[
                                styles.editIngredientText,
                                { color: colors.textPrimary },
                              ]}
                            >
                              Cancelar edicion
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      Keyboard.dismiss();
                      confirmDeleteRecipe();
                    }}
                    style={[
                      styles.deleteRecipeButton,
                      { borderColor: colors.danger },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deleteRecipeText,
                        { color: colors.danger },
                      ]}
                    >
                      Eliminar receta
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </Animated.View>
          {unitPickerIsVisible && (
            <View style={styles.unitPickerOverlay}>
              <View
                style={[
                  styles.unitPickerBackdrop,
                  { backgroundColor: colors.backdrop },
                ]}
              />
              <View
                style={[
                  styles.unitPopupCard,
                  styles.inventoryIngredientPopupCard,
                  {
                    backgroundColor: colors.screenBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.unitPopupTitle, { color: colors.textPrimary }]}
                >
                  Unidad de medida
                </Text>
                <ScrollView
                  contentContainerStyle={styles.unitOptionsList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  style={styles.unitOptionsScroll}
                >
                  {ingredientUnits.map((unit) => {
                    const isSelected = unit.key === ingredientUnit;

                    return (
                      <TouchableOpacity
                        activeOpacity={0.75}
                        key={unit.key}
                        onPress={() => {
                          Keyboard.dismiss();
                          setIngredientUnit(unit.key);
                          setUnitPickerIsVisible(false);
                        }}
                        style={[
                          styles.unitOptionRow,
                          styles.sectionOptionRow,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryMuted
                              : colors.surface,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitOptionKey,
                            {
                              color: isSelected
                                ? colors.primaryText
                                : colors.textPrimary,
                            },
                          ]}
                        >
                          {unit.key}
                        </Text>
                        <Text
                          style={[
                            styles.unitOptionDescription,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {unit.description}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}
          {ingredientPickerIsVisible && (
            <View style={styles.unitPickerOverlay}>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setIngredientInventorySearch('');
                  setIngredientPickerIsVisible(false);
                }}
                style={[
                  styles.unitPickerBackdrop,
                  { backgroundColor: colors.backdrop },
                ]}
              />
              <View
                style={[
                  styles.unitPopupCard,
                  styles.inventoryIngredientPopupCard,
                  { maxHeight: inventoryIngredientPickerMaxHeight },
                  {
                    backgroundColor: colors.screenBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.unitPopupTitle, { color: colors.textPrimary }]}
                >
                  Ingrediente de inventario
                </Text>
                <TextInput
                  onChangeText={setIngredientInventorySearch}
                  placeholder="Buscar ingrediente..."
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.pickerSearchInput,
                    {
                      backgroundColor: colors.fieldBackground,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={ingredientInventorySearch}
                />
                {isLoadingInventory ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Cargando inventario...
                  </Text>
                ) : inventoryItems.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No hay ingredientes registrados.
                  </Text>
                ) : filteredInventoryIngredientOptions.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No encontramos ingredientes con ese criterio.
                  </Text>
                ) : (
                  <ScrollView
                    ref={inventoryIngredientScrollRef}
                    style={styles.inventoryIngredientScroll}
                    contentContainerStyle={styles.inventoryIngredientList}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {filteredInventoryIngredientOptions.map((inventoryItem) => {
                      const isSelected =
                        selectedInventoryIngredient?.inventoryId ===
                        inventoryItem.inventoryId;

                      return (
                        <TouchableOpacity
                          activeOpacity={0.75}
                          key={inventoryItem.id}
                          onPress={() => {
                            Keyboard.dismiss();
                            setSelectedInventoryIngredient(inventoryItem);
                            setIngredientName(inventoryItem.name);
                            setIngredientInventorySearch('');
                            setIngredientPickerIsVisible(false);
                          }}
                          style={[
                            styles.inventoryIngredientOption,
                            {
                              backgroundColor: isSelected
                                ? colors.primaryMuted
                                : colors.surface,
                              borderColor: isSelected
                                ? colors.primary
                                : colors.border,
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.inventoryIngredientOptionName,
                              {
                                color: isSelected
                                  ? colors.primaryText
                                  : colors.textPrimary,
                              },
                            ]}
                          >
                            {inventoryItem.name}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.inventoryIngredientOptionMeta,
                              { color: colors.textMuted },
                            ]}
                          >
                            {inventoryItem.category || 'Sin categoria'} ·{' '}
                            {inventoryItem.lots.length} lotes
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIngredientInventorySearch('');
                    handleOpenInventoryFromPicker();
                  }}
                  style={[
                    styles.inventoryShortcutButton,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.inventoryShortcutText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Ir a inventario
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {ingredientSectionPickerIsVisible && (
            <View style={styles.unitPickerOverlay}>
              <Pressable
                onPress={() => setIngredientSectionPickerIsVisible(false)}
                style={[
                  styles.unitPickerBackdrop,
                  { backgroundColor: colors.backdrop },
                ]}
              />
              <View
                style={[
                  styles.unitPopupCard,
                  {
                    backgroundColor: colors.screenBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.unitPopupTitle, { color: colors.textPrimary }]}
                >
                  Sección del ingrediente
                </Text>
                <ScrollView
                  contentContainerStyle={styles.sectionOptionsList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  style={styles.sectionOptionsScroll}
                >
                  {[
                    {
                      id: 'empty-section',
                      name: '',
                      normalizedName: '',
                      recipeSectionId: null,
                    },
                    ...ingredientSectionOptions,
                  ].map((section) => {
                    const label = section.name || 'Sin sección';
                    const isSelected = ingredientSection === section.name;

                    return (
                      <TouchableOpacity
                        activeOpacity={0.75}
                        key={section.id}
                        onPress={() => {
                          Keyboard.dismiss();
                          setIngredientSection(section.name);
                          setIngredientSectionPickerIsVisible(false);
                        }}
                        style={[
                          styles.unitOptionRow,
                          styles.sectionOptionRow,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryMuted
                              : colors.surface,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitOptionDescription,
                            styles.sectionOptionText,
                            {
                              color: isSelected
                                ? colors.primaryText
                                : colors.textPrimary,
                            },
                          ]}
                        >
                          {label}
                        </Text>
                        {!!section.name && (
                          <TouchableOpacity
                            accessibilityLabel={`Eliminar sección ${section.name}`}
                            activeOpacity={0.7}
                            onPress={(event) => {
                              event.stopPropagation();
                              Keyboard.dismiss();
                              deleteIngredientSection(section);
                            }}
                            style={styles.sectionDeleteButton}
                          >
                            <Text
                              style={[
                                styles.deleteActionText,
                                { color: colors.danger },
                              ]}
                            >
                              Eliminar
                            </Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={styles.newSectionContainer}>
                  <TextInput
                    onChangeText={setNewIngredientSection}
                    placeholder="Nueva sección"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.newSectionInput,
                      {
                        backgroundColor: colors.fieldBackground,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={newIngredientSection}
                  />
                  <TouchableOpacity
                    activeOpacity={0.75}
                    disabled={!newIngredientSection.trim()}
                    onPress={() => {
                      Keyboard.dismiss();
                      addIngredientSection();
                    }}
                    style={[
                      styles.newSectionButton,
                      {
                        backgroundColor: newIngredientSection.trim()
                          ? colors.primary
                          : colors.surfaceMuted,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.newSectionButtonText,
                        {
                          color: newIngredientSection.trim()
                            ? colors.textInverse
                            : colors.inactiveText,
                        },
                      ]}
                    >
                      Agregar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const EditableIngredientRow = ({
  colors,
  ingredient,
  isEditing,
  onEdit,
  onRemove,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => {
        Keyboard.dismiss();
        onEdit(ingredient);
      }}
      style={[
        styles.ingredientRow,
        {
          backgroundColor: colors.surface,
          borderColor: isEditing ? colors.primary : colors.border,
        },
        isEditing && styles.ingredientRowEditing,
      ]}
    >
      <View style={styles.ingredientInfo}>
        <Text style={[styles.ingredientName, { color: colors.textPrimary }]}>
          {ingredient.name}
        </Text>
        <Text style={[styles.ingredientAmount, { color: colors.textMuted }]}>
          {ingredient.quantity} {ingredient.unit}
        </Text>
      </View>
      {isEditing ? (
        <View
          style={[
            styles.ingredientEditingBadge,
            { backgroundColor: colors.primaryMuted },
          ]}
        >
          <Text
            style={[
              styles.ingredientEditingText,
              { color: colors.primaryText },
            ]}
          >
            En edicion
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={(event) => {
            event.stopPropagation();
            Keyboard.dismiss();
            onRemove(ingredient.id);
          }}
          style={[
            styles.removeIngredientButton,
            { borderColor: colors.danger },
          ]}
        >
          <Text style={[styles.removeIngredientText, { color: colors.danger }]}>
            Eliminar
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const DraggablePreparationStep = ({
  colors,
  displacement,
  isEditing,
  onDragPreview,
  onDragStateChange,
  onEdit,
  onMove,
  onRemove,
  step,
  stepsCount,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const displacementY = useRef(new Animated.Value(0)).current;
  const dragStateRef = useRef({
    lastTargetOrder: step.order,
    stepId: step.id,
    stepOrder: step.order,
    stepsCount,
  });
  const handlersRef = useRef({
    onDragPreview,
    onDragStateChange,
    onEdit,
    onMove,
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    dragStateRef.current.stepId = step.id;
    dragStateRef.current.stepOrder = step.order;
    dragStateRef.current.stepsCount = stepsCount;
  }, [step.id, step.order, stepsCount]);

  useEffect(() => {
    handlersRef.current = {
      onDragPreview,
      onDragStateChange,
      onEdit,
      onMove,
    };
  }, [onDragPreview, onDragStateChange, onEdit, onMove]);

  useEffect(() => {
    Animated.spring(displacementY, {
      damping: 18,
      stiffness: 180,
      toValue: isDragging ? 0 : displacement,
      useNativeDriver: true,
    }).start();
  }, [displacement, displacementY, isDragging]);

  const finishDrag = useCallback(() => {
    translateY.stopAnimation(() => {
      Animated.timing(translateY, {
        duration: 120,
        toValue: 0,
        useNativeDriver: true,
      }).start(() => {
        setIsDragging(false);
        handlersRef.current.onDragStateChange(false);
      });
    });
  }, [translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dy) > 4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          const { stepId, stepOrder } = dragStateRef.current;

          dragStateRef.current.lastTargetOrder = stepOrder;
          setIsDragging(true);
          handlersRef.current.onDragStateChange(true);
          handlersRef.current.onDragPreview({
            fromOrder: stepOrder,
            stepId,
            targetOrder: stepOrder,
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const {
            lastTargetOrder,
            stepId,
            stepOrder,
            stepsCount: currentStepsCount,
          } = dragStateRef.current;
          const orderOffset = Math.round(
            gestureState.dy / STEP_DRAG_SLOT_HEIGHT,
          );
          const targetOrder = Math.min(
            Math.max(stepOrder + orderOffset, 1),
            currentStepsCount,
          );

          translateY.setValue(gestureState.dy);

          if (targetOrder !== lastTargetOrder) {
            dragStateRef.current.lastTargetOrder = targetOrder;
            handlersRef.current.onDragPreview({
              fromOrder: stepOrder,
              stepId,
              targetOrder,
            });
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const { lastTargetOrder, stepId, stepOrder } = dragStateRef.current;
          const orderOffset = Math.round(
            gestureState.dy / STEP_DRAG_SLOT_HEIGHT,
          );
          const targetOrder = orderOffset === 0 ? stepOrder : lastTargetOrder;

          if (targetOrder !== stepOrder) {
            handlersRef.current.onMove(stepId, targetOrder);
          }

          finishDrag();
        },
        onPanResponderTerminate: finishDrag,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [finishDrag, translateY],
  );

  return (
    <Animated.View
      style={[
        styles.stepRow,
        isDragging && styles.stepRowDragging,
        {
          backgroundColor: colors.surface,
          borderColor: isDragging || isEditing ? colors.primary : colors.border,
          transform: [{ translateY: isDragging ? translateY : displacementY }],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          handlersRef.current.onEdit(step);
        }}
        style={styles.stepEditableArea}
      >
        <View
          style={[styles.stepNumber, { backgroundColor: colors.primaryMuted }]}
        >
          <Text style={[styles.stepNumberText, { color: colors.primaryText }]}>
            {step.order}
          </Text>
        </View>
        <View style={styles.stepTextContainer}>
          <View style={styles.stepContentRow}>
            <Text
              numberOfLines={2}
              style={[styles.stepText, { color: colors.textPrimary }]}
            >
              {getStepPreview(step.description)}
            </Text>
            {isEditing ? (
              <View
                style={[
                  styles.ingredientEditingBadge,
                  { backgroundColor: colors.primaryMuted },
                ]}
              >
                <Text
                  style={[
                    styles.ingredientEditingText,
                    { color: colors.primaryText },
                  ]}
                >
                  En edicion
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                accessibilityLabel="Eliminar paso"
                activeOpacity={0.75}
                onPress={(event) => {
                  event.stopPropagation();
                  Keyboard.dismiss();
                  onRemove(step.id);
                }}
                style={styles.stepTrashButton}
              >
                <Text
                  style={[styles.deleteActionText, { color: colors.danger }]}
                >
                  Eliminar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Pressable>
      <View
        {...panResponder.panHandlers}
        collapsable={false}
        style={[styles.stepDragRail, { borderLeftColor: colors.border }]}
      >
        <View style={styles.stepGripIcon}>
          <View
            style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]}
          />
          <View
            style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]}
          />
          <View
            style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]}
          />
          <View
            style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]}
          />
          <View
            style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]}
          />
          <View
            style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    borderRadius: 25,
    bottom: 24,
    height: 50,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    width: 50,
  },
  addButtonText: {
    fontSize: typography.sizes.displayAmount,
    fontWeight: typography.weights.regular,
    lineHeight: 46,
  },
  addIngredientButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    marginTop: 12,
  },
  addIngredientText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  clearButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
  },
  clearButtonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    lineHeight: 20,
  },
  cancelIngredientButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
  },
  emptyState: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  emptyText: {
    fontSize: typography.sizes.label,
    lineHeight: 19,
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  detailContent: {
    paddingBottom: 20,
  },
  detailEmptyState: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  deleteRecipeButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    marginTop: 14,
  },
  deleteRecipeText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  detailHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailInput: {
    borderRadius: 8,
    fontSize: typography.sizes.body,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  detailSubtitle: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  detailTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
  },
  detailTitleContainer: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  detailTabButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    height: 34,
    justifyContent: 'center',
  },
  detailTabs: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    height: 44,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  detailTabText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  dragHandle: {
    alignSelf: 'center',
    borderRadius: 3,
    height: 5,
    width: 44,
  },
  dragHandleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingBottom: 10,
    paddingTop: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginTop: 15,
  },
  mainContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
    marginHorizontal: 8,
    marginTop: 50,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  modalPrimaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  modalPrimaryText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  modalSecondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  modalSecondaryText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  modalTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    marginBottom: 14,
  },
  newSectionButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    minWidth: 88,
    paddingHorizontal: 12,
  },
  newSectionButtonText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  newSectionContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  newSectionInput: {
    borderRadius: 8,
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  ingredientAmount: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  ingredientForm: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 12,
    padding: 12,
  },
  ingredientFormEditing: {
    borderWidth: 2,
  },
  ingredientEditingBadge: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    maxWidth: 158,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  ingredientEditingText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  ingredientDuplicateWarning: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    lineHeight: 16,
  },
  ingredientInfo: {
    flex: 1,
    paddingRight: 10,
  },
  ingredientName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  ingredientRow: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 64,
    padding: 12,
    position: 'relative',
  },
  ingredientRowEditing: {
    borderWidth: 2,
  },
  inlineSelectRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    width: '100%',
  },
  inlineSelectText: {
    flex: 1,
  },
  ingredientSectionHeader: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    width: '100%',
    zIndex: 10,
  },
  ingredientSectionHeaderShell: {
    paddingBottom: 8,
    zIndex: 12,
  },
  ingredientSectionHeaderContent: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    minHeight: 24,
    width: '100%',
  },
  ingredientSectionToggle: {
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  ingredientSectionToggleText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    lineHeight: 20,
    textAlign: 'center',
  },
  ingredientSectionHeaderMeta: {
    flexShrink: 0,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    lineHeight: 20,
    textAlign: 'right',
  },
  ingredientSectionHeaderTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.4,
    lineHeight: 20,
  },
  editIngredientText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  inventoryIngredientList: {
    gap: 8,
    paddingBottom: 2,
  },
  inventoryIngredientPopupCard: {
    maxHeight: '86%',
  },
  inventoryIngredientScroll: {
    flexShrink: 1,
    maxHeight: 470,
    width: '100%',
  },
  inventoryIngredientOption: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inventoryIngredientOptionMeta: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 3,
  },
  inventoryIngredientOptionName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  inventoryIngredientSelect: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inventoryIngredientSelectMeta: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 2,
  },
  inventoryIngredientSelectText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  inventoryShortcutButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
  },
  inventoryShortcutText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  pickerSearchInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 46,
    paddingHorizontal: 12,
    width: '100%',
  },
  recipeCard: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    maxWidth: '48.8%',
    minHeight: 152,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  recipeCost: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  recipeCostContainer: {
    alignItems: 'flex-start',
    marginTop: 'auto',
    width: '100%',
  },
  recipeCostLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  recipeInfo: {
    minWidth: 0,
    width: '100%',
  },
  recipeList: {
    paddingBottom: 92,
    paddingHorizontal: 15,
  },
  recipeGridRow: {
    gap: 10,
    marginBottom: 10,
  },
  recipeMeta: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  recipeNameEditInput: {
    borderRadius: 8,
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  recipeModal: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 18,
    paddingTop: 0,
    width: '100%',
  },
  recipeDetailModal: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '94%',
    padding: 18,
    paddingTop: 0,
    width: '100%',
  },
  recipeName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  searchContainer: {
    marginHorizontal: 15,
    marginBottom: 14,
    marginTop: 16,
  },
  searchInput: {
    borderRadius: 15,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    height: 52,
    paddingHorizontal: 15,
    paddingRight: 48,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
  deleteActionText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    lineHeight: 16,
  },
  sheetBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  stepInput: {
    borderRadius: 8,
    fontSize: typography.sizes.body,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  stepNumber: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginRight: 10,
    width: 28,
  },
  stepNumberText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  stepDragRail: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderLeftWidth: 1,
    justifyContent: 'center',
    marginLeft: 4,
    marginRight: -8,
    minWidth: 34,
    paddingLeft: 10,
    paddingRight: 8,
  },
  stepEditableArea: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  stepGripDot: {
    borderRadius: 2,
    height: 2.5,
    width: 2.5,
  },
  stepGripIcon: {
    alignContent: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    justifyContent: 'center',
    width: 8,
  },
  stepContentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 34,
  },
  stepTrashButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 58,
    paddingHorizontal: 2,
  },
  stepRow: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 68,
    padding: 12,
  },
  stepRowDragging: {
    borderWidth: 2,
    zIndex: 2,
  },
  stepText: {
    flex: 1,
    fontSize: typography.sizes.body,
    lineHeight: 20,
  },
  stepTextContainer: {
    flex: 1,
  },
  quantityInput: {
    borderRadius: 8,
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  quantityRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  removeIngredientText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  removeIngredientButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  sectionLabel: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  sectionTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    marginBottom: 10,
    marginTop: 14,
  },
  servingsHint: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  servingsCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  servingsPanel: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 96,
    padding: 12,
  },
  servingsStepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minWidth: 132,
  },
  servingsValue: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
    minWidth: 28,
    textAlign: 'center',
  },
  stepperButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepperText: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
    lineHeight: 22,
  },
  sectionDeleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -4,
    minHeight: 34,
    minWidth: 62,
  },
  sectionOptionRow: {
    justifyContent: 'space-between',
  },
  sectionOptionText: {
    flex: 1,
  },
  sectionOptionsList: {
    gap: 8,
    paddingRight: 2,
  },
  sectionOptionsScroll: {
    maxHeight: 280,
  },
  unitListContainer: {
    width: 126,
  },
  unitOptionsList: {
    gap: 8,
    paddingRight: 2,
  },
  unitOptionsScroll: {
    maxHeight: 380,
  },
  unitOptionDescription: {
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.regular,
  },
  unitOptionKey: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    minWidth: 46,
  },
  unitOptionRow: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  unitPickerBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  unitPickerOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  unitPopupCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    width: '84%',
  },
  unitPopupTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    marginBottom: 4,
  },
  unitSelectBox: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  unitSelectDescription: {
    flex: 1,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    lineHeight: 16,
    textAlign: 'right',
  },
  unitSelectText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    minWidth: 34,
  },
});
