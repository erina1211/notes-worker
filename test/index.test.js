
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

function fakeKV() {
  const data = new Map();

  return {
    async put(key, value) {
      data.set(key, value);
    },

    async get(key, type) {
      const value = data.get(key);

      if (value === undefined) return null;

      return type === "json" ? JSON.parse(value) : value;
    },

    async list({ prefix }) {
      return {
        keys: [...data.keys()]
          .filter((key) => key.startsWith(prefix))
          .map((name) => ({ name })),
      };
    },
  };
}

const call = (
  method,
  body,
  env = { NOTES: fakeKV() },
  path = "/notes"
) =>
  worker.fetch(
    new Request(`http://x${path}`, { method, body }),
    env
  );

// Tes 1: JSON tidak valid
test("POST invalid JSON returns 400", async () => {
  const response = await call("POST", "{bukan json");
  assert.equal(response.status, 400);
});

// Tes 2: teks kosong ditolak
test("POST empty text returns 400", async () => {
  const response = await call(
    "POST",
    JSON.stringify({ text: "   " })
  );

  assert.equal(response.status, 400);
});

// Tes 3: membuat dan menampilkan daftar catatan
test("POST then GET returns created note", async () => {
  const env = { NOTES: fakeKV() };

  const created = await call(
    "POST",
    JSON.stringify({ text: "halo" }),
    env
  );

  assert.equal(created.status, 201);

  const list = await (
    await call("GET", undefined, env)
  ).json();

  assert.equal(list.length, 1);
  assert.equal(list[0].text, "halo");
});

// Tes 4: method DELETE tidak didukung
test("DELETE returns 405", async () => {
  const response = await call("DELETE");
  assert.equal(response.status, 405);
});

// Tes 5: mengambil satu catatan berdasarkan ID
test("GET /notes/:id returns one note", async () => {
  const env = { NOTES: fakeKV() };

  const createdResponse = await call(
    "POST",
    JSON.stringify({ text: "catatan khusus" }),
    env
  );

  const created = await createdResponse.json();

  const response = await call(
    "GET",
    undefined,
    env,
    `/notes/${created.id}`
  );

  assert.equal(response.status, 200);

  const item = await response.json();

  assert.equal(item.id, created.id);
  assert.equal(item.text, "catatan khusus");
});

// Tes 6: ID yang tidak ditemukan menghasilkan 404
test("GET /notes/:id returns 404 when missing", async () => {
  const response = await call(
    "GET",
    undefined,
    { NOTES: fakeKV() },
    "/notes/id-yang-tidak-ada"
  );

  assert.equal(response.status, 404);
});
