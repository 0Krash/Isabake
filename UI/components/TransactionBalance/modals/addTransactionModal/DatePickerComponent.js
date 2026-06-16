import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import typography from '../../../../constants/TransactionBalance/Typography';
import useTransactionBalanceStyles from '../../../../hooks/TransactionBalance/useTransactionBalanceStyles';
import DateFormatter from '../../../../utils/DateFormatter';

const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const YEARS_PER_PAGE = 12;
const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Date(2026, month, 1).toLocaleString('es-MX', { month: 'short' })
);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const handleInputFocus = () => {
  Keyboard.dismiss();
};

const isSameDate = (dateA, dateB) =>
  dateA.getFullYear() === dateB.getFullYear() &&
  dateA.getMonth() === dateB.getMonth() &&
  dateA.getDate() === dateB.getDate();

const getCalendarDays = (visibleDate) => {
  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = firstDay.getDay();

  return [
    ...Array.from({ length: leadingEmptyDays }, (_, index) => ({
      key: `empty-${index}`,
      date: null,
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return {
        key: `${year}-${month}-${day}`,
        date: new Date(year, month, day),
      };
    }),
  ];
};

const getYearRangeStart = (year) =>
  Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;

const getYearRange = (year) => {
  const start = getYearRangeStart(year);

  return Array.from({ length: YEARS_PER_PAGE }, (_, index) => start + index);
};

export default function DatePickerComponent({
  isDatePickerVisible,
  showDatePicker,
  hideDatePicker,
  handleConfirm,
  selectedDate,
}) {
  const { colors, stylesBase } = useTransactionBalanceStyles();
  const { width: windowWidth } = useWindowDimensions();
  const calendarWidth = clamp(windowWidth - 48, 292, 380);
  const horizontalPadding = calendarWidth < 330 ? 14 : 22;
  const titleFontSize =
    calendarWidth < 330 ? typography.sizes.body : typography.sizes.bodyLarge;
  const headerDateFontSize =
    calendarWidth < 330 ? 20 : typography.sizes.title;
  const gridFontSize =
    calendarWidth < 330 ? typography.sizes.label : typography.sizes.body;
  const monthCellHeight = calendarWidth < 330 ? 46 : 52;
  const selectedDateValue = DateFormatter.selectedToDate(selectedDate);
  const [visibleDate, setVisibleDate] = useState(selectedDateValue);
  const [draftDate, setDraftDate] = useState(selectedDateValue);
  const [pickerView, setPickerView] = useState('days');

  useEffect(() => {
    if (isDatePickerVisible) {
      setVisibleDate(selectedDateValue);
      setDraftDate(selectedDateValue);
      setPickerView('days');
    }
  }, [isDatePickerVisible, selectedDate]);

  const calendarDays = useMemo(
    () => getCalendarDays(visibleDate),
    [visibleDate]
  );
  const yearRange = useMemo(
    () => getYearRange(visibleDate.getFullYear()),
    [visibleDate]
  );

  const goToPreviousMonth = () => {
    setVisibleDate(
      new Date(visibleDate.getFullYear(), visibleDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setVisibleDate(
      new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 1)
    );
  };

  const goToPreviousYear = () => {
    setVisibleDate(
      new Date(visibleDate.getFullYear() - 1, visibleDate.getMonth(), 1)
    );
  };

  const goToNextYear = () => {
    setVisibleDate(
      new Date(visibleDate.getFullYear() + 1, visibleDate.getMonth(), 1)
    );
  };

  const goToPreviousYearRange = () => {
    setVisibleDate(
      new Date(
        visibleDate.getFullYear() - YEARS_PER_PAGE,
        visibleDate.getMonth(),
        1
      )
    );
  };

  const goToNextYearRange = () => {
    setVisibleDate(
      new Date(
        visibleDate.getFullYear() + YEARS_PER_PAGE,
        visibleDate.getMonth(),
        1
      )
    );
  };

  const selectDate = (date) => {
    setDraftDate(date);
    setVisibleDate(date);
  };

  const selectMonth = (month) => {
    const year = visibleDate.getFullYear();
    const safeDay = Math.min(
      draftDate.getDate(),
      new Date(year, month + 1, 0).getDate()
    );
    const nextDate = new Date(year, month, safeDay);

    setDraftDate(nextDate);
    setVisibleDate(nextDate);
    setPickerView('days');
  };

  const selectYear = (year) => {
    const month = visibleDate.getMonth();
    const safeDay = Math.min(
      draftDate.getDate(),
      new Date(year, month + 1, 0).getDate()
    );
    const nextDate = new Date(year, month, safeDay);

    setDraftDate(nextDate);
    setVisibleDate(nextDate);
    setPickerView('months');
  };

  const confirmDate = () => {
    handleConfirm(draftDate);
  };

  return (
    <View testID="date">
      <Text style={stylesBase.textInputLabelBase}>Fecha</Text>
      <TextInput
        autoCorrect={false}
        style={[stylesBase.textInputBase, { width: 150 }]}
        placeholderTextColor={colors.textMuted}
        onPressIn={showDatePicker}
        onFocus={handleInputFocus}
        value={selectedDate}
      />
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDatePickerVisible}
        onRequestClose={hideDatePicker}
      >
        <View
          style={[styles.backdrop, { backgroundColor: colors.softBackdrop }]}
        >
          <View
            style={[
              styles.calendar,
              { backgroundColor: colors.surface, width: calendarWidth },
            ]}
          >
            <View
              style={[
                styles.header,
                {
                  backgroundColor: colors.primary,
                  paddingHorizontal: horizontalPadding,
                },
              ]}
            >
              <Text style={[styles.year, { color: colors.textInverse }]}>
                {draftDate.getFullYear()}
              </Text>
              <Text
                adjustsFontSizeToFit={true}
                numberOfLines={1}
                style={[
                  styles.selectedDate,
                  {
                    color: colors.textInverse,
                    fontSize: headerDateFontSize,
                  },
                ]}
              >
                {DateFormatter.ddmmyy(draftDate)}
              </Text>
            </View>

            {pickerView === 'days' ? (
              <>
                <View style={styles.monthRow}>
                  <TouchableOpacity
                    style={styles.monthButton}
                    onPress={goToPreviousMonth}
                  >
                    <Text
                      style={[
                        styles.monthButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      ‹
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.monthTitleButton}
                    onPress={() => setPickerView('months')}
                  >
                    <Text
                      adjustsFontSizeToFit={true}
                      numberOfLines={1}
                      style={[
                        styles.monthTitle,
                        {
                          color: colors.textPrimary,
                          fontSize: titleFontSize,
                        },
                      ]}
                    >
                      {visibleDate.toLocaleString('es-MX', {
                        month: 'long',
                      })}
                      {' de '}
                      {visibleDate.getFullYear()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.monthButton}
                    onPress={goToNextMonth}
                  >
                    <Text
                      style={[
                        styles.monthButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      ›
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.weekRow,
                    { paddingHorizontal: horizontalPadding },
                  ]}
                >
                  {weekDays.map((day, index) => (
                    <Text
                      key={`${day}-${index}`}
                      style={[styles.weekDay, { color: colors.textMuted }]}
                    >
                      {day}
                    </Text>
                  ))}
                </View>

                <View
                  style={[
                    styles.daysGrid,
                    { paddingHorizontal: horizontalPadding },
                  ]}
                >
                  {calendarDays.map(({ key, date }) => {
                    const isSelected = date && isSameDate(date, draftDate);

                    return (
                      <TouchableOpacity
                        key={key}
                        disabled={!date}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => selectDate(date)}
                      >
                        {date && (
                          <Text
                            style={[
                              styles.dayText,
                              {
                            color: isSelected
                              ? colors.textInverse
                              : colors.textPrimary,
                            fontSize: gridFontSize,
                          },
                        ]}
                          >
                            {date.getDate()}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : pickerView === 'months' ? (
              <>
                <View style={styles.monthRow}>
                  <TouchableOpacity
                    style={styles.monthButton}
                    onPress={goToPreviousYear}
                  >
                    <Text
                      style={[
                        styles.monthButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      ‹
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.monthTitleButton}
                    onPress={() => setPickerView('years')}
                  >
                    <Text
                      adjustsFontSizeToFit={true}
                      numberOfLines={1}
                      style={[
                        styles.monthTitle,
                        {
                          color: colors.textPrimary,
                          fontSize: titleFontSize,
                        },
                      ]}
                    >
                      {visibleDate.getFullYear()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.monthButton}
                    onPress={goToNextYear}
                  >
                    <Text
                      style={[
                        styles.monthButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      ›
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.monthGrid,
                    { paddingHorizontal: horizontalPadding },
                  ]}
                >
                  {monthNames.map((monthName, month) => {
                    const isSelectedMonth =
                      visibleDate.getMonth() === month &&
                      visibleDate.getFullYear() === draftDate.getFullYear();

                    return (
                      <TouchableOpacity
                        key={monthName}
                        style={[
                          styles.monthCell,
                          { height: monthCellHeight },
                          isSelectedMonth && {
                            backgroundColor: colors.primaryMuted,
                          },
                        ]}
                        onPress={() => selectMonth(month)}
                      >
                        <Text
                          style={[
                            styles.monthCellText,
                            {
                              color: isSelectedMonth
                                ? colors.primaryText
                                : colors.textPrimary,
                              fontSize: gridFontSize,
                            },
                          ]}
                        >
                          {monthName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <View style={styles.monthRow}>
                  <TouchableOpacity
                    style={styles.monthButton}
                    onPress={goToPreviousYearRange}
                  >
                    <Text
                      style={[
                        styles.monthButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      ‹
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.monthTitleButton}>
                    <Text
                      adjustsFontSizeToFit={true}
                      numberOfLines={1}
                      style={[
                        styles.monthTitle,
                        {
                          color: colors.textPrimary,
                          fontSize: titleFontSize,
                        },
                      ]}
                    >
                      {yearRange[0]} - {yearRange[yearRange.length - 1]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.monthButton}
                    onPress={goToNextYearRange}
                  >
                    <Text
                      style={[
                        styles.monthButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      ›
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.monthGrid,
                    { paddingHorizontal: horizontalPadding },
                  ]}
                >
                  {yearRange.map((year) => {
                    const isSelectedYear = year === draftDate.getFullYear();

                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.monthCell,
                          { height: monthCellHeight },
                          isSelectedYear && {
                            backgroundColor: colors.primaryMuted,
                          },
                        ]}
                        onPress={() => selectYear(year)}
                      >
                        <Text
                          style={[
                            styles.monthCellText,
                            {
                              color: isSelectedYear
                                ? colors.primaryText
                                : colors.textPrimary,
                              fontSize: gridFontSize,
                            },
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={hideDatePicker}
              >
                <Text style={[styles.actionText, { color: colors.primaryText }]}>
                  CANCELAR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={confirmDate}
              >
                <Text style={[styles.actionText, { color: colors.primaryText }]}>
                  ACEPTAR
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  calendar: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 20,
  },
  year: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    marginBottom: 10,
  },
  selectedDate: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    textTransform: 'capitalize',
  },
  monthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  monthButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  monthButtonText: {
    fontSize: 36,
    fontWeight: typography.weights.regular,
    lineHeight: 38,
  },
  monthTitleButton: {
    alignItems: 'center',
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  monthTitle: {
    fontWeight: typography.weights.medium,
    minHeight: 44,
    textAlign: 'center',
    textAlignVertical: 'center',
    textTransform: 'capitalize',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 256,
    paddingTop: 18,
  },
  monthCell: {
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    marginVertical: 6,
    width: `${100 / 3}%`,
  },
  monthCellText: {
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    paddingTop: 12,
  },
  weekDay: {
    flex: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 8,
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: 22,
    justifyContent: 'center',
    marginVertical: 3,
    width: `${100 / 7}%`,
  },
  dayText: {
    fontWeight: typography.weights.regular,
  },
  actions: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  actionText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
});
