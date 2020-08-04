import React from 'react';
import PropTypes from 'prop-types';
import { gql } from '@apollo/client';
import { graphql } from '@apollo/client/react/hoc';
import { Lock } from '@styled-icons/fa-solid';
import { get, isEmpty } from 'lodash';
import { FormattedMessage, injectIntl } from 'react-intl';
import styled from 'styled-components';

import { formatDate } from '../../../lib/utils';

import Avatar from '../../Avatar';
import Container from '../../Container';
import { Box, Flex } from '../../Grid';
import HTMLContent from '../../HTMLContent';
import Link from '../../Link';
import LinkCollective from '../../LinkCollective';
import MessageBox from '../../MessageBox';
import StyledButton from '../../StyledButton';
import StyledCard from '../../StyledCard';
import StyledLink from '../../StyledLink';
import StyledTooltip from '../../StyledTooltip';
import { P, Span } from '../../Text';
import ContainerSectionContent from '../ContainerSectionContent';
import { updatesFieldsFragment } from '../graphql/fragments';
import SectionTitle from '../SectionTitle';

/** Query to re-fetch updates */
const updatesSectionQuery = gql`
  query UpdatesSection($slug: String!, $onlyPublishedUpdates: Boolean) {
    Collective(slug: $slug) {
      id
      updates(limit: 3, onlyPublishedUpdates: $onlyPublishedUpdates) {
        ...UpdatesFields
      }
    }
  }

  ${updatesFieldsFragment}
`;

const PrivateUpdateMesgBox = styled(MessageBox)`
  height: 40px;
  background: #f0f8ff;
  border: 1px solid #b8deff;
  box-sizing: border-box;
  border-radius: 6px;
  margin: 10px 0;
  padding: 10px;
  font-size: 12px;
  color: #71757a;
  display: flex;
  align-items: center;
`;

/**
 * Displays collective's updates.
 */
