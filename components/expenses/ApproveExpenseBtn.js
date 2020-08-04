import React from 'react';
import PropTypes from 'prop-types';
import { gql } from '@apollo/client';
import { graphql } from '@apollo/client/react/hoc';
import { FormattedMessage } from 'react-intl';

import { getErrorFromGraphqlException } from '../../lib/errors';

import StyledButton from '../StyledButton';

class ApproveExpenseBtn extends React.Component {
  static propTypes = {
    id: PropTypes.number.isRequired,
    approveExpense: PropTypes.func.isRequired,
    refetch: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  async onClick() {
    const { id } = this.props;
    try {
      await this.props.approveExpense({ variables: { id } });
      await this.props.refetch();
    } catch (e) {
      const error = getErrorFromGraphqlException(e).message;
      this.props.onError(error);
    }
  }

  render() {
    return (
      <div className="ApproveExpenseBtn" data-cy="approve-expense-btn">
        <StyledButton className="approve" mr={2} my={1} buttonStyle="primary" onClick={this.onClick}>
          <FormattedMessage id="actions.approve" defaultMessage="Approve" />
        </StyledButton>
      </div>
    );
  }
}

const approveExpenseMutation = gql`
  mutation ApproveExpense($id: Int!) {
    approveExpense(id: $id) {
      id
      status
    }
  }
`;

const addApproveExpenseMutation = graphql(approveExpenseMutation, {
  name: 'approveExpense',
});

export default addApproveExpenseMutation(ApproveExpenseBtn);
