import { accessManager } from '@roxavn/core/base';
import { scopes as currencyScopes } from '@roxavn/module-currency/base';

import { baseModule } from './module.js';

export const scopes = accessManager.makeScopes(baseModule, {});

export const permissions = accessManager.makePermissions(scopes, {
  ReadOrders: {
    allowedScopes: [currencyScopes.Module, accessManager.scopes.Owner],
  },
  ConfirmOrder: { allowedScopes: [currencyScopes.Module] },
});
