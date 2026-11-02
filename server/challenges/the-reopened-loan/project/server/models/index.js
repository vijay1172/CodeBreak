import { defineLoan } from './Loan.js';

export function defineModels(connection) {
  return { Loan: defineLoan(connection) };
}
