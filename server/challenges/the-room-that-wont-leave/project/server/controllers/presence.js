import { RequestError } from '../middleware/errorHandler.js';
export function presenceController(repository, hub) {
  return {
    list: async (_req, res) => res.json({ members: await repository.list() }),
    update: async (req, res) => {
      if (!['online', 'away', 'offline'].includes(req.body.status)) throw new RequestError(422, 'Choose online, away, or offline.');
      const member = await repository.update(req.params.handle, req.body.status);
      if (!member) throw new RequestError(404, 'Member not found.');
      hub.publish({ type: 'presence', handle: member.handle, name: member.name, status: member.status });
      res.json(member);
    },
    stream: (req, res) => {
      res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.flushHeaders();
      const unsubscribe = hub.subscribe(event => res.write('data: ' + JSON.stringify(event) + '\n\n'));
      const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
      req.on('close', () => { clearInterval(heartbeat); unsubscribe(); });
    },
  };
}
