/**
 * AI Agent API Service
 * - Refactored for cleaner API communication and error handling.
 * - Removed client-side token handling as it's managed by the backend system.
 */
import axios from 'axios';

// --- Axios Instance Setup ---
const apiClient = axios.create({
    baseURL: process.env.VUE_APP_API_BASE_URL || 'http://localhost:8080/api/v1/devportal/ai-agent/smart-search',
    timeout: 30000, // 30 seconds
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// --- Interceptors ---
apiClient.interceptors.request.use(
    (config) => {
        // Add a request ID for tracing
        config.headers['X-Request-ID'] = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`🚀 [API Request] ${config.method?.toUpperCase()} ${config.url}`, { params: config.params, data: config.data });
        return config;
    },
    (error) => {
        console.error('❌ [API Request Error]', error);
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        console.log(`✅ [API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, { status: response.status });
        return response; // Return the whole response object
    },
    (error) => {
        // Centralized error handling
        if (error.response) {
            console.error(`❌ [API Response Error]`, {
                url: error.config?.url,
                status: error.response.status,
                data: error.response.data
            });
            // Return a structured error message for the UI
            const errorMessage = error.response.data?.message || '서버 오류가 발생했습니다.';
            return Promise.reject(new Error(errorMessage));
        } else if (error.request) {
            console.error('❌ [Network Error]', 'The request was made but no response was received.');
            return Promise.reject(new Error('네트워크 연결을 확인해주세요.'));
        } else {
            console.error('❌ [Axios Error]', error.message);
            return Promise.reject(new Error('요청 중 오류가 발생했습니다.'));
        }
    }
);


// --- API Service Class ---
class AiAgentService {
    /**
     * Fetches the list of categories.
     * @returns {Promise<Array>} A promise that resolves to an array of category objects.
     */
    async getCategories() {
        const response = await apiClient.get('/categories');
        return response.data;
    }

    /**
     * Sends a message to the AI chat.
     * @param {object} chatRequest - The chat request data.
     * @returns {Promise<object>} A promise that resolves to the chat response object.
     */
    async aiSmartSearch(chatRequest) {
        const response = await apiClient.post('/chat', chatRequest);
        return response.data;
    }

    /**
     * Fetches the chat history for a user.
     * @param {object} params - The history query parameters.
     * @returns {Promise<Array>} A promise that resolves to an array of history summary objects.
     */
    async getHistory(params = {}) {
        if (!params.userId) throw new Error('User ID is required for fetching history.');
        
        const queryParams = {
            userId: params.userId,
            page: params.page || 0,
            size: params.size || 20,
            ...(params.categoryId && { categoryId: params.categoryId })
        };
        const response = await apiClient.get('/history', { params: queryParams });
        return response.data;
    }

    /**
     * Sends feedback for a chat session.
     * @param {object} feedbackRequest - The feedback data.
     * @returns {Promise<void>} A promise that resolves when the feedback is sent.
     */
    async sendFeedback(feedbackRequest) {
        await apiClient.post('/feedback', feedbackRequest);
    }
}

// Export a single instance of the service
export default new AiAgentService();
