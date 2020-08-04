import React from 'react';
import PropTypes from 'prop-types';
import { useMutation } from '@apollo/client';
import { useFormik } from 'formik';
import { FormattedMessage } from 'react-intl';

import { API_V2_CONTEXT, gqlV2 } from '../../lib/graphql/helpers';
import { editCollectivePageQuery } from '../../lib/graphql/queries';

import { getI18nLink } from '../I18nFormatters';
import StyledButton from '../StyledButton';
import StyledInput from '../StyledInput';
import StyledInputField from '../StyledInputField';
import { P } from '../Text';

const createConnectedAccountMutation = gqlV2/* GraphQL */ `
  mutation CreateConnectedAccount($connectedAccount: ConnectedAccountCreateInput!, $account: AccountReferenceInput!) {
    createConnectedAccount(connectedAccount: $connectedAccount, account: $account) {
      id
      settings
      service
      createdAt
      updatedAt
    }
  }
`;

const deleteConnectedAccountMutation = gqlV2/* GraphQL */ `
  mutation DeleteConnectedAccount($connectedAccount: ConnectedAccountReferenceInput!) {
    deleteConnectedAccount(connectedAccount: $connectedAccount) {
      id
    }
  }
`;

const EditTransferWiseAccount = props => {
  const mutationOptions = {
    context: API_V2_CONTEXT,
    refetchQueries: [{ query: editCollectivePageQuery, variables: { slug: props.collective.slug } }],
    awaitRefetchQueries: true,
  };
  const [connectedAccount, setConnectedAccount] = React.useState(props.connectedAccount);
  const [createConnectedAccount, { loading: isCreating, error: createError }] = useMutation(
    createConnectedAccountMutation,
    mutationOptions,
  );
  const [deleteConnectedAccount, { loading: isDeleting }] = useMutation(
    deleteConnectedAccountMutation,
    mutationOptions,
  );
  const formik = useFormik({
    initialValues: {
      token: '',
    },
    async onSubmit(values) {
      const {
        data: { createConnectedAccount: createdAccount },
      } = await createConnectedAccount({
        variables: {
          connectedAccount: { token: values.token, service: 'transferwise' },
          account: { slug: props.collective.slug },
        },
      });
      setConnectedAccount(createdAccount);
    },
    validate(values) {
      const errors = {};
      if (!values.token) {
        errors.token = 'Required';
      }
      return errors;
    },
  });

  const handleDelete = async () => {
    await deleteConnectedAccount({ variables: { connectedAccount: { legacyId: props.connectedAccount.id } } });
    setConnectedAccount();
  };

  if (!connectedAccount) {
    return (
      <form onSubmit={formik.handleSubmit}>
        <P lineHeight="0" fontSize="Caption" color="black.600" fontWeight="normal">
          <FormattedMessage
            id="collective.create.connectedAccounts.transferwise.description"
            defaultMessage="Connect a TransferWise account to pay expenses with one click. For instructions on how to connect to TransferWise, please, <a>read our documentation</a>."
            values={{
              a: getI18nLink({
                href: 'https://docs.opencollective.com/help/fiscal-hosts/payouts/payouts-with-transferwise',
                openInNewTab: true,
              }),
            }}
          />
        </P>
        <StyledInputField
          name="token"
          label="Token"
          error={(formik.touched.token && formik.errors.token) || createError?.message.replace('GraphQL error: ', '')}
          disabled={isCreating}
        >
          {inputProps => (
            <StyledInput type="text" {...inputProps} onChange={formik.handleChange} value={formik.values.token} />
          )}
        </StyledInputField>
        <StyledButton mt={10} type="submit" buttonSize="tiny" loading={isCreating}>
          <FormattedMessage
            id="collective.connectedAccounts.transferwise.button"
            defaultMessage="Connect TransferWise"
          />
        </StyledButton>
      </form>
    );
  } else {
    return (
      <React.Fragment>
        <P lineHeight="0">
          <FormattedMessage
            id="collective.connectedAccounts.transferwise.connected"
            defaultMessage="TransferWise account connected on {updatedAt, date, short}"
            values={{
              updatedAt: new Date(connectedAccount.updatedAt || connectedAccount.createdAt),
            }}
          />
        </P>
        <P lineHeight="0">
          <StyledButton type="submit" buttonSize="tiny" loading={isDeleting} onClick={handleDelete}>
            <FormattedMessage id="collective.connectedAccounts.disconnect.button" defaultMessage="Disconnect" />
          </StyledButton>
        </P>
      </React.Fragment>
    );
  }
};

EditTransferWiseAccount.propTypes = {
  connectedAccount: PropTypes.object,
  collective: PropTypes.object,
  intl: PropTypes.object.isRequired,
};

export default EditTransferWiseAccount;
