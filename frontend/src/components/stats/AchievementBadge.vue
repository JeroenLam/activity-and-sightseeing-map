<template>
  <button
    type="button"
    class="achievement-badge"
    :style="{ '--badge-level': achievement.currentLevel }"
    :class="{ selected }"
    @mouseenter="emit('hover')"
    @mouseleave="emit('leave')"
    @focus="emit('hover')"
    @blur="emit('leave')"
    @click="emit('toggle')"
  >
    <div class="achievement-ring">
      <svg viewBox="0 0 96 96" class="achievement-svg" aria-hidden="true">
        <circle class="ring-track" cx="48" cy="48" :r="radius" />
        <circle
          class="ring-progress"
          cx="48"
          cy="48"
          :r="radius"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="progressOffset"
        />
      </svg>
      <div class="achievement-icon">{{ achievement.icon }}</div>
      <div class="level-indicator" v-if="achievement.levels.length > 1">
        <span class="level-dots">
          <span
            v-for="(_, idx) in achievement.levels"
            :key="idx"
            class="dot"
            :class="{ filled: idx < achievement.currentLevel }"
          />
        </span>
      </div>
    </div>
    <span class="achievement-label">{{ t(achievement.titleKey) }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AchievementProgress } from '@/lib/achievements';

const props = defineProps<{
  achievement: AchievementProgress;
  selected?: boolean;
}>();

const emit = defineEmits<{
  hover: [];
  leave: [];
  toggle: [];
}>();

const { t } = useI18n();

const levelColors = ['#64748b', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
const currentColor = computed(() => levelColors[Math.min(props.achievement.currentLevel, levelColors.length - 1)]);

const radius = 38;
const circumference = 2 * Math.PI * radius;
const progressOffset = computed(() => circumference * (1 - props.achievement.progressToNextLevel));
</script>

<style scoped>
.achievement-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  min-height: 132px;
  padding: 0.9rem 0.75rem 0.8rem;
  border: 2px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.achievement-badge:hover,
.achievement-badge:focus-visible,
.achievement-badge.selected {
  transform: translateY(-2px);
  border-color: v-bind('currentColor');
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  outline: none;
}

.achievement-ring {
  position: relative;
  width: 72px;
  height: 72px;
}

.achievement-svg {
  width: 72px;
  height: 72px;
  transform: rotate(-90deg);
}

.ring-track,
.ring-progress {
  fill: none;
  stroke-width: 9;
}

.ring-track {
  stroke: var(--color-border);
}

.ring-progress {
  stroke: v-bind('currentColor');
  stroke-linecap: round;
  transition: stroke-dashoffset 0.25s ease, stroke 0.3s ease;
}

.achievement-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.65rem;
}

.level-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) translateY(50%);
  z-index: 2;
}

.level-dots {
  display: flex;
  gap: 0.24rem;
}

.dot {
  display: inline-block;
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: var(--color-border);
  transition: background 0.3s ease;
}

.dot.filled {
  background: v-bind('currentColor');
}

.achievement-label {
  margin: 0;
  font-size: 0.77rem;
  line-height: 1.25;
  text-align: center;
  color: var(--color-text-secondary);
}
</style>
