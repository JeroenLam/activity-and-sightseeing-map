import api from '@/lib/api';
import type {
    SyncBootstrapResponse,
    SyncChange,
    SyncConflict,
    SyncMutationRequest,
    SyncMutationResult,
    SyncStatus,
} from '@/types';

export interface SyncConflictResolveRequest {
    resolution_mode: 'use_client' | 'use_server' | 'merge';
    payload?: Record<string, unknown> | null;
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
    const response = await api.get('/api/sync/status');
    return response.data;
}

export async function fetchBootstrap(): Promise<SyncBootstrapResponse> {
    const response = await api.get('/api/sync/bootstrap');
    return response.data;
}

export async function fetchChanges(cursor: number): Promise<SyncChange[]> {
    const response = await api.get('/api/sync/changes', { params: { cursor } });
    return response.data;
}

export async function pushMutations(mutations: SyncMutationRequest[]): Promise<{ cursor: number; results: SyncMutationResult[] }> {
    const response = await api.post('/api/sync/push', { mutations });
    return response.data;
}

export async function listConflicts(): Promise<SyncConflict[]> {
    const response = await api.get('/api/sync/conflicts');
    return response.data;
}

export async function resolveConflict(conflictId: number, payload: SyncConflictResolveRequest): Promise<SyncConflict> {
    const response = await api.post(`/api/sync/conflicts/${conflictId}/resolve`, payload);
    return response.data;
}
