<template>
  <article class="achievement-card" :class="{ unlocked: achievement.unlocked }">
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
    </div>

    <div class="achievement-content">
      <h4>{{ t(achievement.titleKey) }}</h4>
      <p>{{ t(achievement.descriptionKey) }}</p>
      <div class="achievement-progress-text">
        <template v-if="achievement.secondaryGoal !== undefined && achievement.secondaryCurrent !== undefined">
          {{ t('stats.achievementProgressDual', {
            current: achievement.current,
            goal: achievement.goal,
            secondaryCurrent: achievement.secondaryCurrent,
            secondaryGoal: achievement.secondaryGoal,
          }) }}
        </template>
        <template v-else>
          {{ t('stats.achievementProgressSingle', {
            current: achievement.current,
            goal: achievement.goal,
          }) }}
        </template>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AchievementProgress } from '@/lib/achievements';

const props = defineProps<{
  achievement: AchievementProgress;
}>();

const { t } = useI18n();

const radius = 38;
const circumference = 2 * Math.PI * radius;
const progressOffset = computed(() => circumference * (1 - props.achievement.progress));
</script>

<style scoped>
.achievement-card {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  align-items: center;
}

.achievement-card.unlocked {
  border-color: color-mix(in srgb, var(--color-success) 45%, var(--color-border));
  box-shadow: 0 10px 30px rgba(34, 197, 94, 0.08);
}

.achievement-ring {
  position: relative;
  width: 96px;
  height: 96px;
}

.achievement-svg {
  width: 96px;
  height: 96px;
  transform: rotate(-90deg);
}

.ring-track,
.ring-progress {
  fill: none;
  stroke-width: 8;
}

.ring-track {
  stroke: var(--color-border);
}

.ring-progress {
  stroke: var(--color-primary);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.25s ease;
}

.achievement-card.unlocked .ring-progress {
  stroke: var(--color-success);
}

.achievement-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.achievement-content h4 {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
}

.achievement-content p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.achievement-progress-text {
  margin-top: 0.65rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
}

@media (max-width: 768px) {
  .achievement-card {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
}
</style>
