import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';

import Dashboard from '../../components/TransactionBalance/Dashboard';
import SwitchSelector from '../../components/TransactionBalance/SwitchSelector';
import TransactionDetail from '../../components/TransactionBalance/TransactionDetail';
import AddTransactionButton from '../../components/TransactionBalance/AddTransactionButton';
import AddTransactionModal from '../../components/TransactionBalance/modals/addTransactionModal/AddTransactionModal';
import TransactionDetailModal from '../../components/TransactionBalance/modals/transactionDetailModal/TransactionDetailModal';
import DeleteTransactionModal from '../../components/TransactionBalance/modals/DeleteTransactionModal';
import transactionService from '../../services/TransactionBalance/API/transactionService';

export default TransactionBalanceScreen = () => {
  const [AddTransactionModalIsVisible, setAddTransactionModalIsVisible] =
    useState(false);
  const [DeleteTransactionModalIsVisible, setDeleteTransactionModalIsVisible] =
    useState(false);
  const [transactionDetailModalIsVisible, setTransactionDetailModalIsVisible] =
    useState(false);
  const [transactionDetail, setTransactionDetail] = useState({});
  const [transactionType, setTransactionType] = useState('Ventas');
  const [dataTransactionsResponse, setDataTransactionsResponse] = useState();

  useEffect(() => {
    if (!AddTransactionModalIsVisible && !DeleteTransactionModalIsVisible) {
      fetchDataTransactions();
    }
  }, [AddTransactionModalIsVisible, DeleteTransactionModalIsVisible]);

  const fetchDataTransactions = async () => {
    try {
      setDataTransactionsResponse(
        await transactionService.getAllTransactions()
      );
    } catch (error) {
      console.error(
        'Error al obtener transacciones desde TransactionBalanceScreen: ',
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
      <Dashboard />
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
    </View>
  );
};

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
