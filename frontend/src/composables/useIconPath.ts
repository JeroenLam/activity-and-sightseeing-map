import * as mdiIcons from '@mdi/js';

export function getIconPath(icon: string | undefined): string {
    if (!icon) return '';
    const camel = 'mdi' + icon.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    return (mdiIcons as Record<string, string>)[camel] ?? '';
}
