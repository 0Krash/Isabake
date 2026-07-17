import React, { useState } from 'react';
import { Keyboard, Platform, StyleSheet, View, Text } from 'react-native';

import Dashboard from '../../components/TransactionBalance/Dashboard';
import SwitchSelector from '../../components/TransactionBalance/SwitchSelector';
import TransactionDetail from '../../components/TransactionBalance/TransactionDetail';
import AddTransactionButton from '../../components/TransactionBalance/AddTransactionButton';
import TransactionMenu, {
  TransactionMenuButton,
} from '../../components/TransactionBalance/TransactionMenu';
import AddTransactionModal from '../../components/TransactionBalance/modals/addTransactionModal/AddTransactionModal';
import TransactionDetailModal from '../../components/TransactionBalance/modals/transactionDetailModal/TransactionDetailModal';
import DeleteTransactionModal from '../../components/TransactionBalance/modals/DeleteTransactionModal';
import AddStoreModal from '../../components/TransactionBalance/modals/addStoreModal/AddStoreModal';
import BackupStatusIndicator from '../../components/Sync/BackupStatusIndicator';
import useTransactionBalanceData from '../../hooks/TransactionBalance/useTransactionBalanceData';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

const TransactionBalanceScreen = ({
  onOpenAppMenu,
  onOpenConflicts,
} = {}) => {
  const [addStoreModalIsVisible, setAddStoreModalIsVisible] = useState(false);
  const [addTransactionModalIsVisible, setAddTransactionModalIsVisible] =
    useState(false);
  const [deleteTransactionModalIsVisible, setDeleteTransactionModalIsVisible] =
    useState(false);
  const [pendingMenuAction, setPendingMenuAction] = useState(null);
  const [transactionDetailModalIsVisible, setTransactionDetailModalIsVisible] =
    useState(false);
  const [transactionMenuIsVisible, setTransactionMenuIsVisible] =
    useState(false);
  const [transactionDetail, setTransactionDetail] = useState({});
  const [transactionType, setTransactionType] = useState('Ventas');
  const { colors } = useTransactionBalanceTheme();
  const {
    hasMoreTransactions,
    isLoadingMoreTransactions,
    loadMoreTransactions,
    refreshTransactions,
    totalAmountByCategory,
    totalAmountByDateCategory,
    transactions,
  } = useTransactionBalanceData(transactionType);

  const handleTabChange = (tabName) => {
    setTransactionType(tabName);
  };

  const handleOpenStoreManager = () => {
    if (Platform.OS === 'ios') {
      setPendingMenuAction('stores');
      setTransactionMenuIsVisible(false);
      return;
    }

    setTransactionMenuIsVisible(false);
    setTimeout(() => {
      setAddStoreModalIsVisible(true);
    }, 90);
  };

  const handleOpenAppOptions = () => {
    if (Platform.OS === 'ios') {
      setPendingMenuAction('app-options');
      setTransactionMenuIsVisible(false);
      return;
    }

    setTransactionMenuIsVisible(false);
    onOpenAppMenu?.();
  };

  const handleMenuDismiss = () => {
    if (pendingMenuAction === 'stores') {
      setAddStoreModalIsVisible(true);
    }

    if (pendingMenuAction === 'app-options') {
      onOpenAppMenu?.();
    }

    setPendingMenuAction(null);
  };

  return (
    <View
      style={[styles.mainContainer, { backgroundColor: colors.screenBackground }]}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Transacciones
        </Text>
        <TransactionMenuButton
          isOpen={transactionMenuIsVisible}
          onPress={() => {
            Keyboard.dismiss();
            setTransactionMenuIsVisible(true);
          }}
        />
      </View>
      <BackupStatusIndicator onPrimaryAction={onOpenConflicts} />
      <Dashboard
        transactionType={transactionType}
        totalAmountByCategoryResponse={totalAmountByCategory}
        totalAmountByDateCategoryResponse={totalAmountByDateCategory}
      />
      <SwitchSelector onTabChange={handleTabChange} />
      <TransactionDetail
        hasMoreTransactions={hasMoreTransactions}
        isLoadingMoreTransactions={isLoadingMoreTransactions}
        loadMoreTransactions={loadMoreTransactions}
        transactionType={transactionType}
        setTransactionDetail={setTransactionDetail}
        setTransactionDetailModalIsVisible={setTransactionDetailModalIsVisible}
        setDeleteTransactionModalIsVisible={setDeleteTransactionModalIsVisible}
        dataTransactionsResponse={transactions}
      />
      <AddTransactionButton
        setAddTransactionModalIsVisible={setAddTransactionModalIsVisible}
      />
      <TransactionMenu
        isVisible={transactionMenuIsVisible}
        onAfterClose={handleMenuDismiss}
        onClose={() => setTransactionMenuIsVisible(false)}
        onOpenAppOptions={handleOpenAppOptions}
        onOpenStoreManager={handleOpenStoreManager}
      />
      {addTransactionModalIsVisible && (
        <AddTransactionModal
          AddTransactionModalIsVisible={addTransactionModalIsVisible}
          onTransactionCreated={refreshTransactions}
          setAddTransactionModalIsVisible={setAddTransactionModalIsVisible}
        />
      )}
      {transactionDetailModalIsVisible && (
        <TransactionDetailModal
          transactionDetail={transactionDetail}
          transactionDetailModalIsVisible={transactionDetailModalIsVisible}
          setTransactionDetailModalIsVisible={setTransactionDetailModalIsVisible}
        />
      )}
      {deleteTransactionModalIsVisible && (
        <DeleteTransactionModal
          transactionDetail={transactionDetail}
          DeleteTransactionModalIsVisible={deleteTransactionModalIsVisible}
          onTransactionDeleted={refreshTransactions}
          setDeleteTransactionModalIsVisible={setDeleteTransactionModalIsVisible}
        />
      )}
      {addStoreModalIsVisible && (
        <AddStoreModal
          AddStoreModalIsVisible={addStoreModalIsVisible}
          setAddStoreModalIsVisible={setAddStoreModalIsVisible}
        />
      )}
    </View>
  );
};

export default TransactionBalanceScreen;

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: 50,
    marginHorizontal: 8,
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  headerContainer: {
    marginTop: 15,
    marginHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
