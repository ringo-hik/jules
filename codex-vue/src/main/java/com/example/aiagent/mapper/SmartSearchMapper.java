package com.example.aiagent.mapper;

import com.example.aiagent.domain.ChatMessage;
import com.example.aiagent.domain.ChatSession;
import com.example.aiagent.domain.ContextData;
import com.example.aiagent.dto.category.CategoryDto;
import com.example.aiagent.dto.feedback.FeedbackRequest;
import com.example.aiagent.dto.history.HistorySummaryDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SmartSearchMapper {

    // SELECT
    List<CategoryDto> selectActiveCategories();
    CategoryDto selectCategoryById(@Param("categoryId") Long categoryId);
    List<ContextData> selectContextDataByCategoryId(@Param("categoryId") Long categoryId);
    List<HistorySummaryDto> selectChatHistory(@Param("userId") String userId,
                                              @Param("categoryId") Long categoryId,
                                              @Param("offset") int offset,
                                              @Param("size") int size);
    boolean existsSession(@Param("sessionId") String sessionId);

    // INSERT
    int insertChatMessage(ChatMessage message);
    int insertChatSession(ChatSession session);
    int insertFeedback(FeedbackRequest feedback);

    // UPDATE
    int updateChatSession(ChatSession session);
}
