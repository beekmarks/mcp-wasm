import { config } from '../src/web/config';
import { TavilyService } from '../src/web/services/tavily';

async function runExamples() {
    // Initialize Tavily service
    const tavily = new TavilyService(config.tavilyApiKey);

    try {
        console.log('Running Tavily Search Examples...\n');

        // Example 1: Basic Search
        console.log('Example 1: Basic Search');
        console.log('Query: What is TypeScript?');
        const basicResult = await tavily.search({
            query: 'What is TypeScript?',
            search_depth: 'basic',
            include_answer: true,
            max_results: 3
        });
        console.log('Answer:', basicResult.answer);
        console.log('Top result:', basicResult.results[0].title);
        console.log('\n---\n');

        // Example 2: News Search
        console.log('Example 2: News Search');
        console.log('Query: Latest developments in AI');
        const newsResult = await tavily.search({
            query: 'Latest developments in AI',
            category: 'news',
            search_depth: 'basic',
            max_results: 3
        });
        console.log('Top 3 news articles:');
        newsResult.results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.title}`);
        });
        console.log('\n---\n');

        // Example 3: Advanced Search with Images
        console.log('Example 3: Advanced Search with Images');
        console.log('Query: Famous landmarks in Paris');
        const imageResult = await tavily.search({
            query: 'Famous landmarks in Paris',
            search_depth: 'advanced',
            include_images: true,
            max_results: 3
        });
        console.log('Found landmarks:');
        imageResult.results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.title}`);
        });
        if (imageResult.images && imageResult.images.length > 0) {
            console.log('\nImage URLs:');
            imageResult.images.forEach((image, index) => {
                console.log(`${index + 1}. ${image.url}`);
            });
        }
        console.log('\n---\n');

        // Example 4: Content Extraction
        console.log('Example 4: Content Extraction');
        const extractResult = await tavily.extract(
            'https://www.typescriptlang.org/docs/handbook/intro.html',
            { include_images: true }
        );
        console.log('Extracted content length:', extractResult.content.length);
        console.log('First 200 characters:', extractResult.content.substring(0, 200));

    } catch (error) {
        console.error('Error running examples:', error);
    }
}

// Run the examples
runExamples().catch(console.error);
