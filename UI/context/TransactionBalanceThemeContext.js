import { createContext, useContext } from 'react';
import themes from '../constants/TransactionBalance/Theme';

export const TransactionBalanceThemeContext = createContext(themes.light);

export const useTransactionBalanceTheme = () =>
  useContext(TransactionBalanceThemeContext);
