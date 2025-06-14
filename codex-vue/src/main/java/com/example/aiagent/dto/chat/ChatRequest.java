package com.example.aiagent.dto.chat;

import lombok.Data;

import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * AI 채팅 요청을 위한 DTO
 */
@Data
public class ChatRequest {
    @NotNull(message = "카테고리 ID는 필수입니다.")
    private Long categoryId;

    @NotEmpty(message = "메시지는 필수입니다.")
    @Size(max = 1000, message = "메시지는 1000자를 초과할 수 없습니다.")
    private String message;

    @NotEmpty(message = "사용자 ID는 필수입니다.")
    private String userId;

    private String sessionId; // 기존 세션에 이어서 대화할 경우 사용
}

/**
 * AI 채팅 응답을 위한 DTO
 */
@Data
public class ChatResponse {
    private String sessionId;
    private String aiMessage;
    private LocalDateTime timestamp;
}
