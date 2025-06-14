<template>
  <div class="chat-tab">
    <!-- Chat Section (Category Selected) -->
    <div v-if="selectedCategory" class="chat-section">
      <!-- Selected Category Header -->
      <div class="selected-category">
        <span class="category-badge">{{ selectedCategory.name }}</span>
        <button class="change-btn" @click="resetCategory">카테고리 변경</button>
      </div>

      <!-- Messages Container -->
      <div class="messages-container" ref="messagesContainer">
        <div v-for="(msg, index) in messages" :key="index" class="message-wrapper">
          <div :class="['message', msg.type === 'user' ? 'user-message' : 'ai-message']" v-html="renderMessageContent(msg)">
          </div>
          <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
        </div>
        <!-- AI Thinking Indicator -->
        <div v-if="isAiThinking" class="message-wrapper">
            <div class="message ai-message loading-message">
                <div class="loading-dots"><span></span><span></span><span></span></div>
            </div>
        </div>
      </div>

      <!-- Input Section -->
      <div class="input-section">
        <div class="input-container">
          <textarea
            ref="inputArea"
            class="message-input"
            v-model="userInput"
            placeholder="메시지를 입력하세요..."
            @keydown.enter.prevent="handleEnterKey"
            @input="adjustTextareaHeight"
          ></textarea>
          <button class="send-button" @click="sendMessage" :disabled="!userInput.trim() || isAiThinking">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Category Selection (No Category Selected) -->
    <div v-else class="category-selection">
      <h3 class="section-title">무엇을 도와드릴까요?</h3>
      <div v-if="loadingCategories" class="loading-state">
        <div class="loading-spinner"></div>
        <p>카테고리 로딩 중...</p>
      </div>
      <div v-else class="category-grid">
        <div
          v-for="category in categories"
          :key="category.categoryId"
          class="category-card"
          @click="selectCategory(category)"
        >
          <div class="category-icon">{{ category.icon || '💬' }}</div>
          <div class="category-name">{{ category.name }}</div>
          <div class="category-desc">{{ category.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// For Markdown rendering. Make sure to add it to your project:
// npm install marked
// or add <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script> to your index.html
import { marked } from 'marked';

export default {
  name: 'ChatTab',
  props: {
    categories: Array,
    loadingCategories: Boolean,
  },
  emits: ['message-sent', 'category-selected', 'reset-category'],
  data() {
    return {
      selectedCategory: null,
      messages: [],
      userInput: '',
      isAiThinking: false,
      currentSessionId: null,
    };
  },
  methods: {
    selectCategory(category) {
      this.selectedCategory = category;
      this.messages = [{
          type: 'ai',
          content: `안녕하세요! '${category.name}'에 대해 무엇이든 물어보세요.`,
          timestamp: new Date()
      }];
      this.$emit('category-selected', category);
    },
    resetCategory() {
      this.selectedCategory = null;
      this.messages = [];
      this.currentSessionId = null;
      this.$emit('reset-category');
    },
    async sendMessage() {
        if (!this.userInput.trim() || this.isAiThinking) return;

        const userMessage = {
            type: 'user',
            content: this.userInput,
            timestamp: new Date()
        };
        this.messages.push(userMessage);
        this.scrollToBottom();

        const messageToSend = this.userInput;
        this.userInput = '';
        this.adjustTextareaHeight();
        this.isAiThinking = true;

        this.$emit('message-sent', {
            categoryId: this.selectedCategory.categoryId,
            message: messageToSend,
            sessionId: this.currentSessionId,
        });
    },
    addAiResponse(response) {
        this.isAiThinking = false;
        if (response && response.aiMessage) {
            this.currentSessionId = response.sessionId;
            this.messages.push({
                type: 'ai',
                content: response.aiMessage,
                timestamp: new Date(response.timestamp)
            });
            this.scrollToBottom();
        }
    },
    showError(errorMessage) {
        this.isAiThinking = false;
        this.messages.push({
            type: 'ai',
            content: `오류가 발생했습니다: ${errorMessage}`,
            isError: true,
            timestamp: new Date()
        });
        this.scrollToBottom();
    },
    renderMessageContent(msg) {
        if (msg.type === 'ai') {
            return marked.parse(msg.content || '');
        }
        return msg.content;
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },
    handleEnterKey(event) {
        if (event.shiftKey) {
            return; // Allow new line with Shift+Enter
        }
        this.sendMessage();
    },
    adjustTextareaHeight() {
        this.$nextTick(() => {
            const textarea = this.$refs.inputArea;
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
        });
    },
    formatTime(date) {
        if (!date) return '';
        return new Date(date).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    },
    loadFromHistory(historyItem) {
        // This method can be called from the parent to load a past conversation
        this.selectCategory({
            categoryId: historyItem.categoryId,
            name: historyItem.categoryName,
        });
        this.currentSessionId = historyItem.sessionId;
        // You would then fetch the full message history for this session
        // and populate the `this.messages` array.
        // For now, we'll just show the last message as a starting point.
        this.messages.push({
            type: 'ai',
            content: `'${historyItem.categoryName}'에 대한 이전 대화를 이어갑니다. 마지막 메시지: "${historyItem.lastMessage}"`,
            timestamp: new Date(historyItem.lastMessageAt)
        });
    }
  }
};
</script>

<style lang="scss" scoped>
/* Component-specific styles are moved here from the global file */
.chat-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f9f9f9;
}

/* Category Selection */
.category-selection {
  padding: 24px 20px;
  height: 100%;
  overflow-y: auto;
  .section-title {
    font-size: 16px; font-weight: 600; color: #3f3f3f;
    margin-bottom: 20px; text-align: center;
  }
}
.loading-state { /* ... */ }
.category-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
}
.category-card {
  background: #fff; border: 1px solid #e0e0e0; border-radius: 12px;
  padding: 20px 16px; text-align: center; cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    border-color: #0052cc; transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 82, 204, 0.1);
  }
  .category-icon { font-size: 28px; margin-bottom: 8px; }
  .category-name { font-size: 14px; font-weight: 600; color: #3f3f3f; margin-bottom: 4px; }
  .category-desc { font-size: 12px; color: #888; line-height: 1.3; }
}

/* Chat Section */
.chat-section {
  display: flex; flex-direction: column; height: 100%;
}
.selected-category {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; background: #f0f4fa; border-bottom: 1px solid #e0e0e0;
  .category-badge {
    background: #0052cc; color: #fff; padding: 6px 12px;
    border-radius: 20px; font-size: 12px; font-weight: 500;
  }
  .change-btn {
    background: none; border: 1px solid #e0e0e0; color: #3f3f3f;
    padding: 4px 12px; border-radius: 6px; font-size: 12px;
    cursor: pointer; transition: all 0.2s ease;
    &:hover { background: #e9e9e9; }
  }
}

/* Messages */
.messages-container {
  flex: 1; padding: 20px; overflow-y: auto; scroll-behavior: smooth;
}
.message-wrapper {
  display: flex; flex-direction: column; margin-bottom: 16px;
  .message-time {
    font-size: 11px; color: #999; margin-top: 6px;
  }
}
.message {
  padding: 12px 16px; border-radius: 18px; font-size: 14px;
  line-height: 1.5; max-width: 85%; word-wrap: break-word;
}
.user-message {
  background: #0052cc; color: #fff; border-radius: 18px 18px 4px 18px;
  margin-left: auto; align-self: flex-end;
  + .message-time { text-align: right; }
}
.ai-message {
  background: #fff; color: #3f3f3f; border-radius: 18px 18px 18px 4px;
  margin-right: auto; border: 1px solid #e5e7eb;
  align-self: flex-start;
  &.loading-message { padding: 16px; }
  /* Markdown table styles */
  ::v-deep table {
    border-collapse: collapse; width: 100%; margin: 1em 0;
    font-size: 13px;
  }
  ::v-deep th, ::v-deep td {
    border: 1px solid #dfe2e5; padding: 6px 13px;
  }
  ::v-deep th {
    font-weight: 600; background-color: #f6f8fa;
  }
}
.loading-dots {
    display: flex; align-items: center;
    span {
        width: 8px; height: 8px; margin: 0 2px;
        background-color: #a3a3a3; border-radius: 50%;
        display: inline-block;
        animation: wave 1.4s infinite ease-in-out both;
        &:nth-child(1) { animation-delay: -0.32s; }
        &:nth-child(2) { animation-delay: -0.16s; }
    }
}
@keyframes wave {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
}

/* Input Section */
.input-section {
  padding: 12px 20px; border-top: 1px solid #e0e0e0; background: #fff;
}
.input-container {
  display: flex; align-items: flex-end; gap: 12px;
  background: #f8f9fa; border-radius: 12px; padding: 8px 12px;
  border: 1px solid #e0e0e0;
  &:focus-within {
    border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1);
  }
}
.message-input {
  flex: 1; border: none; background: none; outline: none; resize: none;
  font-size: 14px; line-height: 1.5; padding: 8px 0;
  min-height: 21px; max-height: 120px; font-family: inherit;
  &::placeholder { color: #aaa; }
}
.send-button {
  background: #0052cc; border: none; border-radius: 8px; color: #fff;
  width: 36px; height: 36px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: all 0.2s ease;
  flex-shrink: 0;
  &:hover:not(:disabled) { background: #0041a3; }
  &:disabled { background: #a0b3d1; cursor: not-allowed; }
}
</style>
