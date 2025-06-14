<template>
  <div class="floating-chatbot">
    <!-- 챗봇 버튼 -->
    <div 
      v-if="!isOpen" 
      class="chatbot-button" 
      @click="toggleChat"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <!-- 챗봇 창 -->
    <div v-if="isOpen" class="chatbot-window">
      <!-- 헤더 -->
      <div class="chatbot-header">
        <div class="header-content">
          <span class="title">DevOps Smart Search</span>
          <div class="status-indicator"></div>
        </div>
        <button class="close-button" @click="toggleChat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- 탭 메뉴 -->
      <div class="tab-menu">
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'chat' }" 
          @click="activeTab = 'chat'"
        >
          질문하기
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'history' }" 
          @click="switchToHistory"
        >
          히스토리
        </button>
      </div>

      <!-- 질문하기 탭 -->
      <ChatTab 
        v-if="activeTab === 'chat'"
        ref="chatTab"
        :categories="categories"
        :loading-categories="loadingCategories"
        @category-selected="handleCategorySelected"
        @message-sent="handleMessageSent"
        @reset-category="handleResetCategory"
      />

      <!-- 히스토리 탭 -->
      <HistoryTab 
        v-if="activeTab === 'history'"
        :history="chatHistory"
        :loading="loadingHistory"
        @load-history="loadHistory"
        @view-detail="handleHistoryDetail"
      />
    </div>

    <!-- 토스트 알림 -->
    <Toast ref="toast" />
  </div>
</template>

<script>
import aiAgentService from '../service/aiAgentService';
import ChatTab from './ChatTab.vue';
import HistoryTab from './HistoryTab.vue';
import Toast from './Toast.vue';

export default {
  name: 'FloatChatLayout',
  components: {
    ChatTab: ChatTab,
    HistoryTab: HistoryTab,
    Toast: Toast
  },
  data: function() {
    return {
      isOpen: false,
      activeTab: 'chat',
      categories: [],
      loadingCategories: false,
      chatHistory: [],
      loadingHistory: false
    };
  },
  
  methods: {
    toggleChat: function() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.loadCategories();
      }
    },
    
    loadCategories: function() {
      var self = this;
      if (self.categories.length > 0) return;
      
      self.loadingCategories = true;
      aiAgentService.getCategories()
        .then(function(response) {
          if (response.success) {
            self.categories = response.data || [];
          } else {
            self.showError('카테고리 로딩 실패', response.error);
          }
        })
        .catch(function(error) {
          console.error('Failed to load categories:', error);
          self.showError('카테고리 로딩 실패', '카테고리를 불러오는데 실패했습니다.');
        })
        .finally(function() {
          self.loadingCategories = false;
        });
    },
    
    loadHistory: function() {
      var self = this;
      self.loadingHistory = true;
      
      aiAgentService.getHistory({
        page: 0,
        size: 50
      })
        .then(function(response) {
          if (response.success) {
            self.chatHistory = response.data || [];
          } else {
            self.showError('히스토리 로딩 실패', response.error);
          }
        })
        .catch(function(error) {
          console.error('Failed to load history:', error);
          self.showError('히스토리 로딩 실패', '히스토리를 불러오는데 실패했습니다.');
        })
        .finally(function() {
          self.loadingHistory = false;
        });
    },
    
    switchToHistory: function() {
      this.activeTab = 'history';
      this.loadHistory();
    },
    
    handleCategorySelected: function(category) {
      console.log('Category selected:', category);
    },
    
    handleMessageSent: function(data) {
      var self = this;
      var categoryId = data.categoryId;
      var message = data.message;
      var sessionId = data.sessionId;
      
      aiAgentService.aiSmartSearch({
        categoryId: categoryId,
        message: message,
        sessionId: sessionId
      })
        .then(function(response) {
          if (response.success) {
            self.$refs.chatTab.addAiResponse(response.data);
          } else {
            self.$refs.chatTab.addAiResponse('죄송합니다. 응답 생성 중 오류가 발생했습니다.');
            self.showError('AI 응답 실패', response.error);
          }
        })
        .catch(function(error) {
          console.error('Chat error:', error);
          self.$refs.chatTab.addAiResponse('일시적인 오류가 발생했습니다. 다시 시도해주세요.');
          self.showError('통신 오류', '서버와의 통신 중 오류가 발생했습니다.');
        });
    },
    
    handleResetCategory: function() {
      console.log('Category reset');
    },
    
    handleHistoryDetail: function(item) {
      this.activeTab = 'chat';
      // 히스토리 상세를 채팅 탭에서 불러오는 로직 추가 가능
    },
    
    showError: function(title, message) {
      this.$refs.toast.show({
        type: 'error',
        title: title,
        message: message
      });
    },
    
    showSuccess: function(title, message) {
      this.$refs.toast.show({
        type: 'success',
        title: title,
        message: message
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import './smartSearch.scss';
</style>