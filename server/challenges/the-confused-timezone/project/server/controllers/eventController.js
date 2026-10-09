export function eventController(Event) {
  return {
    async create(req, res) {
      const slug = String(req.body?.slug || '').trim();
      const title = String(req.body?.title || '').trim();
      const date = String(req.body?.date || '').trim();
      if (!slug || !title || !date) return res.status(422).json({ error: 'Slug, title, and date are required.' });
      const event = await Event.create({ slug, title, date });
      res.status(201).json({ slug: event.slug, title: event.title, date: event.date });
    },
    async show(req, res) {
      const event = await Event.findOne({ slug: req.params.slug }).lean();
      if (!event) return res.status(404).json({ error: 'No such event.' });
      res.json({ slug: event.slug, title: event.title, date: event.date });
    },
    async list(_req, res) {
      const events = await Event.find().sort({ date: 1 }).lean();
      res.json({ events: events.map(({ slug, title, date }) => ({ slug, title, date })) });
    },
  };
}