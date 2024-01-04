import { BaseInstallHook } from '@roxavn/core/server';
import { roles } from '@roxavn/module-currency/base';

import { serverModule } from '../server/index.js';
import { permissions } from '../base/index.js';

@serverModule.injectable()
export class InstallHook extends BaseInstallHook {
  async handle() {
    roles.Admin.permissions.push(
      permissions.ReadOrders,
      permissions.ConfirmOrder
    );
    await this.createRolesService.handle(roles);
  }
}
