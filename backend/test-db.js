const db = require('./db');

db.select('*').from('Users')
  .then(data => console.log("Ligação OK:", data))
  .catch(err => console.error("Erro de ligação:", err))
  .finally(() => db.destroy());
