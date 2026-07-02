export async function resolvePage<T>(
  rowsPromise: Promise<T[]>,
  totalPromise: Promise<Array<{ total: number }>>,
) {
  const [rows, [countRow]] = await Promise.all([rowsPromise, totalPromise])
  return { rows, total: countRow?.total ?? 0 }
}
