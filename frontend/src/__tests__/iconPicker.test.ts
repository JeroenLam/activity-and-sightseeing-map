import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { i18n } from '@/i18n';
import IconPicker from '@/components/types/IconPicker.vue';

/**
 * The icon picker loads the full icon set on demand (when first opened)
 * instead of the icon set being bundled into every page that shows icons.
 */
vi.mock('@mdi/js', () => {
    const icons: Record<string, string> = { mdiBank: 'M-bank', mdiMapMarker: 'M-map-marker' };
    for (let i = 0; i < 80; i++) icons[`mdiAlpha${i}`] = `M-alpha-${i}`;
    return icons;
});

async function openPicker() {
    const wrapper = mount(IconPicker, {
        attachTo: document.body,
        props: { modelValue: '' },
        global: { plugins: [i18n] },
    });
    await wrapper.find('.picker-trigger').trigger('click');
    for (let i = 0; i < 5; i++) await flushPromises();
    return wrapper;
}

describe('IconPicker', () => {
    it('does not render the grid until opened', () => {
        const wrapper = mount(IconPicker, { props: { modelValue: '' }, global: { plugins: [i18n] } });
        expect(wrapper.find('.picker-grid').exists()).toBe(false);
        wrapper.unmount();
    });

    it('loads icons when opened and caps the grid at 50', async () => {
        const wrapper = await openPicker();
        expect(wrapper.findAll('.picker-cell')).toHaveLength(50);
        wrapper.unmount();
    });

    it('filters by name and emits the selected icon', async () => {
        const wrapper = await openPicker();
        await wrapper.find('.picker-search').setValue('map');

        const cells = wrapper.findAll('.picker-cell');
        expect(cells.map((c) => c.attributes('title'))).toEqual(['map-marker']);

        await cells[0].trigger('click');
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['map-marker']);
        wrapper.unmount();
    });

    it('shows the no-results message only after loading', async () => {
        const wrapper = await openPicker();
        await wrapper.find('.picker-search').setValue('zzz-no-match');
        expect(wrapper.findAll('.picker-cell')).toHaveLength(0);
        expect(wrapper.find('.picker-empty').text()).not.toBe('…');
        wrapper.unmount();
    });
});
