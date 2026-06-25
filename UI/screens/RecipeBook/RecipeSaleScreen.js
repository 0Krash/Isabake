import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useInventoryData from '../../hooks/Inventory/useInventoryData';
import transactionService from '../../services/TransactionBalance/API/transactionService';
import {
  calculateRecipeCost,
  calculateSaleMetrics,
} from '../../utils/recipeCost';
import { idsMatch } from '../../utils/idUtils';

const money = (value) =>
  new Intl.NumberFormat('es-MX', {
    currency: 'MXN',
    style: 'currency',
  }).format(value);

const saleUnits = {
  cda: ['spoon', 3],
  cdta: ['spoon', 1],
  g: ['weight', 1],
  kg: ['weight', 1000],
  l: ['volume', 1000],
  ml: ['volume', 1],
  pza: ['piece', 1],
};

const number = (value) =>
  Number(
    String(value || '0')
      .replace(/[^0-9.,-]/g, '')
      .replace(',', '.'),
  ) || 0;

const ingredientRoundingModes = [
  {
    description: 'sin ajustar',
    label: 'Exacto',
    value: 'exact',
  },
  {
    description: '987.5g → 988g',
    label: 'Entero',
    value: 'minimum',
  },
  {
    description: '987g → 990g',
    label: 'Práctico',
    value: 'soft',
  },
  {
    description: '987g → 1000g',
    label: 'Cerrado',
    value: 'wide',
  },
];

const formatQuantity = (value) => {
  const rounded = Math.round(value * 10) / 10;

  return Number.isInteger(rounded)
    ? `${rounded}`
    : rounded.toFixed(1).replace(/\.?0+$/, '');
};

const getRoundingStep = (value, mode) => {
  if (mode === 'minimum') {
    return 1;
  }

  if (mode === 'soft') {
    return Math.abs(value) < 100 ? 1 : 10;
  }

  if (mode === 'wide') {
    return Math.abs(value) < 100 ? 10 : 100;
  }

  return 0;
};

const roundIngredientQuantity = (value, unit, mode) => {
  if (unit === 'pza') {
    return mode === 'exact' ? Math.floor(value) : Math.ceil(value);
  }

  const step = getRoundingStep(value, mode);

  if (!step) {
    return value;
  }

  return Math.ceil(value / step) * step;
};

const toBaseQuantity = (quantity, unit) => {
  const [, factor = 1] = saleUnits[unit] || [];

  return number(quantity) * factor;
};

const scaleIngredientQuantity = (ingredient, scale, roundingMode) => {
  const scaledQuantity = number(ingredient.quantity) * scale;

  if (ingredient.unit === 'pza') {
    return {
      quantity: formatQuantity(
        roundIngredientQuantity(scaledQuantity, 'pza', roundingMode),
      ),
      unit: 'pza',
    };
  }

  if (ingredient.unit === 'kg' && Math.abs(scaledQuantity) < 1) {
    const convertedQuantity = scaledQuantity * 1000;

    return {
      quantity: formatQuantity(
        roundIngredientQuantity(convertedQuantity, 'g', roundingMode),
      ),
      unit: 'g',
    };
  }

  if (ingredient.unit === 'l' && Math.abs(scaledQuantity) < 1) {
    const convertedQuantity = scaledQuantity * 1000;

    return {
      quantity: formatQuantity(
        roundIngredientQuantity(convertedQuantity, 'ml', roundingMode),
      ),
      unit: 'ml',
    };
  }

  return {
    quantity: formatQuantity(
      roundIngredientQuantity(scaledQuantity, ingredient.unit, roundingMode),
    ),
    unit: ingredient.unit,
  };
};

