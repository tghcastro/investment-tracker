import { FormField, Select } from './forms';
import { useDisplayCurrency } from '../contexts/DisplayCurrencyContext';
import './CurrencySelector.css';

export function CurrencySelector() {
  const {
    displayCurrency,
    availableCurrencies,
    loading,
    setDisplayCurrency,
  } = useDisplayCurrency();

  if (loading || availableCurrencies.length <= 1) {
    return null;
  }

  const options = availableCurrencies.map((currency) => ({
    value: currency.code,
    label: `${currency.code} (${currency.symbol})`,
  }));

  return (
    <div className="cb-currency-selector">
      <FormField label="Display currency" htmlFor="display-currency">
        <Select
          id="display-currency"
          value={displayCurrency}
          options={options}
          onChange={(event) => setDisplayCurrency(event.target.value)}
        />
      </FormField>
    </div>
  );
}
