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
  paymentAccountIds: Record<string, string> = {};
  paymentUserId?: string;

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
    let paymentAccountId = this.paymentAccountIds[request.currencyId];
    if (!paymentAccountId) {
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
      const { items } = await this.getUserCurrencyAccountsService.handle({
        accounts: [{ userId: this.paymentUserId }],
        currencyId: request.currencyId,
      });
      if (items.length) {
        paymentAccountId = items[0].id;
        this.paymentAccountIds[request.currencyId] = paymentAccountId;
      } else {
        throw new UserAccountNotFoundException(this.paymentUserId);
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
          accountId: paymentAccountId,
          amount: -request.account.amount,
        },
      ],
    });

    return transactions.find(
      (t) => t.accountId === userAccount.id
    ) as AccountTransaction;
  }
}
