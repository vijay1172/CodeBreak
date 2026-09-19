import { quoteInvoice } from '../services/quoteInvoice.js';
export function invoiceController(repository) {
  return {
    products: async (_req, res) => res.json({ products: await repository.products() }),
    history: async (_req, res) => res.json({ invoices: await repository.history() }),
    preview: async (req, res) => res.json(await quoteInvoice(req.body, repository)),
    create: async (req, res) => {
      const quote = await quoteInvoice(req.body, repository);
      const invoice = await repository.save(quote);
      res.status(201).json(invoice);
    },
  };
}
