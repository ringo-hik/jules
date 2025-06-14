package com.example.aiagent.controller;

import com.example.aiagent.service.SmartSearchService;
import com.example.aiagent.vo.SmartSearchVo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/devportal/ai-agent/smart-search")
@CrossOrigin(origins = "*")
public class SmartSearchController {

    private static final Logger log = LoggerFactory.getLogger(SmartSearchController.class);

    @Autowired
    private SmartSearchService smartSearchService;

    /**
     * 카테고리 목록 조회
     */
    @GetMapping("/categories")
    public ResponseEntity<SmartSearchVo> getCategories() {
        try {
            log.info("카테고리 목록 조회 시작");
            List<SmartSearchVo> categories = smartSearchService.getCategories();
            
            SmartSearchVo response = new SmartSearchVo();
            response.setSuccess(true);
            response.setData(categories);
            response.setMessage("카테고리 조회 성공");
            response.setTimestamp(LocalDateTime.now());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("카테고리 조회 실패", e);
            return createErrorResponse("카테고리 조회에 실패했습니다.");
        }
    }

    /**
     * AI 스마트 검색 채팅
     */
    @PostMapping("/chat")
    public ResponseEntity<SmartSearchVo> chat(@RequestBody SmartSearchVo request) {
        try {
            log.info("채팅 요청 처리 시작 - categoryId: {}", request.getCategoryId());
            
            // getUserId()를 통해 사용자 정보 설정
            String userId = getUserId();
            request.setUserId(userId);
            
            SmartSearchVo response = smartSearchService.processSmartSearch(request);
            response.setSuccess(true);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("채팅 처리 실패", e);
            return createErrorResponse("채팅 처리에 실패했습니다.");
        }
    }

    /**
     * 채팅 히스토리 조회
     */
    @GetMapping("/history")
    public ResponseEntity<SmartSearchVo> getHistory(@RequestParam(required = false) Long categoryId,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        try {
            String userId = getUserId();
            log.info("히스토리 조회 시작 - userId: {}, categoryId: {}", userId, categoryId);
            
            List<SmartSearchVo> history = smartSearchService.getChatHistory(userId, categoryId, page, size);
            
            SmartSearchVo response = new SmartSearchVo();
            response.setSuccess(true);
            response.setData(history);
            response.setMessage("히스토리 조회 성공");
            response.setTimestamp(LocalDateTime.now());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("히스토리 조회 실패", e);
            return createErrorResponse("히스토리 조회에 실패했습니다.");
        }
    }

    /**
     * 피드백 저장
     */
    @PostMapping("/feedback")
    public ResponseEntity<SmartSearchVo> sendFeedback(@RequestBody SmartSearchVo request) {
        try {
            String userId = getUserId();
            request.setUserId(userId);
            
            log.info("피드백 저장 시작 - sessionId: {}, rating: {}", request.getSessionId(), request.getRating());
            
            smartSearchService.saveFeedback(request);
            
            SmartSearchVo response = new SmartSearchVo();
            response.setSuccess(true);
            response.setMessage("피드백이 성공적으로 저장되었습니다.");
            response.setTimestamp(LocalDateTime.now());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("피드백 저장 실패", e);
            return createErrorResponse("피드백 저장에 실패했습니다.");
        }
    }

    /**
     * 헬스체크
     */
    @GetMapping("/health")
    public ResponseEntity<SmartSearchVo> healthCheck() {
        SmartSearchVo response = new SmartSearchVo();
        response.setSuccess(true);
        response.setMessage("서비스가 정상적으로 동작중입니다.");
        response.setTimestamp(LocalDateTime.now());
        return ResponseEntity.ok(response);
    }

    /**
     * 사용자 ID 조회 (실제 환경에서는 보안 컨텍스트에서 가져옴)
     */
    private String getUserId() {
        // TODO: 실제 환경에서는 SecurityContext 또는 세션에서 사용자 정보 가져오기
        // return SecurityContextHolder.getContext().getAuthentication().getName();
        return "user123"; // 개발용 임시 사용자 ID
    }

    /**
     * 에러 응답 생성
     */
    private ResponseEntity<SmartSearchVo> createErrorResponse(String errorMessage) {
        SmartSearchVo response = new SmartSearchVo();
        response.setSuccess(false);
        response.setErrorMessage(errorMessage);
        response.setTimestamp(LocalDateTime.now());
        return ResponseEntity.badRequest().body(response);
    }
}