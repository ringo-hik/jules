<template>
  <div class="toast-container">
    <div 
      v-for="toast in toasts" 
      :key="toast.id"
      :class="['toast', 'toast-' + toast.type]"
    >
      <div class="toast-icon">
        <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        </svg>
        <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="toast.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/>
          <path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="toast.type === 'info'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 16v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      
      <div class="toast-content">
        <div class="toast-title">{{ toast.title }}</div>
        <div class="toast-message">{{ toast.message }}</div>
      </div>
      
      <button class="toast-close" @click="removeToast(toast.id)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Toast',
  data: function() {
    return {
      toasts: [],
      nextId: 1
    };
  },
  
  methods: {
    show: function(options) {
      options = options || {};
      var type = options.type || 'info';
      var title = options.title || '';
      var message = options.message || '';
      var duration = options.duration !== undefined ? options.duration : 5000;
      
      var toast = {
        id: this.nextId++,
        type: type,
        title: title,
        message: message,
        duration: duration
      };
      
      this.toasts.push(toast);
      
      // 자동 제거 (duration이 0이면 자동 제거하지 않음)
      if (duration > 0) {
        var self = this;
        setTimeout(function() {
          self.removeToast(toast.id);
        }, duration);
      }
      
      return toast.id;
    },
    
    removeToast: function(id) {
      var index = this.toasts.findIndex(function(toast) {
        return toast.id === id;
      });
      if (index !== -1) {
        this.toasts.splice(index, 1);
      }
    },
    
    success: function(title, message, duration) {
      return this.show({
        type: 'success',
        title: title,
        message: message,
        duration: duration
      });
    },
    
    error: function(title, message, duration) {
      return this.show({
        type: 'error',
        title: title,
        message: message,
        duration: duration || 0
      });
    },
    
    warning: function(title, message, duration) {
      return this.show({
        type: 'warning',
        title: title,
        message: message,
        duration: duration
      });
    },
    
    info: function(title, message, duration) {
      return this.show({
        type: 'info',
        title: title,
        message: message,
        duration: duration
      });
    },
    
    clear: function() {
      this.toasts = [];
    }
  }
};
</script>