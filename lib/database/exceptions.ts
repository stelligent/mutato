import { MuError } from '../exceptions';

/** Generic base exception class of database */
export abstract class DatabaseError extends MuError {}

/** Error thrown by the parser if validator fails */
export class DynamoDBbillingModeError extends DatabaseError {
  /** @hideconstructor */
  constructor() {
    super(
      'You must set billingMode: dynamodb.BillingMode.PROVISIONED when setting capacity'
    );
  }
}
