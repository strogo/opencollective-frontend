import React from 'react';
import PropTypes from 'prop-types';
import { graphql } from '@apollo/client/react/hoc';
import { get } from 'lodash';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';

import { getErrorFromGraphqlException } from '../../lib/errors';
import { isValidEmail } from '../../lib/utils';

import StyledButton from '../StyledButton';
import StyledSpinner from '../StyledSpinner';
import StyledTooltip from '../StyledTooltip';

import { payExpenseMutation } from './graphql/mutations';

class MarkExpenseAsPaidBtn extends React.Component {
  static propTypes = {
    expense: PropTypes.object.isRequired,
    collective: PropTypes.object.isRequired,
    disabled: PropTypes.bool,
    paymentProcessorFeeInCollectiveCurrency: PropTypes.number,
    hostFeeInCollectiveCurrency: PropTypes.number,
    platformFeeInCollectiveCurrency: PropTypes.number,
    lock: PropTypes.func,
    unlock: PropTypes.func,
    payExpense: PropTypes.func.isRequired,
    refetch: PropTypes.func,
    intl: PropTypes.object.isRequired,
    onError: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = { loading: false };

    this.messages = defineMessages({
      insufficientBalance: {
        id: 'expense.pay.error.insufficientBalance',
        defaultMessage: 'Insufficient balance',
      },
      paypalMissing: {
        id: 'expense.payoutMethod.paypal.missing',
        defaultMessage: 'Please provide a valid paypal email address',
      },
    });
  }

  async handleOnClickPay() {
    const { expense, lock, unlock } = this.props;

    lock();
    this.setState({ loading: true });

    try {
      await this.props.payExpense({
        variables: {
          id: expense.id,
          paymentProcessorFeeInCollectiveCurrency: this.props.paymentProcessorFeeInCollectiveCurrency,
          hostFeeInCollectiveCurrency: this.props.hostFeeInCollectiveCurrency,
          platformFeeInCollectiveCurrency: this.props.platformFeeInCollectiveCurrency,
          forceManual: true,
        },
      });
      this.setState({ loading: false });
      await this.props.refetch();
      unlock();
    } catch (e) {
      const error = getErrorFromGraphqlException(e).message;
      this.props.onError(error);
      this.setState({ loading: false });
      unlock();
    }
  }

  render() {
    const { collective, expense, intl } = this.props;
    const { loading } = this.state;
    let disabled = this.state.loading || this.props.disabled;
    let disabledMessage = '';

    if (expense.payoutMethod === 'paypal') {
      if (
        !get(expense.PayoutMethod, 'data.email') && // New payout methods validate emails on input
        !isValidEmail(get(expense, 'user.paypalEmail')) &&
        !isValidEmail(get(expense, 'user.email'))
      ) {
        disabled = true;
        disabledMessage = intl.formatMessage(this.messages.paypalMissing);
      }
    }

    if (get(collective, 'stats.balance') < expense.amount) {
      disabled = true;
      disabledMessage = intl.formatMessage(this.messages.insufficientBalance);
    }

    const button = (
      <StyledButton
        className="pay"
        buttonStyle="success"
        data-cy="mark-expense-as-paid-btn"
        onClick={() => this.handleOnClickPay()}
        disabled={this.props.disabled || disabled}
        mr={2}
        my={1}
      >
        {loading ? (
          <React.Fragment>
            <StyledSpinner /> <FormattedMessage id="ProcessingWithDots" defaultMessage="Processing…" />
          </React.Fragment>
        ) : (
          <FormattedMessage id="expense.pay.manual.btn" defaultMessage="Record as paid" />
        )}
      </StyledButton>
    );

    return (
      <React.Fragment>
        {!disabledMessage ? (
          button
        ) : (
          <StyledTooltip display="grid" content={disabledMessage}>
            {button}
          </StyledTooltip>
        )}
      </React.Fragment>
    );
  }
}

const addPayExpenseMutation = graphql(payExpenseMutation, {
  name: 'payExpense',
});

export default injectIntl(addPayExpenseMutation(MarkExpenseAsPaidBtn));
