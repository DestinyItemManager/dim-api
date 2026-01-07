import { execSync } from 'node:child_process';

export default async function setupDatabase() {
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
