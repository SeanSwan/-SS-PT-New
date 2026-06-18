import { describe, expect, it } from 'vitest';

import Equipment from '../../models/Equipment.mjs';
import ExerciseEquipment from '../../models/ExerciseEquipment.mjs';
import Order from '../../models/Order.mjs';
import ShoppingCart from '../../models/ShoppingCart.mjs';
import StorefrontItem from '../../models/StorefrontItem.mjs';
import BusinessMetrics from '../../models/financial/BusinessMetrics.mjs';
import FinancialTransaction from '../../models/financial/FinancialTransaction.mjs';
import AdminNotification from '../../models/financial/AdminNotification.mjs';

const referencedTable = (model, attributeName) => (
  model.rawAttributes[attributeName]?.references?.model
);

describe('model reference table names', () => {
  it('uses real table names for production sync foreign key references', () => {
    expect(referencedTable(ExerciseEquipment, 'equipmentId')).toBe(Equipment.getTableName());
    expect(referencedTable(FinancialTransaction, 'orderId')).toBe(Order.getTableName());
    expect(referencedTable(FinancialTransaction, 'cartId')).toBe(ShoppingCart.getTableName());
    expect(referencedTable(BusinessMetrics, 'topPackageId')).toBe(StorefrontItem.getTableName());
    expect(referencedTable(AdminNotification, 'transactionId')).toBe(FinancialTransaction.getTableName());
  });
});
