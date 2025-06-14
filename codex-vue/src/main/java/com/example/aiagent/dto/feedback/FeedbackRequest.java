package com.example.aiagent.dto.feedback;

import lombok.Data;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 * 피드백 전송을 위한 DTO
 */
@Data
public class FeedbackRequest {
    @NotEmpty(message = "세션 ID는 필수입니다.")
    private String sessionId;

    @NotEmpty(message = "사용자 ID는 필수입니다.")
    private String userId;

    @NotNull(message = "평점은 필수입니다.")
    @Min(value = 1, message = "평점은 1 이상이어야 합니다.")
    @Max(value = 5, message = "평점은 5 이하여야 합니다.")
    private Integer rating;

    @Size(max = 500, message = "코멘트는 500자를 초과할 수 없습니다.")
    private String comment;

    private Long messageId;
}
