// Environment configuration
interface Config {
  apiUrl: string;
}

// Different environments
const environments: Record<string, Config> = {
  development: {
    apiUrl: 'http://localhost:5000',
  },
  production: {
    apiUrl: 'https://recipe-summarizer-backend.azurewebsites.net',
  },
};

// Determine current environment
const getEnvironment = (): string => {
  // Check if we're in a production environment
  const host = window.location.hostname;
  if (host.includes('azurewebsites.net') || 
      host.includes('web.core.windows.net') || 
      host === 'recipesummarizer.com') {
    return 'production';
  }
  
  return 'development';
};

// Export the config for the current environment
const env = getEnvironment();
const config = environments[env];

export default config;