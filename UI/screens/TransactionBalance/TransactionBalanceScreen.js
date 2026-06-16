import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';

import Dashboard from '../../components/TransactionBalance/Dashboard';
import SwitchSelector from '../../components/TransactionBalance/SwitchSelector';
import TransactionDetail from '../../components/TransactionBalance/TransactionDetail';
import AddTransactionButton from '../../components/TransactionBalance/AddTransactionButton';
import AddTransactionModal from '../../components/TransactionBalance/modals/addTransactionModal/AddTransactionModal';
import TransactionDetailModal from '../../components/TransactionBalance/modals/transactionDetailModal/TransactionDetailModal';
import DeleteTransactionModal from '../../components/TransactionBalance/modals/DeleteTransactionModal';
import AddStoreModal from '../../components/TransactionBalance/modals/addStoreModal/AddStoreModal';
import transactionService from '../../services/TransactionBalance/API/transactionService';

const TransactionBalanceScreen = () => {
  const [AddStoreModalIsVisible, setAddStoreModalIsVisible] = useState(false);
  const [AddTransactionModalIsVisible, setAddTransactionModalIsVisible] =
    useState(false);
  const [DeleteTransactionModalIsVisible, setDeleteTransactionModalIsVisible] =
    useState(false);
  const [transactionDetailModalIsVisible, setTransactionDetailModalIsVisible] =
    useState(false);
  const [transactionDetail, setTransactionDetail] = useState({});
  const [transactionType, setTransactionType] = useState('Ventas');
  const [dataTransactionsResponse, setDataTransactionsResponse] = useState();
  const [totalAmountByCategoryResponse, setTotalAmountByCategoryResponse] =
    useState();
  const [
    totalAmountByDateCategoryResponse,
    setTotalAmountByDateCategoryResponse,
  ] = useState();

  useEffect(() => {
    if (!AddTransactionModalIsVisible && !DeleteTransactionModalIsVisible) {
      getTransactionsData();
    }
  }, [AddTransactionModalIsVisible, DeleteTransactionModalIsVisible]);

  const getTransactionsData = async () => {
    try {
      setDataTransactionsResponse(
        await transactionService.getAllTransactions()
      );
      setTotalAmountByCategoryResponse(
        await transactionService.getTotalAmountByCategory()
      );
      setTotalAmountByDateCategoryResponse(
        await transactionService.getTotalAmountByDateCategory()
      );
    } catch (error) {
      console.error(
        'Error al obtener transacciones desde getTransactionsData: ',
        error
      );
    }
  };

  const handleTabChange = (tabName) => {
    setTransactionType(tabName);
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerContainer}>
        <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#3B3F3A' }}>
          Transacciones
        </Text>
      </View>
      <Dashboard
        transactionType={transactionType}
        totalAmountByCategoryResponse={
          totalAmountByCategoryResponse !== undefined
            ? totalAmountByCategoryResponse
            : []
        }
        totalAmountByDateCategoryResponse={
          totalAmountByDateCategoryResponse !== undefined
            ? totalAmountByDateCategoryResponse
            : []
        }
      />
      <SwitchSelector onTabChange={handleTabChange} />
      <TransactionDetail
        transactionType={transactionType}
        setTransactionDetail={setTransactionDetail}
        setTransactionDetailModalIsVisible={setTransactionDetailModalIsVisible}
        setDeleteTransactionModalIsVisible={setDeleteTransactionModalIsVisible}
        dataTransactionsResponse={
          dataTransactionsResponse !== undefined ? dataTransactionsResponse : []
        }
      />
      <AddTransactionButton
        setAddTransactionModalIsVisible={setAddTransactionModalIsVisible}
      />
      <AddTransactionModal
        AddTransactionModalIsVisible={AddTransactionModalIsVisible}
        setAddTransactionModalIsVisible={setAddTransactionModalIsVisible}
        setAddStoreModalIsVisible={setAddStoreModalIsVisible}
      />
      <TransactionDetailModal
        transactionDetail={transactionDetail}
        transactionDetailModalIsVisible={transactionDetailModalIsVisible}
        setTransactionDetailModalIsVisible={setTransactionDetailModalIsVisible}
      />
      <DeleteTransactionModal
        transactionDetail={transactionDetail}
        DeleteTransactionModalIsVisible={DeleteTransactionModalIsVisible}
        setDeleteTransactionModalIsVisible={setDeleteTransactionModalIsVisible}
      />
      <AddStoreModal
        AddStoreModalIsVisible={AddStoreModalIsVisible}
        setAddStoreModalIsVisible={setAddStoreModalIsVisible}
      />
    </View>
  );
};

export default TransactionBalanceScreen;

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: 50,
    marginHorizontal: 8,
    flex: 1,
    backgroundColor: '#EFECFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  headerContainer: {
    marginTop: 15,
    marginHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
