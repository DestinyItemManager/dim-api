import { execSync } from 'node:child_process';

export default async function setupDatabase() {
  if (process.env.CI) {
    // In GH actions we use the default postgres instance
    return false;
  }

  try {
    execSync('docker stop dim-api-postgres', {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to start Docker container:', error.message);
    throw error;
  }

  try {
    execSync('docker rm dim-api-postgres', {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to start Docker container:', error.message);
    throw error;
  }
}
