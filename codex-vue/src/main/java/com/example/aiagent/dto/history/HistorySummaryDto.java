package com.example.aiagent.dto.history;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 채팅 히스토리 목록 조회를 위한 DTO
 */
@Data
public class HistorySummaryDto {
    private String sessionId;
    private String categoryName;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private Integer messageCount;
}
