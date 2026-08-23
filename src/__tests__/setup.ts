
// Setup file for vitest — add global test utilities here as needed
import { server } from "./mswServer";
import { beforeAll, afterEach, afterAll } from "vitest";

// Démarre MSW avant tous les tests, réinitialise les handlers entre chaque test
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

