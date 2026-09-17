import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, env.host, () => {
  console.log(`Challenge app listening on ${env.host}:${env.port}`);
});
