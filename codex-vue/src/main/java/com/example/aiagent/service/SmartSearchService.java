package com.example.aiagent.service;

import com.example.aiagent.domain.ChatMessage;
import com.example.aiagent.domain.ChatSession;
import com.example.aiagent.domain.ContextData;
import com.example.aiagent.dto.category.CategoryDto;
import com.example.aiagent.dto.chat.ChatRequest;
import com.example.aiagent.dto.chat.ChatResponse;
import com.example.aiagent.dto.feedback.FeedbackRequest;
import com.example.aiagent.dto.history.HistorySummaryDto;
import com.example.aiagent.mapper.SmartSearchMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmartSearchService {

    private final SmartSearchMapper smartSearchMapper;
    private final LlmService llmService; // 외부 LLM 서비스 (구현되어 있다고 가정)

    /**
     * 카테고리 목록 조회
     */
    public List<CategoryDto> getCategories() {
        log.info("🔄 Fetching all active categories from DB.");
        return smartSearchMapper.selectActiveCategories();
    }

    /**
     * 스마트 검색 채팅 처리
     */
    @Transactional
    public ChatResponse processSmartSearch(ChatRequest request) {
        log.info("🔄 Processing smart search for categoryId: {}, userId: {}", request.getCategoryId(), request.getUserId());

        // 1. 세션 관리
        String sessionId = request.getSessionId();
        if (sessionId == null || sessionId.trim().isEmpty()) {
            sessionId = generateSessionId();
            log.info("✨ New session created: {}", sessionId);
        }

        // 2. 사용자 메시지 저장
        saveChatMessage(sessionId, request.getUserId(), request.getCategoryId(), "USER", request.getMessage());

        // 3. 컨텍스트 데이터 조회
        List<ContextData> contextData = smartSearchMapper.selectContextDataByCategoryId(request.getCategoryId());

        // 4. 시스템 프롬프트 생성
        CategoryDto category = smartSearchMapper.selectCategoryById(request.getCategoryId());
        if(category == null) {
            throw new IllegalArgumentException("Invalid category ID: " + request.getCategoryId());
        }
        String systemPrompt = buildSystemPrompt(category, contextData);

        // 5. LLM 호출 (이 메소드는 이미 구현되어 있다고 가정)
        log.info("🚀 Calling LLM service...");
        String aiResponseContent = llmService.llmCall(systemPrompt, request.getMessage());
        log.info("✅ LLM service returned a response.");

        // 6. AI 응답 저장
        saveChatMessage(sessionId, request.getUserId(), request.getCategoryId(), "AI", aiResponseContent);

        // 7. 세션 정보 생성 또는 업데이트
        upsertChatSession(sessionId, request.getUserId(), request.getCategoryId(), category.getName());

        // 8. 응답 객체 생성 및 반환
        ChatResponse response = new ChatResponse();
        response.setSessionId(sessionId);
        response.setAiMessage(aiResponseContent);
        response.setTimestamp(LocalDateTime.now());
        
        return response;
    }

    /**
     * 채팅 히스토리 조회
     */
    public List<HistorySummaryDto> getChatHistory(String userId, Long categoryId, int page, int size) {
        int offset = page * size;
        log.info("🔄 Fetching chat history for userId: {} with page: {}, size: {}", userId, page, size);
        return smartSearchMapper.selectChatHistory(userId, categoryId, offset, size);
    }

    /**
     * 피드백 저장
     */
    @Transactional
    public void saveFeedback(FeedbackRequest request) {
        log.info("🔄 Saving feedback for sessionId: {}, rating: {}", request.getSessionId(), request.getRating());
        request.setCreatedAt(LocalDateTime.now());
        smartSearchMapper.insertFeedback(request);
    }

    private void saveChatMessage(String sessionId, String userId, Long categoryId, String messageType, String content) {
        ChatMessage message = new ChatMessage();
        message.setSessionId(sessionId);
        message.setUserId(userId);
        message.setCategoryId(categoryId);
        message.setMessageType(messageType);
        message.setContent(content);
        message.setCreatedAt(LocalDateTime.now());
        smartSearchMapper.insertChatMessage(message);
        log.info("💾 Saved {} message to DB for session: {}", messageType, sessionId);
    }
    
    private void upsertChatSession(String sessionId, String userId, Long categoryId, String categoryName) {
        ChatSession session = new ChatSession();
        session.setSessionId(sessionId);
        session.setUserId(userId);
        session.setCategoryId(categoryId);
        session.setCategoryName(categoryName);
        session.setLastMessageAt(LocalDateTime.now());

        if (smartSearchMapper.existsSession(sessionId)) {
            smartSearchMapper.updateChatSession(session);
            log.info("🔄 Updated session: {}", sessionId);
        } else {
            session.setCreatedAt(LocalDateTime.now());
            smartSearchMapper.insertChatSession(session);
            log.info("✨ Inserted new session: {}", sessionId);
        }
    }

    private String buildSystemPrompt(CategoryDto category, List<ContextData> contextData) {
        StringBuilder systemPrompt = new StringBuilder();

        systemPrompt.append("# Role and Goal\n");
        systemPrompt.append("You are a helpful '").append(category.getName()).append("' assistant. ");
        systemPrompt.append("Your primary goal is to provide accurate and easy-to-understand answers to user questions based on the provided context data. The answer must be in Korean.\n\n");

        systemPrompt.append("# Context Data\n");
        systemPrompt.append("Here is the context data you must use to answer the user's question:\n");
        if (contextData != null && !contextData.isEmpty()) {
            String contextString = contextData.stream()
                .map(ContextData::getContent)
                .collect(Collectors.joining("\n- ", "- ", ""));
            systemPrompt.append(contextString);
        } else {
            systemPrompt.append("No context data is available. Answer based on your general knowledge about the topic.");
        }
        systemPrompt.append("\n\n");

        systemPrompt.append("# Response Format Instruction\n");
        systemPrompt.append("IMPORTANT: You must follow these formatting rules for your response:\n");
        systemPrompt.append("1.  **General Answers**: For general questions, provide the answer in a clear and concise paragraph.\n");
        systemPrompt.append("2.  **Tabular Data**: If the user's question asks for information that is best represented in a table (e.g., comparisons, lists of items with multiple attributes), you MUST format the response using Markdown table syntax. Do not use any other table format.\n");
        systemPrompt.append("    - Example of a Markdown Table:\n");
        systemPrompt.append("      | Header 1 | Header 2 | Header 3 |\n");
        systemPrompt.append("      |:---|:---|:---|\n");
        systemPrompt.append("      | Data A | Data B | Data C |\n");
        systemPrompt.append("      | Data D | Data E | Data F |\n");
        systemPrompt.append("3.  **Language**: The final output MUST be in Korean.\n");
        systemPrompt.append("4.  **Tone**: Maintain a professional and helpful tone.\n\n");
        
        systemPrompt.append("Now, answer the user's question based on the provided context and formatting rules.\n");

        log.info("✨ System prompt created for category: {}", category.getName());
        return systemPrompt.toString();
    }

    private String generateSessionId() {
        return UUID.randomUUID().toString();
    }
}

// LlmService.java (외부 서비스 예시)
// @Service
// public class LlmService {
//     public String llmCall(String systemPrompt, String userMessage) {
//         // 이 부분은 이미 구현되어 있다고 가정합니다.
//         // 실제 LLM API 호출 로직이 들어갑니다.
//         return "LLM의 응답입니다. 요청에 따라 테이블 형식으로도 응답할 수 있습니다. \n\n| 항목 | 내용 |\n|:---|:---|\n| 응답 | 정상 |\n| 상태 | 양호 |";
//     }
// }
