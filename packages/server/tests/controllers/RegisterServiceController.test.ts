// packages/server/tests/controllers/RegisterServiceController.test.ts
import { RegisterServiceController } from '../../src/controllers/RegisterServiceController';
import { LlmService, ApiSpecification } from '../../src/services/LlmService';
import { ToolService } from '../../src/services/tools';
import { getService } from '../../src/utils/getService';
import { StatusCodes } from 'http-status-codes';
import { ITool } from '../../src/Interface';
import { LoggedInUser, IAssignedWorkspace } from '../../src/enterprise/Interface.Enterprise';

jest.mock('../../src/utils/getService');
jest.mock('../../src/services/LlmService');
jest.mock('../../src/services/ToolService');


const mockGetService = getService as jest.Mock;
const MockLlmService = LlmService as jest.MockedClass<typeof LlmService>;
const MockToolService = ToolService as jest.MockedClass<typeof ToolService>;

describe('RegisterServiceController', () => {
    let controller: RegisterServiceController;
    let mockRequest: any;
    let mockResponse: any;
    let mockNext: jest.Mock;
    let mockLlmServiceInstance: jest.Mocked<LlmService>;
    let mockToolServiceInstance: jest.Mocked<ToolService>;

    const mockUser: LoggedInUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        activeOrganizationId: 'org-123',
        activeWorkspaceId: 'ws-123',
        roleId: 'role-viewer', // Example role
        activeOrganizationSubscriptionId: 'sub-123',
        activeOrganizationCustomerId: 'cust-123',
        activeOrganizationProductId: 'prod-123',
        isOrganizationAdmin: false,
        activeWorkspace: 'Test Workspace',
        assignedWorkspaces: [] as IAssignedWorkspace[],
        isApiKeyValidated: true, // Assuming true for a logged-in user context
        permissions: [],
        features: {}
    };

    beforeEach(() => {
        controller = new RegisterServiceController();
        mockLlmServiceInstance = new MockLlmService() as jest.Mocked<LlmService>;
        mockToolServiceInstance = new MockToolService() as jest.Mocked<ToolService>;

        mockGetService.mockImplementation((serviceClass: any) => {
            if (serviceClass === LlmService) return mockLlmServiceInstance;
            if (serviceClass === ToolService) return mockToolServiceInstance;
            throw new Error('Service not mocked: ' + serviceClass.name);
        });

        mockRequest = {
            body: { user_query: 'test query' },
            user: mockUser // Attach the mock user
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
    });

    const mockApiSpec: ApiSpecification = {
        name: 'GeneratedTool',
        description: 'A tool from LLM',
        color: '#ABCDEF',
        schema: JSON.stringify({ param: 'value' }),
        func: 'console.log(args);'
    };

    // Define mockCreatedTool based on ITool and mockApiSpec
    const mockCreatedTool: ITool = {
        id: 'tool-id-123',
        name: mockApiSpec.name,
        description: mockApiSpec.description,
        color: mockApiSpec.color,
        schema: mockApiSpec.schema,
        func: mockApiSpec.func,
        workspaceId: mockUser.activeWorkspaceId,
        createdDate: new Date(), // Add required ITool fields
        updatedDate: new Date()  // Add required ITool fields
    };


    it('should register a tool successfully', async () => {
        mockLlmServiceInstance.generateApiSpecification.mockResolvedValue(mockApiSpec);
        mockToolServiceInstance.createTool.mockResolvedValue(mockCreatedTool);

        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);

        expect(mockLlmServiceInstance.generateApiSpecification).toHaveBeenCalledWith('test query', undefined);
        expect(mockToolServiceInstance.createTool).toHaveBeenCalledWith(
            expect.objectContaining({
                name: mockApiSpec.name,
                workspaceId: mockUser.activeWorkspaceId
            }),
            mockUser.activeOrganizationId
        );
        expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.CREATED);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'success',
            toolId: mockCreatedTool.id,
            workspaceId: mockUser.activeWorkspaceId,
            orgId: mockUser.activeOrganizationId
        }));
    });

    it('should return 400 if user_query is missing', async () => {
        mockRequest.body.user_query = undefined;
        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Missing mandatory field: user_query' }));
    });

    it('should return 401 if user is missing from req', async () => {
        mockRequest.user = undefined;
        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication failed or active organization/workspace not found for the user.' }));
    });

    it('should return 401 if activeOrganizationId is missing from user', async () => {
        mockRequest.user = { ...mockUser, activeOrganizationId: undefined as any };
        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    });

    it('should return 401 if activeWorkspaceId is missing from user', async () => {
        mockRequest.user = { ...mockUser, activeWorkspaceId: undefined as any };
        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    });


    it('should handle LLM service failure', async () => {
        const llmError = new Error('LLM API Error');
        mockLlmServiceInstance.generateApiSpecification.mockRejectedValue(llmError);
        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_GATEWAY); // Default for LLM error
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Failed to generate API specification from LLM.',
            details: 'LLM API Error'
        }));
    });

    it('should handle LLM generating dangerous keyword error with BAD_REQUEST', async () => {
        const llmError = new Error('Generated function code contains potentially dangerous keyword: eval');
        mockLlmServiceInstance.generateApiSpecification.mockRejectedValue(llmError);
        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    });

    it('should handle LLM API key not configured error with INTERNAL_SERVER_ERROR', async () => {
        const llmError = new Error('OpenRouter API key not configured');
        mockLlmServiceInstance.generateApiSpecification.mockRejectedValue(llmError);
        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should handle LLM missing required field error with UNPROCESSABLE_ENTITY', async () => {
        const llmError = new Error('LLM output is missing required field: name');
        mockLlmServiceInstance.generateApiSpecification.mockRejectedValue(llmError);
        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY);
    });


    it('should handle ToolService (database) failure', async () => {
        mockLlmServiceInstance.generateApiSpecification.mockResolvedValue(mockApiSpec);
        const dbError = new Error('Database connection lost');
        mockToolServiceInstance.createTool.mockRejectedValue(dbError);
        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Failed to register the new tool in the database.',
            details: 'Database connection lost'
        }));
    });

    it('should call next with error for unexpected errors not handled by specific catches', async () => {
        const unexpectedError = new Error('Something totally unexpected');
        // Make generateApiSpecification throw an error that doesn't match specific checks
        mockLlmServiceInstance.generateApiSpecification.mockRejectedValue(unexpectedError);
        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        // Error is not one of the specifically handled ones (dangerous keyword, API key, missing field)
        // So it falls into the generic BAD_GATEWAY for LLM errors, then the outer catch calls next()
        // This depends on how specific the error checks are in the controller for llmError.
        // If the error from LlmService is re-thrown as is, and doesn't match specific conditions in controller,
        // it would be caught by the final catch block in the controller.
        // The controller's catch block for llmError might already send a response.
        // Let's refine this: if llmError is generic, it results in BAD_GATEWAY.
        // If the error happens *before* llmService call or *after* (e.g. in toolService call not mocked for this test),
        // then it would be caught by the final catch and next() would be called.

        // For this test, let's ensure the error is generic enough not to be caught by specific llm error handlers
        // but by the main try...catch in the controller that calls next(error)
        const genericError = new Error('A very generic error');
        mockRequest.body = null; // This will cause a TypeError when accessing req.body.user_query

        await controller.registerApiAsTool(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalledWith(expect.any(TypeError)); // Error from trying to access property of null
    });
});
