<template>
  <div class="page-container">
    <h2>{{ t('stats.title') }}</h2>

    <div v-if="store.loading" class="text-secondary">{{ t('common.loading') }}</div>

    <template v-else-if="store.statistics">
      <div class="stats-layout">
        <section class="stats-panel">
          <div class="stats-cards">
            <div class="stat-card">
              <span class="stat-value">{{ store.statistics.total_locations }}</span>
              <span class="stat-label">{{ t('stats.totalLocations') }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ store.statistics.total_visited }}</span>
              <span class="stat-label">{{ t('stats.totalVisited') }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ store.statistics.total_unvisited }}</span>
              <span class="stat-label">{{ t('stats.totalUnvisited') }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ store.statistics.total_countries }}</span>
              <span class="stat-label">{{ t('stats.totalCountries') }}</span>
            </div>
          </div>

          <div class="chart-grid">
            <div class="chart-section chart-section-wide" v-if="store.statistics.visits_per_year.length">
              <h3>{{ t('stats.visitsPerYear') }}</h3>
              <div class="chart-container">
                <Bar :data="yearChartData" :options="yearChartOptions" />
              </div>
            </div>

            <div class="chart-section chart-section-wide" v-if="store.statistics.visited_locations_per_year_by_country.length">
              <h3>{{ t('stats.visitedLocationsPerYearByCountry') }}</h3>
              <div class="chart-container chart-container-tall">
                <Bar :data="countryYearChartData" :options="stackedChartOptions" />
              </div>
            </div>

            <div class="chart-section chart-section-wide" v-if="store.statistics.visited_locations_per_year_by_type.length">
              <h3>{{ t('stats.visitedLocationsPerYearByType') }}</h3>
              <div class="chart-container chart-container-tall">
                <Bar :data="typeYearChartData" :options="stackedChartOptions" />
              </div>
            </div>

            <div class="chart-section" v-if="typeComparisonChartData.labels.length">
              <h3>{{ t('stats.locationsByTypeComparison') }}</h3>
              <div class="chart-container chart-container-comparison">
                <Bar :data="typeComparisonChartData" :options="comparisonChartOptions" />
              </div>
            </div>

            <div class="chart-section" v-if="countryComparisonChartData.labels.length">
              <h3>{{ t('stats.locationsByCountryComparison') }}</h3>
              <div class="chart-container chart-container-comparison">
                <Bar :data="countryComparisonChartData" :options="comparisonChartOptions" />
              </div>
            </div>
          </div>
        </section>

        <aside class="badge-panel">
          <div class="section-heading">
            <h3>{{ t('stats.achievementsTitle') }}</h3>
            <p>{{ t('stats.achievementsSubtitle') }}</p>
          </div>

          <div class="badge-detail-box" :class="{ empty: !activeAchievement }">
            <template v-if="activeAchievement">
              <div class="badge-detail-header">
                <div class="badge-detail-icon">{{ activeAchievement.icon }}</div>
                <div>
                  <div class="badge-detail-title-row">
                    <h4>{{ t(activeAchievement.titleKey) }}</h4>
                  </div>
                  <p>{{ t(activeAchievement.descriptionKey) }}</p>
                </div>
              </div>

              <div class="badge-meta-pills">
                <span class="badge-metric-pill">{{ t(activeAchievement.trackingKey) }}</span>
                <span class="badge-level-pill">
                  {{ t('stats.badgeLevelOf', {
                    current: activeAchievement.currentLevel,
                    max: activeAchievement.levels.length,
                  }) }}
                </span>
              </div>

              <div class="badge-progress-block">
                <span class="badge-progress-label">{{ t('stats.badgeProgressLabel') }}</span>
                <strong>{{ Math.floor(activeAchievement.current) }} / {{ activeAchievement.levels[activeAchievement.currentLevel] ?? activeAchievement.levels[activeAchievement.levels.length - 1] }}</strong>
              </div>
            </template>

            <template v-else>
              <div class="badge-empty-state">
                <strong>{{ t('stats.badgeEmptyTitle') }}</strong>
                <p>{{ t('stats.badgeEmptyBody') }}</p>
              </div>
            </template>
          </div>

          <div class="achievement-grid" @mouseleave="clearActiveAchievementSelection">
            <AchievementBadge
              v-for="achievement in achievements"
              :key="achievement.id"
              :achievement="achievement"
              :selected="activeAchievement?.id === achievement.id"
              @hover="setHoveredAchievement(achievement.id)"
              @leave="clearHoveredAchievement(achievement.id)"
              @toggle="togglePinnedAchievement(achievement.id)"
            />
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatisticsStore } from '@/stores/statistics';
import AchievementBadge from '@/components/stats/AchievementBadge.vue';
import { buildAchievements, type AchievementProgress } from '@/lib/achievements';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Bar } from 'vue-chartjs';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const { t } = useI18n();
const store = useStatisticsStore();
const hoveredAchievementId = ref<string | null>(null);
const pinnedAchievementId = ref<string | null>(null);

