import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { gql, useMutation } from '@apollo/client';
import { FormattedMessage } from 'react-intl';

import { getErrorFromGraphqlException } from '../../../lib/errors';

import Container from '../../Container';
import MessageBox from '../../MessageBox';
import StyledButton from '../../StyledButton';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../../StyledModal';
import { H2, P } from '../../Text';

const archiveCollectiveMutation = gql`
  mutation ArchiveCollective($id: Int!) {
    archiveCollective(id: $id) {
      id
      isArchived
    }
  }
`;

const unarchiveCollectiveMutation = gql`
  mutation UnarchiveCollective($id: Int!) {
    unarchiveCollective(id: $id) {
      id
      isArchived
    }
  }
`;

const ArchiveCollective = ({ collective }) => {
  const collectiveType = collective.settings?.fund ? 'FUND' : collective.type; // Funds MVP, to refactor
  const [archiveStatus, setArchiveStatus] = useState({
    processing: false,
    isArchived: collective.isArchived,
    error: null,
    confirmationMsg: '',
  });
  const { processing, isArchived, error, confirmationMsg } = archiveStatus;
  const [modal, setModal] = useState({ type: defaultAction, show: false });
  const defaultAction = isArchived ? 'Archive' : 'Unarchive';

  const [archiveCollective] = useMutation(archiveCollectiveMutation);
  const [unarchiveCollective] = useMutation(unarchiveCollectiveMutation);

  const handleArchiveCollective = async ({ id }) => {
    setModal({ type: 'Archive', show: false });
    try {
      setArchiveStatus({ ...archiveStatus, processing: true });
      await archiveCollective({ variables: { id } });
      setArchiveStatus({
        ...archiveStatus,
        processing: false,
        isArchived: true,
      });
    } catch (err) {
      const errorMsg = getErrorFromGraphqlException(err).message;
      setArchiveStatus({ ...archiveStatus, processing: false, error: errorMsg });
    }
  };

  const handleUnarchiveCollective = async ({ id }) => {
    setModal({ type: 'Unarchive', show: false });
    try {
      setArchiveStatus({ ...archiveStatus, processing: true });
      await unarchiveCollective({ variables: { id } });
      setArchiveStatus({
        ...archiveStatus,
        processing: false,
        isArchived: false,
      });
    } catch (err) {
      const errorMsg = getErrorFromGraphqlException(err).message;
      setArchiveStatus({ ...archiveStatus, processing: false, error: errorMsg });
    }
  };

  const hasBalance = collective.stats.balance > 0 && (collective.type === 'COLLECTIVE' || collective.type === 'FUND');

  const closeModal = () => setModal({ ...modal, show: false });

  return (
    <Container display="flex" flexDirection="column" width={1} alignItems="flex-start">
      <H2>
        <FormattedMessage
          id="collective.archive.title"
          defaultMessage={
            'Archive {type, select, EVENT {this Event} PROJECT {this Project} FUND {this Fund} COLLECTIVE {this Collective} ORGANIZATION {this Organization} other {this account}}'
          }
          values={{ type: collectiveType }}
        />
      </H2>
      {!isArchived && (
        <P>
          <FormattedMessage
            id="collective.archive.description"
            defaultMessage={
              'Archiving {type, select, EVENT {this Event} PROJECT {this Project} FUND {this Fund} COLLECTIVE {this Collective} ORGANIZATION {this Organization} other {this account}} means it will visually appear inactive and no new activity will be allowed.'
            }
            values={{ type: collectiveType }}
          />
          &nbsp;
          {collective.type === 'COLLECTIVE' && (
            <FormattedMessage
              id="collective.archive.subscriptions"
              defaultMessage={'Recurring financial contributions will be automatically canceled.'}
            />
          )}
        </P>
      )}
      {error && <P color="#ff5252">{error}</P>}
      {!isArchived && (
        <StyledButton
          onClick={() => setModal({ type: 'Archive', show: true })}
          loading={processing}
          disabled={collective.isHost || hasBalance ? true : false}
        >
          <FormattedMessage
            id="collective.archive.title"
            defaultMessage={
              'Archive {type, select, EVENT {this Event} PROJECT {this Project} FUND {this Fund} COLLECTIVE {this Collective} ORGANIZATION {this Organization} other {this account}}'
            }
            values={{ type: collectiveType }}
          />
        </StyledButton>
      )}
      {!isArchived && hasBalance && (
        <P color="rgb(224, 183, 0)">
          <FormattedMessage
            id="collective.archive.availableBalance"
            defaultMessage={
              "Only {type, select, EVENT {Events} PROJECT {Projects} FUND {Funds} COLLECTIVE {Collectives} other {Accounts}} with a balance of zero can be archived. To pay out the funds, submit an expense, donate to another Collective, or send the funds to your fiscal host using the 'empty balance' option."
            }
            values={{ type: collectiveType }}
          />
        </P>
      )}
      {!isArchived && collective.isHost && (
        <P color="rgb(224, 183, 0)">
          <FormattedMessage
            id="collective.archive.isHost"
            defaultMessage={
              "You can't archive {type, select, ORGANIZATION {your Organization} other {your account}} while being a Host, please deactivate as Host first."
            }
            values={{ type: collectiveType }}
          />
        </P>
      )}
      {isArchived && confirmationMsg && (
        <MessageBox withIcon type="info" mb={4}>
          {confirmationMsg}
        </MessageBox>
      )}

      {isArchived && (
        <StyledButton onClick={() => setModal({ type: 'Unarchive', show: true })} loading={processing}>
          <FormattedMessage
            id="collective.unarchive.button"
            defaultMessage={
              'Unarchive {type, select, EVENT {this Event} PROJECT {this Project} FUND {this Fund} COLLECTIVE {this Collective} ORGANIZATION {this Organization} other {this account}}'
            }
            values={{ type: collectiveType }}
          />
        </StyledButton>
      )}

      <Modal show={modal.show} width="570px" onClose={closeModal}>
        <ModalHeader onClose={closeModal}>
          {modal.type === 'Unarchive' ? (
            <FormattedMessage
              id="unarchive.modal.header"
              defaultMessage="Unarchive {name}"
              values={{ name: collective.name }}
            />
          ) : (
            <FormattedMessage
              id="archive.modal.header"
              defaultMessage="Archive {name}"
              values={{ name: collective.name }}
            />
          )}
        </ModalHeader>
        <ModalBody>
          <P>
            {modal.type !== 'Unarchive' && (
              <FormattedMessage
                id="archive.account.confirmation"
                defaultMessage={
                  'Are you sure you want to archive {type, select, EVENT {this Event} PROJECT {this Project} FUND {this Fund} COLLECTIVE {this Collective} ORGANIZATION {this Organization} other {this account}}?'
                }
                values={{ type: collectiveType }}
              />
            )}
            {modal.type === 'Unarchive' && (
              <FormattedMessage
                id="unarchive.account.confirmation"
                defaultMessage={
                  'Are you sure you want to unarchive {type, select, EVENT {this Event} PROJECT {this Project} FUND {this Fund} COLLECTIVE {this Collective} ORGANIZATION {this Organization} other {this account}}?'
                }
                values={{ type: collectiveType }}
              />
            )}
          </P>
        </ModalBody>
        <ModalFooter>
          <Container display="flex" justifyContent="flex-end">
            <StyledButton mx={20} onClick={() => setModal({ ...modal, show: false })}>
              <FormattedMessage id="actions.cancel" defaultMessage={'Cancel'} />
            </StyledButton>
            <StyledButton
              buttonStyle="primary"
              data-cy="action"
              onClick={() => {
                if (modal.type === 'Unarchive') {
                  handleUnarchiveCollective({ id: collective.id });
                } else {
                  handleArchiveCollective({ id: collective.id });
                }
              }}
            >
              {modal.type === 'Unarchive' ? (
                <FormattedMessage id="collective.unarchive.confirm.btn" defaultMessage={'Unarchive'} />
              ) : (
                <FormattedMessage id="collective.archive.confirm.btn" defaultMessage={'Archive'} />
              )}
            </StyledButton>
          </Container>
        </ModalFooter>
      </Modal>
    </Container>
  );
};

ArchiveCollective.propTypes = {
  collective: PropTypes.object.isRequired,
  archiveCollective: PropTypes.func,
  unarchiveCollective: PropTypes.func,
};

export default ArchiveCollective;
