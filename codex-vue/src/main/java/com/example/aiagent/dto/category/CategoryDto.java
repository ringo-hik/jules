package com.example.aiagent.dto.category;

import lombok.Data;

/**
 * 카테고리 정보 전송을 위한 DTO
 */
@Data
public class CategoryDto {
    private Long categoryId;
    private String name;
    private String description;
    private String icon;
    private Integer sortOrder;
}
