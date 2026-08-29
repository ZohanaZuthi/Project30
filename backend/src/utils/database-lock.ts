type Transaction = {
  client?: { config?: { client?: string } };
  raw(sql: string, bindings: unknown[]): Promise<unknown>;
};

export async function acquirePostgresTransactionLock(
  transaction: unknown,
  lockName: string
) {
  const trx = transaction as Transaction;
  const clientName = String(trx.client?.config?.client ?? '');

  if (
    clientName === 'pg' ||
    clientName === 'postgres' ||
    clientName === 'postgresql'
  ) {
    await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [lockName]);
  }
}
