import { BaseService, inject } from '@roxavn/core/server';
import { UserAccountNotFoundException } from '@roxavn/module-currency/base';
import {
  CreateBankerTransactionService,
  GetUserCurrencyAccountsService,
} from '@roxavn/module-currency/server';
import { GetOrCreateUserService } from '@roxavn/module-user/server';

import { serverModule } from '../module.js';
import { constants } from '../../base/index.js';

@serverModule.injectable()
export class CreatePaymentTransactionService extends BaseService {
  paymentUserId?: string;

  constructor(
    @inject(CreateBankerTransactionService)
    protected createBankerTransactionService: CreateBankerTransactionService,
    @inject(GetUserCurrencyAccountsService)
    protected getUserCurrencyAccountsService: GetUserCurrencyAccountsService,
    @inject(GetOrCreateUserService)
    protected getOrCreateUserService: GetOrCreateUserService
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
    if (!this.paymentUserId) {
      const paymentUser = await this.getOrCreateUserService.handle({
        username: constants.PAYMENT_ACCOUNT,
      });
      this.paymentUserId = paymentUser.id;
    }

    const { items } = await this.getUserCurrencyAccountsService.handle({
      accounts: [{ userId: request.account.userId }],
      currencyId: request.currencyId,
    });
    if (items.length < 1) {
      throw new UserAccountNotFoundException(request.account.userId);
    }
    const userAccount = items[0];

    return this.createBankerTransactionService.handle({
      bankerUserId: this.paymentUserId,
      currencyId: request.currencyId,
      metadata: request.metadata,
      originalTransactionId: request.originalTransactionId,
      type: request.type,
      account: {
        accountId: userAccount.id,
        amount: request.account.amount,
      },
    });
  }
}
