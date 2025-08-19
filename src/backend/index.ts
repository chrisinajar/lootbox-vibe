import 'dotenv/config';
import { initializeServer } from './init';

initializeServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
