import React, { useCallback, useState } from 'react';
import { Keyboard, Platform, StatusBar, StyleSheet, View } from 'react-native';

import Dashboard from '../../components/TransactionBalance/Dashboard';
import SwitchSelector from '../../components/TransactionBalance/SwitchSelector';
import TransactionDetail from '../../components/TransactionBalance/TransactionDetail';
import AddTransactionButton from '../../components/TransactionBalance/AddTransactionButton';
import TransactionMenu from '../../components/TransactionBalance/TransactionMenu';
import AddTransactionModal from '../../components/TransactionBalance/modals/addTransactionModal/AddTransactionModal';
import TransactionDetailModal from '../../components/TransactionBalance/modals/transactionDetailModal/TransactionDetailModal';
import DeleteTransactionModal from '../../components/TransactionBalance/modals/DeleteTransactionModal';
import {
  MAIN_SCREEN_TOP_PADDING,
  getScreenContentTopPadding,
} from '../../components/layout/layoutMetrics';
import WorkspaceContextIndicator from '../../components/workspace/WorkspaceContextIndicator';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import { refreshNetworkStatus } from '../../data/network/networkStatusService';
import useTransactionBalanceData from '../../hooks/TransactionBalance/useTransactionBalanceData';
import { runManualSyncAction } from '../../hooks/sync/useSyncCenter';
import useCurrentWorkspaceScope from '../../hooks/workspace/useCurrentWorkspaceScope';

const TransactionBalanceScreen = ({
  onOpenAccount,
  onOpenAppMenu,
  onOpenClients,
  onOpenSync,
  onOpenStores,
  onOpenWorkspace,
} = {}) => {
  const [addTransactionModalIsVisible, setAddTransactionModalIsVisible] =
    useState(false);
  const [deleteTransactionModalIsVisible, setDeleteTransactionModalIsVisible] =
    useState(false);
  const [pendingMenuAction, setPendingMenuAction] = useState(null);
  const [transactionDetailModalIsVisible, setTransactionDetailModalIsVisible] =
    useState(false);
  const [transactionMenuIsVisible, setTransactionMenuIsVisible] =
    useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionDetail, setTransactionDetail] = useState({});
  const [transactionType, setTransactionType] = useState('Ventas');
  const { colors } = useTransactionBalanceTheme();
  const { canWrite } = useCurrentWorkspaceScope();
  const {
    hasMoreTransactions,
    isLoadingMoreTransactions,
    isLoadingTransactions,
    loadMoreTransactions,
    refreshTransactions,
    totalAmountByCategory,
    totalAmountByDateCategory,
    transactions,
  } = useTransactionBalanceData(transactionType);

  const handleTabChange = (tabName) => {
    setTransactionType(tabName);
  };

  const openCreateTransaction = () => {
    if (!canWrite) {
      return;
    }

    Keyboard.dismiss();
    setAddTransactionModalIsVisible(true);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.allSettled([
        refreshNetworkStatus(),
        runManualSyncAction({ action: 'full' }),
      ]);
      await refreshTransactions();
      setRefreshKey((currentKey) => currentKey + 1);
    } finally {
      setRefreshing(false);
    }
  }, [refreshTransactions]);

  const handleOpenStoreManager = () => {
    if (Platform.OS === 'ios') {
      setPendingMenuAction('stores');
      setTransactionMenuIsVisible(false);
      return;
    }

    setTransactionMenuIsVisible(false);
    onOpenStores?.();
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

  const handleOpenMenuScreen = (action) => {
    if (Platform.OS === 'ios') {
      setPendingMenuAction(action);
      setTransactionMenuIsVisible(false);
      return;
    }

    setTransactionMenuIsVisible(false);

    if (action === 'account') {
      onOpenAccount?.();
    }
    if (action === 'sync') {
      onOpenSync?.();
    }
    if (action === 'workspace') {
      onOpenWorkspace?.();
    }
  };

  const handleMenuDismiss = () => {
    if (pendingMenuAction === 'stores') {
      onOpenStores?.();
    }

    if (pendingMenuAction === 'app-options') {
      onOpenAppMenu?.();
    }
    if (pendingMenuAction === 'account') {
      onOpenAccount?.();
    }
    if (pendingMenuAction === 'sync') {
      onOpenSync?.();
    }
    if (pendingMenuAction === 'workspace') {
      onOpenWorkspace?.();
    }

    setPendingMenuAction(null);
  };

  return (
    <View
      style={[
        styles.screenShell,
        {
          backgroundColor: colors.appBackground || colors.screenBackground,
          paddingTop: getScreenContentTopPadding({
            basePadding: MAIN_SCREEN_TOP_PADDING,
            platform: Platform.OS,
            statusBarHeight: StatusBar.currentHeight,
          }),
        },
      ]}
    >
      <WorkspaceContextIndicator
        menuIsVisible={transactionMenuIsVisible}
        onOpenMenu={onOpenAppMenu}
        onOpenSync={onOpenSync}
        onOpenWorkspace={onOpenWorkspace}
        refreshKey={refreshKey}
      />
      <View style={[styles.mainContainer, { backgroundColor: colors.screenBackground }]}>
        <TransactionDetail
          canWrite={canWrite}
          hasMoreTransactions={hasMoreTransactions}
          isLoadingMoreTransactions={isLoadingMoreTransactions}
          isLoadingTransactions={isLoadingTransactions}
          ListHeaderComponent={
            <>
              <Dashboard
                transactionType={transactionType}
                totalAmountByCategoryResponse={totalAmountByCategory}
                totalAmountByDateCategoryResponse={totalAmountByDateCategory}
              />
              <SwitchSelector onTabChange={handleTabChange} />
            </>
          }
          loadMoreTransactions={loadMoreTransactions}
          onCreateTransaction={openCreateTransaction}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          transactionType={transactionType}
          setTransactionDetail={setTransactionDetail}
          setTransactionDetailModalIsVisible={setTransactionDetailModalIsVisible}
          setDeleteTransactionModalIsVisible={setDeleteTransactionModalIsVisible}
          dataTransactionsResponse={transactions}
        />
        {canWrite && transactions.length > 0 && (
          <AddTransactionButton
            setAddTransactionModalIsVisible={setAddTransactionModalIsVisible}
          />
        )}
        <TransactionMenu
          canWrite={canWrite}
          isVisible={transactionMenuIsVisible}
          onAfterClose={handleMenuDismiss}
          onClose={() => setTransactionMenuIsVisible(false)}
          onOpenAccount={() => handleOpenMenuScreen('account')}
          onOpenAppOptions={handleOpenAppOptions}
          onOpenSync={() => handleOpenMenuScreen('sync')}
          onOpenStoreManager={handleOpenStoreManager}
          onOpenWorkspace={() => handleOpenMenuScreen('workspace')}
        />
        {addTransactionModalIsVisible && (
          <AddTransactionModal
            AddTransactionModalIsVisible={addTransactionModalIsVisible}
            onOpenClients={() => {
              setAddTransactionModalIsVisible(false);
              onOpenClients?.();
            }}
            onOpenStoreManager={() => {
              setAddTransactionModalIsVisible(false);
              onOpenStores?.();
            }}
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
      </View>
    </View>
  );
};

export default TransactionBalanceScreen;

const styles = StyleSheet.create({
  mainContainer: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    flex: 1,
    marginHorizontal: 8,
    marginTop: 6,
    overflow: 'hidden',
  },
  screenShell: {
    flex: 1,
  },
});
