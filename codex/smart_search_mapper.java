package com.example.aiagent.mapper;

import com.example.aiagent.vo.SmartSearchVo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SmartSearchMapper {

    /**
     * 카테고리 목록 조회
     */
    List<SmartSearchVo> selectCategories();

    /**
     * 카테고리 상세 조회
     */
    SmartSearchVo selectCategoryById(@Param("categoryId") Long categoryId);

    /**
     * 카테고리별 컨텍스트 데이터 조회
     */
    List<SmartSearchVo> selectContextDataByCategory(@Param("categoryId") Long categoryId);

    /**
     * 채팅 메시지 저장
     */
    int insertChatMessage(SmartSearchVo message);

    /**
     * 채팅 히스토리 조회
     */
    List<SmartSearchVo> selectChatHistory(@Param("userId") String userId,
                                         @Param("categoryId") Long categoryId,
                                         @Param("offset") int offset,
                                         @Param("size") int size);

    /**
     * 세션 존재 여부 확인
     */
    boolean existsSession(@Param("sessionId") String sessionId);

    /**
     * 채팅 세션 생성
     */
    int insertChatSession(SmartSearchVo session);

    /**
     * 채팅 세션 업데이트
     */
    int updateChatSession(SmartSearchVo session);

    /**
     * 피드백 저장
     */
    int insertFeedback(SmartSearchVo feedback);
}