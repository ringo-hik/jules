<template>
  <div class="history-tab">
    <div class="history-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>히스토리를 불러오는 중...</p>
      </div>

      <!-- History List -->
      <div v-else-if="history && history.length > 0" class="history-list">
        <div 
          v-for="item in history" 
          :key="item.sessionId"
          class="history-item"
          @click="viewHistoryDetail(item)"
        >
          <div class="history-header">
            <span class="category-name">{{ item.categoryName }}</span>
            <span class="message-count">{{ item.messageCount }}개 메시지</span>
          </div>
          <p class="last-message">{{ item.lastMessage }}</p>
          <div class="history-time">{{ formatRelativeTime(item.lastMessageAt) }}</div>
        </div>
      </div>

      <!-- Empty History -->
      <div v-else class="empty-history">
        <div class="empty-icon">📂</div>
        <h3>아직 대화 히스토리가 없습니다</h3>
        <p>질문하기 탭에서 AI와 대화를 시작해보세요!</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HistoryTab',
  props: {
    history: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['view-detail'],
  methods: {
    viewHistoryDetail(item) {
      this.$emit('view-detail', item);
    },
    formatRelativeTime(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const now = new Date();
      const diffSeconds = Math.round((now - date) / 1000);
      const diffMinutes = Math.round(diffSeconds / 60);
      const diffHours = Math.round(diffMinutes / 60);
      const diffDays = Math.round(diffHours / 24);

      if (diffSeconds < 60) return '방금 전';
      if (diffMinutes < 60) return `${diffMinutes}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      if (diffDays < 7) return `${diffDays}일 전`;
      return date.toLocaleDateString('ko-KR');
    }
  }
}
</script>

<style lang="scss" scoped>
/* Component-specific styles for HistoryTab */
.history-tab {
  height: 100%; display: flex; flex-direction: column;
}
.history-content {
  flex: 1; padding: 20px; overflow-y: auto; background-color: #f9f9f9;
}
.history-item {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  padding: 16px; margin-bottom: 12px; cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    border-color: #0052cc; box-shadow: 0 4px 12px rgba(0, 82, 204, 0.1);
    transform: translateY(-2px);
  }
  .history-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 8px;
    .category-name { font-weight: 600; color: #0052cc; font-size: 14px; }
    .message-count { font-size: 12px; color: #888; }
  }
  .last-message {
    font-size: 14px; color: #3f3f3f; margin-bottom: 10px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; text-overflow: ellipsis; height: 42px; /* 2 lines */
  }
  .history-time { font-size: 12px; color: #aaa; text-align: right; }
}
.empty-history {
  text-align: center; padding: 60px 20px; color: #888;
  .empty-icon { font-size: 48px; margin-bottom: 16px; }
  h3 { font-size: 16px; margin-bottom: 8px; color: #555; }
  p { font-size: 14px; }
}
.loading-state { /* ... */ }
</style>
