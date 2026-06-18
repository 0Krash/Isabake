import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  InteractionManager,
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

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getIngredientUnitLabel = (unitKey) =>
  ingredientUnits.find((unit) => unit.key === unitKey)?.description || 'Unidad';

const getInitials = (name) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
    [closeBottomSheet, resetSwipePosition, sheetTranslateY]
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
    [closeBottomSheet, resetSwipePosition, sheetTranslateY]
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
  const {
    isLoadingRecipes,
    recipes,
    refreshRecipes,
    setRecipes,
  } = useRecipeBookData();
  const {
    inventoryItems,
    isLoadingInventory,
  } = useInventoryData();
  const [addStoreModalIsVisible, setAddStoreModalIsVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalIsVisible, setModalIsVisible] = useState(false);
  const [menuIsVisible, setMenuIsVisible] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [ingredientName, setIngredientName] = useState('');
  const [selectedInventoryIngredient, setSelectedInventoryIngredient] =
    useState(null);
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [isSavingIngredient, setIsSavingIngredient] = useState(false);
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('g');
  const [ingredientPickerIsVisible, setIngredientPickerIsVisible] =
    useState(false);
  const [unitPickerIsVisible, setUnitPickerIsVisible] = useState(false);
  const [recipeDetailTab, setRecipeDetailTab] = useState('Ingredientes');
  const [isReorderingStep, setIsReorderingStep] = useState(false);
  const [stepDragPreview, setStepDragPreview] = useState(null);
  const [editingStepId, setEditingStepId] = useState(null);
  const [stepDescription, setStepDescription] = useState('');
  const [recipeNameDraft, setRecipeNameDraft] = useState('');
  const ingredientFormOffsetY = useRef(0);
  const isSavingIngredientRef = useRef(false);
  const recipeDetailScrollRef = useRef(null);
  const stepFormOffsetY = useRef(0);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId),
    [recipes, selectedRecipeId]
  );

  const sortedRecipeIngredients = useMemo(
    () =>
      [...(selectedRecipe?.ingredients || [])].sort((ingredientA, ingredientB) =>
        ingredientA.name.localeCompare(ingredientB.name, 'es', {
          sensitivity: 'base',
        })
      ),
    [selectedRecipe?.ingredients]
  );

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return recipes;
    }

    return recipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(normalizedSearch)
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
      closeModal();
    } catch (error) {
      console.warn('Error al crear receta:', error);
      Alert.alert(
        'No se pudo guardar',
        'Revisa la conexion con el backend e intenta crear la receta nuevamente.'
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
        currentRecipes.filter((recipe) => recipe.id !== selectedRecipe.id)
      );
      recipeDetailSheet.closeBottomSheet();
      refreshRecipes();
    } catch (error) {
      console.warn('Error al eliminar receta:', error);
      Alert.alert(
        'No se pudo eliminar',
        'Revisa la conexion con el backend e intenta eliminar la receta nuevamente.'
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
      ]
    );
  };

  const closeRecipeDetail = useCallback(() => {
    setSelectedRecipeId(null);
    setIngredientName('');
    setSelectedInventoryIngredient(null);
    setEditingIngredientId(null);
    setIngredientQuantity('');
    setIngredientUnit('g');
    setIngredientPickerIsVisible(false);
    setUnitPickerIsVisible(false);
    setRecipeDetailTab('Ingredientes');
    setEditingStepId(null);
    setStepDescription('');
    setRecipeNameDraft('');
  }, []);

  const createRecipeSheet = useBottomSheet(modalIsVisible, closeModal);
  const recipeDetailSheet = useBottomSheet(Boolean(selectedRecipe), closeRecipeDetail);

  const handleRecipeDetailBack = () => {
    if (ingredientPickerIsVisible) {
      setIngredientPickerIsVisible(false);
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
            console.warn('Error al crear receta local en backend:', createError);
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
        recipe.id === selectedRecipeId ? nextRecipe : recipe
      )
    );

    persistRecipe(nextRecipe);
  };

  const updateServings = (nextServings) => {
    updateSelectedRecipe((recipe) => ({
      ...recipe,
      servings: Math.max(1, nextServings),
    }));
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

  const addIngredient = () => {
    if (isSavingIngredientRef.current) {
      return;
    }

    const name = selectedInventoryIngredient?.name || ingredientName.trim();
    const quantity = ingredientQuantity.trim();

    if (!selectedInventoryIngredient || !name || !quantity) {
      return;
    }

    isSavingIngredientRef.current = true;
    setIsSavingIngredient(true);

    const ingredient = {
      id: editingIngredientId || `${selectedRecipeId}-${Date.now()}`,
      inventoryId: selectedInventoryIngredient.inventoryId,
      name,
      quantity,
      unit: ingredientUnit,
    };

    updateSelectedRecipe((recipe) => ({
      ...recipe,
      ingredients: editingIngredientId
        ? recipe.ingredients.map((currentIngredient) =>
            currentIngredient.id === editingIngredientId
              ? ingredient
              : currentIngredient
          )
        : recipe.ingredients.some(
            (currentIngredient) =>
              currentIngredient.inventoryId === selectedInventoryIngredient.inventoryId
          )
          ? recipe.ingredients
          : [...recipe.ingredients, ingredient],
    }));
    setIngredientName('');
    setSelectedInventoryIngredient(null);
    setEditingIngredientId(null);
    setIngredientQuantity('');
    setIngredientUnit('g');

    setTimeout(() => {
      isSavingIngredientRef.current = false;
      setIsSavingIngredient(false);
    }, 350);
  };

  const editIngredient = (ingredient) => {
    const inventoryIngredient = inventoryItems.find(
      (item) => item.inventoryId === ingredient.inventoryId
    );

    setRecipeDetailTab('Ingredientes');
    setEditingIngredientId(ingredient.id);
    setSelectedInventoryIngredient(
      inventoryIngredient || {
        category: '',
        inventoryId: ingredient.inventoryId,
        lots: [],
        name: ingredient.name,
      }
    );
    setIngredientName(ingredient.name);
    setIngredientQuantity(ingredient.quantity);
    setIngredientUnit(ingredient.unit);
  };

  const cancelIngredientEdition = () => {
    isSavingIngredientRef.current = false;
    setIsSavingIngredient(false);
    setEditingIngredientId(null);
    setSelectedInventoryIngredient(null);
    setIngredientName('');
    setIngredientQuantity('');
    setIngredientUnit('g');
  };

  const removeIngredient = (ingredientId) => {
    updateSelectedRecipe((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.filter(
        (ingredient) => ingredient.id !== ingredientId
      ),
    }));
  };

  const savePreparationStep = () => {
    const description = stepDescription.trim();

    if (!description) {
      return;
    }

    if (editingStepId) {
      updateSelectedRecipe((recipe) => ({
        ...recipe,
        steps: (recipe.steps || []).map((step) =>
          step.id === editingStepId
            ? {
                ...step,
                description,
              }
            : step
        ),
      }));
      setEditingStepId(null);
      setStepDescription('');
      return;
    }

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
  };

  const editPreparationStep = (step) => {
    setRecipeDetailTab('Preparacion');
    setEditingStepId(step.id);
    setStepDescription(step.description);
  };

  const cancelPreparationStepEdition = () => {
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
        (stepA, stepB) => stepA.order - stepB.order
      );
      const currentIndex = sortedSteps.findIndex((step) => step.id === stepId);
      const targetIndex = Math.min(
        Math.max(Number(targetOrder) - 1, 0),
        sortedSteps.length - 1
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
      style={[styles.mainContainer, { backgroundColor: colors.screenBackground }]}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Recetario
        </Text>
        <TransactionMenuButton
          isOpen={menuIsVisible}
          onPress={() => setMenuIsVisible(true)}
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
            onPress={() => setSearchText('')}
            style={[styles.clearButton, { backgroundColor: colors.surfaceMuted }]}
          >
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>
              x
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        contentContainerStyle={styles.recipeList}
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => setSelectedRecipeId(item.id)}
            style={[
              styles.recipeCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.recipeInitials,
                { backgroundColor: colors.primaryMuted },
              ]}
            >
              <Text style={[styles.recipeInitialsText, { color: colors.primaryText }]}>
                {getInitials(item.name)}
              </Text>
            </View>
            <View style={styles.recipeInfo}>
              <Text style={[styles.recipeName, { color: colors.textPrimary }]}>
                {item.name}
              </Text>
              <Text style={[styles.recipeMeta, { color: colors.textMuted }]}>
                {item.ingredients.length} ingredientes · {item.servings} porciones
              </Text>
            </View>
            <View style={styles.recipeCostContainer}>
              <Text style={[styles.recipeCostLabel, { color: colors.textMuted }]}>
                Costo
              </Text>
              <Text style={[styles.recipeCost, { color: colors.textPrimary }]}>
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
        onPress={() => setModalIsVisible(true)}
        style={[styles.addButton, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.addButtonText, { color: colors.textInverse }]}>+</Text>
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
            onPress={createRecipeSheet.closeBottomSheet}
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
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Nueva receta
            </Text>
            <TextInput
              onChangeText={setRecipeName}
              placeholder="Nombre del producto"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.fieldBackground,
                  color: colors.textPrimary,
                },
              ]}
              value={recipeName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={createRecipeSheet.closeBottomSheet}
                style={[styles.modalSecondaryButton, { borderColor: colors.border }]}
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
                onPress={createRecipe}
                style={[styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
              >
                <Text
                  style={[styles.modalPrimaryText, { color: colors.textInverse }]}
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
            onPress={recipeDetailSheet.closeBottomSheet}
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
                    style={[styles.dragHandle, { backgroundColor: colors.border }]}
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
                      style={[styles.detailSubtitle, { color: colors.textMuted }]}
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
                >
                  <View
                    style={[
                      styles.servingsPanel,
                      { backgroundColor: colors.surface, borderColor: colors.border },
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
                        Usa una cantidad realista para calcular costos por pieza.
                      </Text>
                    </View>
                    <View style={styles.servingsStepper}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => updateServings(selectedRecipe.servings - 1)}
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
                        onPress={() => updateServings(selectedRecipe.servings + 1)}
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

                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Receta
                  </Text>

                  <View style={[styles.detailTabs, { backgroundColor: colors.surface }]}>
                    {['Ingredientes', 'Preparacion'].map((tab) => {
                      const isSelected = recipeDetailTab === tab;

                      return (
                        <TouchableOpacity
                          activeOpacity={0.75}
                          key={tab}
                          onPress={() => setRecipeDetailTab(tab)}
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
                    <>
                      {sortedRecipeIngredients.map((ingredient) => {
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
                      })}

                      {sortedRecipeIngredients.length === 0 && (
                        <View
                          style={[
                            styles.detailEmptyState,
                            { borderColor: colors.border },
                          ]}
                        >
                          <Text
                            style={[styles.emptyTitle, { color: colors.textPrimary }]}
                          >
                            Sin ingredientes
                          </Text>
                          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            Los ingredientes se veran reflejados cuando los agregues.
                          </Text>
                        </View>
                      )}

                      <View
                        onLayout={(event) => {
                          ingredientFormOffsetY.current = event.nativeEvent.layout.y;
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
                          onPress={() => setIngredientPickerIsVisible(true)}
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
                              {selectedInventoryIngredient.category || 'Sin categoria'}
                            </Text>
                          )}
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
                              onPress={() => setUnitPickerIsVisible(true)}
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
                        <TouchableOpacity
                          activeOpacity={0.75}
                          disabled={
                            isSavingIngredient ||
                            !selectedInventoryIngredient ||
                            !ingredientQuantity.trim()
                          }
                          onPress={addIngredient}
                          style={[
                            styles.addIngredientButton,
                            {
                              backgroundColor:
                                isSavingIngredient ||
                                !selectedInventoryIngredient ||
                                !ingredientQuantity.trim()
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
                                  !ingredientQuantity.trim()
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
                            onPress={cancelIngredientEdition}
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
                  ) : (
                    <>
                      {(() => {
                        const sortedSteps = [...(selectedRecipe.steps || [])].sort(
                          (stepA, stepB) => stepA.order - stepB.order
                        );

                        return sortedSteps.map((step) => {
                          const previewFromOrder = stepDragPreview?.fromOrder;
                          const previewTargetOrder = stepDragPreview?.targetOrder;
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
                            style={[styles.emptyTitle, { color: colors.textPrimary }]}
                          >
                            Sin pasos de preparacion
                          </Text>
                          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            Los pasos de preparacion se veran reflejados cuando los agregues.
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
                          onPress={savePreparationStep}
                          style={[
                            styles.addIngredientButton,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.addIngredientText,
                              { color: colors.textInverse },
                            ]}
                          >
                            {editingStepId ? 'Actualizar paso' : 'Agregar paso'}
                          </Text>
                        </TouchableOpacity>
                        {editingStepId && (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={cancelPreparationStepEdition}
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
                    onPress={confirmDeleteRecipe}
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
                <Text style={[styles.unitPopupTitle, { color: colors.textPrimary }]}>
                  Unidad de medida
                </Text>
                {ingredientUnits.map((unit) => {
                  const isSelected = unit.key === ingredientUnit;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      key={unit.key}
                      onPress={() => {
                        setIngredientUnit(unit.key);
                        setUnitPickerIsVisible(false);
                      }}
                      style={[
                        styles.unitOptionRow,
                        {
                          backgroundColor: isSelected
                            ? colors.primaryMuted
                            : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
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
              </View>
            </View>
          )}
          {ingredientPickerIsVisible && (
            <View style={styles.unitPickerOverlay}>
              <Pressable
                onPress={() => setIngredientPickerIsVisible(false)}
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
                <Text style={[styles.unitPopupTitle, { color: colors.textPrimary }]}>
                  Ingrediente de inventario
                </Text>
                {isLoadingInventory ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Cargando inventario...
                  </Text>
                ) : inventoryItems.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No hay ingredientes registrados.
                  </Text>
                ) : (
                  <ScrollView
                    persistentScrollbar={true}
                    style={styles.inventoryIngredientScroll}
                    contentContainerStyle={styles.inventoryIngredientList}
                    showsVerticalScrollIndicator={true}
                  >
                    {inventoryItems.map((inventoryItem) => {
                      const isSelected =
                        selectedInventoryIngredient?.inventoryId ===
                        inventoryItem.inventoryId;

                      return (
                        <TouchableOpacity
                          activeOpacity={0.75}
                          key={inventoryItem.id}
                          onPress={() => {
                            setSelectedInventoryIngredient(inventoryItem);
                            setIngredientName(inventoryItem.name);
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
                  onPress={handleOpenInventoryFromPicker}
                  style={[
                    styles.inventoryShortcutButton,
                    { borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.inventoryShortcutText,
                      { color: colors.primaryText },
                    ]}
                  >
                    Ir a inventario
                  </Text>
                </TouchableOpacity>
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
      onPress={() => onEdit(ingredient)}
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
          <Text style={[styles.ingredientEditingText, { color: colors.primaryText }]}>
            En edicion
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={(event) => {
            event.stopPropagation();
            onRemove(ingredient.id);
          }}
          style={[styles.removeIngredientButton, { borderColor: colors.danger }]}
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
            gestureState.dy / STEP_DRAG_SLOT_HEIGHT
          );
          const targetOrder = Math.min(
            Math.max(stepOrder + orderOffset, 1),
            currentStepsCount
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
            gestureState.dy / STEP_DRAG_SLOT_HEIGHT
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
    [finishDrag, translateY]
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
        onPress={() => handlersRef.current.onEdit(step)}
        style={styles.stepEditableArea}
      >
        <View style={[styles.stepNumber, { backgroundColor: colors.primaryMuted }]}>
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
                  onRemove(step.id);
                }}
                style={styles.stepTrashButton}
              >
                <TrashIcon color={colors.danger} />
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
          <View style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]} />
          <View style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]} />
          <View style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]} />
          <View style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]} />
          <View style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]} />
          <View style={[styles.stepGripDot, { backgroundColor: colors.textMuted }]} />
        </View>
      </View>
    </Animated.View>
  );
};

const TrashIcon = ({ color }) => (
  <View style={styles.trashIcon}>
    <View style={[styles.trashHandle, { backgroundColor: color }]} />
    <View style={[styles.trashLid, { backgroundColor: color }]} />
    <View
      style={[
        styles.trashCan,
        {
          borderBottomColor: color,
          borderLeftColor: color,
          borderRightColor: color,
        },
      ]}
    >
      <View style={[styles.trashLine, { backgroundColor: color }]} />
      <View style={[styles.trashLine, { backgroundColor: color }]} />
      <View style={[styles.trashLine, { backgroundColor: color }]} />
    </View>
  </View>
);

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
    minHeight: 36,
    paddingHorizontal: 10,
  },
  ingredientEditingText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
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
  },
  ingredientRowEditing: {
    borderWidth: 2,
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
    maxHeight: '78%',
  },
  inventoryIngredientScroll: {
    flexShrink: 1,
    maxHeight: 390,
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
  recipeCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  recipeCost: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  recipeCostContainer: {
    alignItems: 'flex-end',
  },
  recipeCostLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  recipeInfo: {
    flex: 1,
    minWidth: 0,
  },
  recipeInitials: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginRight: 12,
    width: 48,
  },
  recipeInitialsText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  recipeList: {
    paddingBottom: 92,
    paddingHorizontal: 15,
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
    maxHeight: '88%',
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
  trashCan: {
    alignItems: 'center',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    borderBottomWidth: 1.1,
    borderLeftWidth: 1.1,
    borderRightWidth: 1.1,
    flexDirection: 'row',
    gap: 2,
    height: 11,
    justifyContent: 'center',
    marginTop: 2,
    paddingHorizontal: 1.5,
    width: 13,
  },
  trashHandle: {
    borderRadius: 1,
    height: 1.4,
    marginBottom: 1,
    width: 5,
  },
  trashIcon: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  trashLid: {
    borderRadius: 1,
    height: 1.4,
    width: 15,
  },
  trashLine: {
    borderRadius: 1,
    height: 6.5,
    width: 0.9,
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
    height: 32,
    justifyContent: 'center',
    width: 30,
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
  unitListContainer: {
    width: 126,
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
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  unitSelectDescription: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    lineHeight: 16,
  },
  unitSelectText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
});
