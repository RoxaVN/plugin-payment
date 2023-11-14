import { BaseService, inject } from '@roxavn/core/server';
import { CreateTransactionService } from '@roxavn/module-currency/server';
import { GetUsersApiService } from '@roxavn/module-user/server';

import { serverModule } from '../module.js';
import { constants } from '../../base/index.js';
import { NotFoundException } from '@roxavn/core';

@serverModule.injectable()
export class CreatePaymentTransactionService extends BaseService {
  paymentUserId?: string;

  constructor(
    @inject(CreateTransactionService)
    protected createTransactionService: CreateTransactionService,
    @inject(GetUsersApiService)
    public getUsersApiService: GetUsersApiService
  ) {
    super();
  }

  async handle(request: {
    currencyId: string;
    type: string;
    originalTransactionId?: string;
    metadata?: Record<string, any>;
    account: {
      userId: string;
      amount: number | bigint;
      type?: string;
    };
  }) {
    if (!this.paymentUserId) {
      const { items } = await this.getUsersApiService.handle({
        username: constants.PAYMENT_ACCOUNT,
      });
      if (items.length) {
        this.paymentUserId = items[0].id;
      } else {
        throw new NotFoundException();
      }
    }
    return this.createTransactionService.handle({
      currencyId: request.currencyId,
      type: request.type,
      originalTransactionId: request.originalTransactionId,
      metadata: request.metadata,
      accounts: [
        request.account,
        {
          userId: this.paymentUserId,
          amount: -request.account.amount,
        },
      ],
    });
  }
}
