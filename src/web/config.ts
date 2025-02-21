interface Config {
    tavilyApiKey: string;
}

export const config: Config = {
    tavilyApiKey: import.meta.env.VITE_TAVILY_API_KEY || '',
};

// Validate required environment variables
export function validateConfig() {
    const missingVars: string[] = [];

    if (!config.tavilyApiKey) {
        missingVars.push('VITE_TAVILY_API_KEY');
    }

    if (missingVars.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingVars.join(', ')}\n` +
            'Please check your .env file and make sure all required variables are set.'
        );
    }
}
