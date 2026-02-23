import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';
import { api, ApiError } from '@/api/client';

interface PowerSyncTokenResponse {
  token: string;
  powersync_url?: string;
  expiresIn: number;
}

export class XOPowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    try {
      const data = await api<PowerSyncTokenResponse>(
        '/auth/powersync/token',
      );
      return {
        endpoint: data.powersync_url || '',
        token: data.token,
        expiresAt: new Date(Date.now() + data.expiresIn * 1000),
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // api() already attempted token refresh — auth is truly dead
        console.warn('PowerSync auth failed after refresh attempt');
        return null;
      }
      console.error('PowerSync credential fetch failed:', error);
      throw error;
    }
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      const operations = transaction.crud.map((entry: CrudEntry) => ({
        type: this.mapUpdateType(entry.op),
        table: entry.table,
        id: entry.id,
        data: entry.opData || {},
        clientId: entry.id,
        timestamp: new Date().toISOString(),
      }));

      await api('/sync/queue', {
        method: 'POST',
        body: { operations },
      });

      await transaction.complete();
    } catch (error) {
      console.error('PowerSync upload error:', error);
      throw error;
    }
  }

  private mapUpdateType(op: UpdateType): string {
    switch (op) {
      case UpdateType.PUT:
        return 'CREATE';
      case UpdateType.PATCH:
        return 'UPDATE';
      case UpdateType.DELETE:
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }
}
