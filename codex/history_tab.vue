<template>
  <div class="history-tab">
    <!-- 히스토리 헤더 -->
    <div class="history-header">
      <h3 class="section-title">대화 히스토리</h3>
    </div>

    <!-- 히스토리 콘텐츠 -->
    <div class="history-content">
      <!-- 로딩 상태 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>히스토리를 불러오는 중...</p>
      </div>

      <!-- 히스토리 목록 -->
      <div v-else-if="history && history.length > 0" class="history-list">
        <div 
          v-for="item in history" 
          :key="item.sessionId"
          class="history-item"
          @click="selectHistoryItem(item)"
        >
          <div class="history-item-header">
            <span class="category-name">{{ item.categoryName }}</span>
            <span class="message-count">{{ item.messageCount }}개 메시지</span>
          </div>
          <div class="last-message">{{ item.lastMessage }}</div>
          <div class="history-time">
            {{ formatDate(item.lastMessageAt) }}
          </div>
        </div>
      </div>

      <!-- 빈 히스토리 -->
      <div v-else class="empty-history">
        <div class="empty-icon">💬</div>
        <h3>아직 대화 히스토리가 없습니다</h3>
        <p>질문하기 탭에서 AI와 대화를 시작해보세요!</p>
      </div>
    </div>

    <!-- 히스토리 하단 버튼 -->
    <div v-if="history && history.length > 0" class="history-footer">
      <button 
        class="refresh-btn"
        @click="refreshHistory"
        :disabled="loading"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        새로고침
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HistoryTab',
  props: {
    history: {
      type: Array,
      default: function() {
        return [];
      }
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  
  methods: {
    selectHistoryItem: function(item) {
      this.$emit('view-detail', item);
    },
    
    refreshHistory: function() {
      this.$emit('load-history');
    },
    
    formatDate: function(dateString) {
      var date = new Date(dateString);
      var now = new Date();
      var diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        return '방금 전';
      } else if (diffInHours < 24) {
        return diffInHours + '시간 전';
      } else if (diffInHours < 24 * 7) {
        var diffInDays = Math.floor(diffInHours / 24);
        return diffInDays + '일 전';
      } else {
        return date.toLocaleDateString('ko-KR', {
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
  },
  
  mounted: function() {
    // 컴포넌트가 마운트되면 히스토리 로드
    this.$emit('load-history');
  }
};
</script>