
/**
 * mswServer.ts — MSW v2 server partagé pour les tests d'intégration.
 * Chaque test file peut ajouter ses propres handlers via server.use().
 */
import { setupServer } from "msw/node";

export const server = setupServer();