onMounted(() => {
  void store.fetchStatistics();
});

const achievements = computed(() => {
  if (!store.statistics) return [];
  return buildAchievements(store.statistics);
});

const activeAchievement = computed(() => {
  const activeId = pinnedAchievementId.value ?? hoveredAchievementId.value;
  return achievements.value.find((achievement) => achievement.id === activeId) ?? null;
});

function setHoveredAchievement(achievementId: string) {
  if (!pinnedAchievementId.value) {
    hoveredAchievementId.value = achievementId;
  }
}

function clearHoveredAchievement(achievementId?: string) {
  if (pinnedAchievementId.value) {
    return;
  }

  if (!achievementId || hoveredAchievementId.value === achievementId) {
    hoveredAchievementId.value = null;
  }
}

function togglePinnedAchievement(achievementId: string) {
  if (pinnedAchievementId.value === achievementId) {
    pinnedAchievementId.value = null;
    hoveredAchievementId.value = achievementId;
    return;
  }

  pinnedAchievementId.value = achievementId;
  hoveredAchievementId.value = achievementId;
}

function clearActiveAchievementSelection() {
  if (!pinnedAchievementId.value) {
    hoveredAchievementId.value = null;
  }
}


const yearChartData = computed(() => {
  const stats = store.statistics;
  if (!stats) return { labels: [], datasets: [] };
  return {
    labels: stats.visits_per_year.map((s) => String(s.year)),
    datasets: [
      {
        label: t('stats.visits'),
        data: stats.visits_per_year.map((s) => s.count),
        backgroundColor: '#4f46e5',
        borderRadius: 4,
      },
    ],
  };
});

const yearChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
  },
}));

function buildComparisonEntries(
  addedItems: Array<{ key: string; label: string; count: number }>,
  visitedItems: Array<{ key: string; label: string; count: number }>,
  limit = 10,
) {
  const merged = new Map<string, { label: string; added: number; visited: number }>();

  for (const item of addedItems) {
    merged.set(item.key, {
      label: item.label,
      added: item.count,
      visited: merged.get(item.key)?.visited ?? 0,
    });
  }

  for (const item of visitedItems) {
    const existing = merged.get(item.key);
    merged.set(item.key, {
      label: item.label,
      added: existing?.added ?? 0,
      visited: item.count,
    });
  }

  return Array.from(merged.values())
    .sort((left, right) => Math.max(right.added, right.visited) - Math.max(left.added, left.visited))
    .slice(0, limit);
}

const typeComparisonChartData = computed(() => {
  const stats = store.statistics;
  if (!stats) return { labels: [], datasets: [] };

  const entries = buildComparisonEntries(
    stats.locations_per_type.map((item) => ({
      key: item.type_id ?? item.type_name,
      label: item.type_name,
      count: item.count,
    })),
    stats.visited_locations_per_type.map((item) => ({
      key: item.type_id ?? item.type_name,
      label: item.type_name,
      count: item.count,
    })),
  );

  return {
    labels: entries.map((entry) => entry.label),
    datasets: [
      {
        label: t('stats.addedLocations'),
        data: entries.map((entry) => entry.added),
        backgroundColor: '#94a3b8',
        borderRadius: 5,
      },
      {
        label: t('stats.visitedLocations'),
        data: entries.map((entry) => entry.visited),
        backgroundColor: '#0f766e',
        borderRadius: 5,
      },
    ],
  };
});

const countryComparisonChartData = computed(() => {
  const stats = store.statistics;
  if (!stats) return { labels: [], datasets: [] };

  const entries = buildComparisonEntries(
    stats.locations_per_country.map((item) => ({
      key: item.country,
      label: item.country,
      count: item.count,
    })),
    stats.visited_locations_per_country.map((item) => ({
      key: item.country,
      label: item.country,
      count: item.count,
    })),
  );

  return {
    labels: entries.map((entry) => entry.label),
    datasets: [
      {
        label: t('stats.addedLocations'),
        data: entries.map((entry) => entry.added),
        backgroundColor: '#c084fc',
        borderRadius: 5,
      },
      {
        label: t('stats.visitedLocations'),
        data: entries.map((entry) => entry.visited),
        backgroundColor: '#2563eb',
        borderRadius: 5,
      },
    ],
  };
});

