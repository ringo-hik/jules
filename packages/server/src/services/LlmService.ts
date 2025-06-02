import fetch from 'node-fetch';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'YOUR_OPENROUTER_API_KEY';
const LLM_MODEL_NAME = process.env.LLM_MODEL_NAME || 'anthropic/claude-3-haiku';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ApiSpecification {
    name: string;
    description: string;
    color: string;
    iconSrc?: string;
    schema: string;
    func: string;
}

// List of potentially dangerous keywords to check in the generated 'func' string
const DANGEROUS_KEYWORDS = [
    'eval', 'Function(', 'setTimeout(', 'setInterval(', // Common ways to execute arbitrary strings
    'fs.', 'child_process', 'require(', '.exec', '.spawn', // Filesystem and process manipulation
    'process.', 'global.', 'window', 'document', // Access to global objects or sensitive environments
    'innerHTML', 'outerHTML', 'dangerouslySetInnerHTML', // DOM manipulation if ever used in such context
    'constructor', '__proto__', 'prototype' // Prototype pollution potential
];

export class LlmService {
    public async generateApiSpecification(userQuery: string, targetToolName?: string): Promise<ApiSpecification> {
        const prompt = `
You are an expert API designer. Based on the user's query, generate a Flowise tool specification.
The specification must be a JSON object with the following fields: "name", "description", "color", "iconSrc" (optional), "schema" (a JSON string representing the input parameters), and "func" (a JavaScript async function body as a string to execute the API call).

User Query: "${userQuery}"
${targetToolName ? `Suggested Tool Name: "${targetToolName}"` : ''}

The "schema" field must be a JSON string. For example: "{ \"param1\": { \"type\": \"string\", \"description\": \"An example parameter\" } }".
The "func" field must be a JavaScript async function body as a string. For example:
"
// Access input arguments via an 'args' object.
// const { param1 } = args;
// const credentialData = await this.getCredentialData('myApiCredential', options); // If API key needed
// const apiKey = credentialData.apiKey;
// const response = await fetch(\`https://api.example.com/data?query=\${param1}&apiKey=\${apiKey}\`);
// if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
// return await response.json();
"
Provide ONLY the JSON object as your response, without any surrounding text or explanations.
Ensure the "name" is unique and descriptive. If a targetToolName is provided, use it or a variation. Otherwise, create one.
The "description" should clearly explain what the API tool does.
The "color" should be a valid hex color code (e.g., "#FFD700").
The "func" code should correctly use 'args' for input parameters defined in the 'schema'. It should be safe and not contain malicious code.
If the API requires authentication (e.g., API key), the func should demonstrate how to retrieve it using 'this.getCredentialData('YOUR_CREDENTIAL_NAME', options)'. The user will need to configure this credential in Flowise.
Do not include actual API keys in the func. Do not use functions like eval(), Function(), setTimeout(), setInterval(), or access 'fs', 'child_process', 'process', 'global', 'window', 'document'.

JSON Output:
`;

        try {
            if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY') {
                console.warn('OpenRouter API key is not configured. LLM call will be skipped.');
                throw new Error('OpenRouter API key not configured. Cannot connect to LLM service.');
            }

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': \`Bearer \${OPENROUTER_API_KEY}\`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.FLOWISE_BASE_URL || 'http://localhost:3000', // Recommended by OpenRouter
                    'X-Title': process.env.FLOWISE_APP_TITLE || 'Flowise', // Recommended by OpenRouter
                },
                body: JSON.stringify({
                    model: LLM_MODEL_NAME,
                    messages: [{ role: 'user', content: prompt }],
                }),
                timeout: 30000, // 30 seconds timeout
            });

            if (!response.ok) {
                const errorBody = await response.text();
                let detail = errorBody;
                try {
                    const jsonError = JSON.parse(errorBody);
                    detail = jsonError.error?.message || errorBody;
                } catch (e) { /* Ignore if errorBody is not JSON */ }
                console.error(\`LLM API Error (\${response.status}): \${detail}\`);
                throw new Error(\`LLM API request failed with status \${response.status}. Detail: \${detail}\`);
            }

            const result = await response.json();
            let jsonResponseString = result.choices?.[0]?.message?.content?.trim();

            if (!jsonResponseString) {
                console.error('LLM returned empty or unexpected content:', JSON.stringify(result, null, 2));
                throw new Error('LLM returned empty or unexpected content.');
            }

            if (jsonResponseString.startsWith('```json')) {
                jsonResponseString = jsonResponseString.substring(7, jsonResponseString.length - 3).trim();
            } else if (jsonResponseString.startsWith('```')) {
                 jsonResponseString = jsonResponseString.substring(3, jsonResponseString.length - 3).trim();
            }

            let parsedSpec: ApiSpecification;
            try {
                parsedSpec = JSON.parse(jsonResponseString);
            } catch (e) {
                console.error('Failed to parse LLM JSON response:', e, '\nResponse string:', jsonResponseString);
                throw new Error('Failed to parse LLM response as JSON. Ensure the LLM returns valid JSON.');
            }

            const requiredFields = ['name', 'description', 'color', 'schema', 'func'];
            for (const field of requiredFields) {
                if (!parsedSpec[field]) {
                    console.error(\`LLM output is missing required field: \${field}\`, parsedSpec);
                    throw new Error(\`LLM output is missing required field: \${field}\`);
                }
            }

            if (typeof parsedSpec.name !== 'string' || parsedSpec.name.trim() === '') {
                throw new Error('LLM output "name" must be a non-empty string.');
            }
            if (typeof parsedSpec.description !== 'string' || parsedSpec.description.trim() === '') {
                throw new Error('LLM output "description" must be a non-empty string.');
            }
            if (typeof parsedSpec.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(parsedSpec.color)) {
                throw new Error('LLM output "color" must be a valid hex color string (e.g., #RRGGBB).');
            }
            if (parsedSpec.iconSrc && typeof parsedSpec.iconSrc !== 'string') {
                throw new Error('LLM output "iconSrc" must be a string if provided.');
            }
            if (typeof parsedSpec.schema !== 'string') { // Already checked by requiredFields, but good for specific message
                throw new Error('LLM output "schema" must be a JSON string.');
            }
            try {
                const schemaObj = JSON.parse(parsedSpec.schema);
                if (typeof schemaObj !== 'object' || schemaObj === null) {
                    throw new Error('Parsed "schema" is not a JSON object.');
                }
            } catch (e) {
                console.error('LLM output "schema" is not valid JSON:', parsedSpec.schema, e);
                throw new Error('LLM output "schema" is not valid JSON string.');
            }

            if (typeof parsedSpec.func !== 'string' || parsedSpec.func.trim() === '') {
                throw new Error('LLM output "func" must be a non-empty JavaScript string.');
            }
            for (const keyword of DANGEROUS_KEYWORDS) {
                if (parsedSpec.func.includes(keyword)) {
                    console.warn(\`LLM generated 'func' contains potentially dangerous keyword: \${keyword}\`, parsedSpec.func);
                    throw new Error(\`Generated function code contains potentially dangerous keyword: \${keyword}. Please review the user query or LLM output.\`);
                }
            }
            // if (!parsedSpec.func.trim().startsWith('//') && !parsedSpec.func.includes('async') && !parsedSpec.func.includes('return')) {
            //      console.warn(\`LLM generated 'func' might not be a proper async function body:\`, parsedSpec.func);
            // }

            return parsedSpec;

        } catch (error) {
            console.error(\`Error in LlmService.generateApiSpecification (\${LLM_MODEL_NAME}):\`, error.message);
            if (error.message.startsWith('LLM API request failed') ||
                error.message.startsWith('LLM returned empty') ||
                error.message.startsWith('Failed to parse LLM JSON response') ||
                error.message.startsWith('LLM output is missing required field') ||
                error.message.includes('must be a') || // Covers type errors like "name must be a non-empty string"
                error.message.includes('not valid JSON string') || // Covers schema JSON validation
                error.message.includes('Parsed "schema" is not a JSON object') ||
                error.message.startsWith('Generated function code contains potentially dangerous keyword') ||
                error.message.startsWith('OpenRouter API key not configured')) {
                throw error;
            }
            throw new Error(\`LLM service failed: \${error.message}\`);
        }
    }
}
