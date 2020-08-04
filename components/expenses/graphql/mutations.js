import { gql } from '@apollo/client';

export const payExpenseMutation = gql`
  mutation PayExpense(
    $id: Int!
    $paymentProcessorFeeInCollectiveCurrency: Int
    $hostFeeInCollectiveCurrency: Int
    $platformFeeInCollectiveCurrency: Int
    $forceManual: Boolean
  ) {
    payExpense(
      id: $id
      paymentProcessorFeeInCollectiveCurrency: $paymentProcessorFeeInCollectiveCurrency
      hostFeeInCollectiveCurrency: $hostFeeInCollectiveCurrency
      platformFeeInCollectiveCurrency: $platformFeeInCollectiveCurrency
      forceManual: $forceManual
    ) {
      id
      status
      collective {
        id
        stats {
          id
          balance
        }
        host {
          id
          paymentMethods {
            id
            balance
          }
        }
      }
    }
  }
`;
