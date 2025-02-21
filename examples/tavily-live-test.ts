import { config } from 'dotenv';
import { TavilyService } from '../src/web/services/tavily';

// Load environment variables from .env file
config();

async function runLiveTests() {
    // Get API key from environment variable
    const apiKey = process.env.VITE_TAVILY_API_KEY;
    if (!apiKey) {
        console.error('Please set VITE_TAVILY_API_KEY environment variable');
        process.exit(1);
    }

    const tavily = new TavilyService(apiKey);

    try {
        // Test 1: Current events query
        console.log('\n🔍 Test 1: Current Events Query');
        console.log('Query: "What are the latest developments in AI technology?"');
        const currentEvents = await tavily.search({
            query: 'What are the latest developments in AI technology?',
            category: 'news',
            search_depth: 'advanced',
            include_answer: true,
            max_results: 5
        });
        console.log('\nAI-Generated Answer:');
        console.log(currentEvents.answer);
        console.log('\nTop Results:');
        currentEvents.results.forEach((result, i) => {
            console.log(`\n${i + 1}. ${result.title}`);
            console.log(`   URL: ${result.url}`);
            console.log(`   Score: ${result.score}`);
            console.log(`   Excerpt: ${result.content.substring(0, 200)}...`);
        });

        // Test 2: Technical query with images
        console.log('\n\n🔍 Test 2: Technical Query with Images');
        console.log('Query: "What is quantum computing and how does it work?"');
        const technical = await tavily.search({
            query: 'What is quantum computing and how does it work?',
            search_depth: 'advanced',
            include_answer: true,
            include_images: true,
            max_results: 3
        });
        console.log('\nAI-Generated Answer:');
        console.log(technical.answer);
        console.log('\nTop Results:');
        technical.results.forEach((result, i) => {
            console.log(`\n${i + 1}. ${result.title}`);
            console.log(`   URL: ${result.url}`);
            console.log(`   Score: ${result.score}`);
            console.log(`   Excerpt: ${result.content.substring(0, 200)}...`);
        });
        if (technical.images && technical.images.length > 0) {
            console.log('\nRelated Images:');
            technical.images.forEach((image, i) => {
                console.log(`${i + 1}. ${image.url}`);
                if (image.description) console.log(`   Description: ${image.description}`);
            });
        }

        // Test 3: Content extraction
        console.log('\n\n🔍 Test 3: Content Extraction');
        const url = 'https://www.codeium.com/blog/cascade-next-gen-ai-agent';
        console.log(`Extracting content from: ${url}`);
        const extracted = await tavily.extract(url, {
            search_depth: 'advanced',
            include_images: true
        });
        console.log('\nExtracted Content:');
        console.log(extracted.content.substring(0, 500) + '...');

    } catch (error) {
        console.error('Error running live tests:', error);
    }
}

// Run the tests
console.log('🚀 Starting Tavily Live Tests...');
runLiveTests().then(() => {
    console.log('\n✅ Live tests completed!');
}).catch(console.error);
