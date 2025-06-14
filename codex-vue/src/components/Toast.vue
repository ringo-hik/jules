<template>
  <div class="toast-container">
    <transition-group name="toast-transition" tag="div">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <div class="toast-icon">
          <!-- SVGs for success, error, warning, info -->
        </div>
        <div class="toast-content">
          <div class="toast-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button class="toast-close" @click="removeToast(toast.id)">
            <!-- Close Icon SVG -->
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script>
// The script part of Toast.vue remains largely the same.
// No functional changes were needed based on the refactoring.
export default {
  name: 'Toast',
  data() {
    return {
      toasts: [],
      nextId: 1
    }
  },
  methods: {
    show(options = {}) {
      const {
        type = 'info',
        title = '',
        message = '',
        duration = 5000
      } = options;
      
      const toast = {
        id: this.nextId++,
        type,
        title,
        message
      };
      
      this.toasts.unshift(toast); // Add to the top
      
      if (duration > 0) {
        setTimeout(() => {
          this.removeToast(toast.id);
        }, duration);
      }
    },
    removeToast(id) {
      const index = this.toasts.findIndex(toast => toast.id === id);
      if (index !== -1) {
        this.toasts.splice(index, 1);
      }
    },
    // ... other methods like success, error, etc.
  }
}
</script>

<style lang="scss" scoped>
/* Component-specific styles for Toast */
.toast-container {
  position: fixed; top: 20px; right: 20px; z-index: 10000;
  width: 350px;
}
.toast {
  background: #fff; border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-left: 5px solid;
  margin-bottom: 12px; padding: 16px;
  display: flex; align-items: flex-start; gap: 12px;
  /* ... specific types .toast-success, .toast-error etc. ... */
}
/* Transition for toasts */
.toast-transition-enter-active, .toast-transition-leave-active {
  transition: all 0.4s ease;
}
.toast-transition-enter-from, .toast-transition-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.toast-transition-move {
  transition: transform 0.4s ease;
}
</style>
