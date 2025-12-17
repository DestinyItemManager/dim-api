import DBMigrate from 'db-migrate';
import { execSync } from 'node:child_process';

export default async function setupDatabase() {
  if (process.env.CI) {
    // In GH actions we use the default postgres instance
    return false;
  }

  try {
    execSync('docker stop dim-api-postgres', {
      stdio: 'inherit',
      sterr: 'inherit',
    });
  } catch {}

  try {
    execSync('docker rm dim-api-postgres', {
      stdio: 'inherit',
      sterr: 'inherit',
    });
  } catch {}

  try {
    execSync(
      'docker run --name dim-api-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=travis_ci_test -p 5432:5432 -d postgres',
      {
        stdio: 'inherit',
        sterr: 'inherit',
      },
    );
  } catch (error) {
    console.error('Failed to start Docker container:', error.message);
    throw error;
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const dbmigrate = DBMigrate.getInstance(true, {
    config: './api/database.json',
    cmdOptions: {
      'migrations-dir': './api/migrations',
    },
    env: 'test',
  });

  await dbmigrate.up();

  return true;
}
