<template>
  <div class="chat-tab">
    <!-- 카테고리 선택 화면 -->
    <div v-if="!selectedCategory" class="category-selection">
      <h3 class="section-title">어떤 도움이 필요하신가요?</h3>
      
      <!-- 로딩 상태 -->
      <div v-if="loadingCategories" class="loading-state">
        <div class="loading-spinner"></div>
        <p>카테고리를 불러오는 중...</p>
      </div>
      
      <!-- 카테고리 그리드 -->
      <div v-else class="category-grid">
        <div 
          v-for="category in categories" 
          :key="category.categoryId"
          class="category-card"
          @click="selectCategory(category)"
        >
          <div class="category-icon">{{ category.icon || '🔍' }}</div>
          <div class="category-name">{{ category.name }}</div>
          <div class="category-desc">{{ category.description }}</div>
        </div>
      </div>
    </div>

    <!-- 채팅 화면 -->
    <div v-else class="chat-section">
      <!-- 선택된 카테고리 표시 -->
      <div class="selected-category">
        <div class="category-badge">
          {{ selectedCategory.icon || '🔍' }} {{ selectedCategory.name }}
        </div>
        <button class="change-btn" @click="resetCategory">변경</button>
      </div>

      <!-- 메시지 영역 -->
      <div class="messages-container" ref="messagesContainer">
        <div 
          v-for="(message, index) in messages" 
          :key="index"
          class="message"
        >
          <div :class="message.type === 'user' ? 'user-message' : 'ai-message'">
            <div class="message-content">{{ message.content }}</div>
          </div>
          <div class="message-time">
            {{ formatTime(message.timestamp) }}
          </div>
        </div>
        
        <!-- 로딩 메시지 -->
        <div v-if="isProcessing" class="message">
          <div class="loading-message">
            <span>AI가 답변을 생성하고 있습니다</span>
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 입력 영역 -->
      <div class="input-section">
        <div class="input-container">
          <textarea
            v-model="currentMessage"
            class="message-input"
            placeholder="프로젝트 관련 질문을 입력하세요..."
            rows="1"
            @keydown="handleKeydown"
            @input="adjustTextareaHeight"
            ref="messageInput"
            :disabled="isProcessing"
          ></textarea>
          <button 
            class="send-button"
            @click="sendMessage"
            :disabled="!currentMessage.trim() || isProcessing"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatTab',
  props: {
    categories: {
      type: Array,
      default: function() {
        return [];
      }
    },
    loadingCategories: {
      type: Boolean,
      default: false
    }
  },
  data: function() {
    return {
      selectedCategory: null,
      currentMessage: '',
      messages: [],
      isProcessing: false,
      currentSessionId: null
    };
  },
  
  methods: {
    selectCategory: function(category) {
      this.selectedCategory = category;
      this.messages = [];
      this.currentSessionId = null;
      this.$emit('category-selected', category);
    },
    
    resetCategory: function() {
      this.selectedCategory = null;
      this.messages = [];
      this.currentMessage = '';
      this.currentSessionId = null;
      this.$emit('reset-category');
    },
    
    sendMessage: function() {
      if (!this.currentMessage.trim() || this.isProcessing) {
        return;
      }
      
      var message = this.currentMessage.trim();
      var timestamp = new Date();
      
      // 사용자 메시지 추가
      this.messages.push({
        type: 'user',
        content: message,
        timestamp: timestamp
      });
      
      // 입력창 초기화
      this.currentMessage = '';
      this.adjustTextareaHeight();
      
      // 메시지 영역 스크롤
      this.scrollToBottom();
      
      // 로딩 상태 시작
      this.isProcessing = true;
      
      // 부모 컴포넌트에 메시지 전송 이벤트 발생
      this.$emit('message-sent', {
        categoryId: this.selectedCategory.categoryId,
        message: message,
        sessionId: this.currentSessionId
      });
    },
    
    addAiResponse: function(response) {
      this.isProcessing = false;
      
      if (typeof response === 'string') {
        this.messages.push({
          type: 'ai',
          content: response,
          timestamp: new Date()
        });
      } else if (response && response.message) {
        this.messages.push({
          type: 'ai',
          content: response.message,
          timestamp: response.timestamp ? new Date(response.timestamp) : new Date()
        });
        
        if (response.sessionId) {
          this.currentSessionId = response.sessionId;
        }
      }
      
      this.scrollToBottom();
    },
    
    handleKeydown: function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
      }
    },
    
    adjustTextareaHeight: function() {
      var textarea = this.$refs.messageInput;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      }
    },
    
    scrollToBottom: function() {
      var self = this;
      this.$nextTick(function() {
        var container = self.$refs.messagesContainer;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },
    
    formatTime: function(timestamp) {
      var date = new Date(timestamp);
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  },
  
  watch: {
    selectedCategory: function(newVal) {
      var self = this;
      if (newVal) {
        this.$nextTick(function() {
          var input = self.$refs.messageInput;
          if (input) {
            input.focus();
          }
        });
      }
    }
  }
};
</script>