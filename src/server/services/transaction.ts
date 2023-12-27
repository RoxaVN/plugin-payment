import { NotFoundException } from '@roxavn/core';
import { BaseService, inject } from '@roxavn/core/server';
import { UserAccountNotFoundException } from '@roxavn/module-currency/base';
import {
  type AccountTransaction,
  CreateTransactionService,
  GetUserCurrencyAccountsService,
} from '@roxavn/module-currency/server';
import { GetUsersApiService } from '@roxavn/module-user/server';

import { serverModule } from '../module.js';
import { constants } from '../../base/index.js';

@serverModule.injectable()
export class CreatePaymentTransactionService extends BaseService {
  paymentAccountId?: string;

  constructor(
    @inject(CreateTransactionService)
    protected createTransactionService: CreateTransactionService,
    @inject(GetUsersApiService)
    protected getUsersApiService: GetUsersApiService,
    @inject(GetUserCurrencyAccountsService)
    protected getUserCurrencyAccountsService: GetUserCurrencyAccountsService
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
    };
  }) {
    if (!this.paymentAccountId) {
      const users = await this.getUsersApiService.handle({
        username: constants.PAYMENT_ACCOUNT,
      });
      if (users.items.length) {
        const paymentUserId = users.items[0].id;
        const accounts = await this.getUserCurrencyAccountsService.handle({
          accounts: [{ userId: paymentUserId }],
          currencyId: request.currencyId,
        });
        if (accounts.items.length) {
          this.paymentAccountId = accounts.items[0].id;
        } else {
          throw new UserAccountNotFoundException(paymentUserId);
        }
      } else {
        throw new NotFoundException();
      }
    }
    const { items } = await this.getUserCurrencyAccountsService.handle({
      accounts: [{ userId: request.account.userId }],
      currencyId: request.currencyId,
    });
    if (items.length < 1) {
      throw new UserAccountNotFoundException(request.account.userId);
    }
    const userAccount = items[0];

    const transactions = await this.createTransactionService.handle({
      currencyId: request.currencyId,
      type: request.type,
      originalTransactionId: request.originalTransactionId,
      metadata: request.metadata,
      accounts: [
        {
          accountId: userAccount.id,
          amount: request.account.amount,
        },
        {
          accountId: this.paymentAccountId,
          amount: -request.account.amount,
        },
      ],
    });

    return transactions.find(
      (t) => t.accountId === userAccount.id
    ) as AccountTransaction;
  }
}
