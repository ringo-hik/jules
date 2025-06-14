package com.example.aiagent.service;

import com.example.aiagent.mapper.SmartSearchMapper;
import com.example.aiagent.vo.SmartSearchVo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * LLM을 이용한 카테고리 자동 분류 서비스
 * 사용자의 질문을 분석하여 적절한 카테고리를 자동으로 선택
 * 
 * 사용법:
 * 1. CategoryDetectionService.detectCategory(userMessage) 호출
 * 2. 적절한 카테고리 ID 반환
 * 3. 해당 카테고리로 스마트 검색 진행
 */
@Service
public class CategoryDetectionService {

    private static final Logger log = LoggerFactory.getLogger(CategoryDetectionService.class);

    @Autowired
    private SmartSearchMapper smartSearchMapper;

    @Autowired
    private LlmService llmService;

    /**
     * 사용자 메시지를 분석하여 적절한 카테고리 감지
     * 
     * @param userMessage 사용자 입력 메시지
     * @return 감지된 카테고리 ID (null이면 감지 실패)
     */
    public Long detectCategory(String userMessage) {
        log.info("카테고리 자동 감지 시작 - message: {}", userMessage);

        try {
            // 1단계: 사용 가능한 카테고리 목록 조회
            List<SmartSearchVo> categories = smartSearchMapper.selectCategories();
            if (categories == null || categories.isEmpty()) {
                log.warn("사용 가능한 카테고리가 없습니다.");
                return null;
            }

            // 2단계: 카테고리 분류 프롬프트 생성
            String classificationPrompt = buildClassificationPrompt(categories, userMessage);

            // 3단계: LLM 호출로 카테고리 분류
            String llmResponse = llmService.llmCall(classificationPrompt, userMessage);

            // 4단계: LLM 응답에서 카테고리 ID 추출
            Long detectedCategoryId = extractCategoryId(llmResponse, categories);

            if (detectedCategoryId != null) {
                log.info("카테고리 자동 감지 성공 - categoryId: {}", detectedCategoryId);
            } else {
                log.warn("카테고리 자동 감지 실패 - LLM 응답을 파싱할 수 없습니다: {}", llmResponse);
            }

            return detectedCategoryId;

        } catch (Exception e) {
            log.error("카테고리 자동 감지 중 오류 발생", e);
            return null;
        }
    }

