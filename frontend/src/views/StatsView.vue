<template>
  <div class="page-container">
    <h2>{{ t('stats.title') }}</h2>

    <div v-if="store.loading" class="text-secondary">{{ t('common.loading') }}</div>

    <template v-else-if="store.statistics">
      <!-- Summary cards -->
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

      <!-- Visits per year chart -->
      <div class="chart-section" v-if="store.statistics.visits_per_year.length">
        <h3>{{ t('stats.visitsPerYear') }}</h3>
        <div class="chart-container">
          <Bar :data="yearChartData" :options="yearChartOptions" />
        </div>
      </div>

      <!-- Locations per type chart -->
      <div class="chart-section" v-if="store.statistics.locations_per_type.length">
        <h3>{{ t('stats.locationsByType') }}</h3>
        <div class="chart-container chart-container-small">
          <Doughnut :data="typeChartData" :options="typeChartOptions" />
        </div>
      </div>

      <!-- Locations per country chart -->
      <div class="chart-section" v-if="store.statistics.locations_per_country.length">
        <h3>{{ t('stats.locationsByCountry') }}</h3>
        <div class="chart-container">
          <Bar :data="countryChartData" :options="countryChartOptions" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatisticsStore } from '@/stores/statistics';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'vue-chartjs';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

const { t } = useI18n();
const store = useStatisticsStore();

onMounted(() => store.fetchStatistics());

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

const typeChartData = computed(() => {
  const stats = store.statistics;
  if (!stats) return { labels: [], datasets: [] };
  return {
    labels: stats.locations_per_type.map((s) => s.type_name),
    datasets: [
      {
        data: stats.locations_per_type.map((s) => s.count),
        backgroundColor: stats.locations_per_type.map((s) => s.color),
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };
});

const typeChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const },
  },
};

const countryChartData = computed(() => {
  const stats = store.statistics;
  if (!stats) return { labels: [], datasets: [] };
  // Show top 15 countries
  const top = stats.locations_per_country.slice(0, 15);
  return {
    labels: top.map((s) => s.country),
    datasets: [
      {
        label: t('stats.locations'),
        data: top.map((s) => s.count),
        backgroundColor: '#22c55e',
        borderRadius: 4,
      },
    ],
  };
});

const countryChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: { legend: { display: false } },
  scales: {
    x: { beginAtZero: true, ticks: { stepSize: 1 } },
  },
}));
</script>

<style scoped>
.page-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
}

.page-container h2 {
  margin: 0 0 1.5rem;
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
  margin-bottom: 2rem;
}

.chart-section h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
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
  max-width: 500px;
}

@media (max-width: 768px) {
  .page-container { padding: 1rem; }
  .stats-cards { grid-template-columns: repeat(2, 1fr); }
  .chart-container { height: 250px; padding: 0.75rem; }
  .chart-container-small { max-width: 100%; }
}
</style>
