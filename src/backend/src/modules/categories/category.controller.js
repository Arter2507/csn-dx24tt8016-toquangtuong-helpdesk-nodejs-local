export function categoryController(service) {
  return {
    list: async (req, res) => { const { items, meta } = await service.list(req.validated.query); res.json({ success: true, data: items, meta }); },
    find: async (req, res) => res.json({ success: true, data: await service.find(req.validated.params.id), meta: null }),
    create: async (req, res) => { const row = await service.create(req.validated.body); res.location('/api/v1/categories/' + row.id).status(201).json({ success: true, data: row, meta: null }); },
    update: async (req, res) => res.json({ success: true, data: await service.update(req.validated.params.id, req.validated.body), meta: null })
  };
}