    /**
     * 다중 시도로 카테고리 감지 (정확도 향상)
     * 
     * @param userMessage 사용자 입력 메시지
     * @param maxAttempts 최대 시도 횟수
     * @return 감지된 카테고리 ID
     */
    public Long detectCategoryWithRetry(String userMessage, int maxAttempts) {
        log.info("다중 시도 카테고리 감지 시작 - message: {}, maxAttempts: {}", userMessage, maxAttempts);

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            log.debug("카테고리 감지 시도 {}/{}", attempt, maxAttempts);
            
            Long categoryId = detectCategory(userMessage);
            if (categoryId != null) {
                log.info("카테고리 감지 성공 (시도 {}/{})", attempt, maxAttempts);
                return categoryId;
            }
            
            // 실패 시 잠시 대기 (LLM 호출 간격 조절)
            if (attempt < maxAttempts) {
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        log.warn("모든 시도 후 카테고리 감지 실패");
        return null;
    }

    /**
     * 카테고리 분류를 위한 시스템 프롬프트 생성
     */
    private String buildClassificationPrompt(List<SmartSearchVo> categories, String userMessage) {
        StringBuilder prompt = new StringBuilder();
        
        prompt.append("당신은 사용자의 질문을 분석하여 적절한 카테고리를 선택하는 전문가입니다.\n\n");
        
        prompt.append("사용 가능한 카테고리 목록:\n");
        for (SmartSearchVo category : categories) {
            prompt.append("- ID: ").append(category.getCategoryId())
                  .append(", 이름: ").append(category.getName())
                  .append(", 설명: ").append(category.getDescription()).append("\n");
        }
        
        prompt.append("\n사용자 질문: \"").append(userMessage).append("\"\n\n");
        
        prompt.append("위 질문에 가장 적합한 카테고리의 ID만 숫자로 답변해주세요.\n");
        prompt.append("예시: 1 또는 2 또는 3\n");
        prompt.append("만약 적절한 카테고리를 찾을 수 없다면 'NONE'이라고 답변해주세요.\n");
        prompt.append("다른 설명 없이 ID 숫자 또는 NONE만 답변해주세요.");
        
        return prompt.toString();
    }

    /**
     * LLM 응답에서 카테고리 ID 추출
     */
    private Long extractCategoryId(String llmResponse, List<SmartSearchVo> categories) {
        if (llmResponse == null || llmResponse.trim().isEmpty()) {
            return null;
        }

        String response = llmResponse.trim().toUpperCase();
        
        // NONE 응답 처리
        if (response.contains("NONE")) {
            return null;
        }

        // 숫자 추출 시도
        try {
            // 응답에서 첫 번째 숫자 추출
            String numberOnly = response.replaceAll("[^0-9]", "");
            if (!numberOnly.isEmpty()) {
                Long categoryId = Long.parseLong(numberOnly);
                
                // 유효한 카테고리 ID인지 확인
                boolean isValid = categories.stream()
                    .anyMatch(category -> category.getCategoryId().equals(categoryId));
                
                if (isValid) {
                    return categoryId;
                }
            }
        } catch (NumberFormatException e) {
            log.debug("숫자 파싱 실패: {}", llmResponse);
        }

        // 카테고리 이름으로 매칭 시도
        for (SmartSearchVo category : categories) {
            if (response.contains(category.getName().toUpperCase())) {
                return category.getCategoryId();
            }
        }

        return null;
    }

    /**
     * 카테고리 감지 신뢰도 평가
     * 
     * @param userMessage 사용자 메시지
     * @param categoryId 감지된 카테고리 ID
     * @return 신뢰도 점수 (0.0 ~ 1.0)
     */
    public double evaluateConfidence(String userMessage, Long categoryId) {
        try {
            SmartSearchVo category = smartSearchMapper.selectCategoryById(categoryId);
            if (category == null) {
                return 0.0;
            }

            String evaluationPrompt = buildConfidenceEvaluationPrompt(userMessage, category);
            String llmResponse = llmService.llmCall(evaluationPrompt, userMessage);
            
            return parseConfidenceScore(llmResponse);
            
        } catch (Exception e) {
            log.error("신뢰도 평가 중 오류 발생", e);
            return 0.5; // 기본값
        }
    }

    /**
     * 신뢰도 평가를 위한 프롬프트 생성
     */
    private String buildConfidenceEvaluationPrompt(String userMessage, SmartSearchVo category) {
        StringBuilder prompt = new StringBuilder();
        
        prompt.append("사용자 질문과 선택된 카테고리의 적합성을 0~100 점수로 평가해주세요.\n\n");
        prompt.append("사용자 질문: \"").append(userMessage).append("\"\n");
        prompt.append("선택된 카테고리: ").append(category.getName()).append("\n");
        prompt.append("카테고리 설명: ").append(category.getDescription()).append("\n\n");
        prompt.append("평가 기준:\n");
        prompt.append("- 90-100: 매우 적합 (질문이 카테고리와 완벽히 일치)\n");
        prompt.append("- 70-89: 적합 (질문이 카테고리와 잘 일치)\n");
        prompt.append("- 50-69: 보통 (일부 일치하지만 애매함)\n");
        prompt.append("- 30-49: 부적합 (질문과 카테고리가 잘 맞지 않음)\n");
        prompt.append("- 0-29: 매우 부적합 (전혀 관련 없음)\n\n");
        prompt.append("점수만 숫자로 답변해주세요. 예: 85");
        
        return prompt.toString();
    }

    /**
     * LLM 응답에서 신뢰도 점수 파싱
     */
    private double parseConfidenceScore(String llmResponse) {
        if (llmResponse == null || llmResponse.trim().isEmpty()) {
            return 0.5;
        }

        try {
            String numberOnly = llmResponse.trim().replaceAll("[^0-9]", "");
            if (!numberOnly.isEmpty()) {
                int score = Integer.parseInt(numberOnly);
                // 0-100 범위를 0.0-1.0 범위로 변환
                return Math.max(0.0, Math.min(1.0, score / 100.0));
            }
        } catch (NumberFormatException e) {
            log.debug("신뢰도 점수 파싱 실패: {}", llmResponse);
        }

        return 0.5; // 기본값
    }

    /**
     * 사용자 메시지에서 키워드 추출
     */
    public List<String> extractKeywords(String userMessage) {
        log.info("키워드 추출 시작 - message: {}", userMessage);

        try {
            String keywordPrompt = buildKeywordExtractionPrompt(userMessage);
            String llmResponse = llmService.llmCall(keywordPrompt, userMessage);
            
            return parseKeywords(llmResponse);
            
        } catch (Exception e) {
            log.error("키워드 추출 중 오류 발생", e);
            return java.util.Arrays.asList(); // 빈 리스트 반환
        }
    }

    /**
     * 키워드 추출을 위한 프롬프트 생성
     */
    private String buildKeywordExtractionPrompt(String userMessage) {
        StringBuilder prompt = new StringBuilder();
        
        prompt.append("다음 질문에서 핵심 키워드들을 추출해주세요.\n\n");
        prompt.append("질문: \"").append(userMessage).append("\"\n\n");
        prompt.append("추출 규칙:\n");
        prompt.append("- 프로젝트명, 기술명, 도구명 등 고유명사 우선\n");
        prompt.append("- 동작이나 문제를 나타내는 동사나 명사\n");
        prompt.append("- 3-7개의 핵심 키워드만 추출\n");
        prompt.append("- 쉼표로 구분하여 나열\n\n");
        prompt.append("예시: 프로젝트, 배포, 오류, Jenkins, Docker\n");
        prompt.append("키워드만 답변해주세요:");
        
        return prompt.toString();
    }

    /**
     * LLM 응답에서 키워드 파싱
     */
    private List<String> parseKeywords(String llmResponse) {
        if (llmResponse == null || llmResponse.trim().isEmpty()) {
            return java.util.Arrays.asList();
        }

        String[] keywords = llmResponse.trim().split("[,，]");
        java.util.List<String> result = new java.util.ArrayList<>();
        
        for (String keyword : keywords) {
            String trimmed = keyword.trim();
            if (!trimmed.isEmpty() && trimmed.length() > 1) {
                result.add(trimmed);
            }
        }
        
        return result;
    }
}