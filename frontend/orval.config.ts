import { defineConfig } from "orval";

export default defineConfig({
  visions: {
    input: {
      target: "http://localhost:8000/openapi.json",
    },
    output: {
      // One file per OpenAPI tag — properties.ts, styles.ts, generation.ts, auth.ts
      mode: "tags-split",
      target: "src/lib/api/generated",
      client: "vue-query",
      override: {
        mutator: {
          path: "src/lib/api/mutator.ts",
          name: "customMutator",
        },
      },
    },
  },
});
