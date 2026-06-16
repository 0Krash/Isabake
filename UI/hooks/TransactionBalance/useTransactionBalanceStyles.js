import { createStylesBase } from '../../constants/TransactionBalance/Styles';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';

export default function useTransactionBalanceStyles() {
  const theme = useTransactionBalanceTheme();

  return {
    ...theme,
    stylesBase: createStylesBase(theme.colors),
  };
}
