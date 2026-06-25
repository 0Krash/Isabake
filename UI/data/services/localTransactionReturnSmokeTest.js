import { initDatabase } from '../db/database';
import { runLocalTransaction } from '../db/localTransaction';

export const runLocalTransactionReturnSmokeTest = async () => {
  const details = [];

  try {
    await initDatabase();
    details.push('database_initialized');

    const returnedValue = await runLocalTransaction(async () => ({
      ok: true,
      value: 'returned',
    }));
    const returnValuePassed =
      returnedValue?.ok === true && returnedValue?.value === 'returned';

    if (!returnValuePassed) {
      return {
        debug: {
          returnedValue,
          returnedValueType: typeof returnedValue,
        },
        details,
        error: 'runLocalTransaction did not return the callback result',
        failedStep: 'callback_return_value',
        success: false,
      };
    }

    details.push('callback_return_value_verified');

    let thrownError = null;

    try {
      await runLocalTransaction(async () => {
        throw new Error('local_transaction_return_smoke_error');
      });
    } catch (error) {
      thrownError = error;
    }

    if (!thrownError) {
      return {
        debug: {
          thrownError: null,
        },
        details,
        error: 'runLocalTransaction did not propagate callback errors',
        failedStep: 'callback_error_propagation',
        success: false,
      };
    }

    if (thrownError.message !== 'local_transaction_return_smoke_error') {
      return {
        debug: {
          thrownError: String(thrownError?.message || thrownError),
        },
        details,
        error: 'runLocalTransaction propagated the wrong callback error',
        failedStep: 'callback_error_message',
        success: false,
      };
    }

    details.push('callback_error_propagation_verified');

    return {
      details,
      returnedValue,
      success: true,
      thrownError: thrownError.message,
    };
  } catch (error) {
    return {
      details,
      error: String(error?.message || error),
      failedStep: 'unexpected_exception',
      success: false,
    };
  }
};

export default runLocalTransactionReturnSmokeTest;
