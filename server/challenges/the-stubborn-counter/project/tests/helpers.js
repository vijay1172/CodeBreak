import { act } from "react";
import { createRoot } from "react-dom/client";
import { once } from "node:events";

export async function mount(element) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return {
    container,
    async close() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}
export async function changeInput(input, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export async function waitFor(check) {
  const deadline = Date.now() + 1500;
  while (!check() && Date.now() < deadline) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
  if (!check()) throw new Error("The expected rendered outcome did not appear.");
}

export async function serve(app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    async close() {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}
