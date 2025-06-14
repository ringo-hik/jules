<template>
  <div class="floating-chatbot">
    <!-- Chatbot Toggle Button -->
    <div v-if="!isOpen" class="chatbot-button" @click="openChatWindow">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"></path></svg>
    </div>

    <!-- Chatbot Window -->
    <transition name="slide-up">
      <div v-if="isOpen" class="chatbot-window">
        <!-- Header -->
        <div class="chatbot-header">
          <div class="header-content">
            <span class="title">DevOps Assistant</span>
            <div class="status-indicator"></div>
          </div>
          <button class="close-button" @click="isOpen = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Tab Menu -->
        <div class="tab-menu">
          <button :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">질문하기</button>
          <button :class="{ active: activeTab === 'history' }" @click="switchToHistoryTab">히스토리</button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <ChatTab
            v-show="activeTab === 'chat'"
            ref="chatTab"
            :categories="categories"
            :loading-categories="loadingCategories"
            @message-sent="handleMessageSent"
            @reset-category="handleResetCategory"
          />
          <HistoryTab
            v-if="activeTab === 'history'"
            :history="chatHistory"
            :loading="loadingHistory"
            @view-detail="handleHistoryDetail"
          />
        </div>
      </div>
    </transition>

    <!-- Toast Notifications -->
    <Toast ref="toast" />
  </div>
</template>

<script>
import aiAgentService from '../services/aiAgentService';
import ChatTab from './ChatTab.vue';
import HistoryTab from './HistoryTab.vue';
import Toast from './Toast.vue';

export default {
  name: 'FloatChatLayout',
  components: { ChatTab, HistoryTab, Toast },
  data() {
    return {
      isOpen: false,
      activeTab: 'chat',
      categories: [],
      loadingCategories: false,
      chatHistory: [],
      loadingHistory: false,
      isHistoryLoaded: false,
      // In a real app, this would come from an auth service
      currentUser: { id: 'user123' } 
    };
  },
  methods: {
    async openChatWindow() {
      this.isOpen = true;
      if (this.categories.length === 0) {
        await this.loadCategories();
      }
    },
    async loadCategories() {
      this.loadingCategories = true;
      try {
        this.categories = await aiAgentService.getCategories();
      } catch (error) {
        this.showToast('error', '카테고리 로딩 실패', error.message);
      } finally {
        this.loadingCategories = false;
      }
    },
    async loadHistory() {
      this.loadingHistory = true;
      try {
        this.chatHistory = await aiAgentService.getHistory({ userId: this.currentUser.id });
        this.isHistoryLoaded = true;
      } catch (error) {
        this.showToast('error', '히스토리 로딩 실패', error.message);
      } finally {
        this.loadingHistory = false;
      }
    },
    switchToHistoryTab() {
      this.activeTab = 'history';
      if (!this.isHistoryLoaded) {
        this.loadHistory();
      }
    },
    async handleMessageSent(data) {
      try {
        const response = await aiAgentService.aiSmartSearch({
          ...data,
          userId: this.currentUser.id
        });
        this.$refs.chatTab.addAiResponse(response);
        // If a new conversation starts, history becomes stale
        this.isHistoryLoaded = false; 
      } catch (error) {
        this.$refs.chatTab.showError(error.message);
        this.showToast('error', 'AI 응답 실패', error.message);
      }
    },
    handleResetCategory() {
      // Logic when user goes back to category selection
    },
    handleHistoryDetail(historyItem) {
      this.activeTab = 'chat';
      // Use $nextTick to ensure chatTab is visible before calling its method
      this.$nextTick(() => {
        this.$refs.chatTab.loadFromHistory(historyItem);
      });
    },
    showToast(type, title, message) {
      this.$refs.toast.show({ type, title, message });
    }
  }
};
</script>

<style lang="scss" scoped>
/* Component-specific styles for FloatChatLayout */
.floating-chatbot {
  position: fixed; bottom: 24px; right: 24px;
  z-index: 1000; font-family: inherit;
}
.chatbot-button {
  width: 60px; height: 60px; background: #0052cc;
  border-radius: 50%; cursor: pointer; display: flex;
  align-items: center; justify-content: center; color: #fff;
  box-shadow: 0 4px 16px rgba(0, 82, 204, 0.25);
  transition: all 0.3s ease;
  &:hover { transform: translateY(-2px) scale(1.05); }
}
.chatbot-window {
  width: 400px; height: 620px; background: #fff;
  border-radius: 16px; box-shadow: 0 12px 48px rgba(0,0,0,0.15);
  border: 1px solid #e0e0e0; display: flex; flex-direction: column;
  overflow: hidden;
}
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0; transform: translateY(20px);
}

/* Header */
.chatbot-header {
  padding: 16px 20px; border-bottom: 1px solid #e0e0e0;
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; flex-shrink: 0;
  .header-content { /* ... */ }
  .close-button { /* ... */ }
}
/* Tab Menu */
.tab-menu {
  display: flex; background: #fff; border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  button {
    flex: 1; padding: 14px 16px; border: none; background: none;
    color: #666; font-size: 14px; font-weight: 500; cursor: pointer;
    transition: all 0.2s ease; border-bottom: 3px solid transparent;
    &.active { color: #0052cc; border-bottom-color: #0052cc; }
    &:hover:not(.active) { background: #f8f8f8; color: #333; }
  }
}
.tab-content {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
}

@media (max-width: 480px) {
  /* Responsive styles */
}
</style>
