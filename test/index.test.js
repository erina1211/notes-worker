
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

      return type === "json"
        ? JSON.parse(value)
        : value;
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
  env = { NOTES: fakeKV() }
) =>
  worker.fetch(
    new Request("http://x/notes", {
      method,
      body,
    }),
    env
  );

test("POST invalid JSON returns 400", async () => {
  const response = await call("POST", "{bukan json");
  assert.equal(response.status, 400);
});

test("POST empty text returns 400", async () => {
  const response = await call(
    "POST",
    JSON.stringify({ text: "   " })
  );

  assert.equal(response.status, 400);
});

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

test("DELETE returns 405", async () => {
  const response = await call("DELETE");
  assert.equal(response.status, 405);
});