export default function RecipeSaleScreen({ onClose, recipe }) {
  const { colors } = useTransactionBalanceTheme();
  const { inventoryItems, isLoadingInventory } = useInventoryData();
  const recipeServings = Math.max(Number(recipe.servings) || 1, 1);
  const [quantity, setQuantity] = useState(`${recipeServings}`);
  const [targetMargin, setTargetMargin] = useState('60');
  const [extraExpenses, setExtraExpenses] = useState('0');
  const [saleTotal, setSaleTotal] = useState(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showRoundingFilters, setShowRoundingFilters] = useState(false);
  const [showPreparation, setShowPreparation] = useState(false);
  const [ingredientRoundingMode, setIngredientRoundingMode] = useState('exact');
  const [scrollOffsetY, setScrollOffsetY] = useState(0);
  const [ingredientsHeaderY, setIngredientsHeaderY] = useState(0);
  const [ingredientsHeaderHeight, setIngredientsHeaderHeight] = useState(0);
  const [saleFormY, setSaleFormY] = useState(0);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const cost = useMemo(
    () => calculateRecipeCost(recipe, inventoryItems),
    [inventoryItems, recipe],
  );
  const saleQuantity = Math.max(Number(quantity) || 0, 0);
  const ingredientScale = recipeServings ? saleQuantity / recipeServings : 0;

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onClose();
        return true;
      },
    );

    return () => {
      backSubscription.remove();
    };
  }, [onClose]);
  const sortedIngredients = useMemo(
    () =>
      cost.ingredients
        .map((ingredient) => {
          const exactIngredient = scaleIngredientQuantity(
            ingredient,
            ingredientScale,
            'exact',
          );
          const scaledIngredient = scaleIngredientQuantity(
            ingredient,
            ingredientScale,
            ingredientRoundingMode,
          );
          const originalBaseQuantity = toBaseQuantity(
            ingredient.quantity,
            ingredient.unit,
          );
          const roundedBaseQuantity = toBaseQuantity(
            scaledIngredient.quantity,
            scaledIngredient.unit,
          );
          const costPerBaseUnit = originalBaseQuantity
            ? ingredient.cost / originalBaseQuantity
            : 0;

          return {
            ...ingredient,
            cost: roundedBaseQuantity * costPerBaseUnit,
            hasRoundedQuantity:
              ingredientRoundingMode !== 'exact' &&
              (`${exactIngredient.quantity}` !==
                `${scaledIngredient.quantity}` ||
                exactIngredient.unit !== scaledIngredient.unit),
            originalQuantity: exactIngredient.quantity,
            originalUnit: exactIngredient.unit,
            quantity: scaledIngredient.quantity,
            unit: scaledIngredient.unit,
          };
        })
        .sort((first, second) =>
          String(first.name || '').localeCompare(
            String(second.name || ''),
            'es',
            {
              sensitivity: 'base',
            },
          ),
        ),
    [cost.ingredients, ingredientScale, ingredientRoundingMode],
  );
  const roundedProductionCost = sortedIngredients.reduce(
    (sum, ingredient) => sum + ingredient.cost,
    0,
  );
  const roundedPortionCost = saleQuantity
    ? roundedProductionCost / saleQuantity
    : 0;
  const metrics = calculateSaleMetrics({
    extraExpenses,
    portionCost: roundedPortionCost,
    quantity: saleQuantity,
    saleTotal,
    targetMargin,
  });
  const {
    amount,
    extraExpenses: normalizedExtraExpenses,
    grossMargin,
    grossProfit,
    netMargin,
    netProfit,
    productionCost,
    suggestedTotal,
    suggestedUnitPrice,
    targetMargin: normalizedTargetMargin,
  } = metrics;
  const canSell =
    !isLoadingInventory &&
    !cost.missingCost &&
    productionCost > 0 &&
    amount > 0 &&
    !isSaving;
  const groupedIngredients = useMemo(() => {
    const groups = sortedIngredients.reduce((currentGroups, ingredient) => {
      const section = ingredient.section || 'Sin sección';

      return {
        ...currentGroups,
        [section]: [...(currentGroups[section] || []), ingredient],
      };
    }, {});

    return Object.keys(groups)
      .sort((sectionA, sectionB) =>
        sectionA.localeCompare(sectionB, 'es', {
          sensitivity: 'base',
        }),
      )
      .map((section) => ({
        ingredients: groups[section],
        section,
        total: groups[section].reduce(
          (sum, ingredient) => sum + ingredient.cost,
          0,
        ),
      }));
  }, [sortedIngredients]);
  const selectedInventoryItem = useMemo(
    () =>
      selectedIngredient
        ? inventoryItems.find(
            (item) => idsMatch(item.inventoryId, selectedIngredient.inventoryId),
          )
        : null,
    [inventoryItems, selectedIngredient],
  );
  const selectedIngredientLots = useMemo(() => {
    if (!selectedIngredient || !selectedInventoryItem) {
      return [];
    }

    const [group] = saleUnits[selectedIngredient.unit] || [];

    return (selectedInventoryItem.lots || []).filter(
      (lot) => saleUnits[lot.unit]?.[0] === group && number(lot.quantity) > 0,
    );
  }, [selectedIngredient, selectedInventoryItem]);
  const selectedRoundingMode =
    ingredientRoundingModes.find(
      (mode) => mode.value === ingredientRoundingMode,
    ) || ingredientRoundingModes[0];
  const shouldShowStickyIngredientsHeader =
    showIngredients &&
    ingredientsHeaderHeight > 0 &&
    saleFormY > 0 &&
    scrollOffsetY >= ingredientsHeaderY &&
    scrollOffsetY < saleFormY - ingredientsHeaderHeight;

  const renderIngredientsHeader = ({ isSticky = false } = {}) => (
    <View
      onLayout={
        isSticky
          ? undefined
          : (event) => {
              setIngredientsHeaderY(event.nativeEvent.layout.y);
              setIngredientsHeaderHeight(event.nativeEvent.layout.height);
            }
      }
      style={[
        styles.ingredientsChunkHeader,
        { backgroundColor: colors.screenBackground },
        isSticky && styles.ingredientsStickyHeader,
      ]}
    >
      <TouchableOpacity
        onPress={() => setShowIngredients((current) => !current)}
        style={[styles.sectionHeader, { borderBottomColor: colors.border }]}
      >
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Ingredientes
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {isSticky
              ? `${money(productionCost)} · ${selectedRoundingMode.label}`
              : `${cost.ingredients.length} registrados`}
          </Text>
        </View>
        <Text style={[styles.sectionToggle, { color: colors.primaryText }]}>
          {showIngredients ? 'Ocultar −' : 'Mostrar +'}
        </Text>
      </TouchableOpacity>
      {showIngredients && !isSticky && (
        <View style={styles.roundingControls}>
          <View style={styles.roundingHeaderRow}>
            <View style={styles.rowCopy}>
              <Text style={[styles.roundingLabel, { color: colors.textMuted }]}>
                Redondeo de cantidades
              </Text>
              <Text
                style={[styles.roundingSelected, { color: colors.textPrimary }]}
              >
                {selectedRoundingMode.label} ·{' '}
                {selectedRoundingMode.description}
              </Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Actualiza cantidades, costos y precio sugerido.
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowRoundingFilters((current) => !current)}
              style={[
                styles.roundingToggle,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.roundingToggleText,
                  { color: colors.primaryText },
                ]}
              >
                {showRoundingFilters ? 'Ocultar' : 'Cambiar'}
              </Text>
            </TouchableOpacity>
          </View>
          {showRoundingFilters && (
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
            >
              {ingredientRoundingModes.map((mode) => {
                const isSelected = ingredientRoundingMode === mode.value;

                return (
                  <TouchableOpacity
                    activeOpacity={0.78}
                    key={mode.value}
                    onPress={() => setIngredientRoundingMode(mode.value)}
                    style={[
                      styles.roundingChip,
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
                        styles.roundingChipTitle,
                        {
                          color: isSelected
                            ? colors.primaryText
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {mode.label}
                    </Text>
                    <Text
                      style={[
                        styles.roundingChipDescription,
                        { color: colors.textMuted },
                      ]}
                    >
                      {mode.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );

  const createSale = async () => {
    if (!canSell) return;
    setIsSaving(true);

    try {
      await transactionService.postTransaction({
        amount: Math.round(amount * 100),
        category: { description: 'Recetas', shortDescription: 'Recetas' },
        description: `Venta de ${recipe.name}`,
        financials: {
          costPerPortion: Math.round(roundedPortionCost * 100),
          extraExpenses: Math.round(normalizedExtraExpenses * 100),
          grossMargin,
          grossProfit: Math.round(grossProfit * 100),
          ingredientRoundingMode,
          ingredients: sortedIngredients.map((ingredient) => ({
            cost: Math.round(ingredient.cost * 100),
            inventoryId: ingredient.inventoryId,
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
          })),
          netMargin,
          netProfit: Math.round(netProfit * 100),
          productionCost: Math.round(productionCost * 100),
          recipeId: recipe.recipeId,
          recipeName: recipe.name,
          recipeServings,
          saleQuantity,
          saleTotal: Math.round(amount * 100),
          suggestedTotal: Math.round(suggestedTotal * 100),
          suggestedUnitPrice: Math.round(suggestedUnitPrice * 100),
          targetMargin: normalizedTargetMargin,
        },
        itemQuantity: `${saleQuantity}`,
        quantity: `${saleQuantity}`,
        selectedDate: new Date().toISOString(),
        transactionType: 'Ventas',
        uomId: 'pza',
      });
      Alert.alert('Venta registrada', `${saleQuantity} × ${recipe.name}`, [
        { onPress: onClose, text: 'Aceptar' },
      ]);
    } catch (error) {
      console.warn('Error al registrar venta de receta:', error);
      Alert.alert(
        'No se pudo registrar',
        'Revisa la conexión e intenta nuevamente.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.screenBackground }]}>
      <View
        style={[
          styles.header,
          { paddingTop: (StatusBar.currentHeight || 0) + 12 },
        ]}
      >
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primaryText }]}>
            ‹ Volver
          </Text>
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: colors.textPrimary }]}
        >
          {recipe.name}
        </Text>
      </View>

      <View style={styles.scrollArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          onScroll={(event) =>
            setScrollOffsetY(event.nativeEvent.contentOffset.y)
          }
          scrollEventThrottle={16}
        >
          <View style={[styles.summary, { backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              {saleTotal === null ? 'Total sugerido' : 'Total de venta'}
            </Text>
            <Text style={[styles.amount, { color: colors.textPrimary }]}>
              {isLoadingInventory ? 'Calculando…' : money(amount)}
            </Text>
            <View style={styles.summaryMetrics}>
              <View style={styles.summaryMetric}>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  Utilidad neta
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.textPrimary }]}
                >
                  {money(netProfit)}
                </Text>
              </View>
              <View style={styles.summaryMetric}>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  Costo elaboración
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.textPrimary }]}
                >
                  {money(productionCost)}
                </Text>
              </View>
              <View style={styles.summaryMetric}>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  Margen neto
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.textPrimary }]}
                >
                  {netMargin.toFixed(1)}%
                </Text>
              </View>
            </View>
            <Text style={[styles.scaleNote, { color: colors.textMuted }]}>
              Costos ajustados para {saleQuantity || 0} de {recipeServings}{' '}
              porciones con redondeo {selectedRoundingMode.label.toLowerCase()}.
            </Text>
          </View>

          {renderIngredientsHeader()}
          {showIngredients &&
            groupedIngredients.map((group) => (
              <View key={group.section} style={styles.ingredientGroup}>
                <View
                  style={[
                    styles.ingredientGroupHeader,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.groupTitle, { color: colors.textPrimary }]}
                  >
                    {group.section}
                  </Text>
                  <Text style={[styles.rowCost, { color: colors.textPrimary }]}>
                    {money(group.total)}
                  </Text>
                </View>
                {group.ingredients.map((ingredient) => (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    key={ingredient.id}
                    onPress={() => setSelectedIngredient(ingredient)}
                    style={[styles.row, { borderBottomColor: colors.border }]}
                  >
                    <View style={styles.rowCopy}>
                      <Text
                        style={[styles.rowTitle, { color: colors.textPrimary }]}
                      >
                        {ingredient.name}
                      </Text>
                      <Text style={[styles.meta, { color: colors.textMuted }]}>
                        {ingredient.quantity} {ingredient.unit}
                      </Text>
                      {ingredient.hasRoundedQuantity && (
                        <Text
                          style={[
                            styles.roundingChange,
                            { color: colors.textMuted },
                          ]}
                        >
                          Exacto: {ingredient.originalQuantity}{' '}
                          {ingredient.originalUnit} → redondeado
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.rowCost,
                        {
                          color: ingredient.hasCost
                            ? colors.textPrimary
                            : colors.danger,
                        },
                      ]}
                    >
                      {ingredient.hasCost
                        ? money(ingredient.cost)
                        : 'Sin costo'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

          {recipe.steps?.length > 0 && (
            <>
              <TouchableOpacity
                onPress={() => setShowPreparation((current) => !current)}
                style={[
                  styles.sectionHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    Preparación
                  </Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>
                    {recipe.steps.length} pasos
                  </Text>
                </View>
                <Text
                  style={[styles.sectionToggle, { color: colors.primaryText }]}
                >
                  {showPreparation ? 'Ocultar −' : 'Mostrar +'}
                </Text>
              </TouchableOpacity>
              {showPreparation &&
                [...recipe.steps]
                  .sort((a, b) => a.order - b.order)
                  .map((step, index) => (
                    <Text
                      key={step.id}
                      style={[styles.step, { color: colors.textSecondary }]}
                    >
                      {index + 1}. {step.description}
                    </Text>
                  ))}
            </>
          )}

          <View
            onLayout={(event) => setSaleFormY(event.nativeEvent.layout.y)}
            style={[
              styles.sale,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.saleTitle, { color: colors.textPrimary }]}>
              Rentabilidad de la venta
            </Text>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Porciones
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(value) =>
                    setQuantity(value.replace(/[^0-9]/g, ''))
                  }
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.fieldBackground,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={quantity}
                />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Margen objetivo %
                </Text>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={setTargetMargin}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.fieldBackground,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={targetMargin}
                />
              </View>
            </View>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Define el precio sugerido; 60% significa conservar $60 de cada
              $100 antes de otros gastos.
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              Gastos adicionales
            </Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setExtraExpenses}
              placeholder="Empaque, comisión, envío…"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.fieldBackground,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={extraExpenses}
            />

            <View style={styles.totalHeader}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                Total de venta
              </Text>
              {saleTotal !== null && (
                <TouchableOpacity onPress={() => setSaleTotal(null)}>
                  <Text
                    style={[styles.resetText, { color: colors.primaryText }]}
                  >
                    Restaurar sugerido
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setSaleTotal}
              style={[
                styles.totalInput,
                {
                  backgroundColor: colors.fieldBackground,
                  borderColor: colors.primary,
                  color: colors.textPrimary,
                },
              ]}
              value={saleTotal === null ? suggestedTotal.toFixed(2) : saleTotal}
            />
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {saleTotal === null
                ? 'Usando precio sugerido. Puedes modificarlo si vendiste a otro monto.'
                : 'Precio editado manualmente; utilidad y márgenes se recalculan inmediatamente.'}
            </Text>

            <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
              Resultado
            </Text>
            <View style={styles.metricSections}>
              {[
                [
                  'Resultado',
                  [
                    [
                      'Utilidad neta estimada',
                      money(netProfit),
                      `${netMargin.toFixed(1)}% de margen neto`,
                      true,
                    ],
                    [
                      'Utilidad bruta',
                      money(grossProfit),
                      `${grossMargin.toFixed(1)}% de margen bruto`,
                    ],
                  ],
                ],
                [
                  'Precio',
                  [
                    [
                      'Total sugerido',
                      money(suggestedTotal),
                      `${saleQuantity} porciones`,
                    ],
                    [
                      'Precio sugerido por porción',
                      money(suggestedUnitPrice),
                      `${normalizedTargetMargin.toFixed(1)}% de margen objetivo`,
                    ],
                  ],
                ],
                [
                  'Costos',
                  [
                    [
                      'Costo de elaboración',
                      money(productionCost),
                      'Ingredientes consumidos',
                    ],
                    [
                      'Gastos adicionales',
                      money(normalizedExtraExpenses),
                      'Empaque, comisión, envío…',
                    ],
                  ],
                ],
              ].map(([sectionTitle, rows]) => (
                <View
                  key={sectionTitle}
                  style={[styles.metrics, { borderColor: colors.border }]}
                >
                  <Text
                    style={[
                      styles.metricSectionTitle,
                      { color: colors.textMuted },
                    ]}
                  >
                    {sectionTitle}
                  </Text>
                  {rows.map(([label, value, description, isHighlighted]) => (
                    <View
                      key={label}
                      style={[
                        styles.metricRow,
                        isHighlighted && {
                          backgroundColor: colors.primaryMuted,
                        },
                      ]}
                    >
                      <View style={styles.rowCopy}>
                        <Text
                          style={[
                            styles.metricLabel,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {label}
                        </Text>
                        <Text
                          style={[styles.hint, { color: colors.textMuted }]}
                        >
                          {description}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.metricValue,
                          {
                            color: value.startsWith('-')
                              ? colors.danger
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
            {cost.missingCost && !isLoadingInventory && (
              <Text style={[styles.warning, { color: colors.danger }]}>
                Agrega costo y existencia a todos los ingredientes para vender.
              </Text>
            )}
          </View>
        </ScrollView>
        {shouldShowStickyIngredientsHeader &&
          renderIngredientsHeader({ isSticky: true })}
      </View>
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.rowCopy}>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {saleTotal === null ? 'Total sugerido' : 'Total de venta'}
          </Text>
          <Text style={[styles.bottomBarAmount, { color: colors.textPrimary }]}>
            {money(amount)}
          </Text>
        </View>
        <TouchableOpacity
          disabled={!canSell}
          onPress={createSale}
          style={[
            styles.bottomSellButton,
            {
              backgroundColor: canSell ? colors.primary : colors.primaryMuted,
            },
          ]}
        >
          <Text style={[styles.sellText, { color: colors.textInverse }]}>
            {isSaving ? 'Registrando…' : 'Registrar venta'}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedIngredient(null)}
        transparent
        visible={Boolean(selectedIngredient)}
      >
        <View style={styles.lotModalRoot}>
          <Pressable
            onPress={() => setSelectedIngredient(null)}
            style={[
              styles.lotModalBackdrop,
              { backgroundColor: colors.backdrop },
            ]}
          />
          <View
            style={[
              styles.lotModalCard,
              {
                backgroundColor: colors.screenBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.lotModalTitle, { color: colors.textPrimary }]}>
              {selectedIngredient?.name}
            </Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Lotes disponibles para {selectedIngredient?.quantity}{' '}
              {selectedIngredient?.unit}
            </Text>
            {selectedIngredientLots.length === 0 ? (
              <Text style={[styles.warning, { color: colors.danger }]}>
                No hay lotes compatibles con existencia.
              </Text>
            ) : (
              selectedIngredientLots.map((lot, lotIndex) => (
                <View
                  key={`${lot.id || lot.lotId || 'lot'}-${lotIndex}`}
                  style={[styles.lotRow, { borderColor: colors.border }]}
                >
                  <View style={styles.rowCopy}>
                    <Text
                      style={[styles.rowTitle, { color: colors.textPrimary }]}
                    >
                      {lot.brand || selectedIngredient?.name}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {lot.supplier || 'Sin proveedor'} · {lot.quantity}{' '}
                      {lot.unit}
                    </Text>
                  </View>
                  <Text style={[styles.rowCost, { color: colors.textPrimary }]}>
                    {money(number(lot.cost))}
                  </Text>
                </View>
              ))
            )}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setSelectedIngredient(null)}
              style={[
                styles.closeLotButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.sellText, { color: colors.textInverse }]}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 32, fontWeight: typography.weights.bold, marginTop: 6 },
  backButton: { justifyContent: 'center', minHeight: 44 },
  backText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  bottomBar: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 18,
  },
  bottomBarAmount: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  bottomSellButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  content: { padding: 16, paddingBottom: 96 },
  fieldLabel: { fontSize: typography.sizes.label, marginTop: 16 },
  formField: { flex: 1 },
  formRow: { flexDirection: 'row', gap: 10 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  groupTitle: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  hint: { fontSize: typography.sizes.caption, lineHeight: 17, marginTop: 3 },
  ingredientsChunkHeader: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  ingredientsStickyHeader: {
    left: 0,
    marginHorizontal: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  ingredientGroup: { marginTop: 10 },
  ingredientGroupHeader: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 24,
    marginTop: 6,
    padding: 12,
  },
  label: { fontSize: typography.sizes.label },
  closeLotButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 46,
  },
  lotModalBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  lotModalCard: {
    borderRadius: 14,
    borderWidth: 1,
    margin: 18,
    maxHeight: '78%',
    padding: 16,
    width: '90%',
  },
  lotModalRoot: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  lotModalTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
  },
  lotRow: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    padding: 12,
  },
  marginChip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 10,
  },
  marginChipText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  marginQuickChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  meta: { fontSize: typography.sizes.caption, marginTop: 3 },
  metricSections: {
    gap: 10,
    marginTop: 8,
  },
  metricSectionTitle: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    paddingHorizontal: 10,
    paddingTop: 8,
    textTransform: 'uppercase',
  },
  metricLabel: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  metrics: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
    paddingVertical: 3,
  },
  metricValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    textAlign: 'right',
  },
  resetText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  resultTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    marginTop: 22,
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  rowCopy: { flex: 1 },
  rowCost: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  rowTitle: { fontSize: typography.sizes.body },
  roundingChange: {
    fontSize: typography.sizes.caption,
    marginTop: 3,
  },
  roundingChip: {
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 5,
    width: 100,
  },
  roundingChipDescription: {
    fontSize: typography.sizes.caption,
    marginTop: 3,
  },
  roundingChipTitle: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  roundingControls: {
    paddingBottom: 10,
    paddingTop: 10,
  },
  roundingHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  roundingLabel: {
    fontSize: typography.sizes.caption,
  },
  roundingSelected: {
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  roundingToggle: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  roundingToggleText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  sale: { borderRadius: 12, borderWidth: 1, marginTop: 24, padding: 16 },
  saleTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
    marginBottom: 16,
  },
  scaleNote: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 8,
  },
  screen: { flex: 1 },
  scrollArea: { flex: 1 },
  sectionHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    minHeight: 62,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
  },
  sectionToggle: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  sellButton: {
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 16,
    minHeight: 52,
    justifyContent: 'center',
  },
  sellText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  step: { fontSize: typography.sizes.body, lineHeight: 22, marginTop: 10 },
  summary: { borderRadius: 12, padding: 18 },
  summaryMetric: { flex: 1 },
  summaryMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  summaryValue: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    marginTop: 3,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
  totalHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalInput: {
    borderRadius: 8,
    borderWidth: 2,
    fontSize: 28,
    fontWeight: typography.weights.bold,
    marginTop: 6,
    padding: 12,
  },
  warning: { fontSize: typography.sizes.label, marginTop: 12 },
});
