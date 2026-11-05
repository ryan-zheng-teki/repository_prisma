// SCN-A3: the repository module runs before the db package registers the client.
import './models-repositories.js';
import '@acme/db';

console.log('wrong-order: not reached');