class SectionUpdates extends React.PureComponent {
  static propTypes = {
    /** Collective */
    collective: PropTypes.shape({
      slug: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }).isRequired,

    /** Does user can see drafts? */
    isAdmin: PropTypes.bool.isRequired,

    /** Is user loggedIn? */
    isLoggedIn: PropTypes.bool.isRequired,

    /** Transactions */
    data: PropTypes.shape({
      refetch: PropTypes.func,
      Collective: PropTypes.shape({
        updates: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.number,
            slug: PropTypes.string,
            title: PropTypes.string,
            summary: PropTypes.string,
            createdAt: PropTypes.string,
            publishedAt: PropTypes.string,
            isPrivate: PropTypes.bool,
            userCanSeeUpdate: PropTypes.bool,
            fromCollective: PropTypes.shape({
              id: PropTypes.number,
              type: PropTypes.string,
              name: PropTypes.string,
              slug: PropTypes.string,
            }),
          }),
        ),
      }),
    }),
  };

  componentDidUpdate(oldProps) {
    // If user log in/out we need to refresh data as it depends on the current user
    const refetch = get(this.props.data, 'refetch');
    if (oldProps.isLoggedIn !== this.props.isLoggedIn && refetch) {
      refetch();
    }
  }

  render() {
    const { collective, isAdmin } = this.props;
    const updates = get(this.props.data, 'Collective.updates', []);

    // Nothing to show if updates is empty and user can't add new ones
    if (isEmpty(updates) && !isAdmin) {
      return null;
    }

    return (
      <ContainerSectionContent pt={5} pb={3}>
        <SectionTitle mb={24}>
          <FormattedMessage
            id="CollectivePage.SectionUpdates.Title"
            defaultMessage="What's new with {collectiveName}"
            values={{ collectiveName: collective.name }}
          />
        </SectionTitle>
        <Flex mb={3} justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <P color="black.700" my={2} mr={2}>
            <FormattedMessage
              id="section.updates.subtitle"
              defaultMessage="Stay up to dates with our latest activities and progress."
            />
          </P>
          {isAdmin && (
            <Link route="createUpdate" params={{ collectiveSlug: collective.slug }}>
              <StyledButton data-cy="create-new-update-btn" buttonStyle="primary">
                <Span fontSize="LeadParagraph" fontWeight="bold" mr={2}>
                  +
                </Span>
                <FormattedMessage id="CollectivePage.SectionUpdates.CreateBtn" defaultMessage="Create a new update" />
              </StyledButton>
            </Link>
          )}
        </Flex>
        {isEmpty(updates) ? (
          <div>
            <MessageBox my={5} type="info" withIcon maxWidth={700} fontStyle="italic" fontSize="Paragraph">
              <FormattedMessage
                id="SectionUpdates.PostFirst"
                defaultMessage="Use this section to promote your actions and keep your community up-to-date."
              />
            </MessageBox>
          </div>
        ) : (
          <StyledCard data-cy="updatesList">
            {updates.map((update, idx) => (
              <Container
                key={update.id}
                p={24}
                display="flex"
                justifyContent="space-between"
                borderBottom={idx === updates.length - 1 ? undefined : '1px solid #e6e8eb'}
              >
                <Flex>
                  <Box mr={3}>
                    <LinkCollective collective={update.fromCollective}>
                      <Avatar collective={update.fromCollective} radius={40} />
                    </LinkCollective>
                  </Box>
                  <Flex flexDirection="column" justifyContent="space-between">
                    <Link route="update" params={{ collectiveSlug: collective.slug, updateSlug: update.slug }}>
                      <P color="black.900" fontWeight="600" mb={2}>
                        {update.title}
                      </P>
                    </Link>
                    {update.userCanSeeUpdate ? (
                      <Container>
                        <HTMLContent style={{ display: 'inline' }} content={update.summary} />
                        {` `}
                        <StyledLink
                          as={Link}
                          fontSize="12px"
                          route="update"
                          params={{ collectiveSlug: collective.slug, updateSlug: update.slug }}
                        >
                          <FormattedMessage id="ContributeCard.ReadMore" defaultMessage="Read more" />
                        </StyledLink>
                      </Container>
                    ) : (
                      <PrivateUpdateMesgBox type="info" data-cy="mesgBox">
                        <FormattedMessage
                          id="update.private.cannot_view_message"
                          defaultMessage="Become a backer of {collective} to see this update"
                          values={{ collective: collective.name }}
                        />
                      </PrivateUpdateMesgBox>
                    )}
                    <Container color="black.400" mt={2} fontSize="Caption">
                      {update.isPrivate && (
                        <StyledTooltip
                          content={() => (
                            <FormattedMessage id="update.private.lock_text" defaultMessage="This update is private" />
                          )}
                        >
                          <Box mr={1}>
                            <Lock
                              data-tip
                              data-for="privateLockText"
                              data-cy="privateIcon"
                              size={12}
                              cursor="pointer"
                            />
                          </Box>
                        </StyledTooltip>
                      )}
                      {update.publishedAt ? (
                        <FormattedMessage
                          id="update.publishedAtBy"
                          defaultMessage="Published on {date} by {author}"
                          values={{
                            date: formatDate(update.publishedAt, {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            }),
                            author: <LinkCollective collective={update.fromCollective} />,
                          }}
                        />
                      ) : (
                        <FormattedMessage
                          id="update.createdAtBy"
                          defaultMessage={'Created on {date} (draft) by {author}'}
                          values={{
                            date: formatDate(update.createdAt),
                            author: <LinkCollective collective={update.fromCollective} />,
                          }}
                        />
                      )}
                    </Container>
                  </Flex>
                </Flex>
              </Container>
            ))}
          </StyledCard>
        )}
        {updates.length > 0 && (
          <Link route="updates" params={{ collectiveSlug: collective.slug }}>
            <StyledButton data-cy="view-all-updates-btn" mt={4} width={1} buttonSize="small" fontSize="Paragraph">
              <FormattedMessage id="CollectivePage.SectionUpdates.ViewAll" defaultMessage="View all updates" /> →
            </StyledButton>
          </Link>
        )}
      </ContainerSectionContent>
    );
  }
}

const addUpdatesSectionData = graphql(updatesSectionQuery, {
  options: props => ({
    variables: {
      slug: props.collective.slug,
      onlyPublishedUpdates: !props.isAdmin,
    },
  }),
});

export default injectIntl(addUpdatesSectionData(SectionUpdates));
