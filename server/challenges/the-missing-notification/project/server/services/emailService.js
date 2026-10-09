export function createEmailService() {
  return {
    async sendConfirmation(order) {
      if (!order?.sku) throw new Error('Nothing to confirm.');
      return { delivered: true, sku: order.sku };
    },
  };
}