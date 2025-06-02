// packages/server/tests/services/LlmService.test.ts
import { LlmService, ApiSpecification } from '../../src/services/LlmService';
import fetch from 'node-fetch';

const { Response } = jest.requireActual('node-fetch');
jest.mock('node-fetch');

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('LlmService', () => {
    let llmService: LlmService;
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules(); // Clear cache for process.env
        process.env = { ...OLD_ENV }; // Make a copy
        llmService = new LlmService();
        mockFetch.mockClear();
    });

    afterAll(() => {
        process.env = OLD_ENV; // Restore old environment
    });

    const mockUserQuery = 'Create a weather API tool';
    const mockApiSpec: ApiSpecification = {
        name: 'WeatherTool',
        description: 'Gets the current weather',
        color: '#22A5F1',
        schema: JSON.stringify({ location: { type: 'string', description: 'City name' } }),
        func: 'const { location } = args; return { temp: 25, condition: "sunny" };'
    };

    it('should generate API specification successfully', async () => {
        process.env.OPENROUTER_API_KEY = 'fake-api-key';
        mockFetch.mockResolvedValue(new Response(JSON.stringify({
            choices: [{ message: { content: JSON.stringify(mockApiSpec) } }]
        }), { status: 200 }));

        const result = await llmService.generateApiSpecification(mockUserQuery);
        expect(result).toEqual(mockApiSpec);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        // More detailed check of the prompt could be added if needed
    });

    it('should extract JSON from markdown code blocks', async () => {
        process.env.OPENROUTER_API_KEY = 'fake-api-key';
        const llmResponseContent = \`\`\`json
        \${JSON.stringify(mockApiSpec)}
        \`\`\`
        mockFetch.mockResolvedValue(new Response(JSON.stringify({
            choices: [{ message: { content: llmResponseContent } }]
        }), { status: 200 }));
        const result = await llmService.generateApiSpecification(mockUserQuery);
        expect(result).toEqual(mockApiSpec);
    });

    it('should throw error if API key is not configured', async () => {
        delete process.env.OPENROUTER_API_KEY;
        await expect(llmService.generateApiSpecification(mockUserQuery))
            .rejects
            .toThrow('OpenRouter API key not configured. Cannot connect to LLM service.');
    });

    it('should throw error for LLM API non-200 response', async () => {
        process.env.OPENROUTER_API_KEY = 'fake-api-key';
        mockFetch.mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Billing issue' } }), { status: 402 }));
        await expect(llmService.generateApiSpecification(mockUserQuery))
            .rejects
            .toThrow('LLM API request failed with status 402. Detail: {"error":{"message":"Billing issue"}}');
    });

    it('should throw error for empty or unexpected LLM content', async () => {
        process.env.OPENROUTER_API_KEY = 'fake-api-key';
        mockFetch.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 }));
        await expect(llmService.generateApiSpecification(mockUserQuery))
            .rejects
            .toThrow('LLM returned empty or unexpected content.');
    });

    it('should throw error if LLM output is not valid JSON', async () => {
        process.env.OPENROUTER_API_KEY = 'fake-api-key';
        mockFetch.mockResolvedValue(new Response(JSON.stringify({
            choices: [{ message: { content: "This is not JSON" } }]
        }), { status: 200 }));
        await expect(llmService.generateApiSpecification(mockUserQuery))
            .rejects
            .toThrow('Failed to parse LLM response as JSON.');
    });

    it('should throw error if LLM output is missing required fields', async () => {
        process.env.OPENROUTER_API_KEY = 'fake-api-key';
        const incompleteSpec = { ...mockApiSpec, name: undefined } as any; // Cast to any to allow missing field
        mockFetch.mockResolvedValue(new Response(JSON.stringify({
            choices: [{ message: { content: JSON.stringify(incompleteSpec) } }]
        }), { status: 200 }));
        await expect(llmService.generateApiSpecification(mockUserQuery))
            .rejects
            .toThrow('LLM output is missing required field: name');
    });

    it('should throw error if "func" contains dangerous keywords', async () => {
        process.env.OPENROUTER_API_KEY = 'fake-api-key';
        const maliciousSpec = { ...mockApiSpec, func: 'eval("danger")' };
        mockFetch.mockResolvedValue(new Response(JSON.stringify({
            choices: [{ message: { content: JSON.stringify(maliciousSpec) } }]
        }), { status: 200 }));
        await expect(llmService.generateApiSpecification(mockUserQuery))
            .rejects
            .toThrow('Generated function code contains potentially dangerous keyword: eval');
    });

     it('should throw error for invalid color format', async () => {
        process.env.OPENROUTER_API_KEY = 'fake-api-key';
        const specWithInvalidColor = { ...mockApiSpec, color: 'invalidcolor' };
        mockFetch.mockResolvedValue(new Response(JSON.stringify({
            choices: [{ message: { content: JSON.stringify(specWithInvalidColor) } }]
        }), { status: 200 }));

        await expect(llmService.generateApiSpecification(mockUserQuery))
            .rejects
            .toThrow('LLM output "color" must be a valid hex color string (e.g., #RRGGBB).');
    });

    it('should throw error if schema is not a string', async () => {
        process.env.OPENROUTER_API_KEY = 'fake-api-key';
        const specWithInvalidSchema = { ...mockApiSpec, schema: { not: "a string" } } as any; // Schema as object, cast to any
         mockFetch.mockResolvedValue(new Response(JSON.stringify({
            choices: [{ message: { content: JSON.stringify(specWithInvalidSchema) } }]
        }), { status: 200 }));

        await expect(llmService.generateApiSpecification(mockUserQuery))
            .rejects
            .toThrow('LLM output "schema" must be a JSON string.');
    });

    it('should throw error if schema string is not valid JSON', async () => {
        process.env.OPENROUTER_API_KEY = 'fake-api-key';
        const specWithInvalidSchemaJson = { ...mockApiSpec, schema: "this is not json" };
        mockFetch.mockResolvedValue(new Response(JSON.stringify({
            choices: [{ message: { content: JSON.stringify(specWithInvalidSchemaJson) } }]
        }), { status: 200 }));

        await expect(llmService.generateApiSpecification(mockUserQuery))
            .rejects
            .toThrow('LLM output "schema" is not valid JSON string.');
    });
});
