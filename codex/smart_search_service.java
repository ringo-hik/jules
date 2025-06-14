package com.example.aiagent.service;

import com.example.aiagent.mapper.SmartSearchMapper;
import com.example.aiagent.vo.SmartSearchVo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class SmartSearchService {

    private static final Logger log = LoggerFactory.getLogger(SmartSearchService.class);

    @Autowired
    private SmartSearchMapper smartSearchMapper;

    @Autowired
    private LlmService llmService;

    /**
     * 카테고리 목록 조회
     */
    public List<SmartSearchVo> getCategories() {
        log.info("카테고리 목록 조회 시작");
        return smartSearchMapper.selectCategories();
    }

    /**
     * 스마트 검색 처리 (메인 로직)
     */
    @Transactional
    public SmartSearchVo processSmartSearch(SmartSearchVo request) {
        log.info("스마트 검색 처리 시작 - categoryId: {}, userId: {}", request.getCategoryId(), request.getUserId());

        // 세션 ID 생성 또는 기존 사용
        String sessionId = request.getSessionId();
        if (sessionId == null || sessionId.isEmpty()) {
            sessionId = generateSessionId();
        }

        // 사용자 메시지 저장
        saveUserMessage(sessionId, request);

        // 카테고리별 컨텍스트 데이터 조회
        List<SmartSearchVo> contextData = getContextDataByCategory(request.getCategoryId());
        
        // 시스템 프롬프트 생성
        String systemPrompt = buildSystemPrompt(request.getCategoryId(), contextData);
        
        // LLM 호출 (기존 내부망 서비스 사용)
        String aiResponse = llmService.llmCall(systemPrompt, request.getMessage());

        // AI 응답 저장
        saveAiMessage(sessionId, request, aiResponse);

        // 세션 정보 업데이트
        updateChatSession(sessionId, request.getUserId(), request.getCategoryId());

        // 응답 생성
        SmartSearchVo response = new SmartSearchVo();
        response.setSessionId(sessionId);
        response.setMessage(aiResponse);
        response.setTimestamp(LocalDateTime.now());
        
        return response;
    }

    /**
     * 채팅 히스토리 조회
     */
    public List<SmartSearchVo> getChatHistory(String userId, Long categoryId, int page, int size) {
        log.info("채팅 히스토리 조회 - userId: {}, categoryId: {}", userId, categoryId);
        
        int offset = page * size;
        return smartSearchMapper.selectChatHistory(userId, categoryId, offset, size);
    }

    /**
     * 피드백 저장
     */
    @Transactional
    public void saveFeedback(SmartSearchVo request) {
        log.info("피드백 저장 - sessionId: {}, rating: {}", request.getSessionId(), request.getRating());
        
        SmartSearchVo feedback = new SmartSearchVo();
        feedback.setSessionId(request.getSessionId());
        feedback.setUserId(request.getUserId());
        feedback.setRating(request.getRating());
        feedback.setComment(request.getComment());
        feedback.setCreatedAt(LocalDateTime.now());
        
        smartSearchMapper.insertFeedback(feedback);
    }

    /**
     * 카테고리별 컨텍스트 데이터 조회
     */
    private List<SmartSearchVo> getContextDataByCategory(Long categoryId) {
        log.info("카테고리별 데이터 조회 - categoryId: {}", categoryId);
        return smartSearchMapper.selectContextDataByCategory(categoryId);
    }

    /**
     * 시스템 프롬프트 생성
     */
    private String buildSystemPrompt(Long categoryId, List<SmartSearchVo> contextData) {
        StringBuilder systemPrompt = new StringBuilder();
        
        // 카테고리 정보 조회
        SmartSearchVo category = smartSearchMapper.selectCategoryById(categoryId);
        
        systemPrompt.append("당신은 ").append(category.getName()).append(" 전문가입니다.\n");
        systemPrompt.append("설명: ").append(category.getDescription()).append("\n\n");
        
        // 프로젝트 검색 관련 컨텍스트 데이터 추가
        if (contextData != null && !contextData.isEmpty()) {
            systemPrompt.append("다음은 현재 시스템의 프로젝트 관련 정보입니다:\n");
            systemPrompt.append("=== 데이터베이스 정보 ===\n");
            for (SmartSearchVo data : contextData) {
                systemPrompt.append(data.getContent()).append("\n");
            }
            systemPrompt.append("\n");
        }
        
        systemPrompt.append("위 데이터를 기반으로 사용자의 질문에 대해 정확하고 도움이 되는 답변을 제공해주세요.\n");
        systemPrompt.append("답변 규칙:\n");
        systemPrompt.append("1. 한국어로 답변해주세요\n");
        systemPrompt.append("2. 구체적이고 실용적인 정보를 포함해주세요\n");
        systemPrompt.append("3. 프로젝트명, 프레임워크명, IMS 키, 테스트 요청 정보 등을 활용해주세요\n");
        systemPrompt.append("4. 답변 길이는 200-500자 정도로 적절히 조절해주세요\n");
        systemPrompt.append("5. 데이터에 없는 정보는 추측하지 말고 '해당 정보를 찾을 수 없습니다'라고 답변해주세요\n");
        
        return systemPrompt.toString();
    }

    /**
     * 사용자 메시지 저장
     */
    private void saveUserMessage(String sessionId, SmartSearchVo request) {
        SmartSearchVo userMessage = new SmartSearchVo();
        userMessage.setSessionId(sessionId);
        userMessage.setUserId(request.getUserId());
        userMessage.setCategoryId(request.getCategoryId());
        userMessage.setMessageType("USER");
        userMessage.setContent(request.getMessage());
        userMessage.setTimestamp(LocalDateTime.now());
        smartSearchMapper.insertChatMessage(userMessage);
    }

    /**
     * AI 응답 메시지 저장
     */
    private void saveAiMessage(String sessionId, SmartSearchVo request, String aiResponse) {
        SmartSearchVo aiMessage = new SmartSearchVo();
        aiMessage.setSessionId(sessionId);
        aiMessage.setUserId(request.getUserId());
        aiMessage.setCategoryId(request.getCategoryId());
        aiMessage.setMessageType("AI");
        aiMessage.setContent(aiResponse);
        aiMessage.setTimestamp(LocalDateTime.now());
        smartSearchMapper.insertChatMessage(aiMessage);
    }

    /**
     * 세션 정보 업데이트
     */
    private void updateChatSession(String sessionId, String userId, Long categoryId) {
        SmartSearchVo session = new SmartSearchVo();
        session.setSessionId(sessionId);
        session.setUserId(userId);
        session.setCategoryId(categoryId);
        session.setLastMessageAt(LocalDateTime.now());
        
        if (smartSearchMapper.existsSession(sessionId)) {
            smartSearchMapper.updateChatSession(session);
        } else {
            session.setCreatedAt(LocalDateTime.now());
            smartSearchMapper.insertChatSession(session);
        }
    }

    /**
     * 세션 ID 생성
     */
    private String generateSessionId() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}