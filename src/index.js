
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/notes") {
      return json({ error: "Not found" }, 404);
    }

    if (request.method === "POST") {
      let data;

      try {
        data = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const text = String(data?.text ?? "").trim();

      if (!text) {
        return json(
          { error: "Field 'text' is required" },
          400
        );
      }

      const item = {
        id: crypto.randomUUID(),
        text: text.slice(0, 280),
        created_at: Math.floor(Date.now() / 1000),
      };

      await env.NOTES.put(
        `note:${item.id}`,
        JSON.stringify(item)
      );

      return json(item, 201);
    }

    if (request.method === "GET") {
      const list = await env.NOTES.list({
        prefix: "note:",
        limit: 50,
      });

      const items = await Promise.all(
        list.keys.map((key) =>
          env.NOTES.get(key.name, "json")
        )
      );

      return json(items.filter(Boolean));
    }

    return json(
      { error: "Method not allowed" },
      405
    );
  },
};
