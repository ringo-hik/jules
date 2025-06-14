package com.example.aiagent.controller;

import com.example.aiagent.dto.category.CategoryDto;
import com.example.aiagent.dto.chat.ChatRequest;
import com.example.aiagent.dto.chat.ChatResponse;
import com.example.aiagent.dto.feedback.FeedbackRequest;
import com.example.aiagent.dto.history.HistorySummaryDto;
import com.example.aiagent.service.SmartSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/devportal/ai-agent/smart-search")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*") // 실제 운영 환경에서는 특정 도메인만 허용하도록 변경
public class SmartSearchController {

    private final SmartSearchService smartSearchService;

    /**
     * 사용 가능한 모든 카테고리 목록을 조회합니다.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<CategoryDto>> getCategories() {
        log.info("✅ GET /categories - Received request for categories.");
        List<CategoryDto> categories = smartSearchService.getCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * AI와 채팅을 수행합니다.
     */
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        log.info("✅ POST /chat - Received chat request for categoryId: {}", request.getCategoryId());
        ChatResponse response = smartSearchService.processSmartSearch(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 사용자의 채팅 히스토리 목록을 조회합니다.
     */
    @GetMapping("/history")
    public ResponseEntity<List<HistorySummaryDto>> getHistory(@RequestParam String userId,
                                                              @RequestParam(required = false) Long categoryId,
                                                              @RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "20") int size) {
        log.info("✅ GET /history - Received history request for userId: {}", userId);
        List<HistorySummaryDto> history = smartSearchService.getChatHistory(userId, categoryId, page, size);
        return ResponseEntity.ok(history);
    }

    /**
     * 채팅 결과에 대한 피드백을 전송합니다.
     */
    @PostMapping("/feedback")
    public ResponseEntity<Void> sendFeedback(@Valid @RequestBody FeedbackRequest request) {
        log.info("✅ POST /feedback - Received feedback for sessionId: {}", request.getSessionId());
        smartSearchService.saveFeedback(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