const countryYearChartData = computed(() => {
  const stats = store.statistics;
  if (!stats) return { labels: [], datasets: [] };

  const years = Array.from(new Set(stats.visited_locations_per_year_by_country.map((item) => item.year))).sort((a, b) => a - b);
  const topCountries = stats.visited_locations_per_country.slice(0, 6).map((item) => item.country);
  const series = new Map(stats.visited_locations_per_year_by_country.map((item) => [`${item.year}:${item.country}`, item.count]));
  const colors = ['#0f766e', '#0891b2', '#2563eb', '#4f46e5', '#7c3aed', '#db2777'];

  return {
    labels: years.map(String),
    datasets: topCountries.map((country, index) => ({
      label: country,
      data: years.map((year) => series.get(`${year}:${country}`) ?? 0),
      backgroundColor: colors[index % colors.length],
      borderRadius: 4,
    })),
  };
});

const typeYearChartData = computed(() => {
  const stats = store.statistics;
  if (!stats) return { labels: [], datasets: [] };

  const years = Array.from(new Set(stats.visited_locations_per_year_by_type.map((item) => item.year))).sort((a, b) => a - b);
  const topTypes = stats.visited_locations_per_type.slice(0, 6).map((item) => ({
    key: item.type_id ?? item.type_name,
    label: item.type_name,
    color: item.color,
  }));
  const series = new Map(stats.visited_locations_per_year_by_type.map((item) => [`${item.year}:${item.type_id ?? item.type_name}`, item.count]));

  return {
    labels: years.map(String),
    datasets: topTypes.map((type) => ({
      label: type.label,
      data: years.map((year) => series.get(`${year}:${type.key}`) ?? 0),
      backgroundColor: type.color,
      borderRadius: 4,
    })),
  };
});

const stackedChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
  },
}));

const comparisonChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { position: 'bottom' as const },
  },
  scales: {
    x: { beginAtZero: true, ticks: { stepSize: 1 } },
  },
}));
</script>

<style scoped>
.page-container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 2rem;
}

.page-container h2 {
  margin: 0 0 1.5rem;
}

.section-heading {
  margin-bottom: 1rem;
}

.section-heading h3 {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
}

.section-heading p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.stats-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 1.5rem;
  align-items: start;
}

.stats-panel,
.badge-panel {
  min-width: 0;
}

.badge-panel {
  position: sticky;
  top: 1rem;
}

.achievement-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.badge-detail-box {
  min-height: 255px;
  margin-bottom: 1rem;
  padding: 1.2rem;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 38%),
    var(--color-surface);
}

.badge-detail-box.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-empty-state {
  text-align: center;
  color: var(--color-text-secondary);
}

.badge-empty-state strong {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--color-text);
}

.badge-empty-state p {
  margin: 0;
  font-size: 0.88rem;
}

.badge-detail-header {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 1rem;
  align-items: start;
}

.badge-detail-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
}

.badge-detail-title-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.badge-detail-title-row h4 {
  margin: 0;
  font-size: 1.05rem;
}

.badge-detail-header p {
  margin: 0.45rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.badge-status-pill,
.badge-metric-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.62rem;
  font-size: 0.74rem;
  font-weight: 700;
}

.badge-status-pill {
  background: color-mix(in srgb, var(--color-border) 65%, transparent);
  color: var(--color-text-secondary);
}

.badge-status-pill.unlocked {
  background: color-mix(in srgb, var(--color-success) 16%, transparent);
  color: var(--color-success);
}

.badge-meta-pills {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge-metric-pill {
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  color: var(--color-primary);
}

.badge-level-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.62rem;
  font-size: 0.74rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--color-primary) 16%, transparent);
  color: var(--color-primary);
}

.badge-progress-block {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.badge-progress-label {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--color-text-secondary);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.chart-section {
  min-width: 0;
}

.chart-section h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.chart-section-wide {
  grid-column: 1 / -1;
}

.chart-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem;
  height: 300px;
}

.chart-container-small {
  height: 280px;
}

.chart-container-tall {
  height: 360px;
}

.chart-container-comparison {
  height: 360px;
}

@media (max-width: 768px) {
  .page-container { padding: 1rem; }
  .stats-layout { grid-template-columns: 1fr; }
  .badge-panel { position: static; }
  .achievement-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats-cards { grid-template-columns: repeat(2, 1fr); }
  .chart-grid { grid-template-columns: 1fr; }
  .chart-container { height: 250px; padding: 0.75rem; }
  .chart-container-tall { height: 280px; }
  .chart-container-comparison { height: 300px; }
  .badge-detail-header { grid-template-columns: 1fr; }
  .badge-detail-icon { margin: 0 auto; }
}
</style>
