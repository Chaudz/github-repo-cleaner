import 'dotenv/config';
import app from './src/server/app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 GitHub Repo Deleter UI → http://localhost:${PORT}\n`);
});
