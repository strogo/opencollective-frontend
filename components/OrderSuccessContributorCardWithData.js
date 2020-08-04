import React, { createRef } from 'react';
import PropTypes from 'prop-types';
import { gql } from '@apollo/client';
import { graphql } from '@apollo/client/react/hoc';
import themeGet from '@styled-system/theme-get';
import { get } from 'lodash';
import { FormattedMessage, injectIntl } from 'react-intl';
import styled from 'styled-components';

import Avatar from './Avatar';
import Container from './Container';
import EditPublicMessagePopup from './EditPublicMessagePopup';
import FormattedMoneyAmount from './FormattedMoneyAmount';
import { Box, Flex } from './Grid';
import LinkCollective from './LinkCollective';
import StyledCard from './StyledCard';
import { Span } from './Text';

const PublicMessage = styled.p`
  font-size: ${themeGet('fontSizes.Tiny')}px;
  lineheight: ${themeGet('fontSizes.Caption')}px;
  color: ${themeGet('colors.black.600')};
  margin-top: 12px;
  text-align: center;
  cursor: pointer;
  word-break: break-word;

  &:hover {
    opacity: 0.9;
  }
`;

const CollectiveLogoContainer = styled(Flex)`
  position: relative;
  border-top: 1px solid ${themeGet('colors.black.200')};
  justify-content: center;
  a {
    display: block;
    &:hover {
      opacity: 0.8;
    }
  }
  img {
    width: 48px;
    height: 48px;
    margin: 0 auto;
    background: ${themeGet('colors.black.100')};
    display: block;
    position: absolute;
    border-radius: 8px;
    margin-top: -24px;
  }
`;

const orderSuccessMemberQuery = gql`
  query OrderSuccessMember($collectiveId: Int!, $memberCollectiveId: Int!, $tierId: Int) {
    member(CollectiveId: $collectiveId, MemberCollectiveId: $memberCollectiveId, TierId: $tierId) {
      id
      publicMessage
    }
  }
`;

/**
 * A card to display the contributor, with a popup to edit public message.
 * This component fetch data for membership.
 */
class OrderSuccessContributorCardWithData extends React.Component {
  static propTypes = {
    fromCollective: PropTypes.object,
    order: PropTypes.shape({
      totalAmount: PropTypes.number,
      interval: PropTypes.string,
      currency: PropTypes.string,
    }).isRequired,
    // @ignore from injectIntl
    intl: PropTypes.object.isRequired,
    // @ignore from graphql
    data: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { hasPopup: true };
    this.mainContainerRef = createRef();
  }

  componentDidMount() {
    // Force updating to provide the ref after mounting
    this.forceUpdate();
  }

  getPublicMessage(props) {
    return get(props, 'data.member.publicMessage') || '';
  }

  showPopup = () => {
    this.setState({ hasPopup: true });
  };

  hidePopup = () => {
    this.setState({ hasPopup: false });
  };

  render() {
    const { order, fromCollective, intl, data } = this.props;
    const { totalAmount, interval, currency } = order;
    const { hasPopup } = this.state;
    const member = data && data.member;
    const { collectiveId, memberCollectiveId } = data && data.variables;
    return (
      <Container
        ref={this.mainContainerRef}
        display="flex"
        position="relative"
        flexWrap="wrap"
        justifyContent="center"
        p={2}
        mb={4}
      >
        <StyledCard className="collective-card" width={160}>
          <CollectiveLogoContainer mt={47}>
            <Box mt={-32}>
              <LinkCollective collective={fromCollective}>
                <Avatar collective={fromCollective} />
              </LinkCollective>
            </Box>
          </CollectiveLogoContainer>
          <Container
            display="flex"
            mt={2}
            px={2}
            justifyContent="center"
            fontSize="Paragraph"
            fontWeight="bold"
            lineHeight="Caption"
            color="black.900"
            textAlign="center"
          >
            <LinkCollective collective={fromCollective}>{fromCollective.name}</LinkCollective>
          </Container>
          <Flex flexDirection="column" p={12} alignItems="center">
            {totalAmount !== 0 && (
              <React.Fragment>
                <Span fontSize="Tiny">
                  <FormattedMessage id="contributeFlow.contributedTotal" defaultMessage="Contributed a total of:" />
                </Span>
                <Span fontSize="Caption">
                  <FormattedMoneyAmount
                    precision={2}
                    amount={totalAmount}
                    currency={currency}
                    interval={interval}
                    amountStyles={{ fontWeight: 'bold', color: 'black.900' }}
                    abbreviateInterval
                  />
                </Span>
              </React.Fragment>
            )}
            {member && member.publicMessage && (
              <Container textAlign="center" color="black.600">
                <PublicMessage onClick={this.showPopup}>“{member.publicMessage}”</PublicMessage>
              </Container>
            )}
            {member && !member.publicMessage && !hasPopup && (
              <Span
                mt={2}
                cursor="pointer"
                fontSize="Tiny"
                color="black.600"
                textAlign="center"
                onClick={this.showPopup}
              >
                <FormattedMessage id="contribute.publicMessage" defaultMessage="Leave a public message (Optional)" />
              </Span>
            )}
          </Flex>
        </StyledCard>
        {hasPopup && member && (
          <EditPublicMessagePopup
            cardRef={this.mainContainerRef}
            message={member.publicMessage}
            onClose={this.hidePopup}
            intl={intl}
            fromCollectiveId={memberCollectiveId}
            collectiveId={collectiveId}
          />
        )}
      </Container>
    );
  }
}

const addOrderSuccessMemberData = graphql(orderSuccessMemberQuery, {
  options: props => {
    const { collective, fromCollective, tier } = props.order;
    const variables = { collectiveId: collective.id, memberCollectiveId: fromCollective.id };
    if (tier) {
      variables.tierId = tier.id;
    }
    return { variables };
  },
});

export default injectIntl(addOrderSuccessMemberData(OrderSuccessContributorCardWithData));
