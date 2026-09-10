/** Node --import entrypoint for the explicit real-model test database adapter. */
import { register } from 'node:module';
register('./coachTestDatabaseLoader.mjs', import.meta.url);
